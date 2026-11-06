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
assert.ok(H.includes("const mkWrite = async () => { mkBusy++;") && !/onTime = async[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*writeJSON\(j\.folder\.id, MKREQ/.test(H));
console.log("exit card wiring ok");
// (11/06 17:37 사용자) 빈 곳 톡으로 재생이 시작되면 고른 음표 선택 해제
assert.ok(T.includes("const wasP = isPaused(); toggle(); lastTap = now;") && T.includes("st.sel = null; st.msel = null; } } }"));
console.log("deselect on play ok");
// (11/06 17:59 사용자) 화살표 꾹 = 진동 · 늘렸다 처음 자리로 돌아오면 진동(살짝 붙음)
assert.ok(T.includes('st.onBarDragX(0, ed, true); if (e.pointerType !== "mouse") { buzz(40);') && T.includes("if (home && !st._tbHome && st._tbAway) { buzz(30);") && T.includes("st._tbHome = true; st._tbAway = false; return; }"));
console.log("arrow buzz ok");
