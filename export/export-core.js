// 폰에서 마지막 합치기: 서버 makeup.py의 lufs()(pyloudnorm, ITU BS.1770-4) · limit()(룩어헤드 피크 리미터)를 그대로 옮김 + mp3 저장(lamejs)
// 입력: 채널별 Float32Array 배열(모노면 1개). 서버와 같은 값이 나오는지는 tests/export-core.test.js (파이썬 기준 자료와 비교)
(function (root) {
  const db = (g) => 10 ** (g / 20);
  const rne = (x) => { const f = Math.floor(x), d = x - f; return d < 0.5 ? f : d > 0.5 ? f + 1 : (f % 2 === 0 ? f : f + 1); };   // numpy round = 짝수쪽 반올림
  // RBJ 쌍이차(pyloudnorm iirfilter.py와 같은 식)
  function biquad(type, G, Q, fc, rate) {
    const A = 10 ** (G / 40), w0 = 2 * Math.PI * (fc / rate), al = Math.sin(w0) / (2 * Q), c = Math.cos(w0), sA = Math.sqrt(A);
    let b0, b1, b2, a0, a1, a2;
    if (type === "high_shelf") { b0 = A * ((A + 1) + (A - 1) * c + 2 * sA * al); b1 = -2 * A * ((A - 1) + (A + 1) * c); b2 = A * ((A + 1) + (A - 1) * c - 2 * sA * al); a0 = (A + 1) - (A - 1) * c + 2 * sA * al; a1 = 2 * ((A - 1) - (A + 1) * c); a2 = (A + 1) - (A - 1) * c - 2 * sA * al; }
    else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }   // high_pass
    return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
  }
  function filt(x, [b0, b1, b2, a1, a2]) {   // scipy.signal.lfilter(전치 직접형 II, 초기값 0)
    const y = new Float64Array(x.length); let z1 = 0, z2 = 0;
    for (let i = 0; i < x.length; i++) { const v = x[i], o = b0 * v + z1; z1 = b1 * v - a1 * o + z2; z2 = b2 * v - a2 * o; y[i] = o; }
    return y;
  }
  // 통합 라우드니스(LUFS): 소리 없으면 −70 (서버 lufs()와 같음)
  function lufs(chs, sr) {
    const T = chs[0].length / sr, Tg = 0.4, step = 0.25;
    const f1 = biquad("high_shelf", 4.0, 1 / Math.SQRT2, 1500.0, sr), f2 = biquad("high_pass", 0.0, 0.5, 38.0, sr);
    const nb = rne((T - Tg) / (Tg * step)) + 1; if (!(nb >= 1)) return -70;
    const z = chs.map((c) => { const y = filt(filt(c, f1), f2), cs = new Float64Array(y.length + 1); for (let i = 0; i < y.length; i++) cs[i + 1] = cs[i] + y[i] * y[i];
      const out = new Float64Array(nb); for (let j = 0; j < nb; j++) { const l = Math.trunc(Tg * (j * step) * sr), u = Math.trunc(Tg * (j * step + 1) * sr); out[j] = (cs[Math.min(u, y.length)] - cs[Math.min(l, y.length)]) / (Tg * sr); } return out; });
    const G = [1, 1, 1, 1.41, 1.41], blk = new Float64Array(nb), l = new Float64Array(nb);
    for (let j = 0; j < nb; j++) { let s = 0; for (let i = 0; i < z.length; i++) s += G[i] * z[i][j]; blk[j] = s; l[j] = -0.691 + 10 * Math.log10(s); }
    const avg = (idx) => { let s = 0; for (let i = 0; i < z.length; i++) { let m = 0; for (const j of idx) m += z[i][j]; s += G[i] * (idx.length ? m / idx.length : 0); } return s; };
    const J1 = []; for (let j = 0; j < nb; j++) if (l[j] >= -70) J1.push(j);
    if (!J1.length) return -70;
    const gr = -0.691 + 10 * Math.log10(avg(J1)) - 10, J2 = []; for (const j of J1) if (l[j] > gr) J2.push(j);
    const v = -0.691 + 10 * Math.log10(avg(J2)); return Number.isFinite(v) ? v : -70;
  }
  // 서버 limit(): 천장 −1.5 dB · 룩어헤드 5 ms · 풀림 80 ms
  function limit(chs, sr, ceilingDb = -1.5, lookMs = 5, relMs = 80) {
    const n = chs[0].length, c = db(ceilingDb), la = Math.max(1, Math.trunc(sr * lookMs / 1000)), peak = new Float64Array(n);
    for (const ch of chs) for (let i = 0; i < n; i++) { const a = Math.abs(ch[i]); if (a > peak[i]) peak[i] = a; }
    const mx = new Float64Array(n), dq = new Int32Array(n); let h = 0, t = 0;   // 가운데 기준 창(−la..+la) 최댓값, 가장자리는 창을 잘라서(반사와 같은 값)
    let nxt = 0; for (let i = 0; i < n; i++) { const hi = Math.min(n - 1, i + la); while (nxt <= hi) { while (t > h && peak[dq[t - 1]] <= peak[nxt]) t--; dq[t++] = nxt++; } while (dq[h] < i - la) h++; mx[i] = peak[dq[h]]; }
    const rel = Math.exp(-1 / (sr * relMs / 1000)), g = new Float32Array(n); let prev = 0;
    for (let i = 0; i < n; i++) { const need = Math.min(1, c / Math.max(mx[i], 1e-9)); prev = i === 0 ? need : (1 - rel) * need + rel * prev; /* 첫 값은 서버와 같게 need[0] */ g[i] = Math.min(need, prev); }
    return chs.map((ch) => { const o = new Float32Array(n); for (let i = 0; i < n; i++) o[i] = ch[i] * g[i]; return o; });
  }
  // 트랙들을 곱해서 더하고 목표 LUFS로 맞춘 뒤 리미터(서버 render의 마지막 단계와 같은 차례). tracks = [{ch:[Float32Array...], gain}] — 모노는 두 채널로 복제
  function master(tracks, sr, targetLufs = -14) {
    const n = Math.max(...tracks.map((t) => t.ch[0].length)), out = [new Float32Array(n), new Float32Array(n)];
    for (const t of tracks) { if (!t.gain) continue; for (let c = 0; c < 2; c++) { const src = t.ch[Math.min(c, t.ch.length - 1)], o = out[c], g = t.gain; for (let i = 0; i < src.length; i++) o[i] += src[i] * g; } }
    const pre = lufs(out, sr), k = pre > -60 ? db(targetLufs - pre) : 1;
    for (const o of out) for (let i = 0; i < n; i++) o[i] *= k;
    return { ch: limit(out, sr), pre, gain: k };
  }
  // mp3 (lamejs, 스테레오) → Uint8Array. 입력은 −1~1 실수
  function mp3(chs, sr, kbps = 320, lame) {
    const L = lame || root.lamejs; if (!L) throw new Error("mp3 엔진 없음");
    const enc = new L.Mp3Encoder(2, sr, kbps), n = chs[0].length, i16 = (a) => { const o = new Int16Array(a.length); for (let i = 0; i < a.length; i++) { const v = Math.max(-1, Math.min(1, a[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
    const l = i16(chs[0]), r = i16(chs[1] || chs[0]), parts = []; let len = 0;
    for (let i = 0; i < n; i += 1152 * 20) { const b = enc.encodeBuffer(l.subarray(i, i + 1152 * 20), r.subarray(i, i + 1152 * 20)); if (b.length) { parts.push(b); len += b.length; } }
    const e = enc.flush(); if (e.length) { parts.push(e); len += e.length; }
    const out = new Uint8Array(len); let p = 0; for (const b of parts) { out.set(b, p); p += b.length; } return out;
  }
  // 같은 일을 화면이 멈추지 않게 조금씩 쉬면서(onProg(0~1)) — 폰에서 3분 곡이면 수십 초 걸리므로
  async function mp3Async(chs, sr, kbps = 320, lame, onProg) {
    const L = lame || root.lamejs; if (!L) throw new Error("mp3 엔진 없음");
    const enc = new L.Mp3Encoder(2, sr, kbps), n = chs[0].length, i16 = (a) => { const o = new Int16Array(a.length); for (let i = 0; i < a.length; i++) { const v = Math.max(-1, Math.min(1, a[i])); o[i] = v < 0 ? v * 32768 : v * 32767; } return o; };
    const l = i16(chs[0]), r = i16(chs[1] || chs[0]), parts = [], B = 1152 * 40; let len = 0, last = Date.now();
    for (let i = 0; i < n; i += B) { const b = enc.encodeBuffer(l.subarray(i, i + B), r.subarray(i, i + B)); if (b.length) { parts.push(b); len += b.length; }
      if (Date.now() - last > 50) { last = Date.now(); if (onProg) onProg(i / n); await new Promise((f) => setTimeout(f, 0)); } }
    const e = enc.flush(); if (e.length) { parts.push(e); len += e.length; }
    const out = new Uint8Array(len); let p = 0; for (const b of parts) { out.set(b, p); p += b.length; } return out;
  }
  const Core = { lufs, limit, master, mp3, mp3Async, db };
  if (typeof module !== "undefined" && module.exports) module.exports = Core; else root.ExportCore = Core;
})(typeof self !== "undefined" ? self : globalThis);
