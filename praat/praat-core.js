// 서버(pitch.py)와 같은 Praat으로 음정을 옮기는 미리듣기 엔진. 브라우저(Web Worker·화면)와 node(시험) 양쪽에서 씀.
// 서버 apply()를 그대로 따름: ① To Manipulation(0.01, 75, 1000) ② 분석 음 높이 × 2^(보정/1200)로 새 PitchTier ③ Replace pitch tier ④ overlap-add 재합성
// ⑤ 보정한 곳(과 그 사이 0.3초 이하 빈 곳)만 새 소리, 나머지는 원음, 이음매 0.05초.
// Praat은 한 번 실행하고 나면 다시 못 돌려서(내부 상태) 호출마다 새로 시작함(시작 약 60ms).
(function (root) {
  "use strict";
  const state = { bin: null, factory: null };
  const wavFloat = (x, sr) => {   // 32비트 실수 WAV (잘림·반올림 없이 Praat에 넘김)
    const b = new ArrayBuffer(44 + x.length * 4), v = new DataView(b), s = (o, t) => { for (let i = 0; i < t.length; i++) v.setUint8(o + i, t.charCodeAt(i)); };
    s(0, "RIFF"); v.setUint32(4, 36 + x.length * 4, true); s(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 3, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 32, true); s(36, "data"); v.setUint32(40, x.length * 4, true);
    new Float32Array(b, 44, x.length).set(x); return new Uint8Array(b);
  };
  const readWav16 = (u8) => {   // Praat이 저장한 16비트 WAV → Float32 (data 조각을 찾아 읽음)
    const v = new DataView(u8.buffer, u8.byteOffset, u8.byteLength); let p = 12;
    while (p + 8 <= u8.length) { const id = String.fromCharCode(u8[p], u8[p + 1], u8[p + 2], u8[p + 3]), sz = v.getUint32(p + 4, true);
      if (id === "data") { const n = Math.min(sz, u8.length - p - 8) >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = v.getInt16(p + 8 + i * 2, true) / 32768; return y; }
      p += 8 + sz + (sz & 1); }
    throw new Error("WAV data 조각 없음");
  };
  async function gunzip(buf) {
    if (typeof DecompressionStream !== "undefined") return new Uint8Array(await new Response(new Blob([buf]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    return new Uint8Array(require("zlib").gunzipSync(Buffer.from(buf)));
  }
  async function fresh() { const lines = []; const M = await state.factory({ wasmBinary: state.bin, print: (s) => lines.push(s), printErr: (s) => lines.push("ERR " + s) }); M._lines = lines; return M; }
  async function run(x, sr, script) {
    const M = await fresh(); M.FS.writeFile("in.wav", wavFloat(x, sr)); M.FS.writeFile("t.praat", script);
    try { M.callMain(["--run", "t.praat"]); } catch (e) { if (typeof e !== "number") throw e; }
    const err = M._lines.filter((l) => /^ERR|not completed|Error/.test(l)); if (err.length) throw new Error("Praat: " + err.slice(0, 3).join(" | "));
    return M;
  }
  const num = (v) => Number(v).toPrecision(15);
  const Core = {
    // gz = praat_web.wasm.gz 바이트, factory = praat_web.js의 PraatModule
    async init(gz, factory) { state.bin = await gunzip(gz); state.factory = factory; return true; },
    ready: () => !!state.bin,
    // 음 높이 분석: 서버 analyze()의 기본 분석(t, f)과 같은 값 (채움 분석은 아직 아님)
    async analyze(x, sr) {
      const M = await run(x, sr, `snd = Read from file: "in.wav"
manip = To Manipulation: 0.01, 75, 1000
tier = Extract pitch tier
n = Get number of points
writeInfoLine: "N ", n
for i to n
  t = Get time from index: i
  f = Get value at index: i
  appendInfoLine: "P ", fixed$(t, 7), " ", fixed$(f, 5)
endfor
`);
      const t = [], f = []; for (const l of M._lines) if (l.startsWith("P ")) { const p = l.split(" "); t.push(+p[1]); f.push(+p[2]); }
      return { t: Float64Array.from(t), f: Float64Array.from(f) };
    },
    // 재합성만(서버 apply의 y): 분석점 (t, f)에 높이 f를 입힌 소리. t는 x의 첫 샘플을 0으로 한 시각
    async resynth(x, sr, t, f) {
      let pts = ""; for (let i = 0; i < t.length; i++) pts += `Add point: ${num(t[i])}, ${num(f[i])}\n`;
      const M = await run(x, sr, `snd = Read from file: "in.wav"
manip = To Manipulation: 0.01, 75, 1000
tier = Create PitchTier: "corr", 0, ${num(x.length / sr)}
${pts}selectObject: tier, manip
Replace pitch tier
selectObject: manip
out = Get resynthesis (overlap-add)
Save as WAV file: "out.wav"
`);
      return readWav16(M.FS.readFile("out.wav"));
    },
    // 서버 apply()의 마지막 단계: 보정한 곳(과 0.3초 이하 빈 곳)만 새 소리, 나머지 원음, 이음매 0.05초
    mask(n, sr, t, shift, keepMask) {
      const hold = Math.floor(0.3 * sr), rr = Math.floor(0.05 * sr), m = new Float32Array(n);
      const idx = Array.from(t, (v) => Math.trunc(v * sr));   // 서버: ((t − xmin)·sr).astype(int)
      for (let k = 0; k + 1 < idx.length; k++) if (Math.abs(shift[k]) > 0.5 && idx[k + 1] - idx[k] < rr) for (let i = Math.max(0, idx[k]); i < Math.min(n, idx[k + 1]); i++) m[i] = 1;
      const refl = (i) => { while (i < 0 || i >= n) i = i < 0 ? -i - 1 : 2 * n - i - 1; return i; };   // scipy 기본 경계 = 거울
      const box = (src, size, mode) => {   // scipy 가운데 맞춤 창(왼쪽 size//2, 오른쪽 나머지)의 최댓값(mode "max") 또는 평균
        const Lh = Math.floor(size / 2), Rh = size - Lh - 1, cs = new Float64Array(n + size + 1);   // 거울로 늘린 배열의 누적합: 자리 j ↔ 원래 자리 j − Lh
        for (let j = 0; j < n + size - 1; j++) cs[j + 1] = cs[j] + src[refl(j - Lh)];
        const out = new Float32Array(n); for (let i = 0; i < n; i++) { const sum = cs[i + size] - cs[i]; out[i] = mode === "max" ? (sum > 0 ? 1 : 0) : sum / size; } return out; };
      const out = box(box(m, hold, "max"), rr, "mean");
      if (keepMask) for (let i = 0; i < n; i++) out[i] *= 1 - keepMask[i];
      return out;
    },
    // 앱이 가진 25칸/초 음정 선(pts 행: [시각, 부른 높이(센트), 보정 후(센트)…])에서 분석점마다 보정량(센트) 복원: 칸 가운데 값을 이어 선형 보간, 소리 없는 칸은 0
    shiftFromCurve(pts, fps, colNew, t) {
      const by = new Map(); for (const r of pts) { const k = Math.round(r[0] * fps); if (r[1] != null && r[colNew] != null) by.set(k, r[colNew] - r[1]); }
      return Float64Array.from(t, (tt) => { const x = tt * fps - 0.5, k0 = Math.floor(x), a = by.get(k0), b = by.get(k0 + 1), w = x - k0;
        if (a != null && b != null) return a * (1 - w) + b * w; const near = a != null && w < 0.5 ? a : b != null && w >= 0.5 ? b : null; return near != null ? near : 0; });
    },
    // 서버 formant_shift(): 목소리 결만 위아래(높이·길이 그대로) — Praat 'Change gender'
    async formantShift(x, sr, semis) {
      const M = await run(x, sr, `snd = Read from file: "in.wav"
g = Change gender: 75, 600, ${num(2 ** (semis / 12))}, 0, 1, 1
Save as WAV file: "out.wav"
`), z = readWav16(M.FS.readFile("out.wav")), out = new Float32Array(x.length); out.set(z.subarray(0, x.length)); return out;
    },
    // 서버 formant_notes(): 음별 음색 — 그 음 앞뒤 0.1초 여유로 따로 바꿔 0.03초 이음매로 이어 붙임(차례로). y는 곡의 [off, off+len) 구간, notes는 곡 시각(초)
    async formantNotes(y, sr, notes, off) {
      const out = Float32Array.from(y), pad = Math.floor(0.1 * sr), xf = Math.max(1, Math.floor(0.03 * sr));
      for (const nt of notes) { if (!nt.formant) continue;
        const a = Math.max(0, Math.trunc(nt.t0 * sr) - off), b = Math.min(out.length, Math.trunc(nt.t1 * sr) - off); if (b - a < Math.floor(0.08 * sr)) continue;
        const a0 = Math.max(0, a - pad), b0 = Math.min(out.length, b + pad), z = await Core.formantShift(out.slice(a0, b0), sr, +nt.formant), w = new Float32Array(b0 - a0), i0 = a - a0, i1 = b - a0;
        for (let i = i0; i < i1; i++) w[i] = 1; const r = Math.min(xf, (i1 - i0) >> 1);
        for (let i = 0; i < r; i++) { const v = r > 1 ? i / (r - 1) : 0; w[i0 + i] = v; w[i1 - 1 - i] = v; }   // linspace(0,1,r) 오르막 · 반대로 내리막
        for (let i = 0; i < b0 - a0; i++) out[a0 + i] = out[a0 + i] * (1 - w[i]) + z[i] * w[i]; }
      return out;
    },
    // 서버 gain_curve()의 음별 부분: 샘플마다 곱할 볼륨(곡의 [off, off+n)), 음별 볼륨·끄기·페이드, 15ms로 부드럽게. 고칠 게 없으면 null. N = 곡 전체 샘플 수
    gain(n, sr, notes, off, N) {
      if (!notes.some((x) => x.gain_db || x.mute || x.fade_in || x.fade_out)) return null;
      const e = Math.max(1, Math.floor(0.015 * sr)), lo = Math.max(0, off - e), hi = Math.min(N, off + n + e), lin = new Float64Array(hi - lo).fill(1);
      for (const x of notes) { const s0 = Math.max(0, Math.trunc(x.t0 * sr)), s1 = Math.min(N, Math.trunc(x.t1 * sr)); if (s1 <= s0) continue;
        const k = s1 - s0, seg = new Float64Array(k).fill(1); if (x.mute) seg.fill(0); else if (x.gain_db) seg.fill(10 ** (x.gain_db / 20));
        if (x.fade_in) { const f = Math.min(k, Math.trunc(x.fade_in * sr)); for (let i = 0; i < f; i++) seg[i] *= (f > 1 ? i / (f - 1) : 0) ** 2; }
        if (x.fade_out) { const f = Math.min(k, Math.trunc(x.fade_out * sr)); for (let i = 0; i < f; i++) seg[k - f + i] *= (f > 1 ? 1 - i / (f - 1) : 0) ** 2; }
        for (let i = Math.max(s0, lo); i < Math.min(s1, hi); i++) lin[i - lo] *= seg[i - s0]; }
      const L = Math.floor(e / 2), R = e - L - 1, cs = new Float64Array(hi - lo + 1), at = (i) => lin[Math.min(hi - lo - 1, Math.max(0, i))];
      for (let i = 0; i < hi - lo; i++) cs[i + 1] = cs[i] + lin[i];
      const out = new Float32Array(n);   // 거울이 아니라 가장자리 값 되풀이(scipy mode nearest) — 구간 가장자리는 e 이상 여유가 있어 곡 끝에서만 해당
      for (let i = 0; i < n; i++) { const c = off + i - lo; let sum = 0; for (let j = c - L; j <= c + R; j++) sum += at(j); out[i] = sum / e; }
      return out;
    },
    // x(원음) → 보정한 소리. t, f = analyze 결과, shift = 분석점마다 보정(센트)
    async apply(x, sr, t, f, shift, keepMask) {
      if (!shift.some((v) => v)) return Float32Array.from(x);
      const nf = Float64Array.from(f, (v, i) => v * 2 ** (shift[i] / 1200)), y = await Core.resynth(x, sr, t, nf), n = Math.min(x.length, y.length), m = Core.mask(n, sr, t, shift, keepMask), out = new Float32Array(n);
      for (let i = 0; i < n; i++) out[i] = x[i] * (1 - m[i]) + y[i] * m[i];
      return out;
    },
  };
  if (typeof module !== "undefined" && module.exports) module.exports = Core; else root.PraatCore = Core;
})(typeof self !== "undefined" ? self : this);
