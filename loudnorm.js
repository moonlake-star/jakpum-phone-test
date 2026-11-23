/* 곡 재생 크기 맞춤(11/23 사용자 '유튜브 뮤직 원본보다 크고 찌그러짐 — 동일하게, 에이')
   예전 방식(모노 평균·무음 포함 실효값 → 최대 +7.5 dB 올림 × 보컬 보상 최대 +9 dB → 압축기)은 이미 크게 마스터링된 곡을 더 키워 찌그러졌음.
   새 방식: 유튜브와 같은 기준(ITU BS.1770 라우드니스, K 가중·게이트)으로 재서
     · 목표 = min(−14 LUFS, 원곡 자체 크기) — 유튜브는 큰 곡만 −14로 줄이고 작은 곡은 그대로 둠 → 원곡보다 크게 안 함
     · 보컬을 줄이면 그만큼 다시 올려 원곡 크기 유지(예전 보컬 보상과 같은 뜻)
     · 어떤 경우에도 봉우리가 −1 dBFS를 넘지 않게 배율 상한(올릴 때든 줄일 때든)
     · 마지막 안전 압축기(문턱 −1, 20:1)가 자동으로 더하는 약 +0.57 dB(Web Audio 규격의 메이크업 게인)는 미리 빼 둠
   반주·보컬을 트랙 하나씩 분석(메모리에 두 트랙 동시 보유 없음). 둘이 섞일 때의 교차항은 성기게 뽑은 원 표본(16칸마다)의 0.1초 칸별 상관으로 추정.
   (검토: 다른 모델 독립 검토 반영 — 교차항·모노 ×2·봉우리 상한 항상·메이크업 보정·슬라이더 시정수 통일·백그라운드에서 느려지지 않는 양보) */
(function (G) {
  const SUB = 0.1, TARGET = -14, CEIL = 10 ** (-1 / 20), STRIDE = 16, PK_MARGIN = 10 ** (1.5 / 20);
  const MAKEUP_DB = -0.6 * (-1 + 1 / 20);   // Web Audio DynamicsCompressor: 메이크업 = (1/fullRangeGain)^0.6, fullRange = 문턱 + (0−문턱)/비율 → +0.57 dB
  // BS.1770 K 가중(고역 선반 + 고역 통과) — 표본율에 맞춰 계수 계산(libebur128 방식). 48 kHz에서 표준 표 값과 같음
  function kCoefs(fs) {
    let f0 = 1681.974450955533, Q = 0.7071752369554196, K = Math.tan(Math.PI * f0 / fs);
    const Vh = 10 ** (3.999843853973347 / 20), Vb = Vh ** 0.4996667741545416;
    let a0 = 1 + K / Q + K * K;
    const s1 = [(Vh + Vb * K / Q + K * K) / a0, 2 * (K * K - Vh) / a0, (Vh - Vb * K / Q + K * K) / a0, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
    f0 = 38.13547087602444; Q = 0.5003270373238773; K = Math.tan(Math.PI * f0 / fs); a0 = 1 + K / Q + K * K;
    const s2 = [1, -2, 1, 2 * (K * K - 1) / a0, (1 - K / Q + K * K) / a0];
    return { s1, s2 };
  }
  // 양보: setTimeout(0)은 화면이 꺼지면 1초로 늦춰지므로 MessageChannel 사용
  const tick = (() => { try { if (typeof MessageChannel === "function" && typeof window !== "undefined") { const ch = new MessageChannel(), q = []; ch.port1.onmessage = () => { const f = q.shift(); f && f(); }; return () => new Promise((r) => { q.push(r); ch.port2.postMessage(0); }); } } catch {} return () => new Promise((r) => setTimeout(r, 0)); })();
  // 트랙 하나 → 0.1초 칸마다 K 가중 에너지(채널 합, 모노는 ×2 — 스테레오 양쪽으로 나가므로) e[] · 원 표본 봉우리 p[] · 16칸마다 뽑은 원 표본 s[채널]
  async function analyze(buf, opt) {
    opt = opt || {};
    const fs = buf.sampleRate, nch = Math.min(2, buf.numberOfChannels), n = buf.length, step = Math.max(1, Math.round(fs * SUB)), nb = Math.ceil(n / step);
    const e = new Float64Array(nb), p = new Float32Array(nb), s = [], { s1, s2 } = kCoefs(fs), slice = opt.slice || 1 << 20;
    const [b0, b1, b2, a1, a2] = s1, [c0, c1, c2, d1, d2] = s2, w = nch === 1 ? 2 : 1;
    let done = 0;
    for (let c = 0; c < nch; c++) {
      const x = buf.getChannelData(c), sd = new Float32Array(Math.ceil(n / STRIDE)); s.push(sd);
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0, w1 = 0, w2 = 0, z1 = 0, z2 = 0;
      for (let i0 = 0, k = 0; i0 < n; i0 += step, k++) {
        const i1 = Math.min(n, i0 + step); let acc = 0, pk = p[k];
        for (let i = i0; i < i1; i++) {
          const v = x[i], y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2; x2 = x1; x1 = v; y2 = y1; y1 = y;
          const z = c0 * y + c1 * w1 + c2 * w2 - d1 * z1 - d2 * z2; w2 = w1; w1 = y; z2 = z1; z1 = z;
          acc += z * z; const a = v < 0 ? -v : v; if (a > pk) pk = a;
        }
        for (let i = Math.ceil(i0 / STRIDE) * STRIDE; i < i1; i += STRIDE) sd[i / STRIDE] = x[i];
        e[k] += acc * w; p[k] = pk; done += i1 - i0;
        if (done >= slice) { done = 0; await tick(); if (opt.dead && opt.dead()) throw new Error("stale"); }   // 화면이 멈추지 않게 조금씩
      }
    }
    return { e, p, s, step, fs, nch };
  }
  // 교차항(칸별): 원 표본 상관 ρ_k × √(e_m·e_v) — 분리 음원은 합치면 원곡이라 상관이 0이 아닐 수 있음
  const XC = new WeakMap();
  function cross(m, v) {
    let h = XC.get(m); if (h && h.v === v) return h.c;
    const nb = Math.min(m.e.length, v.e.length), c = new Float64Array(nb), per = m.step / STRIDE;
    if (m.fs === v.fs && m.step === v.step) {
      for (let k = 0; k < nb; k++) {
        const j0 = Math.ceil(k * per), j1 = Math.min(Math.ceil((k + 1) * per), m.s[0].length, v.s[0].length); let mm = 0, vv = 0, mv = 0;
        for (let ch = 0; ch < 2; ch++) { const a = m.s[Math.min(ch, m.s.length - 1)], b = v.s[Math.min(ch, v.s.length - 1)]; for (let j = j0; j < j1; j++) { mm += a[j] * a[j]; vv += b[j] * b[j]; mv += a[j] * b[j]; } }
        c[k] = mm > 0 && vv > 0 ? (mv / Math.sqrt(mm * vv)) * Math.sqrt(m.e[k] * v.e[k]) : 0;
      }
    }
    XC.set(m, { v, c }); return c;
  }
  // 반주 m + 보컬 v(g배) 섞은 소리의 크기(LUFS) — 0.4초 창(0.1초씩 이동), 절대 게이트 −70, 상대 게이트 −10
  function lufs(m, v, g) {
    const nb = Math.min(m.e.length, v.e.length), W = 4, c = cross(m, v), blk = [];
    for (let k = 0; k + W <= nb; k++) {
      let s = 0; for (let j = k; j < k + W; j++) s += m.e[j] + g * g * v.e[j] + 2 * g * c[j];
      blk.push(Math.max(0, s) / (W * m.step));
    }
    if (!blk.length) return -70;
    const L = (z) => -0.691 + 10 * Math.log10(z + 1e-20);
    let a = blk.filter((z) => L(z) > -70); if (!a.length) return -70;
    const rel = L(a.reduce((x, y) => x + y, 0) / a.length) - 10;
    a = a.filter((z) => L(z) > rel); if (!a.length) return -70;
    return L(a.reduce((x, y) => x + y, 0) / a.length);
  }
  // 섞은 소리 봉우리 추정: 성긴 표본으로 잰 섞은 봉우리 +1.5 dB 와 (반주 봉우리 + g·보컬 봉우리) 중 작은 쪽
  function peak(m, v, g) {
    let tri = 0; const nb = Math.min(m.p.length, v.p.length); for (let k = 0; k < nb; k++) { const q = m.p[k] + g * v.p[k]; if (q > tri) tri = q; }
    let sp = 0; const n = Math.min(m.s[0].length, v.s[0].length);
    for (let ch = 0; ch < 2; ch++) { const a = m.s[Math.min(ch, m.s.length - 1)], b = v.s[Math.min(ch, v.s.length - 1)]; for (let j = 0; j < n; j++) { const q = Math.abs(a[j] + g * b[j]); if (q > sp) sp = q; } }
    return Math.min(tri, sp * PK_MARGIN);
  }
  const L0C = new WeakMap();
  // 최종 배율(압축기 메이크업 보정 포함): 목표 = min(−14, 원곡 크기) · 봉우리 −1 dBFS 상한
  function gain(m, v, g) {
    const mk = 10 ** (-MAKEUP_DB / 20);
    if (!m || !v) return mk;
    let L0 = L0C.get(m); if (!L0 || L0.v !== v) { L0 = { v, L: lufs(m, v, 1) }; L0C.set(m, L0); }
    const Lg = lufs(m, v, g); if (Lg <= -69) return mk;
    let x = 10 ** ((Math.min(TARGET, L0.L) - Lg) / 20);
    const pk = peak(m, v, g); if (pk > 0) x = Math.min(x, CEIL / pk);
    return x * mk;
  }
  const api = { kCoefs, analyze, cross, lufs, peak, gain, TARGET, CEIL, MAKEUP_DB };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else G.Loud = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
