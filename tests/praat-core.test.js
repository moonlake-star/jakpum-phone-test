// 앱의 Praat 미리듣기 엔진이 서버(pitch.analyze/apply)와 같은 결과를 내는지: 서버 코드로 만든 기준 자료와 비교(합성 목소리)
const fs = require("fs"), assert = require("assert"), path = require("path");
const Core = require("../praat/praat-core.js"), factory = require("../praat/praat_web.js"), F = path.join(__dirname, "fixtures/praat/");
const rd = (f) => { const u = fs.readFileSync(F + f), v = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = 12; while (String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) !== "data") p += 8 + v.getUint32(p + 4, true); const n = v.getUint32(p + 4, true) >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = v.getInt16(p + 8 + i * 2, true) / 32768; return y; };
const ref = JSON.parse(fs.readFileSync(F + "ref.json", "utf8")), x = rd("in.wav"), srv = rd("server_out.wav"), SR = ref.sr;
(async () => {
  await Core.init(fs.readFileSync(path.join(__dirname, "../praat/praat_web.wasm.gz")), factory);
  // ① 분석: 서버 analyze()와 같은 점
  const a = await Core.analyze(x, SR); assert.strictEqual(a.t.length, ref.t.length, "분석 점 개수");
  let dt = 0, df = 0; for (let i = 0; i < a.t.length; i++) { dt = Math.max(dt, Math.abs(a.t[i] - ref.t[i])); df = Math.max(df, Math.abs(a.f[i] - ref.f[i])); }
  assert.ok(dt < 2e-7 && df < 2e-4, `분석 차이 t ${dt} f ${df}`);
  // ② 서버와 같은 보정량을 주면 서버와 같은 소리
  const y = await Core.apply(x, SR, Float64Array.from(ref.t), Float64Array.from(ref.f), Float64Array.from(ref.corr)); assert.strictEqual(y.length, srv.length, "길이");
  let mx = 0, e = 0, s = 0; for (let i = 0; i < y.length; i++) { const d = y[i] - srv[i]; mx = Math.max(mx, Math.abs(d)); e += d * d; s += srv[i] * srv[i]; }
  const snr = 10 * Math.log10(s / (e + 1e-30)); console.log("서버와 같은 보정량: 최대 차이", mx.toExponential(2), "신호 대 차이", snr.toFixed(1), "dB");
  assert.ok(mx < 1e-3 && snr > 60, "서버 소리와 같아야 함");
  // ②-2 일부만 보정해도(사이 구간 처리 포함) 같은 소리
  const srv2 = rd("server_out2.wav"), y2 = await Core.apply(x, SR, Float64Array.from(ref.t), Float64Array.from(ref.f), Float64Array.from(ref.corr2));
  const cmp = (a, b) => { let m = 0, e = 0, s = 0; for (let i = 0; i < a.length; i++) { const d = a[i] - b[i]; m = Math.max(m, Math.abs(d)); e += d * d; s += b[i] * b[i]; } return { mx: m, snr: 10 * Math.log10(s / (e + 1e-30)) }; };
  const c2 = cmp(y2, srv2); console.log("일부만 보정:", c2.mx.toExponential(2), c2.snr.toFixed(1), "dB"); assert.ok(c2.mx < 1e-3 && c2.snr > 60, "일부만 보정");
  // ③ 앱이 갖는 25칸/초 음정 선에서 보정량을 복원했을 때(서버 자료 없이) — 서버와 얼마나 다른가
  const sh = Core.shiftFromCurve(ref.curve.pts, ref.curve.fps, 2, a.t);
  let sm = 0, se = 0, sn = 0; for (let i = 0; i < sh.length; i++) { const d = sh[i] - ref.corr[i]; sm = Math.max(sm, Math.abs(d)); se += d * d; sn++; }
  const y3 = await Core.apply(x, SR, a.t, a.f, sh), c3 = cmp(y3, srv); console.log("25칸/초에서 복원: 보정량 오차 최대", sm.toFixed(1), "센트, 평균제곱근", Math.sqrt(se / sn).toFixed(1), "센트 / 소리 신호 대 차이", c3.snr.toFixed(1), "dB");
  // 소리가 같은지는 파형이 아니라 '들리는 높이'로: 두 결과의 음 높이 선 차이(센트)
  const A = await Core.analyze(srv, SR), B = await Core.analyze(y3, SR), ds = []; for (let i = 0, j = 0; i < A.t.length; i++) { while (j + 1 < B.t.length && Math.abs(B.t[j + 1] - A.t[i]) <= Math.abs(B.t[j] - A.t[i])) j++; if (Math.abs(B.t[j] - A.t[i]) < 0.006) ds.push(1200 * Math.log2(B.f[j] / A.f[i])); }
  ds.sort((p, q) => Math.abs(p) - Math.abs(q)); const med = Math.abs(ds[ds.length >> 1]), p95 = Math.abs(ds[Math.floor(ds.length * 0.95)]);
  console.log("들리는 높이 차이(서버 대비): 중앙값", med.toFixed(1), "센트, 95%", p95.toFixed(1), "센트 (", ds.length, "점)"); assert.ok(med < 5 && p95 < 20, "25칸/초 복원본의 높이가 서버와 거의 같아야 함");
  // ④ 음별 음색 + 볼륨·페이드·끄기: 서버 post_audio와 같은 소리 (보정 → 음색 → 볼륨 차례)
  const post = rd("server_post.wav"), notes = ref.ne.notes, yy = await Core.apply(x, SR, Float64Array.from(ref.t), Float64Array.from(ref.f), Float64Array.from(ref.corr));
  const yf = await Core.formantNotes(yy, SR, notes, 0), gc = Core.gain(yf.length, SR, notes, 0, yf.length), yp = Float32Array.from(yf, (v, i) => v * gc[i]), c4 = cmp(yp, post);
  console.log("음색+볼륨 후 서버와 비교:", c4.mx.toExponential(2), c4.snr.toFixed(1), "dB"); assert.ok(c4.snr > 50, "음별 음색·볼륨이 서버와 같아야 함(서버도 두 번 돌리면 58.6 dB까지 달라지는 Praat 잡음 수준)");
  // 서버 자체 잡음이 없는 안정 구간(1.1~1.8초)에서는 거의 비트 단위로 같아야 함
  let sm4 = 0; for (let i = Math.round(1.1 * SR); i < Math.round(1.8 * SR); i++) sm4 = Math.max(sm4, Math.abs(yp[i] - post[i])); assert.ok(sm4 < 2e-3, "안정 구간 차이 " + sm4);
  // 구간만 만들어도 같은 소리(곡 가운데 조각 + 앞뒤 여유로): 볼륨 곡선이 조각 경계에서 이어지는지
  const off = Math.round(0.9 * SR), len = Math.round(2.2 * SR), g2 = Core.gain(len, SR, notes, off, yf.length); let gm = 0; for (let i = 0; i < len; i++) gm = Math.max(gm, Math.abs(g2[i] - gc[off + i])); assert.ok(gm < 1e-6, "구간 볼륨 곡선이 전체와 같음 " + gm);
  console.log("praat-core ok");
})().catch((e) => { console.error(e); process.exit(1); });
