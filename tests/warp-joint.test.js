// (11/09 21:10 사용자 '멀어져간사람아 여전히 지글') 타이밍 미리듣기: 보정 전(p0)에서 높이·길이 한 번에 + 울림 트랙은 타이밍 창 동안 뺌
const fs = require("fs"), assert = require("assert"), path = require("path");
const Core = require("../praat/praat-core.js"), factory = require("../praat/praat_web.js");
const H = fs.readFileSync(path.join(__dirname, "../teacher/index.html"), "utf8");
assert.ok(H.includes("const wetT = /^(w[0-3]|x[0-3]|wet)$/.test(name)") && H.includes("if (wetT) {"), "울림 트랙은 PSOLA로 늘이지 않음");
assert.ok(H.includes("pvWarpJob(wk, jz ? pvSrc(src, 0, i0, i1) : reg.ch[0].slice(), sr, i0, tp, jz)") && H.includes("PraatCore.warp(x, sr, anc, pitch)"), "보정 전 소리에서 한 번에");
(async () => {
  await Core.init(fs.readFileSync(path.join(__dirname, "../praat/praat_web.wasm.gz")), factory);
  const sr = 48000, x = new Float32Array(sr).map((_, i) => 0.5 * Math.sin(2 * Math.PI * 220 * i / sr) + 0.2 * Math.sin(2 * Math.PI * 440 * i / sr));
  const A = await Core.analyze(x, sr);
  const y = await Core.warp(x, sr, [[0, 0], [0.5, 0.6], [1, 1]], { t: A.t, f: Float64Array.from(A.f, (v) => v * 2 ** (100 / 1200)) });
  const B = await Core.analyze(y.slice(0.2 * sr, 0.4 * sr), sr), m = B.f.reduce((a, b) => a + b, 0) / B.f.length;
  assert.ok(y.length === x.length && Math.abs(1200 * Math.log2(m / 220) - 100) < 15, "높이 +100센트·길이 그대로 " + m);
  const z = await Core.warp(x, sr, [[0, 0], [0.5, 0.6], [1, 1]]);   // 높이 없이 = 예전 그대로
  const C = await Core.analyze(z.slice(0.2 * sr, 0.4 * sr), sr), m2 = C.f.reduce((a, b) => a + b, 0) / C.f.length;
  assert.ok(Math.abs(1200 * Math.log2(m2 / 220)) < 15, "높이 그대로 " + m2);
  console.log("warp-joint ok", m.toFixed(1), m2.toFixed(1));
})().catch((e) => { console.error(e); process.exit(1); });
