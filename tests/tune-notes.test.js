// 음정 주석(10/30 사용자 시안 승인) + 현상치 문구(↑높게/↓낮게)
const fs = require("fs"), path = require("path"), assert = require("assert");
require(path.join(__dirname, "..", "tune.js"));
const T = globalThis.Tune;
assert.strictEqual(T.sangLabel(-60).txt, "↑ 0.6반음 높게 불렀어요");   // 고친 양이 내림(-) = 높게 불렀음
assert.strictEqual(T.sangLabel(30).txt, "↓ 0.3반음 낮게 불렀어요");
assert.strictEqual(typeof T.sheet, "function");
const html = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const grab = (name) => { const i = html.indexOf("function " + name + "("); assert.ok(i >= 0, name); let d = 0, j = html.indexOf("{", i); for (let k = j; k < html.length; k++) { if (html[k] === "{") d++; else if (html[k] === "}" && --d === 0) return html.slice(i, k + 1); } };
const tnCache = {};
const tnPublic = new Function("tnCache", grab("tnPublic") + "; return tnPublic;")(tnCache);
tnCache.F = { doc: { notes: [
  { t0: 4.2, t1: 4.6, text: "초안", status: "draft" },
  { t0: 18.5, t1: 18.5, text: " 스팟 확인 ", status: "ok" },
  { t0: 30, t1: 34.5, text: "구간 확인", status: "ok", evidence: "선생님만" },
  { t0: 5, t1: 6, text: "", status: "ok" } ] } };
const pub = tnPublic({ folder: { id: "F" } });
assert.deepStrictEqual(pub, [{ t0: 18.5, t1: 18.5, text: "스팟 확인" }, { t0: 30, t1: 34.5, text: "구간 확인" }]);   // 초안·빈 글·근거는 수강생에게 안 감
assert.strictEqual(tnPublic({ folder: { id: "X" } }), null);
assert.ok(html.includes("t1: Math.round(tt * 10) / 10, text: \"\", src: \"teacher\""), "꾹 누르기 = 한 점(스팟)");
assert.ok(/tune_notes: tn/.test(html), "확인한 주석이 수강생 노트(makeup)에 실림");
const stu = fs.readFileSync(path.join(__dirname, "..", "student", "index.html"), "utf8");
assert.ok(stu.includes("notes: () => tnOk(mk.tune_notes)"), "수강생 화면은 확인 주석만 보기");
assert.ok(!/onNote|onAdd/.test(stu), "수강생 화면엔 고치기·추가 없음");
console.log("tune-notes OK");
