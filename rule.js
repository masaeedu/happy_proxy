const fs = require("fs");

const { JSDOM } = require("jsdom");
const mime = require("whatwg-mimetype");
const spongebobify = require("spongebobify");
const Sentiment = require("sentiment");

const delay = d => new Promise(res => setTimeout(res, d));
const pipe = fs => x => fs.reduce((p, f) => f(p), x);

const textnode = d => c => d.createTextNode(c);
const createElement = d => tn => ch => {
  const e = d.createElement(tn);
  e.innerHTML = ch;
  return e;
};

const sentiment = new Sentiment();
const embiggen = s => {
  return s.split(/\b/).reduce((p, w) => {
    const score = sentiment.analyze(w).score;

    return (
      p +
      (score === 0
        ? w
        : `<span style="font-size:${Math.pow(2, score)}em">${w}</span>`)
    );
  });
};

const transform = pipe([
  // Spongebobify the text
  // spongebobify,
  // Embiggen the nice words
  embiggen
]);

const modifyHTML = async body => {
  const dom = new JSDOM(body);
  const { document, Node } = dom.window;
  const nodes = Array.from(document.getElementsByTagName("*"));

  for (const n of nodes) {
    if (n.tagName === "SCRIPT" || n.tagName === "STYLE") continue;
    for (const c of Array.from(n.childNodes)) {
      if (c.nodeType === Node.TEXT_NODE) {
        const newContent = transform(c.textContent);
        if (newContent.indexOf("span") !== -1) {
          const span = document.createElement("span");
          span.innerHTML = newContent;
          n.replaceChild(span, c);
        }
      }
    }
  }

  return dom.serialize();
};

module.exports = {
  async beforeSendResponse(req, res) {
    const { response } = res;
    const headers = response.header;

    let ct = headers["Content-Type"];
    if (typeof ct !== "string") return res;

    ct = new mime(ct);
    if (ct.essence !== "text/html") return res;

    return {
      response: {
        ...response,
        body: await modifyHTML(response.body.toString(ct.charset))
      }
    };
  }
};
