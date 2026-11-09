// (11/09 11:18 사용자 '길이 조금 고쳤는데 드르르') 폰 타이밍 미리듣기 = 서버 timing._psola_warp와 같은 Praat DurationTier 소리인지(합성 목소리 기준 자료)
const fs = require("fs"), assert = require("assert"), path = require("path");
const Core = require("../praat/praat-core.js"), factory = require("../praat/praat_web.js"), F = path.join(__dirname, "fixtures/praat/");
const rd = (f) => { const u = fs.readFileSync(F + f), v = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = 12; while (String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) !== "data") p += 8 + v.getUint32(p + 4, true);
  const n = v.getUint32(p + 4, true) >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = v.getInt16(p + 8 + i * 2, true) / 32768; return y; };
const W = JSON.parse(fs.readFileSync(F + "warp.json", "utf8")), x = rd("in.wav"), srv = rd("server_warp.wav");
const H = fs.readFileSync(path.join(__dirname, "../teacher/index.html"), "utf8");
assert.ok(H.includes("function pvWarpJob(key, x, sr, i0, tp)") && H.includes("sh = wy && wy.length >= n ? wy : pvWarp(org, sr, f0, Dk);"), "준비되면 Praat 소리로");
(async () => {
  await Core.init(fs.readFileSync(path.join(__dirname, "../praat/praat_web.wasm.gz")), factory);
  const y = await Core.warp(x, W.sr, W.anc); const n = Math.min(y.length, srv.length);
  let mx = 0, e = 0, s = 0; for (let i = 0; i < n; i++) { const d = y[i] - srv[i]; mx = Math.max(mx, Math.abs(d)); e += d * d; s += srv[i] * srv[i]; }
  const snr = 10 * Math.log10(s / (e + 1e-30)); console.log("타이밍 미리듣기 vs 서버: 최대 차이", mx.toExponential(2), "신호 대 차이", snr.toFixed(1), "dB");
  assert.ok(Math.abs(y.length - srv.length) < W.sr * 0.01 && snr > 40, "서버 타이밍 소리와 같아야 함");
  console.log("praat-warp ok");
})().catch((e) => { console.error(e); process.exit(1); });
