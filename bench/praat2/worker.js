// Praat 폰 측정(워커): 인스턴스 만들기·분석·합성 시간을 구간 길이별로 잼. 메인 화면은 움직이지 않음.
importScripts("../../praat/praat_web.js", "../../praat/praat-core.js");
const SR = 48000, now = () => performance.now();
function voice(sec, sr) { const n = Math.round(sec * sr), x = new Float32Array(n); let ph = 0;
  for (let i = 0; i < n; i++) { const t = i / sr, f = 220 * Math.pow(2, (Math.floor(t * 1.5) % 4) * 2 / 12) * (1 + 0.012 * Math.sin(2 * Math.PI * 5.5 * t)); ph += f / sr;
    let s = 0; for (let h = 1; h <= 20; h++) s += Math.sin(2 * Math.PI * ph * h) / h; x[i] = 0.2 * s * (0.6 + 0.4 * Math.sin(2 * Math.PI * 0.7 * t) ** 2); }
  return x; }
const med = (a) => { const s = a.slice().sort((p, q) => p - q); return s[s.length >> 1]; };
self.onmessage = async (e) => {
  const post = (m) => self.postMessage(m);
  try {
    let t0 = now(); const r = await fetch("../../praat/praat_web.wasm.gz"); const gz = await r.arrayBuffer(); const tDl = now() - t0;
    t0 = now(); await PraatCore.init(gz, PraatModule); const tInit = now() - t0; post({ type: "info", tDl, tInit, mb: (gz.byteLength / 1e6).toFixed(1) });
    const rows = [], reps = e.data.reps || 3;
    await PraatCore.analyze(voice(0.1, SR), SR);   // 한 번 데워 두기(첫 호출은 느림)
    for (const sec of [0.2, 0.5, 1, 2, 4]) {
      const x = voice(sec, SR), A = [], R = [], T = [];
      for (let k = 0; k < reps; k++) {
        let a0 = now(); const an = await PraatCore.analyze(x, SR); const ta = now() - a0;
        const sh = Float64Array.from(an.t, (t) => (t > sec / 2 ? 100 : 0)); a0 = now(); await PraatCore.apply(x, SR, an.t, an.f, sh); const tr = now() - a0;
        A.push(ta); R.push(tr); T.push(ta + tr); }
      rows.push({ sec, analyze: med(A), apply: med(R), total: med(T), min: Math.min(...T), max: Math.max(...T) }); post({ type: "row", row: rows[rows.length - 1] });
    }
    post({ type: "done", rows });
  } catch (err) { post({ type: "error", msg: String(err && err.message || err) }); }
};
