// (11/03 13:08 사용자 승인) 타이밍·길이 고치기: 앱 시간표가 서버(app/jakpum/timing.py)와 같은 값 · 폰 미리듣기가 음을 실제로 옮김(높이 그대로) · 고친 게 없으면 소리 그대로
const fs = require("fs"), assert = require("assert");
require("../tune.js"); const T = globalThis.Tune;
// 서버 시험 test_tmap_vector_for_app_parity 와 같은 예시·같은 답
assert.deepStrictEqual(T.tmapOf([{ t0: 1, t1: 2, nt0: 1.2, nt1: 2.5 }, { t0: 2.6, t1: 3, nt0: 2.7, nt1: 3 }], 10),
  [[0, 0], [0.25, 0.25], [1, 1.2], [2, 2.5], [2.6, 2.7], [3, 3], [3.4, 3.4], [10, 10]]);
// 많이 옮기면 창이 넓어짐(서버 test_big_move_widens_window)
{ const tm = T.tmapOf([{ t0: 2, t1: 3, nt0: 2.6, nt1: 4.6 }], 20); assert.deepStrictEqual(tm, [[0, 0], [2, 2.6], [3, 4.6], [7, 7], [20, 20]]); }
// 말이 안 되는 고침은 버림(서버와 같게)
assert.deepStrictEqual(T.tmapOf([{ t0: 1, t1: 2, nt0: 1.5, nt1: 1.51 }], 10), [[0, 0], [10, 10]]);
assert.deepStrictEqual(T.tmapOf([], 10), [[0, 0], [10, 10]]);
// 오가는 변환
{ const tm = T.tmapOf([{ t0: 1, t1: 2, nt0: 1.2, nt1: 2.2 }], 10); for (const t of [0.3, 1, 1.5, 2, 5]) assert.ok(Math.abs(T.mapT(T.mapT(t, tm), tm, true) - t) < 1e-9); assert.strictEqual(T.mapT(3, null), 3); }

const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.slice(src.indexOf("let mkPv = {"), src.indexOf("function mkStop() {"));
const ctx = { mkTracks: {} };
const f = new Function("ctx", "let mkTracks = ctx.mkTracks, mkPlaying = false, mkDurS = 0, mkCtx = null; const mkNow = () => 0, mkPlay = () => {};\n" + code + "\nreturn { pvWarp, pvMarks, pvPsola, pvApply, pvApplyAll, pvTimePlan, get mkPv() { return mkPv; }, set mkPv(v) { mkPv = v; }, setDur(d) { mkDurS = d; } };")(ctx);
const sr = 24000;
const saw = (hz, len) => { const x = new Float32Array(len); for (let i = 0; i < len; i++) { let v = 0; for (let h = 1; h <= 8; h++) v += Math.sin(2 * Math.PI * hz * h * i / sr) / h; x[i] = 0.3 * v; } return x; };
// ① 그대로(Dk = k)면 원래 소리와 거의 같음
{ const n = sr, x = saw(200, n), y = f.pvWarp(x, sr, new Float32Array(n).fill(200), (k) => k); let e = 0, p = 0; for (let i = 2400; i < n - 2400; i++) { e += (y[i] - x[i]) ** 2; p += x[i] ** 2; } assert.ok(e / p < 0.01, "그대로면 같은 소리 " + e / p); }
// ② 트랙 전체: 1~2초 음을 0.2초 늦게 → 소리 시작이 1.2초 근처로, 길이 그대로, 높이 그대로
{ const n = 4 * sr, x = new Float32Array(n), s = saw(220, sr); x.set(s, sr);
  const mkBuf = (a) => ({ sampleRate: sr, length: a.length, numberOfChannels: 1, duration: a.length / sr, getChannelData: () => a });
  const pts = []; for (let k = 0; k < 100; k++) { const t = k / 25; pts.push([t, t >= 1 && t < 2 ? 5700 : null, t >= 1 && t < 2 ? 5700 : null, t >= 1 && t < 2 ? 5700 : null]); }
  const cv = { fps: 25, pts, levels: [3], v: 2 }; const p0 = x.slice(), p3 = x.slice();
  ctx.mkTracks.p0 = { buf: mkBuf(p0) }; ctx.mkTracks.p3 = { buf: mkBuf(p3) }; ctx.mkTracks.mr = { buf: mkBuf(new Float32Array(n)) };
  f.setDur(4); f.mkPv = { fixes: [], rendered: () => null, orig: {}, cv, tedits: [{ t0: 1, t1: 2, nt0: 1.2, nt1: 2.2 }], tplan: null };
  assert.ok(f.pvApplyAll(), "바뀜");
  const env = (a, i) => { let s_ = 0; for (let k = i - 120; k < i + 120; k++) s_ += Math.abs(a[k] || 0); return s_ / 240; };
  const on = (a) => { for (let i = 200; i < n; i += 24) if (env(a, i) > 0.05) return i / sr; };
  assert.ok(Math.abs(on(p0) - 1.2) < 0.03 && Math.abs(on(p3) - 1.2) < 0.03, "옮겨짐 " + on(p0));
  assert.strictEqual(p0.length, n);
  { let c = 0, prev = 0; const a = Math.round(1.5 * sr), b = Math.round(2.0 * sr); for (let i = a; i < b; i++) { const v = p0[i]; if (prev < 0 && v >= 0) c++; prev = v; } assert.ok(Math.abs(c / 0.5 - 220) < 8, "높이 그대로 " + c / 0.5); }
  // 고침을 지우면 원래 소리로 돌아감
  f.mkPv.tedits = []; f.pvApplyAll(); let e = 0; for (let i = 0; i < n; i++) e += Math.abs(p0[i] - x[i]); assert.ok(e < 1e-6, "되돌림");
  // 반주(mr)는 손대지 않음
  assert.ok(!("mr" in f.mkPv.orig) || f.mkPv.orig.mr.regs.length === 0);
}
// ③ 화면·저장 연결
assert.ok(src.includes("onFix, onTime, onResetRange:") && src.includes("cur.push({ t0: o0, t1: o1, nt0: n0, nt1: n1 })") && src.includes("const x = pvSrc(src, 0, i0, i0 + n)"));
const tj = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(tj.includes('data-md="t">⏱ 타이밍') && tj.includes("st.onBarDragX = (dt, edge, start)") && tj.includes("hb = hitT(le) || hitBar(le);"));
console.log("time-edits ok");
