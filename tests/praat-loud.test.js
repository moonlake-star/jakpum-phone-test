// (11/09 20:49 실제 목소리 5곡 시험) 봉우리 1.0 근처의 큰 소리도 Praat 미리듣기가 실패하지 않아야(예전엔 16비트 저장 '잘림 경고'를 오류로 보고 간이 엔진=지글지글로 떨어짐)
const fs = require("fs"), assert = require("assert"), path = require("path");
const Core = require("../praat/praat-core.js"), factory = require("../praat/praat_web.js"), F = path.join(__dirname, "fixtures/praat/");
const rd = (f) => { const u = fs.readFileSync(F + f), v = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = 12; while (String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) !== "data") p += 8 + v.getUint32(p + 4, true);
  const n = v.getUint32(p + 4, true) >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = v.getInt16(p + 8 + i * 2, true) / 32768; return y; };
(async () => {
  await Core.init(fs.readFileSync(path.join(__dirname, "../praat/praat_web.wasm.gz")), factory);
  const x0 = rd("in.wav"), sr = 48000; let pk = 0; for (const v of x0) pk = Math.max(pk, Math.abs(v));
  const x = Float32Array.from(x0, (v) => v / pk);   // 봉우리 정확히 1.0
  const A = await Core.analyze(x, sr), sh = new Float64Array(A.t.length).fill(80);
  const y = await Core.apply(x, sr, A.t, A.f, sh);   // 예전엔 여기서 'clipped' 경고 → 오류
  let py = 0; for (const v of y) py = Math.max(py, Math.abs(v));
  assert.ok(y.length > sr * 0.5 && py > 0.6 && py < 1.6, "결과 크기 원래대로 " + py);
  const w = await Core.warp(x, sr, [[0, 0], [0.5, 0.6], [x.length / sr, x.length / sr]]);   // 타이밍도
  assert.ok(w.length > sr * 0.5, "타이밍 결과");
  // 작은 소리는 크기 그대로(줄였다 키우는 처리 안 함)
  const s = Float32Array.from(x, (v) => v * 0.2), ys = await Core.apply(s, sr, A.t, A.f, sh); let ps = 0; for (const v of ys) ps = Math.max(ps, Math.abs(v));
  assert.ok(ps > 0.12 && ps < 0.32, "작은 소리 크기 " + ps);
  console.log("praat-loud ok", py.toFixed(3), ps.toFixed(3));
})().catch((e) => { console.error(e); process.exit(1); });
