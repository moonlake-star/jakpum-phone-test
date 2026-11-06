// (11/06 17:13 사용자) 전체화면 닫았다 다시 열어도 되돌리기 기록 유지 · 나올 때 고친 내용 카드
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const a = T.indexOf("  function mkHist("), b = T.indexOf("  function openFull(");
const store = {}; const ls = { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
const perf = { now: (() => { let t = 0; return () => (t += 1000); })() };
const M = new Function("noteName", "performance", "localStorage", T.slice(a, b) + "; return { mkHist, histCount, histLoad };")((m) => "N" + m, perf, ls);
// 1) 기록 → 닫기(디스크 저장) → 다시 열기 = 이어 씀
let state = JSON.stringify({ fx: [], te: [], ne: null });
const o = { histKey: "mk:1", histGet: () => state, histSet: async (s) => { state = s; }, onFix: (f) => { state = JSON.stringify({ fx: [f], te: [], ne: null }); } };
let h = M.mkHist(o, () => {}); h.o.onFix({ t0: 1, t1: 2, midi: 60 }); h.o.onFix({ t0: 1, t1: 2, midi: 62 });
assert.strictEqual(h.S.length, 3); h.keep(true);
assert.ok(store.tune_hist_v1 && JSON.parse(store.tune_hist_v1)["mk:1"].S.length === 3, "기기에 보관");
let h2 = M.mkHist(o, () => {}); assert.strictEqual(h2.S.length, 3, "다시 열면 이어 씀"); assert.strictEqual(h2.ptr, 2); assert.ok(h2.canU());
assert.strictEqual(h2.base, state, "카드 비교 기준 = 이번에 열 때");
// 2) 다른 곳에서 고침이 바뀌었으면 새로 시작
state = JSON.stringify({ fx: [{ t0: 5, t1: 6, midi: 50 }], te: [], ne: null });
const h3 = M.mkHist(o, () => {}); assert.strictEqual(h3.S.length, 1, "상태가 다르면 새 기록");
// 3) 다른 곡 키 = 따로
const h4 = M.mkHist({ ...o, histKey: "mk:2" }, () => {}); assert.strictEqual(h4.S.length, 1);
// 4) 50단계까지만
const o5 = { ...o, histKey: "mk:5" }; const h5 = M.mkHist(o5, () => {}); for (let i = 0; i < 70; i++) h5.o.onFix({ t0: 1, t1: 2, midi: 40 + i }); h5.keep(true);
assert.strictEqual(JSON.parse(store.tune_hist_v1)["mk:5"].S.length, 50, "50단계");
// 5) 고친 곳 세기
const base = JSON.stringify({ fx: [{ t0: 1, t1: 2, midi: 60 }], te: [], ne: null });
const now = JSON.stringify({ fx: [{ t0: 1, t1: 2, midi: 61 }, { t0: 3, t1: 4, midi: 62 }], te: [{ t0: 5, t1: 6, nt0: 5.1, nt1: 6 }], ne: { notes: [{ t0: 7, t1: 8, vib: 1 }], global: { draw: [{ t0: 9, t1: 10, pts: [] }], uv_fix: [{ t0: 11, t1: 12 }] } } });
assert.deepStrictEqual(M.histCount(base, now), { fx: 2, te: 1, det: 2, pen: 1 });
assert.deepStrictEqual(M.histCount(base, base), { fx: 0, te: 0, det: 0, pen: 0 });
console.log("hist keep ok");
// 6) 카드 · 선생님 화면 연결
assert.ok(T.includes('exitCard(o, hist); try {') && T.includes("if (!n && !ss().fail) return;") && T.includes("저장 못 한 고침이 있어요") && T.includes("완성본 다시 만들기</button>"));
assert.ok(T.includes('document.addEventListener("visibilitychange", hidKeep)'));
assert.ok(H.includes('histKey: "mk:" + (j.reqId || j.folder.id), saveState: () => ({ busy: mkBusy, fail: mkFail })') && H.includes("remake: () => $(\"mkFinal\")?.click()"));
assert.ok(H.includes("const mkWrite = () => { mkBusy++;") && !/onTime = async[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*writeJSON\(j\.folder\.id, MKREQ/.test(H));
console.log("exit card wiring ok");
// (11/06 17:37 사용자) 빈 곳 톡으로 재생이 시작되면 고른 음표 선택 해제
assert.ok(T.includes("const wasP = isPaused(); toggle(); lastTap = now;") && T.includes("st.sel = null; st.msel = null; } } }"));
console.log("deselect on play ok");
// (11/06 17:59 사용자) 화살표 꾹 = 진동 · 늘렸다 처음 자리로 돌아오면 진동(살짝 붙음)
assert.ok(T.includes('st.onBarDragX(0, ed, true); if (e.pointerType !== "mouse") { buzz(50);') && T.includes("if (home && !st._tbHome && st._tbAway) { buzz(40);") && T.includes("st._tbHome = true; st._tbAway = false; return; }"));
console.log("arrow buzz ok");
// (11/06 18:02 사용자) ↶↷ 누르면 바로(저장 안 기다림) · 소리 없이 고름 · 저장은 한 줄로
assert.ok(T.includes("if (!(st && st._quiet)) { try { sndFor(m, 1000); } catch {} }") && T.includes("st._quiet = true;") && !T.includes("try { await o.histSet(H.S[i]); }"));
assert.ok(H.includes("mkQ = p.catch(() => {});"));
console.log("undo fast ok");
// (11/06 18:13 사용자) 세로 버튼 줄 좌우 끝 맞춤 · 폰 가로에서 안내 글 숨김(음정선 안 밀리게)
assert.ok(T.includes("#tuneFs .port .tfAbRow{width:100%;justify-content:space-between}") && T.includes("#tuneFs .port .tfNav button{flex:1;min-width:0!important}") && T.includes("@media (max-height:560px){#tuneFs .tfBox:not(.port) .tfHint"));
console.log("align ok");
// (11/06 18:21·18:24 사용자) −/+ → 끌어서 조절하는 칸 · 흐름 1줄 · 이어짐 1줄 · 두 번 톡 = 원래 값
{ const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
  assert.ok(A.includes("function scrub(label, get, set, o, inLabel, en)") && A.includes("if (now - lastTap < 320) { lastTap = 0; put(o.def); vib(40); return; }") && A.includes("vib(home ? 40 : 15)"));
  assert.ok(A.includes("rows.push(cells(tl, trC));") && !A.includes('"계단"'));
  console.log("scrub ok"); }
// (11/06 18:36 사용자) 비브라토 3칸×2줄 · 볼륨 1줄 · 눈금 낮게·이름 크게·숫자 작게
{ const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
  assert.ok(A.includes('"원래 떨림"), lab(') && A.includes('"페이드 아웃"))') && A.includes(".advScT{height:3px!important"));
  // (11/06 19:25 사용자 고고) 흐름 = 음 전체 기울기(tilt) · 세로 칸(▴▾·세로 눈금) · 칸 뒤 선 그림 · 이름 주황 · 바꾼 칸 테두리 빛
  assert.ok(A.includes('stepper("흐름", () => get("tilt"), (v) => put("tilt", v)') && A.includes("vert: true") && A.includes("if (n.tilt && dur > 0) v += n.tilt * ((tt[i] - tt[0]) / dur - 0.5);"));
  assert.ok(A.includes("const ICO = {") && A.includes('"커지는 시간": "fade"') && A.includes(".advCells .advSc .advScL{color:#ffbe7a!important}"));
  assert.ok(H.includes('const PV_ADV_P = ["drift", "vib", "vs", "tilt", "tilt_in"'));
  console.log("scrub vib/vol ok"); }
// (11/06 19:36 사용자) 터치 끌기: 칸은 touch-action:none(전체화면 규칙보다 우선) · 처음 움직인 방향 하나만
{ const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
  assert.ok(A.includes("#tuneFs .advSc,#tuneFs .advSc *,.advSc,.advSc *{touch-action:none!important}") && A.includes('const dd = d.ax === "v" ? dy_ : d.ax === "h" ? dx_ : 0;'));
  console.log("touch drag ok"); }
// (11/06 19:59 사용자 B) 핀치: 어느 방향이든 위아래·좌우 같은 비율(최대 8배씩)
assert.ok(T.includes("st.yz = Math.max(1, Math.min(8, pinch.yz * r ** pinch.ep)); st.xz = Math.max(1, Math.min(8, pinch.xz * r ** pinch.et));") && T.includes("et: 0.5 + 0.5 * h_, ep: 1 - 0.5 * h_") && !T.includes("pinch.ax"));   // (20:07) A·B 절충
console.log("pinch uniform ok");
// (11/06 21:47~21:51 사용자) 고르지 않은 음 꾹 = 고르며 미세 + 진동 · 옮길 때 화면 안 따라감·눈금 고정 · 하늘색 선 같이 움직임
assert.ok(T.includes("음표 위 꾹은 여러 음 고르기보다 이것이 먼저") && T.includes("&& !st.sel && !st.dragging && !st.msel) {") && T.includes("function syncCorr(cv)") && T.includes("drag.cpp = st.kb.inv(drag.y0) - st.kb.inv(drag.y0 + 1)"));
console.log("long-press fine / view / blue ok");
// (11/06 21:53 사용자) 칸을 누르면 아래 안내 줄 = 그 칸 설명
{ const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
  assert.ok(A.includes('"커지는 시간": "떨림이 시작돼 다 커질 때까지') && A.includes('tp.classList.add("desc")') && A.includes("칸을 누르면 여기에 그 칸 설명이 나와요"));
  console.log("cell desc ok"); }
// (11/06 21:59 사용자) 반음 옮김 진동 · 미세 5센트마다 짧게 · 빈 곳 꾹 구간 고르기 시작 진동
assert.ok(T.includes("if (Math.abs(nm_ - m) > 0.5) buzz(20); else if (Math.floor(nm_ * 20 + 1e-6) !== Math.floor(m * 20 + 1e-6)) buzz(10);") && T.includes("armTip(true); buzz(40); return; }"));
console.log("move buzz ok");
// (11/06 22:02 사용자) 꾹 켜짐 표시 크게(채운 원 + 두 겹 고리, 0.7초)
assert.ok(T.includes("performance.now() - st.pulse.at < 700") && T.includes("20 + 70 * e_"));
console.log("pulse ok");
// (11/06 22:09 사용자) 초록 더 진하게 · 📳 진동 시험 · 진동 최소 20ms
{ const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
  assert.ok(T.includes('scale: "rgba(127,217,154,.46)"') && T.includes("navigator.vibrate(Math.max(20, ms || 25))") && A.includes('data-g="vib">📳 진동 시험') && A.includes("navigator.vibrate(Math.max(20, ms))"));
  console.log("green / vib test ok"); }
// (11/06 22:18 사용자) 여러 음 고르기는 빈 곳 꾹에서만(음표 위 꾹은 안 함)
assert.ok(T.includes("if (st.kb && (hitT(l0) || hitBar(l0))) return;   // (11/06 22:18 사용자)"));
console.log("msel empty only ok");
