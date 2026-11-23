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
  const SUB = 0.1, TARGET = -14,   // (11/24 노트북 폰 재현: 유튜브 앱은 큰 곡을 정확히 −14로 틀었음 · 앞서 −16은 크기 맞춤이 꺼진 소리와 비교해 잘못 정한 값) −16 → −14
      // (11/23 23시 사용자 '여전히 유튜브 뮤직보다 큼') −14 → −16
    CEIL = 10 ** (-1 / 20), STRIDE = 16, PK_MARGIN = 10 ** (1.5 / 20);
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
  // 녹음(레슨·메이크업)용: 원곡이 없으니 −14 LUFS까지 올리는 것도 허용(최대 maxUp dB) · 봉우리는 −1 dBFS를 over dB까지만 넘게(넘는 순간은 마지막 안전 제한기 하나가 잡음)
  function gainTo(m, v, g, opt) {
    opt = opt || {}; const mk = 10 ** (-MAKEUP_DB / 20), maxUp = opt.maxUp ?? 12, over = opt.over ?? 3;
    if (!m) return mk; const z = v || { e: new Float64Array(m.e.length), p: new Float32Array(m.p.length), s: m.s.map((x) => new Float32Array(x.length)), step: m.step, fs: m.fs };
    const Lg = lufs(m, z, v ? g : 0); if (Lg <= -69) return mk;
    let x = 10 ** (Math.max(-20, Math.min(maxUp, TARGET - Lg)) / 20);
    const pk = peak(m, z, v ? g : 0); if (x > 1 && pk > 0) x = Math.min(x, Math.max(1, CEIL * 10 ** (over / 20) / pk));
    return x * mk;
  }
  // 실시간(분석기 값) 크기 추정용: K 가중 필터 두 개(브라우저 BiquadFilter 근사) — 레슨 재생처럼 미리 디코드하지 않는 소리
  function kNodes(ctx) { const hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 38; hp.Q.value = 0.5; const hs = ctx.createBiquadFilter(); hs.type = "highshelf"; hs.frequency.value = 1500; hs.gain.value = 4; hp.connect(hs); return { input: hp, output: hs }; }
  const api = { kCoefs, analyze, cross, lufs, peak, gain, gainTo, kNodes, TARGET, CEIL, MAKEUP_DB };
  /* (11/24 사용자 '레슨 녹음·메이크업·수강생 앱 등 전체를 곡 서랍처럼, 맥시마이저 겹치지 않게' · 노트북 전수조사: <audio> 직결 재생이 −9~−11 LUFS 그대로
     → 유튜브보다 3~5 dB 크고, 폰 스피커 보호 처리가 저음을 더 누름) 앱의 모든 <audio> 재생을 같은 기준(−16 LUFS, 제한기 하나)으로:
     · 재생이 시작되면(play() 또는 재생 버튼) 같은 출처(blob:·data:) 소리만 웹오디오로 보냄 — 다른 도메인은 소리가 사라질 수 있어 건드리지 않음
     · 파일이 작으면(약 12 MB 이하) 한 번 디코드해 정확히 잼(곡마다 한 번) — 재는 동안(보통 1초 안)은 소리를 0에서 시작해 크게 튀지 않음
     · 큰 파일(긴 레슨 녹음)은 재생하며 K 가중 크기를 재서 천천히 맞춤(−12~+12 dB, 처음은 0 dB)
     · 이미 크기 맞춤이 있는 곳(곡 서랍 엔진·선생님 레슨 재생기·무음 잠금 해제)은 el._noLoud로 제외 → 제한기 겹침 없음 */
  const EL = { ctx: null, lim: null, map: new WeakMap(), list: new Set(), cache: new Map() }, MAXB = 12 << 20;
  const okSrc = (a) => /^(blob|data):/.test(a.currentSrc || a.src || "");
  function elCtx() {
    if (EL.ctx && EL.ctx.state !== "closed") return EL.ctx;
    const AC = G.AudioContext || G.webkitAudioContext; try { EL.ctx = new AC({ latencyHint: "playback" }); } catch { EL.ctx = new AC(); }
    const l = EL.ctx.createDynamicsCompressor(); l.threshold.value = -1; l.knee.value = 0; l.ratio.value = 20; l.attack.value = 0.003; l.release.value = 0.12; l.connect(EL.ctx.destination); EL.lim = l;
    try { G.Brand && G.Brand.audioKeep && G.Brand.audioKeep((c) => c === EL.ctx && [...EL.list].some((x) => !x.paused)); } catch {}
    return EL.ctx;
  }
  const mk = () => 10 ** (-MAKEUP_DB / 20);
  const setG = (r, db, tc) => { const g = r.g.gain, n = EL.ctx.currentTime, v = 10 ** (db / 20) * mk(); try { g.cancelScheduledValues(n); g.setTargetAtTime(v, n, tc); } catch { g.value = v; } };
  async function measure(a, r) {
    const u = a.currentSrc || a.src; if (r.u === u) return; r.u = u; r.live = false;
    if (EL.cache.has(u)) { setG(r, EL.cache.get(u), 0.02); return; }
    r.g.gain.value = 0; const fb = setTimeout(() => { if (r.u === u && !EL.cache.has(u)) { r.live = true; setG(r, 0, 0.05); } }, 1500);   // 오래 걸리면 0 dB로 시작하고 재생하며 맞춤
    try {
      const ab = await (await fetch(u)).arrayBuffer(); if (r.u !== u) return;
      if (ab.byteLength > MAXB) { clearTimeout(fb); r.live = true; setG(r, 0, 0.05); return; }
      const OAC = G.OfflineAudioContext || G.webkitOfflineAudioContext, oc = new OAC(2, 1, 44100);
      const buf = await new Promise((ok, no) => { try { const p = oc.decodeAudioData(ab, ok, no); if (p && p.then) p.then(ok, no); } catch (e) { no(e); } });
      const st = await analyze(buf); if (r.u !== u) return;
      const db = 20 * Math.log10(gainTo(st, null, 0, { maxUp: 12, over: 0 }) / mk()); EL.cache.set(u, db); clearTimeout(fb); r.live = false; setG(r, db, 0.03);
    } catch { clearTimeout(fb); if (r.u === u) { r.live = true; setG(r, 0, 0.05); } }
  }
  function liveTick() {   // 큰 파일: 재생 중 K 가중 크기(약 6초 평균)로 천천히
    for (const a of EL.list) { const r = EL.map.get(a); if (!r || !r.live || a.paused || !r.an) continue;
      const x = r.buf || (r.buf = new Float32Array(r.an.fftSize)); r.an.getFloatTimeDomainData(x); let s2 = 0; for (let i = 0; i < x.length; i++) s2 += x[i] * x[i];
      const L = -0.691 + 10 * Math.log10(s2 / x.length + 1e-12) + 3.01; if (L < -47) continue;
      r.lv = r.lv == null ? L : r.lv + (L - r.lv) * (r.n = (r.n || 0) + 1, r.n < 15 ? 0.15 : 0.03);   // 처음 3초는 빨리, 그 뒤는 천천히
      setG(r, Math.max(-12, Math.min(12, TARGET - r.lv)), 0.8); }
  }
  function route(a) {
    try {
      if (!a || a._noLoud || !okSrc(a) || typeof G.AudioContext === "undefined" && typeof G.webkitAudioContext === "undefined") return;
      const ctx = elCtx(); if (ctx.state !== "running") { const p = ctx.resume(); if (p && p.catch) p.catch(() => {}); }
      let r = EL.map.get(a);
      if (!r) { const g = ctx.createGain(); g.gain.value = 0; const s = ctx.createMediaElementSource(a); s.connect(g); g.connect(EL.lim);
        r = { g }; try { const k = kNodes(ctx); const an = ctx.createAnalyser(); an.fftSize = 4096; s.connect(k.input); k.output.connect(an); r.an = an; } catch {}
        EL.map.set(a, r); EL.list.add(a); if (!EL.t) EL.t = setInterval(liveTick, 200); }
      measure(a, r);
    } catch {}
  }
  if (G.HTMLMediaElement && G.document && !G.HTMLMediaElement.prototype.__loudWrapped) {
    const P0 = G.HTMLMediaElement.prototype.play;
    G.HTMLMediaElement.prototype.play = function () { if (G.HTMLAudioElement && this instanceof G.HTMLAudioElement) route(this); return P0.apply(this, arguments); };
    G.HTMLMediaElement.prototype.__loudWrapped = true;
    G.document.addEventListener("play", (e) => { if (G.HTMLAudioElement && e.target instanceof G.HTMLAudioElement) route(e.target); }, true);   // 재생 버튼(controls)으로 튼 것
  }
  api.route = route; api._el = EL;
  if (typeof module !== "undefined" && module.exports) module.exports = api; else G.Loud = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
