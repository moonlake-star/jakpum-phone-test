// (11/04 17:27·17:41 사용자) 고급 보정 모드(원장 + 원장이 허용한 강사) — 음정선 미리보기는 서버 note_edits.shape_pitch와 같은 값
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const src = fs.readFileSync(__dirname + "/../adv.js", "utf8");
const ctx = { document: { createElement: () => ({ style: {} }), head: { appendChild() {} } }, JSON, Math, Object, Array, String, Number, Float64Array, Uint8Array, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const A = ctx.TuneAdv; assert.ok(A && A._t);
// ① 서버와 같은 곡선(같은 입력 → 0.01센트 안)
const ref = JSON.parse(fs.readFileSync(__dirname + "/adv-parity.json", "utf8"));
const js = A._t.shapeNote(ref.n, ref.t, ref.c);
const md = Math.max(...js.map((v, i) => Math.abs(v - ref.out[i])));
assert.ok(md < 0.01, "서버와 다름: " + md);
// ② 기본값과 같은 칸은 저장 안 함
const S = { ne: { notes: [{ t0: 1, t1: 2, drift: 1, vib: 1, gain_db: 0 }, { t0: 3, t1: 4, tr_shape: "lin" }, { t0: 5, t1: 6, gain_db: -3 }], global: { ref_hz: 440, strength: 1, level: { quiet: 0, loud: 0 } } } };
A._t.clean(S); assert.deepStrictEqual(JSON.parse(JSON.stringify(S.ne)), { notes: [{ t0: 5, t1: 6, gain_db: -3 }], global: {} });
// ③ MIDI: 정음 덩어리 → 음, 표준 파일 머리
const cv = { levels: [3], target: true, pts: [] }; for (let i = 0; i < 100; i++) cv.pts.push([i / 50, 0, 0, i < 50 ? 6900 : 7200]);
const ns = A._t.notesFromCurve(cv); assert.strictEqual(JSON.stringify(ns.map(n => n.m)), "[69,72]");
const mb = A._t.midiBytes(ns); assert.strictEqual(String.fromCharCode(...mb.slice(0, 4)), "MThd"); assert.strictEqual(String.fromCharCode(...mb.slice(14, 18)), "MTrk");
// ④ 연결: tune.js는 onAdv가 있을 때만 버튼·'🎛 고급' 칸, 기본은 꺼짐(기본 보정 모드)
const tu = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(tu.includes('st.onAdv = typeof o.onAdv === "function" && G.TuneAdv ? o.onAdv : null;') && tu.includes("st.advOn = false;"));
assert.ok(tu.includes('${st && st.onAdv && st.advOn ? `<button type="button" data-md="a">🎛 고급</button>` : ""}'));
assert.ok(!/\/\/[^\n]*d\.querySelectorAll\("\[data-md\]"\)\.forEach\(x => \{ const on/.test(tu), "모드 바꾸는 코드가 주석에 묻히지 않음");
// ⑤ 선생님 앱: 원장 + 허용한 강사만, 원래 녹음 시간으로 저장, 강사 설정에 adv_mode
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("const canAdv = () => !isStaffApp() || !!cfg?.adv_mode;") && T.includes("...(canAdv() ? { onAdv, advGet } : {})"));
assert.ok(T.includes("adv_mode: !!s.adv,") && T.includes("function paintAdvPerm()") && T.includes('<script src="../adv.js?v='));
assert.ok(T.includes("t0: r4(toO(n.t0)), t1: r4(toO(n.t1))") && T.includes("r.note_edits = { notes, global: g }"));
console.log("adv-mode ok", md.toFixed(4));
// (11/05 00:06 사용자) 고급 보정을 켜도 음표를 누르면 🎵 음정(기본: 위아래·나누기)부터
{ const tj = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  require("assert").ok(tj.includes('setMd(tMode ? "t" : "p")') && !tj.includes('st.advOn = true; st.fixMode = "a"'), "고급 켜도 기본 탭부터"); }
// (11/05 00:14) 오늘의 베스트 전체화면 → ✏️ 음표 고치기(메이크업 화면 전체화면으로)
{ const fs_ = require("fs"), tj = fs_.readFileSync(__dirname + "/../tune.js", "utf8"), th = fs_.readFileSync(__dirname + "/../teacher/index.html", "utf8"), A = require("assert");
  A.ok(tj.includes("el._openFull = () =>") && tj.includes('"✏️ 음표 고치기"') && tj.includes('typeof o.onFix !== "function" && typeof o.onEdit === "function"'));
  A.ok(th.includes("onEdit: (t) => { try { player.pause(); } catch {} editFromBest(job, t); }") && th.includes("async function editFromBest(job, t)")); }
