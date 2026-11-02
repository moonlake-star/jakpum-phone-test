// (11/02 17:09·17:39 사용자) 고친 정음 폰 미리듣기 — 완성본과 같은 원리(PSOLA), 보정본은 보정 전 보컬에서 한 번에
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.slice(src.indexOf("let mkPv = {"), src.indexOf("function mkStop() {"));
const ctx = { mkTracks: {} };
const f = new Function("ctx", "let mkTracks = ctx.mkTracks, mkPlaying = false; const mkNow = () => 0, mkPlay = () => {};\n" + code + "\nreturn { pvPsola, pvApply, pvRatio, get mkPv() { return mkPv; }, set mkPv(v) { mkPv = v; } };")(ctx);
const sr = 48000, n = sr;
// 성대 소리 비슷한 파형(배음 많은 톱니) — 음색(포먼트) 보존 확인용
const saw = (hz, len) => { const x = new Float32Array(len); for (let i = 0; i < len; i++) { let v = 0; for (let h = 1; h <= 12; h++) v += Math.sin(2 * Math.PI * hz * h * i / sr) / h; x[i] = 0.3 * v; } return x; };
const zc = (a, s, e) => { let c = 0, prev = 0; for (let i = s + 1; i < e; i++) { const v = a[i] - 0.0; if (prev < 0 && v >= 0) c++; prev = v; } return c / ((e - s) / sr); };
const lp = (a) => { const o = new Float32Array(a.length); let y = 0; for (let i = 0; i < a.length; i++) { y += 0.04 * (a[i] - y); o[i] = y; } return o; };   // 기본음만 보이게
// ① 사인파 2반음 올림: 길이 그대로, 높이 맞음
{ const x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * 220 * i / sr);
  const y = f.pvPsola(x, sr, new Float32Array(n).fill(220), 2 ** (2 / 12));
  assert.strictEqual(y.length, n); const fr = zc(y, 4800, 43200); assert.ok(Math.abs(fr - 246.94) < 3, "2반음 올라감: " + fr); }
// ② 톱니파: 기본음만 올라가고 길이 그대로
{ const x = saw(200, n), y = f.pvPsola(x, sr, new Float32Array(n).fill(200), 2 ** (1 / 12)); const fr = zc(lp(y), 4800, 43200);
  assert.ok(Math.abs(fr - 211.9) < 4, "반음 올라감(톱니): " + fr); }
// ③ 비율 1 = 거의 그대로
{ const x = saw(180, n), y = f.pvPsola(x, sr, new Float32Array(n).fill(180), 1); let e = 0, p = 0; for (let i = 4800; i < 43200; i++) { e += (y[i] - x[i]) ** 2; p += x[i] ** 2; }
  assert.ok(e / p < 0.05, "비율 1은 원래 소리와 거의 같음: " + (e / p).toFixed(3)); }
// ④ 트랙 반영: 보정본(p3)은 보정 전(p0)에서 정음까지 한 번에, 구간 밖은 그대로, 고침 지우면 원래
const p0 = saw(220, n), p3 = new Float32Array(saw(220, n));
const mono = (a) => ({ sampleRate: sr, length: n, numberOfChannels: 1, getChannelData: () => a });
ctx.mkTracks.p0 = { buf: mono(p0) }; ctx.mkTracks.p3 = { buf: mono(p3) };
const pts = []; for (let k = 0; k < 25; k++) pts.push([k / 25, 5700, 5700]);   // A3(220Hz) = 5700센트, 열: [t, 원음, 강]
const cv = { fps: 25, levels: [3], pts };
f.mkPv = { fixes: [{ t0: 0.2, t1: 0.8, midi: 59 }], rendered: () => 57, orig: {}, cv };
assert.ok(f.pvApply("p3")); assert.ok(!f.pvApply("p0"), "보정 끔 트랙은 그대로");
assert.ok(Math.abs(zc(lp(p3), 0.35 * sr, 0.65 * sr) - 246.94) < 5, "그 구간만 B3로");
assert.ok(Math.abs(zc(lp(p3), 0.84 * sr, n - 1) - 220) < 6, "구간 밖은 그대로");
f.mkPv.fixes = []; assert.ok(f.pvApply("p3")); assert.ok(Math.abs(zc(lp(p3), 0.35 * sr, 0.65 * sr) - 220) < 4, "고침을 지우면 원래 소리");
// ⑤ 서버와 같은 규칙: 8센트 안쪽 그대로, 최대 ±2반음
{ const c2 = { fps: 25, pts: [[0, 5705], [0.04, 5705]], _pvb: null }; const r = f.pvRatio(c2, 57, sr, 0, 100); assert.strictEqual(r[50], 1);
  const c3 = { fps: 25, pts: [[0, 5000], [0.04, 5000]] }; assert.ok(Math.abs(f.pvRatio(c3, 57, sr, 0, 100)[50] - 2 ** (200 / 1200)) < 1e-6); }
assert.ok(src.includes("let re = false; try { re = pvApplyAll(); } catch {}") && src.includes("mkPv.cv = cv; mkPv.rendered") && src.includes("mkPv.fixes = r.target_fixes.slice(); try { pvApplyAll(); }"));
console.log("fix-preview ok");
