// (11/04 23:41 사용자) 호흡·치찰음: 빗금 표시·이름 바꾸기·구간 볼륨 — 고급 보정에서만
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const ctx = { window: {}, document: { createElement: () => ({ style: {} }), head: { appendChild() {} }, getElementById: () => null }, console, setTimeout: () => 0, clearTimeout: () => {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../adv.js", "utf8").replace("typeof window !== \"undefined\" ? window : globalThis", "globalThis"), ctx);
const A = ctx.TuneAdv;
const cv = { uv: [[1, 1.2, "s"], [3, 3.5, "b"], [5, 5.1, "x"]] }, st = { advGet: () => ({ global: { uv_fix: [{ t0: 3, t1: 3.5, kind: "n" }] } }) };
const L = JSON.parse(JSON.stringify(A.uvList(cv, st)));
assert.deepStrictEqual(L, [[1, 1.2, "s", false], [3, 3.5, "n", true]], "선생님 이름표가 우선 · 이상한 값은 버림");
let saved = null; const st2 = { advGet: () => ({}), onAdv: (ne) => { saved = ne; } };
assert.strictEqual(A.relabel(st2, cv, [1, 1.2, "s"]), "b"); assert.strictEqual(A.relabel(st2, cv, [1, 1.2, "b"]), "n"); assert.strictEqual(A.relabel(st2, cv, [1, 1.2, "n"]), "s");
assert.deepStrictEqual(JSON.parse(JSON.stringify(st2._adv.ne.global.uv_fix)), [{ t0: 1, t1: 1.2, kind: "s" }], "같은 자리는 하나만");
const tj = fs.readFileSync(__dirname + "/../tune.js", "utf8"), th = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(tj.includes("st.advOn && G.TuneAdv && cv.uv") && !tj.includes('mk("advUvB"') && tj.includes("G.TuneAdv.uvSheet(") && tj.includes("data-uv") && tj.includes("const uvOn = !!(st.advOn && st.onAdv"), "고급 보정에서만 빗금 · 도구 = 여러 음 고르기 창의 🌬(버튼 따로 없음)");
assert.ok(th.includes('for (const k of ["uv_fix", "uv_gain"])') && th.includes("global: uvT(ne.global || {}, toA)") && th.includes("g = uvT(ne.global || {}, toO)"), "화면 시간 ↔ 원래 시간");
console.log("adv-uv ok");
