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
assert.ok(tj.includes("full && st && st.advOn && sc && ins") && tj.includes("const HANDLE_R = 15") && tj.includes("st.hdl = { l:") && tj.includes('mk("advPenB"'));
assert.ok(tj.includes('e.pointerType === "pen" || e.pointerType === "mouse" || !st.penSeen'), "펜을 쓰면 손가락은 이동만");
assert.ok(tj.includes("st.advOn && st.snapSel && !d.hdl && Date.now() - (st._bt || 0) < 350"));
assert.ok(th.includes("if (Array.isArray(o.draw)) o.draw = o.draw.map(") && th.includes("((mkPv.advG || {}).draw || [])"), "시간 바꿔 저장 + 미리듣기");
console.log("adv-pen ok");
// (11/06 15:32 사용자) 음을 고른 채 확인↔보정 바꾸면 그 음 고치기 창이 새 모드로 바로
{ const t2 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  require("assert").ok(t2.includes("st._selBar = b;") && t2.includes("if (keep) { try { fixSheet(wrap, cv, keep, o.onFix, getT, st);"), "모드 바꿔도 고른 음 창 유지"); }
// (11/06 16:02 사용자) 끄는 동안 저장 안 함 — 손 뗄 때 한 번(제자리면 기록 없음)
{ const t3 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), A_ = require("assert");
  A_.ok(t3.includes("st.onBarDragEnd = () => { if (st._dragBase != null && Math.abs(m - st._dragBase) > 0.004) persist();") && t3.includes("st.onBarDragXEnd = () =>"));
  A_.ok(!/st\.onBarDrag = \(k, start\) => \{[^\n]*persist\(\)/.test(t3), "끄는 중엔 저장 안 함"); }
// (11/06) 🥁 박자 격자·박자 맞춤(스마트 어택)
{ const t4 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), A_ = require("assert");
  const beatNear = new Function(t4.match(/const beatNear = [^\n]*\n/)[0] + "return beatNear;")();
  A_.strictEqual(beatNear({ beats: { t: [0.35, 1.05, 1.75, 2.45] } }, 1.5), 1.75); A_.strictEqual(beatNear({ beats: { t: [0.35, 1.05] } }, 0.6), 0.35); A_.strictEqual(beatNear({}, 1), null);
  A_.ok(t4.includes("if (st.beatOn && edge !== \"r\") { const bt = beatNear(cv, n0); if (bt != null && Math.abs(bt - n0) <= BEAT_SNAP)") && t4.includes('mk("advBeatB"') && t4.includes("st.advOn && cv.beats && cv.beats.t")); }
// (11/06 16:13·16:20 사용자) 음 가운데: 바로 위아래 = 반음, 좌우 = 자리, 꾹 = 미세 · 양 끝 화살표는 꾹 눌러야 길이 · 건반 꾹 진동 없음
{ const t5 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), A_ = require("assert");
  A_.ok(t5.includes("const LONG_MS = 600, FINE = 0.25;") && t5.includes("drag.fine ? Math.round(c * FINE * 100) / 100 : Math.round(c)"), "반음/미세");
  A_.ok(!t5.includes('st.onBarDragX(0, "c", true)') && t5.includes('drag.selBody = false; drag.mode = "time"') && t5.includes("if (!drag.hArmed) { if (Math.hypot(l0.x - drag.x0, l0.y - drag.y0) > 8)"), "(11/06 17:03) 음 좌우 옮기기 뺌 — 좌우는 화면 이동, 화살표는 꾹 눌러야");
  A_.ok(!t5.includes('"↕", "#9cc3ff"'), "↕ 동그라미 없앰");
  A_.ok(t5.includes('cvEl.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false })'), "꾹 눌러도 폰 진동 없게"); }
// (11/06 16:36 사용자) 손짓 안내(두 번 써 보면 사라짐) · 처음 보정 모드 안내 · 꾹 0.6초 진동
{ const t6 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), a6 = require("fs").readFileSync(__dirname + "/../adv.js", "utf8"), A_ = require("assert");
  A_.ok(t6.includes('const LEARN_KEY = "tune_learn_v1", LEARN_N = 2;') && t6.includes('learn(d.fine ? "fine" : "v")') && t6.includes('learn("dbl")') && t6.includes('learn("arr")'));
  A_.ok((t6.match(/buzz\((25|40|50)\); st\.pulse = /g) || []).length >= 2, "꾹 켜질 때 진동 + 동그라미");
  A_.ok(t6.includes("const advGuide = (force) =>") && a6.includes('data-g="guide"'), "처음 안내 + 다시 보기"); }
// (11/06) 고급 보정 ② 보정 엔진 선택·A/B(고른 뒤에야 어느 엔진인지 알려 줌)
{ const a7 = require("fs").readFileSync(__dirname + "/../adv.js", "utf8"), t7 = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8"), A_ = require("assert");
  A_.ok(a7.includes("function engineBox(st)") && a7.includes('data-ew="A"') && a7.includes("{ engine: en, engine_pick: k }") && a7.includes("${pick ? `"), "A/B 고르면 엔진으로");
  A_.ok(t7.includes('engFid("엔진비교_A.mp3")') && t7.includes('if (!r.engine || r.engine === "psola") delete r.engine;')); }
// (11/06) 고급 보정 ③ 마우스 모드: 휠 이동·Ctrl+휠 확대·빈 곳 끌기 = 여러 음·우클릭 메뉴·Alt 미세·키보드
{ const t8 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), A_ = require("assert");
  A_.ok(t8.includes('cvEl.addEventListener("wheel"') && t8.includes("if (e.ctrlKey || e.metaKey) { st.xz = ") && t8.includes("armed: { x: l0.x, t: tt, mouse: true }"));
  A_.ok(t8.includes('mn.className = "tfCtx"') && t8.includes('if (e.pointerType === "mouse" && e.altKey) d0.fine = true;') && t8.includes('if (e.pointerType === "mouse") armH();'));
  A_.ok(t8.includes('document.addEventListener("keydown", st.onKey)') && t8.includes('document.removeEventListener("keydown", st.onKey)'), "키보드 — 닫으면 정리"); }
// (11/06 17:03 사용자) 되돌리기·다시하기 = 바뀐 음을 골라 보여 줌(여러 음이면 여러 음 고르기)
{ const t9 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), A_ = require("assert");
  const histDiff = new Function(t9.match(/const histDiff = [\s\S]*?return m_; \};\n/)[0] + "return histDiff;")();
  const J = (o) => JSON.stringify(o);
  A_.deepStrictEqual(histDiff({ fx: [J({ t0: 1, t1: 2, midi: 60 })], te: [], ne: [] }, { fx: [J({ t0: 1, t1: 2, midi: 61 })], te: [], ne: [] }), [[1, 2]], "한 음");
  A_.deepStrictEqual(histDiff({ fx: [], te: [], ne: [] }, { fx: [J({ t0: 1, t1: 2, midi: 60 }), J({ t0: 5, t1: 6, midi: 62 })], te: [], ne: [] }), [[1, 2], [5, 6]], "여러 음");
  A_.ok(t9.includes("selectChanged(histDiff(snap0, histSnap()))") && !t9.includes("st.msel = [a, b]; try { multiSheet(wrap, cv, st, false, true);") /* 11/10: 여러 음 되돌리기는 창 안 띄움 */); }
