// (11/09 12:35 사용자) 메이크업 예상 시간 = 서버가 학습한 처리시간.json(종류별 a + b×곡 길이 + 대기 중앙값) · 표본 없으면 예전 공식
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const blk = T.slice(T.indexOf("let mkEta = {"), T.indexOf("let progTimer = null"));
const mk = (model) => new Function("cfg", "list", "readJSON", blk + "; mkEta.model = arguments[3]; mkEta.at = Date.now(); return mkEstimate;")(null, null, null, model);
const old = mk(null); assert.strictEqual(old({ mode: "two" }), 95, "표본 없으면 예전 공식");
const e = mk({ queue_s: 40, sep: { n: 5, a: 30, b: 1.2 }, two: { n: 3, a: 50, b: 0 }, single: { n: 0 } });
assert.strictEqual(e({ mode: "single", render_count: 0, start: 0, end: 200 }), 40 + 30 + 240, "첫 분리: 대기 + a + b×곡 길이");
assert.strictEqual(e({ mode: "two" }), 90); assert.strictEqual(e({ mode: "single", render_count: 2 }), 85, "그 종류 표본 없으면 예전 공식");
console.log("eta-learn ok");
