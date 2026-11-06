// 폰에서 마지막 합치기(export/export-core.js)가 서버 makeup.py의 lufs·limit·마스터링과 같은 값을 내는지 + mp3 저장이 되는지
const fs = require("fs"), assert = require("assert"), cp = require("child_process"), os = require("os"), path = require("path");
const X = require("../export/export-core.js"), ref = JSON.parse(fs.readFileSync(__dirname + "/fixtures/export/ref.json", "utf8")), sr = ref.sr, n = ref.n;
// make_fixture.py와 같은 식으로 입력 만들기
const lcg = (len, seed) => { const x = new Float64Array(len); let s = seed >>> 0; for (let i = 0; i < len; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; x[i] = s / 4294967296 * 2 - 1; } return x; };
const f0 = new Float64Array(n), env = new Float64Array(n), ph = new Float64Array(n); let acc = 0;
for (let i = 0; i < n; i++) { const t = i / sr; f0[i] = 220 * 2 ** (Math.sin(2 * Math.PI * 0.4 * t) / 12); env[i] = Math.sqrt(Math.max(Math.sin(2 * Math.PI * 0.35 * t), 0)); acc += f0[i]; ph[i] = acc / sr; }
const voc = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let k = 1; k < 8; k++) s += Math.sin(2 * Math.PI * ph[i] * k) / k; voc[i] = s * env[i] * 0.3; }
const nz = lcg(n, 12345); for (let i = 0; i < 960; i++) voc[3 * sr + i] += nz[i] * 0.9;
const mrL = new Float64Array(n), mrR = new Float64Array(n); for (let i = 0; i < n; i++) { const t = i / sr; mrL[i] = ([[110, 0], [165, 1], [220, 2]].reduce((s, [f, p]) => s + Math.sin(2 * Math.PI * f * t + p), 0)) * 0.12 + nz[i] * 0.01; mrR[i] = ([98, 147, 196].reduce((s, f) => s + Math.sin(2 * Math.PI * f * t), 0)) * 0.12 + nz[(i - 7 + n) % n] * 0.01; }
const wet = new Float64Array(n), d1 = Math.trunc(0.03 * sr), d2 = Math.trunc(0.07 * sr); for (let i = d1; i < n; i++) wet[i] += voc[i - d1] * 0.5; for (let i = d2; i < n; i++) wet[i] += voc[i - d2] * 0.3;
const F = (a, m = 1) => Float32Array.from(a, (v) => v * m), V = [F(voc), F(voc)], MR = [F(mrL), F(mrR)], W = [F(wet), F(wet, 0.8)];
// ① 라우드니스
const lv = X.lufs(V, sr), lm = X.lufs(MR, sr); console.log("LUFS 폰/서버: 보컬", lv.toFixed(3), ref.lufs_voc.toFixed(3), " MR", lm.toFixed(3), ref.lufs_mr.toFixed(3));
assert.ok(Math.abs(lv - ref.lufs_voc) < 0.02 && Math.abs(lm - ref.lufs_mr) < 0.02, "LUFS가 서버(pyloudnorm)와 같아야 함");
// ② 합치기 → 목표 LUFS → 리미터
const m = X.master([{ ch: V, gain: 1.3 }, { ch: W, gain: 2.0 }, { ch: MR, gain: 0.8 }], sr, -14);
console.log("합치기 전 LUFS", m.pre.toFixed(3), ref.lufs_mix.toFixed(3), "· 배율", m.gain.toFixed(4), ref.k.toFixed(4)); assert.ok(Math.abs(m.pre - ref.lufs_mix) < 0.02 && Math.abs(m.gain / ref.k - 1) < 0.003, "합친 소리 크기·배율");
let dm = 0, rm = 0; for (let j = 0; j * ref.step < n; j++) { const i = j * ref.step; dm = Math.max(dm, Math.abs(m.ch[0][i] - ref.out_L[j]), Math.abs(m.ch[1][i] - ref.out_R[j])); rm = Math.max(rm, Math.abs(ref.out_L[j])); }
let pk = 0; for (const c of m.ch) for (let i = 0; i < n; i++) pk = Math.max(pk, Math.abs(c[i]));
console.log("마스터 표본 최대 차이", dm.toExponential(2), "(신호 최대", rm.toFixed(3) + ")  피크", pk.toFixed(4), ref.peak_out.toFixed(4)); assert.ok(dm < 2e-3 && Math.abs(pk - ref.peak_out) < 2e-3, "리미터 후 소리가 서버와 같아야 함");
const lo = X.lufs(m.ch, sr); assert.ok(Math.abs(lo - ref.lufs_out) < 0.02, "최종 LUFS " + lo);
// ③ 리미터만(3배로 키워 일부러 넘김)
const lim = X.limit(V.map((c) => F(c, 3)), sr); let dl = 0; for (let j = 0; j * ref.step < n; j++) dl = Math.max(dl, Math.abs(lim[0][j * ref.step] - ref.lim_L[j]));
let lp = 0; for (const c of lim) for (let i = 0; i < n; i++) lp = Math.max(lp, Math.abs(c[i])); let dz = 0; ref.lim_zone.forEach((v, k) => { dz = Math.max(dz, Math.abs(lim[0][3 * sr - 300 + k * 20] - v)); });
console.log("리미터: 표본 차이", dl.toExponential(2), "피크", lp.toFixed(4), ref.lim_peak.toFixed(4), "피크 근처 차이", dz.toExponential(2)); assert.ok(dl < 2e-3 && dz < 2e-3 && lp < 0.8415, "리미터가 서버와 같아야 함");
// ④ mp3: 만들어 ffmpeg로 풀어서 길이·소리 크기가 맞는지
const lame = new Function(fs.readFileSync(__dirname + "/../export/lame.min.js", "utf8") + "; return lamejs;")();
const t0 = Date.now(), mp = X.mp3(m.ch, sr, 320, lame), dt = Date.now() - t0; console.log("mp3", (mp.length / 1024).toFixed(0), "KB,", dt, "ms (5초 곡)"); assert.ok(mp.length > 150000 && mp.length < 260000, "320k 5초 크기");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "x")), f = path.join(tmp, "a.mp3"); fs.writeFileSync(f, mp);
try { const out = cp.execFileSync("ffmpeg", ["-v", "error", "-i", f, "-f", "f32le", "-ac", "2", "-ar", String(sr), "-"], { maxBuffer: 1 << 28 }), fl = new Float32Array(out.buffer, out.byteOffset, out.byteLength >> 2), len = fl.length >> 1, dec = [new Float32Array(len), new Float32Array(len)];
  for (let i = 0; i < len; i++) { dec[0][i] = fl[2 * i]; dec[1][i] = fl[2 * i + 1]; } const ld = X.lufs(dec, sr); console.log("mp3 풀어서 LUFS", ld.toFixed(2), "길이", (len / sr).toFixed(3), "초"); assert.ok(Math.abs(ld - lo) < 0.3 && Math.abs(len / sr - 5) < 0.1, "mp3로 저장해도 크기·길이 그대로");
} catch (e) { if (e.code === "ENOENT") console.log("(ffmpeg 없음 — mp3 풀기 시험 건너뜀)"); else throw e; }
console.log("export-core ok");
