// 앱 열기 빠르게 — 출입증이 있어도 설정을 서버에서 받기 전에 지난 목록을 먼저 그린다(체험 보기·공유 열기 제외)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const i = src.indexOf("if (savedToken()) {\n  token = savedToken();");
assert.ok(i > 0, "빠른 열기 블록이 없음");
const blk = src.slice(i, src.indexOf("let goBack", i));
// 1. 지난 목록 그리기는 start() 호출보다 앞
assert.ok(blk.indexOf("paintList(l0, true)") > 0 && blk.indexOf("paintList(l0, true)") < blk.lastIndexOf("start();"), "목록 먼저 그리기가 start보다 뒤");
// 2. 체험 보기·?shared·저장된 목록 없음이면 건너뜀
for (const g of ['c0.demo_readonly !== true', 'has("shared")', 'Array.isArray(l0) && l0.length', 'LS.get("vn_hint")']) assert.ok(blk.includes(g), "조건 누락: " + g);
// 3. 그리기 오류가 start를 막지 않음(try/catch) · start는 항상 호출
assert.ok(/try \{ paintList\(l0, true\); \} catch \{\}/.test(blk));
// 4. 실행 시험: 조건별로 paintList 호출 여부
function run({ hint = "a@b", cfg0 = { students: {} }, list = [{ sid: "S1" }], search = "", boom = false }) {
  const calls = []; const store = { vn_hint: hint, vn_cfg: cfg0, vn_list: list };
  const f = new Function("savedToken", "LS", "location", "show", "paintList", "start", "calls", "boom",
    `let token, cfg; ${blk.replace("let goBack", "")}; return cfg;`);
  f(() => "T", { get: (k) => store[k] ?? null }, { search }, (v) => calls.push("show:" + v),
    (d, st) => { calls.push("paint:" + st); if (boom) throw new Error("x"); }, () => calls.push("start"), calls, boom);
  return calls;
}
assert.deepStrictEqual(run({}), ["show:vList", "paint:true", "start"]);
assert.deepStrictEqual(run({ cfg0: { demo_readonly: true } }), ["start"]);
assert.deepStrictEqual(run({ search: "?shared=1" }), ["start"]);
assert.deepStrictEqual(run({ list: [] }), ["start"]);
assert.deepStrictEqual(run({ hint: null }), ["start"]);
assert.deepStrictEqual(run({ boom: true }), ["show:vList", "paint:true", "start"]);
console.log("fast-open OK");
