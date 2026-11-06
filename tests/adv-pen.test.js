// (11/06 사용자 '고급 보정 다음 단계') 큰 손잡이 · 음계 격자 · 두 번 톡 맞춤 · 펜으로 그리기
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const ctx = { window: {}, document: { createElement: () => ({ style: {} }), head: { appendChild() {} }, getElementById: () => null }, console, setTimeout: () => 0, clearTimeout: () => {} };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(__dirname + "/../adv.js", "utf8").replace("typeof window !== \"undefined\" ? window : globalThis", "globalThis"), ctx);
const A = ctx.TuneAdv, J = (x) => JSON.parse(JSON.stringify(x));
// 펜 선 다듬기: 10ms 간격·시간 순서·너무 짧으면 버림
const d = J(A.cleanStroke([[1.0, 6000], [1.2, 6200], [1.1, 6100], [1.3, 6300]]));
assert.strictEqual(d.t0, 1); assert.strictEqual(d.t1, 1.3); assert.strictEqual(d.pts.length, 31); assert.ok(Math.abs(d.pts[15][1] - 6150) < 20);
assert.strictEqual(A.cleanStroke([[1, 6000], [1.02, 6000], [1.03, 6000]]), null, "0.05초 미만");
// 미리보기 = 서버 규칙(가운데는 그린 선, 밖은 그대로)
const cv = { levels: [1, 2], target: true, pts: [] }; for (let t = 0; t < 2; t += 0.04) cv.pts.push([+t.toFixed(2), 6000, 6000, 6000, 6000]);
let saved = null; const st = { advGet: () => ({}), onAdv: (ne) => { saved = ne; } };
A.addDraw(st, cv, [[0.5, 6200], [1.0, 6300], [1.5, 6400]]);
const k = 3, at = (t) => cv.pts.find(p => Math.abs(p[0] - t) < 0.001)[k];
assert.ok(Math.abs(at(1) - 6300) < 15, "그린 대로"); assert.strictEqual(at(0.2), 6000, "밖은 그대로");
assert.strictEqual(st._adv.ne.global.draw.length, 1);
A.addDraw(st, cv, [[0.8, 6100], [1.2, 6100], [1.3, 6100]]); assert.strictEqual(st._adv.ne.global.draw.length, 1, "겹친 선은 새 선으로 바꿈");
const hit = A.drawAt(st, 1.0); assert.ok(hit); A.removeDraw(st, cv, hit); assert.ok(!st._adv.ne.global.draw, "다 지우면 칸도 지움");
assert.strictEqual(at(1), 6000, "지우면 원래 선");
A.flatNote(st, cv, { t0: 0.2, t1: 0.6 }); assert.strictEqual(st._adv.ne.notes[0].drift, 0, "두 번 톡: 흐름 평평");
// tune.js·선생님 앱 연결
const tj = fs.readFileSync(__dirname + "/../tune.js", "utf8"), th = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(tj.includes("full && st && st.advOn && sc && ins") && tj.includes("const HANDLE_R = 15") && tj.includes("st.hdl = { k:") && tj.includes('mk("advPenB"'));
assert.ok(tj.includes('e.pointerType === "pen" || e.pointerType === "mouse" || !st.penSeen'), "펜을 쓰면 손가락은 이동만");
assert.ok(tj.includes("st.advOn && st.snapSel && !d.hdl && Date.now() - (st._bt || 0) < 350"));
assert.ok(th.includes("if (Array.isArray(o.draw)) o.draw = o.draw.map(") && th.includes("((mkPv.advG || {}).draw || [])"), "시간 바꿔 저장 + 미리듣기");
console.log("adv-pen ok");
// (11/06 15:32 사용자) 음을 고른 채 확인↔보정 바꾸면 그 음 고치기 창이 새 모드로 바로
{ const t2 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  require("assert").ok(t2.includes("st._selBar = b;") && t2.includes("if (keep) { try { fixSheet(wrap, cv, keep, o.onFix, getT, st);"), "모드 바꿔도 고른 음 창 유지"); }
