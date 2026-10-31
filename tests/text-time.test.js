// 글 속 시각(8:24) 근거 듣기(10/30 20:02 사용자 시안 승인)
const fs = require("fs"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const grab = (name) => { const i = html.indexOf("function " + name + "("); assert.ok(i >= 0, name); let d = 0, j = html.indexOf("{", i); for (let k = j; k < html.length; k++) { if (html[k] === "{") d++; else if (html[k] === "}" && --d === 0) return html.slice(i, k + 1); } };
const reLine = html.match(/const TS_RE = (\/.*\/g);/)[1];
const env = new Function(`const TS_RE = ${reLine}; ${grab("tsTimes")}; ${grab("tsLineTime")}; return { tsTimes, tsLineTime };`)();
assert.deepStrictEqual(env.tsTimes("· 8:24 '오' 발음\n· 11:16 언젠가는\n· 15:24 마지막 · 8:24 다시").map(x => x.s), [504, 676, 924]);
assert.deepStrictEqual(env.tsTimes("1:02:03 은 무시, 12:345도 무시, 3:7도 무시"), []);
const v = "홍길동님 수고하셨어요!\n· 8:24 브릿지 좋았어요\n· 11:16 숨";
assert.strictEqual(env.tsLineTime({ value: v, selectionStart: v.indexOf("브릿지") }).s, 504);
assert.strictEqual(env.tsLineTime({ value: v, selectionStart: 3 }), null, "시각 없는 줄 = 막대 숨김");
assert.strictEqual(env.tsLineTime({ value: v, selectionStart: v.length }).lab, "11:16");
assert.ok(html.includes("tsWire(el)"), "선생님 한마디·포인트 글 칸 모두에 연결");
console.log("text-time OK");
