// (사용자 2026-11-04 17:27·17:36) 원장 모드 '멜로다인 프로젝트' 1단계 — 원장 계정에만. 강사 화면(tune.js 기본 고치기)은 그대로.
// 음 하나: 흐름(드리프트·앞/뒤 기울기) · 이어짐(길이·곡선 모양) · 비브라토(원래 떨림 %, 새 비브라토 주기·폭·시작·커지는 시간·사람처럼) · 볼륨(dB, 맨 아래 = 무음 · 페이드)
// 곡 전체: 자동 보정 강도 · 가까운 음 그대로 · 흐름 평평하게 · 볼륨 고르게 · 치찰음 · 목소리 결 · 되돌리기 여러 단계 · MIDI 내보내기
// 저장 = st.onAdv({notes, global}) (화면 시간 — 선생님 앱이 원래 녹음 시간으로 바꿔 메이크업요청.json note_edits에) · 진짜 소리는 '완성본 다시 만들기' 뒤(서버 note_edits.py)
// 음정선 미리보기 = 서버 shape_pitch와 같은 규칙(사람처럼 흔들기 제외)을 '보정 후' 선에 그려 줌. 볼륨·치찰음·목소리 결은 그림에 안 보임(완성본에서 확인).
(function (G) {
  "use strict";
  const N_DEF = { drift: 1, tilt: 0, tilt_in: 0, tilt_out: 0, vib: 1, tr_ms: 0, gain_db: 0, fade_in: 0, fade_out: 0, formant: 0 };
  const DRIFT_WIN = 0.25;
  const D = (row, t) => { row._desc = t; return row; };   // 설명 한 줄을 붙인 칸
  const near = (a, b) => Math.abs(a - b) < 0.02;
  const clone = (x) => JSON.parse(JSON.stringify(x || {}));
  const r2 = (x) => Math.round(x * 100) / 100;

  // ── 상태(전체화면 하나당 하나) ──
  function state(st) {
    if (st._adv) return st._adv;
    const ne = clone(typeof st.advGet === "function" ? st.advGet() : {});
    ne.notes = Array.isArray(ne.notes) ? ne.notes : []; ne.global = ne.global && typeof ne.global === "object" ? ne.global : {};
    return (st._adv = { ne, hist: [], tm: null });
  }
  function noteOf(A, b, make) {
    let n = A.ne.notes.find(x => near(x.t0, b.t0) && near(x.t1, b.t1));
    if (!n && make) { n = { t0: r2(b.t0), t1: r2(b.t1) }; A.ne.notes.push(n); A.ne.notes.sort((x, y) => x.t0 - y.t0); }
    return n || null;
  }
  function clean(A) {   // 기본값과 같은 칸은 지움 → 고친 게 없는 음은 목록에서 뺌
    A.ne.notes = A.ne.notes.filter(n => {
      for (const k in N_DEF) if (k in n && Math.abs(n[k] - N_DEF[k]) < 1e-9) delete n[k];
      if (!n.tr_ms) delete n.tr_shape;
      if (n.mute === false) delete n.mute;
      if (n.vs && !(n.vs.depth > 0)) delete n.vs;
      return Object.keys(n).some(k => k !== "t0" && k !== "t1");
    });
    const g = A.ne.global;
    for (const [k, d] of [["ref_hz", 440], ["flat", 1], ["sib_db", 0], ["formant", 0], ["strength", 1], ["near", 8]]) if (k in g && Math.abs(g[k] - d) < 1e-9) delete g[k];
    if (g.level && !g.level.quiet && !g.level.loud) delete g.level;
    if (Array.isArray(g.uv_gain)) { g.uv_gain = g.uv_gain.filter(r => r && (r.s_db || r.b_db)); if (!g.uv_gain.length) delete g.uv_gain; }
    if (Array.isArray(g.uv_fix) && !g.uv_fix.length) delete g.uv_fix;
    if (Array.isArray(g.draw) && !g.draw.length) delete g.draw;
  }
  function change(A, st, cv, fn) {   // 고침 1번 = 되돌리기 1칸 · 그림 바로 · 저장은 0.4초 모아서
    A.hist.push(JSON.stringify(A.ne)); if (A.hist.length > 100) A.hist.shift();
    fn(); clean(A); preview(cv, A.ne);
    clearTimeout(A.tm); A.tm = setTimeout(() => save(A, st), 400);
  }
  function save(A, st) { clearTimeout(A.tm); A.tm = null; try { const p = st.onAdv && st.onAdv(clone(A.ne)); if (p && p.catch) p.catch(() => {}); } catch {} }
  function undo(A, st, cv) { const s = A.hist.pop(); if (!s) return false; A.ne = JSON.parse(s); preview(cv, A.ne); save(A, st); return true; }

  // ── 음정선 미리보기(서버 note_edits.shape_pitch와 같은 규칙) ──
  function corrCol(cv) { const L = cv.levels || []; return L.length ? 2 + L.length - 1 : 0; }
  function smooth(x, t, win) {
    const n = x.length, c = new Float64Array(n + 1); for (let i = 0; i < n; i++) c[i + 1] = c[i] + x[i];
    const out = new Array(n); let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) { while (t[lo] < t[i] - win / 2) lo++; while (hi < n && t[hi] <= t[i] + win / 2) hi++; out[i] = (c[hi] - c[lo]) / Math.max(1, hi - lo); }
    return out;
  }
  function shapeNote(n, tt, pp) {   // tt·pp: 그 음 안 점들 → 새 음높이
    if (pp.length < 3) return pp;
    const srt = pp.slice().sort((a, b) => a - b), h = srt.length >> 1, T = srt.length % 2 ? srt[h] : (srt[h - 1] + srt[h]) / 2, d = pp.map(v => v - T), slow = smooth(d, tt, DRIFT_WIN);
    const vib = n.vib != null ? n.vib : (n.vs ? 0 : 1), dr = n.drift != null ? n.drift : 1, dur = tt[tt.length - 1] - tt[0];
    const L = n.tilt_len || Math.min(0.4, Math.max(0.03, 0.3 * dur));
    return pp.map((_, i) => {
      let v = dr * slow[i] + vib * (d[i] - slow[i]);
      if (n.tilt && dur > 0) v += n.tilt * ((tt[i] - tt[0]) / dur - 0.5);   // (11/06 18:54 사용자) 흐름 = 음 전체 기울기(가운데 기준, 시작 −절반 → 끝 +절반)
      if (n.tilt_in) { const x = Math.min(1, Math.max(0, (tt[i] - tt[0]) / L)); v += n.tilt_in * (1 - x) ** 2; }
      if (n.tilt_out) { const x = Math.min(1, Math.max(0, (tt[tt.length - 1] - tt[i]) / L)); v += n.tilt_out * (1 - x) ** 2; }
      if (n.vs) { const u = tt[i] - tt[0] - n.vs.delay; if (u >= 0) { const env = n.vs.fade > 0 ? Math.min(1, u / n.vs.fade) : 1; v += n.vs.depth * env * Math.sin(2 * Math.PI * n.vs.rate * u); } }
      return T + v;
    });
  }
  function preview(cv, ne) {
    const k = corrCol(cv); if (!k || !cv.pts) return;
    const base = cv._advBase || (cv._advBase = cv.pts.map(p => p[k]));
    cv.pts.forEach((p, i) => { p[k] = base[i]; });
    const g = (ne && ne.global) || {}, notes = ((ne && ne.notes) || []).slice();
    const idx = (a, b) => { const out = []; cv.pts.forEach((p, i) => { if (p[0] >= a && p[0] <= b && p[k] != null) out.push(i); }); return out; };
    for (const n of notes) {
      if (!["drift", "vib", "vs", "tilt", "tilt_in", "tilt_out"].some(x => x in n) && g.flat == null) continue;
      const ii = idx(n.t0, n.t1); if (ii.length < 3) continue;
      const nn = g.flat != null && n.drift == null ? { ...n, drift: g.flat } : n;
      const res = shapeNote(nn, ii.map(i => cv.pts[i][0]), ii.map(i => base[i]));
      ii.forEach((i, j) => { cv.pts[i][k] = res[j]; });
    }
    for (const n of notes) {   // 이어짐
      if (!n.tr_ms) continue;
      const after = cv.pts.find(p => p[0] > n.t1 + 0.005 && p[k] != null); if (!after || after[0] - n.t1 > 0.12) continue;
      const tb = (n.t1 + after[0]) / 2, w = n.tr_ms / 2000, ii = idx(tb - w, tb + w); if (ii.length < 2) continue;
      const pa = cv.pts[Math.max(0, ii[0] - 1)][k], pb = cv.pts[Math.min(cv.pts.length - 1, ii[ii.length - 1] + 1)][k];
      if (pa == null || pb == null) continue;
      ii.forEach(i => { const x = Math.min(1, Math.max(0, (cv.pts[i][0] - (tb - w)) / (2 * w))), s = n.tr_shape || "s";
        const kk = s === "lin" ? x : s === "step" ? (x >= 0.5 ? 1 : 0) : x * x * (3 - 2 * x); cv.pts[i][k] = pa + (pb - pa) * kk; });
    }
    for (const d of g.draw || []) {   // (11/06) 펜으로 그린 선 — 서버 note_edits.shape_pitch와 같은 규칙(가장자리 30ms 섞음)
      const P = d.pts || []; if (P.length < 2) continue; const long = d.t1 - d.t0 > 2 * DRAW_EDGE;
      cv.pts.forEach(p => { if (p[k] == null || p[0] < d.t0 || p[0] > d.t1) return; const want = interp(P, p[0]), e = Math.min(p[0] - d.t0, d.t1 - p[0]), w = long ? Math.min(1, Math.max(0, e / DRAW_EDGE)) : 1; p[k] = p[k] * (1 - w) + want * w; });
    }
    if (g.ref_hz && g.ref_hz !== 440) { const off = 1200 * Math.log2(g.ref_hz / 440), kt = cv.target ? 2 + (cv.levels || []).length : 0;
      cv.pts.forEach(p => { if (p[k] != null && (!kt || p[kt] != null)) p[k] += off; }); }
  }
  const DRAW_EDGE = 0.03;
  function interp(P, x) { if (x <= P[0][0]) return P[0][1]; if (x >= P[P.length - 1][0]) return P[P.length - 1][1]; let lo = 0, hi = P.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (P[m][0] <= x) lo = m; else hi = m; } const a = P[lo], b = P[hi]; return a[1] + (b[1] - a[1]) * (x - a[0]) / Math.max(1e-9, b[0] - a[0]); }
  // ── 펜으로 그리기(11/06 사용자 '고급 보정 다음 단계': 멜로다인 Pitch Draw) — 손으로 그린 점들 → 10ms마다 고르게 + 살짝 매끈하게 → global.draw ──
  function cleanStroke(raw) {
    const q = raw.filter(p => Number.isFinite(p[0]) && Number.isFinite(p[1])).sort((a, b) => a[0] - b[0]); if (q.length < 3) return null;
    const t0 = q[0][0], t1 = q[q.length - 1][0]; if (t1 - t0 < 0.05) return null;
    const out = []; for (let t = t0; t <= t1 + 1e-9; t += 0.01) out.push([Math.round(t * 1000) / 1000, interp(q, t)]);
    const sm = out.map((p, i) => { let s_ = 0, n = 0; for (let j = Math.max(0, i - 2); j <= Math.min(out.length - 1, i + 2); j++) { s_ += out[j][1]; n++; } return [p[0], Math.round(s_ / n * 10) / 10]; });   // 손떨림만 살짝(±20ms)
    return { t0: sm[0][0], t1: sm[sm.length - 1][0], pts: sm };
  }
  function addDraw(st, cv, raw) {
    const d = cleanStroke(raw); if (!d) return null; const A = state(st);
    change(A, st, cv, () => { const g = A.ne.global; g.draw = (g.draw || []).filter(x => x.t1 <= d.t0 || x.t0 >= d.t1); g.draw.push(d); g.draw.sort((a, b) => a.t0 - b.t0); });
    return d;
  }
  function drawAt(st, t) { const A = state(st); return (A.ne.global.draw || []).find(x => t >= x.t0 - 0.05 && t <= x.t1 + 0.05) || null; }
  function removeDraw(st, cv, d) { const A = state(st); change(A, st, cv, () => { A.ne.global.draw = (A.ne.global.draw || []).filter(x => !(near(x.t0, d.t0) && near(x.t1, d.t1))); }); }
  function flatNote(st, cv, b) { const A = state(st); change(A, st, cv, () => { const n = noteOf(A, b, true); n.drift = 0; }); }   // 두 번 톡 맞춤: 흐름 평평하게

  // ── 조절 줄(− 값 +) — 손가락으로 누르기 쉽게 44px · 꾹 누르면 계속 ──
  // (11/06 18:21 사용자 시안 승인) −/+ 버튼 → 끌어서 조절하는 칸: 좌우(또는 위아래)로 끌기 = 값 · 톡 = 한 칸(왼쪽 절반 내림·오른쪽 절반 올림) · 두 번 톡 = 원래 값
  // 한 칸마다 짧은 진동, 원래 값에 닿으면 조금 센 진동 + 살짝 붙음 · 끄는 동안 위에 큰 숫자 · 빨리 끌면 성큼 · 손 뗀 뒤 0.4초 모아 한 번 저장(change)
  const vib = (ms) => { try { navigator.vibrate && navigator.vibrate(Math.max(20, ms)); } catch {} };
  // (11/06 19:01 사용자 시안) 칸 뒤에 기능을 상징하는 희미한 선 그림 — 흐름은 지금 값만큼 기울어짐 · 떨림 폭·원래 떨림은 값만큼 출렁임
  const wave = (amp, cyc, f) => { let d = ""; for (let i = 0; i <= 60; i++) { const x = i / 60, a = typeof f === "function" ? f(x) : 1; d += `${i ? "L" : "M"}${(6 + x * 88).toFixed(1)} ${(20 - amp * a * Math.sin(x * cyc * 2 * Math.PI)).toFixed(1)}`; } return d; };
  const arrowV = (x, y0, y1) => `M${x} ${y0} L${x} ${y1} M${x - 2.5} ${y0 + 4} L${x} ${y0} L${x + 2.5} ${y0 + 4} M${x - 2.5} ${y1 - 4} L${x} ${y1} L${x + 2.5} ${y1 - 4}`;   // ↕
  const arrowH = (x0, x1, y) => `M${x0} ${y} L${x1} ${y} M${x0 + 4} ${y - 3} L${x0} ${y} L${x0 + 4} ${y + 3} M${x1 - 4} ${y - 3} L${x1} ${y} L${x1 - 4} ${y + 3}`;   // ↔
  const ICO = {
    // 흐름: 가운데 축(점)을 중심으로 기울어지는 선 + 수평 기준 점선 + 양끝 위아래 화살표(기울일 수 있음) · 0이면 살짝 기운 두 선이 흐리게(움직일 수 있다는 뜻)
    tilt: (v) => { const k = Math.abs(v || 0), h = k ? Math.sign(v) * Math.min(17, 7 + 10 * k / 300) : 0;   // 조금만 바꿔도 잘 보이게 더 기울임
      return `M6 ${20 + h} L94 ${20 - h} M48 20 m-1.6 0 a1.6 1.6 0 1 0 3.2 0 a1.6 1.6 0 1 0 -3.2 0 ` + arrowV(8, 5, 35) + " " + arrowV(92, 5, 35) + (k ? "||M6 20 L94 20" : "||M6 30 L94 10 M6 10 L94 30"); },   // 점선: 바꿨으면 수평 기준 · 그대로면 기울일 수 있는 두 방향
    tr: () => "M6 30 L34 30 C50 30 50 10 66 10 L94 10",
    vib: (v) => { const k = Math.min(2, v == null ? 1 : v); return wave(6 * k, 4) + "||" + wave(6, 4); },   // 원래 떨림: 점선 = 부른 그대로(100%) · 실선 = 지금 남길 만큼(0% 평평 · 200% 두 배)
    depth: (v) => { const A = v ? Math.min(14, 8 + 6 * Math.min(150, v) / 150) : 0; return v ? wave(A, 3) + " " + arrowV(72, 20 - A, 20 + A) : "M6 20 L94 20||" + wave(10, 3) + " " + arrowV(72, 10, 30); },   // 떨림 폭 = 위아래 폭(↕) · 없음이면 평평한 선 + 흐린 점선 물결   // 떨림 폭 = 위아래 폭(↕)
    rate: () => wave(9, 3) + " " + arrowH(14.3, 43.7, 36),   // 주기 = 한 번 출렁이는 좌우 길이(↔)
    delay: () => wave(8, 3, (x) => (x < 0.22 ? 0 : 1)) + " M25.4 1 L25.4 13 M22.4 9 L25.4 13 L28.4 9",   // 시작 = 떨림이 시작되는 곳 ↓
    fade: () => wave(12, 4, (x) => (x < 0.3 ? 0 : Math.min(1, (x - 0.3) / 0.6))) + " M70 10 L93 2 M87.6 1.6 L93 2 L89.4 6.4",   // 커지는 시간 = 곧은 음 → 점점 커지는 비브라토 + 비스듬히 오르는 화살표   // 곧은 음 → 점점 커지는 비브라토
    human: () => { let d = "", seg = [[0, 0.17, 1], [0.17, 0.27, 0.6], [0.27, 0.47, 1.15], [0.47, 0.58, 0.75], [0.58, 0.8, 1.05], [0.8, 0.9, 0.55], [0.9, 1, 0.9]];   // 사람처럼 = 한 번 한 번 길이·높이가 다른 사인파
      for (let i = 0; i <= 80; i++) { const x = i / 80, sg = seg.find(q => x <= q[1]) || seg[seg.length - 1], u = (x - sg[0]) / (sg[1] - sg[0]); d += `${i ? "L" : "M"}${(6 + x * 88).toFixed(1)} ${(20 - 10 * sg[2] * Math.sin(u * 2 * Math.PI)).toFixed(1)}`; } return d; },
    // 볼륨: 스피커 + 소리 물결(값이 클수록 물결 수↑ · 무음이면 ✕)
    gain: (v) => { const n = v <= -25 ? -1 : v < -8 ? 1 : v < 3 ? 2 : 3; let d = "M4 14 L11 14 L21 5 L21 35 L11 26 L4 26 Z";
      if (n < 0) return d + " M28 13 L42 27 M42 13 L28 27"; for (let k = 0; k < n; k++) { const r = 6 + k * 6.5; d += ` M${23 + r * 0.4} ${20 - r} A${r} ${r} 0 0 1 ${23 + r * 0.4} ${20 + r}`; } return d; },
    fin: () => "M6 34 L50 8 L94 8",
    fout: () => "M6 8 L50 8 L94 34" };
  const ICO_MEET = { gain: "xMinYMid meet" };
  const ICO_OF = { "흐름": "tilt", "이어짐": "tr", "원래 떨림": "vib", "떨림 폭": "depth", "새 떨림 폭": "depth", "주기": "rate", "시작": "delay", "커지는 시간": "fade", "사람처럼": "human", "볼륨": "gain", "페이드 인": "fin", "페이드 아웃": "fout" };
  // (11/06 21:53 사용자) 칸을 누르면 아래 안내 줄에 그 칸 설명
  const DESC = {
    "흐름": "이 음 전체를 비스듬히 기울여요 · ↗ + 는 끝으로 갈수록 올라가고, ↘ − 는 내려가요",
    "이어짐": "다음 음으로 넘어가는 시간 · 길수록 미끄러지듯, 짧을수록 딱 끊어서(다음 음이 바로 붙어 있을 때만)",
    "원래 떨림": "부른 떨림을 얼마나 남길지 · 0% 곧게 펴기 · 100% 그대로 · 200% 두 배",
    "떨림 폭": "새로 넣는 떨림의 위아래 폭(100센트 = 반음) · 자연스러운 범위는 ±20~50센트",
    "주기": "새 떨림이 1초에 몇 번 출렁이는지 · 보통 5~6.5Hz(떨림 폭을 넣었을 때만)",
    "시작": "음이 시작되고 몇 초 뒤부터 떨기 시작할지(떨림 폭을 넣었을 때만)",
    "커지는 시간": "떨림이 시작돼 다 커질 때까지 · 길수록 곧은 음에서 서서히 비브라토로(떨림 폭을 넣었을 때만)",
    "사람처럼": "새 떨림의 빠르기·폭을 조금씩 불규칙하게 · 0%는 기계처럼 일정(떨림 폭을 넣었을 때만)",
    "볼륨": "이 음만 크게·작게(dB) · −24dB 밑으로 내리면 무음",
    "페이드 인": "음 시작을 소리 0에서 서서히 키우는 시간",
    "페이드 아웃": "음 끝을 서서히 줄여 0으로 만드는 시간",
    "위치": "이 음을 일찍(‹)·늦게(›) 옮겨요 · 0.02초씩",
    "길이": "이 음 끝을 짧게(‹)·길게(›) · 0.02초씩" };
  let scTipShown = false;
  function scrub(label, get, set, o, inLabel, en) {
    const c = document.createElement("div"); c.className = "advSc" + (o.vert ? " vert" : ""); c.tabIndex = 0; c.setAttribute("role", "slider"); c.setAttribute("aria-label", label + " (좌우로 밀어 조절 · 두 번 톡 = 원래 값)");
    c.innerHTML = `<i class="advScA a1">${o.vert ? "▴" : "‹"}</i>${inLabel ? `<small class="advScL">${label}${en ? `<em>${en}</em>` : ""}</small>` : ""}<b class="advV"></b><i class="advScA a2">${o.vert ? "▾" : "›"}</i><i class="advScT"></i>`;
    const icoK = o.ico || ICO_OF[label]; if (icoK) { const sv = document.createElementNS("http://www.w3.org/2000/svg", "svg"); sv.setAttribute("class", "advScI"); sv.setAttribute("viewBox", "0 0 100 40"); sv.setAttribute("preserveAspectRatio", ICO_MEET[icoK] || "none"); sv.setAttribute("aria-hidden", "true"); sv.innerHTML = `<path class="ln" d="" /><path class="dash" d="" />`; c.insertBefore(sv, c.firstChild); }
    const icoP = c.querySelector(".advScI .ln"), icoD = c.querySelector(".advScI .dash"), icoPaint = () => { if (!icoP) return; const [d1, d2] = ICO[icoK](get(), o).split("||"); icoP.setAttribute("d", d1); icoD.setAttribute("d", d2 || ""); };
    const out = c.querySelector(".advV"), q = (v) => Math.min(o.max, Math.max(o.min, +(Math.round(v / o.step) * o.step).toFixed(4)));
    const paint = () => { const v = get(); icoPaint(); out.textContent = o.fmt(v); const on = Math.abs(v - o.def) > 1e-9; c.classList.toggle("on", on); c.setAttribute("aria-valuetext", o.fmt(v)); return on; };
    const put = (v) => { v = q(v); if (Math.abs(v - get()) < 1e-9) return false; set(v); paint(); return true; };
    const sgn = o.inv ? -1 : 1;   // inv = 화면에 −로 보이는 값: 왼쪽(−)으로 끌면 숫자가 더 마이너스로
    let d = null, lastTap = 0, bub = null;
    const bubble = (on) => { if (on && !bub) { bub = document.createElement("span"); bub.className = "advScB"; c.appendChild(bub); } if (bub) { if (on) bub.textContent = o.fmt(get()); else { bub.remove(); bub = null; } } };
    c.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); try { c.setPointerCapture(e.pointerId); } catch {} const ds = o.desc || DESC[label], tp = ds && c.closest(".advBody") && c.closest(".advBody").querySelector(".advTip"); if (tp) { tp.innerHTML = ""; const bb = document.createElement("b"); bb.textContent = label + " · "; tp.append(bb, ds); tp.classList.add("desc"); } d = { id: e.pointerId, x: e.clientX, y: e.clientY, v0: get(), n: 0, drag: false, home: Math.abs(get() - o.def) < 1e-9 }; });
    c.addEventListener("pointermove", (e) => { if (!d || e.pointerId !== d.id) return; const dx_ = e.clientX - d.x, dy_ = d.y - e.clientY; if (!d.ax && Math.max(Math.abs(dx_), Math.abs(dy_)) >= 7) d.ax = Math.abs(dy_) > Math.abs(dx_) ? "v" : "h"; const dd = d.ax === "v" ? dy_ : d.ax === "h" ? dx_ : 0;   // 오른쪽·위 = 올림 · 처음 움직인 방향 하나만 씀(대각선으로 움직여도 서로 지워지지 않게)
      if (!d.drag) { if (Math.abs(dd) < 7) return; d.drag = true; c.classList.add("act"); bubble(true); }
      const a = Math.max(0, Math.abs(dd) - 7) / 16, k = Math.sign(dd) * (a + a * a / 30);   // 빨리(멀리) 끌수록 성큼
      let n = Math.trunc(k); const nDef = (o.def - d.v0) / o.step * sgn;
      if (Math.abs(k - nDef) < 0.7 && Math.abs(nDef - Math.round(nDef)) < 1e-6) n = Math.round(nDef);   // 원래 값 근처면 거기 붙음
      if (n === d.n) return; d.n = n; if (put(d.v0 + n * o.step * sgn)) { const home = Math.abs(get() - o.def) < 1e-9; vib(home ? 40 : 15); d.home = home; bubble(true); } });
    const end = (e) => { if (!d || (e && e.pointerId !== d.id)) return; const was = d; d = null; c.classList.remove("act"); bubble(false);
      if (was.drag || !e || e.type !== "pointerup") return;
      const now = Date.now(); if (now - lastTap < 320) { lastTap = 0; put(o.def); vib(40); return; }   // 두 번 톡 = 원래 값
      lastTap = now; const r = c.getBoundingClientRect(); if (put(get() + ((o.vert ? e.clientY > r.top + r.height / 2 : e.clientX < r.left + r.width / 2) ? -1 : 1) * o.step * sgn)) vib(15); };   // 세로 칸: 위 절반 톡 = 올림 · 아래 절반 = 내림
    c.addEventListener("pointerup", end); c.addEventListener("pointercancel", end); c.addEventListener("lostpointercapture", () => { if (d) end(null); });
    c.addEventListener("keydown", (e) => { const k = e.key; if (k === "ArrowRight" || k === "ArrowUp") put(get() + o.step * sgn); else if (k === "ArrowLeft" || k === "ArrowDown") put(get() - o.step * sgn); else if (k === "Enter" || k === "0") put(o.def); else return; e.preventDefault(); e.stopPropagation(); });
    c.addEventListener("dblclick", (e) => { e.preventDefault(); put(o.def); });   // 마우스 두 번 클릭
    paint(); c._paint = paint;
    if (!scTipShown) { let seen = false; try { seen = localStorage.getItem("adv_scrub_tip_v1") === "1"; } catch {} if (!seen) { scTipShown = true; try { localStorage.setItem("adv_scrub_tip_v1", "1"); } catch {}
      setTimeout(() => { if (!c.isConnected || d) return; const t = document.createElement("span"); t.className = "advScB tip"; t.textContent = "↔ 좌우로 밀어 조절 · 두 번 톡 = 원래 값"; c.appendChild(t); setTimeout(() => t.remove(), 3200); }, 300); } }
    return c;
  }
  function stepper(label, get, set, o) {   // [이름 ……… (‹ 값 ›)] 한 줄 — 칸은 끌어서 조절
    const row = document.createElement("div"); row.className = "advRow";
    row.innerHTML = `<span class="advL">${label}</span>`; const c = scrub(label, get, set, o, false); row.appendChild(c);
    const paint = () => { row.classList.toggle("on", c._paint()); }; paint(); row._paint = paint; row._sc = { label, get, set, o }; return row;
  }
  function cells(...rows) {   // (11/06) 이름을 칸 안에 넣어 한 줄에 여러 칸: [느린 흐름 100%] [앞 −10] [뒤 0]
    const row = document.createElement("div"); row.className = "advCells";
    const cs = rows.map(r => { if (r.nodeType && !r._sc) return r; const sc = r._sc, cc = scrub(r._lab || sc.label, sc.get, sc.set, sc.o, true, r._en); return cc; });
    row.append(...cs); row._paint = () => cs.forEach(x => x._paint && x._paint()); return row;
  }
  const lab = (r, t, en) => { r._lab = t; r._en = en; return r; };
  function duo(r1, r2_, l1, l2) {   // 조절 줄 두 개를 한 줄로: [앞 − 값 +] [뒤 − 값 +]
    const row = document.createElement("div"); row.className = "advDuo";
    r1.querySelector(".advL").textContent = l1; r2_.querySelector(".advL").textContent = l2;
    row.append(r1, r2_); row._paint = () => { r1._paint(); r2_._paint(); }; return row;
  }
  function chips(label, opts, get, set) {
    const row = document.createElement("div"); row.className = "advRow";
    row.innerHTML = `<span class="advL">${label}</span><span class="advChips">${opts.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("")}</span>`;
    const paint = () => row.querySelectorAll("[data-v]").forEach(b => b.classList.toggle("on", String(get()) === b.dataset.v));
    row.querySelectorAll("[data-v]").forEach(b => b.onclick = (e) => { e.stopPropagation(); set(b.dataset.v); paint(); });
    paint(); row._paint = paint; return row;
  }
  const pct = (v) => `${Math.round(v * 100)}%`, cents = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}센트`, sec = (v) => `${v.toFixed(2)}초`;

  // ── 음 하나 고급 조절 칸(고치기 창 안 '🎛 고급' 모드) ──
  function panel(box, b, st, cv) {
    const A = state(st);
    let el = box.querySelector(".advPanel"); if (el) el.remove();
    el = document.createElement("div"); el.className = "advPanel tfA";
    const tabs = [["f", "흐름"], ["v", "비브라토"]];   // (11/09 01:21 사용자 고고) 볼륨은 흐름 탭 안으로 · 음별 포먼트 탭 뺌(높이·길이를 고쳐도 엔진이 목소리 결을 그대로 지킴, 곡 전체 포먼트는 일괄 보정에)   // (11/06 18:50 사용자) 이어짐 탭은 흐름 탭으로 합침(곡선은 늘 부드럽게)
    el.innerHTML = `<div class="advTabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" data-at="${k}">${t}</button>`).join("")}<button type="button" class="advRst" aria-label="이 음 고급 고침 원래대로">↺ 이 음</button></div><div class="advBody"></div>`;
    const body = el.querySelector(".advBody");
    const N = () => noteOf(A, b, false) || {};
    const put = (k, v) => change(A, st, cv, () => { const n = noteOf(A, b, true); n[k] = v; });
    const dur_ = Math.max(0.05, b.t1 - b.t0), VD = { rate: 5.5, depth: 0, delay: Math.min(0.3, r2(dur_ * 0.25)), fade: Math.min(0.4, r2(dur_ * 0.35)) };   // 짧은 음(0.6초 안팎)에서도 새 떨림이 보이게: 시작·커지는 시간은 음 길이에 맞춰 줄임
    const putVs = (k, v) => change(A, st, cv, () => { const n = noteOf(A, b, true); n.vs = Object.assign({}, VD, n.vs || {}); n.vs[k] = v; });
    const MUTE_DB = -25;   // 볼륨을 −24dB 밑으로 더 내리면 '무음'(= 예전 소리 끄기)
    const get = (k) => (N()[k] != null ? N()[k] : N_DEF[k]);
    const getVs = (k, d) => (N().vs && N().vs[k] != null ? N().vs[k] : (k in VD ? VD[k] : d));
    const show = (k) => {
      st._advTab = k; el.querySelectorAll("[data-at]").forEach(x => x.classList.toggle("on", x.dataset.at === k)); body.innerHTML = "";
      const rows = [];
      if (k === "f" || k === "c") {   // (11/06 18:54 사용자) 흐름 탭 한 줄: [흐름 = 음 전체 기울기] [이어짐 = 다음 음으로 넘어가기(늘 부드럽게)] · 앞·뒤 기울기 칸은 뺌
        const tl = lab(stepper("흐름", () => get("tilt"), (v) => put("tilt", v), { step: 10, min: -300, max: 300, def: 0, vert: true, fmt: (v) => (v ? `${v > 0 ? "↗ +" : "↘ −"}${Math.abs(Math.round(v))}센트` : "평평 그대로") }), "흐름", "Drift");
        const trC = lab(stepper("이어짐", () => get("tr_ms"), (v) => change(A, st, cv, () => { const n = noteOf(A, b, true); if (v) n.tr_ms = v; else delete n.tr_ms; delete n.tr_shape; }), { step: 20, min: 0, max: 800, def: 0, fmt: (v) => v ? `${Math.round(v)}ms` : "그대로" }), "이어짐", "Transition");
        const vlC = lab(stepper("볼륨", () => (N().mute ? MUTE_DB : get("gain_db")), (v) => change(A, st, cv, () => { const n = noteOf(A, b, true); if (v <= MUTE_DB) { n.mute = true; delete n.gain_db; } else { n.mute = false; n.gain_db = v; } }), { step: 1, min: MUTE_DB, max: 12, def: 0, fmt: (v) => (v <= MUTE_DB ? "무음" : `${v > 0 ? "+" : ""}${Math.round(v)}dB`) }), "볼륨");   // (11/09 01:21) 볼륨 = 흐름 탭 셋째 칸(페이드 인·아웃 칸은 삭제)
        rows.push(cells(tl, trC, vlC)); }
      if (k === "v") rows.push(   // (11/06 18:25 사용자 시안) 6줄 → 3칸 × 2줄
        cells(lab(stepper("원래 떨림", () => (N().vib != null ? N().vib : (N().vs ? 0 : 1)), (v) => put("vib", v), { step: 0.25, min: 0, max: 2, def: 1, vert: true, fmt: pct }), "원래 떨림"), lab(stepper("새 떨림 폭", () => getVs("depth", 0), (v) => putVs("depth", v), { step: 5, min: 0, max: 150, def: 0, vert: true, fmt: (v) => v ? `±${Math.round(v)}센트` : "없음" }), "떨림 폭"), lab(stepper("주기", () => getVs("rate", 5.5), (v) => putVs("rate", v), { step: 0.25, min: 2, max: 10, def: 5.5, fmt: (v) => `${v.toFixed(2)}Hz` }), "주기")),
        cells(lab(stepper("시작", () => getVs("delay", 0.3), (v) => putVs("delay", v), { step: 0.05, min: 0, max: 3, def: VD.delay, fmt: sec }), "시작"), lab(stepper("커지는 시간", () => getVs("fade", 0.4), (v) => putVs("fade", v), { step: 0.05, min: 0, max: 3, def: VD.fade, fmt: sec }), "커지는 시간"), lab(stepper("사람처럼", () => getVs("human", 0), (v) => putVs("human", v), { step: 0.25, min: 0, max: 1, def: 0, fmt: pct }), "사람처럼")));
      rows.forEach(r => { if (!r._desc) { body.appendChild(r); return; } const w = document.createElement("div"), p = document.createElement("p"); p.className = "advD"; p.textContent = r._desc; w.appendChild(r); w.appendChild(p); body.appendChild(w); });
      const tip = document.createElement("p"); tip.className = "advTip";
      tip.textContent = k === "m" ? "포먼트는 ▶로 서버와 같은 소리가 들려요(선엔 안 보여요) · 고친 뒤 잠깐 준비해요" : "칸을 누르면 여기에 그 칸 설명이 나와요 · 밀어서 조절 · 두 번 톡 = 원래 값";   // (11/06 21:53 사용자) 긴 안내 대신 누른 칸 설명
      body.appendChild(tip);
    };
    el.querySelectorAll("[data-at]").forEach(x => x.onclick = (e) => { e.stopPropagation(); show(x.dataset.at); });
    el.querySelector(".advRst").onclick = (e) => { e.stopPropagation(); change(A, st, cv, () => { A.ne.notes = A.ne.notes.filter(x => !(near(x.t0, b.t0) && near(x.t1, b.t1))); }); show((tabs.some(x => x[0] === st._advTab) ? st._advTab : "f")); };
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    box.appendChild(el); show((tabs.some(x => x[0] === st._advTab) ? st._advTab : "f"));
    return el;
  }


  // ── 치찰음·호흡(11/04 23:41 사용자: 멜로다인처럼 구분 · 구간 골라 위아래로 끌면 치찰음만 볼륨) ──
  // 서버(consonants.py)가 찾은 자리 = cv.uv [[t0,t1,"s"|"b"]] (화면 시간). 선생님 이름표 고침 = global.uv_fix, 구간 볼륨 = global.uv_gain
  const UV_NAME = { s: "치찰음", b: "호흡", n: "아님" };
  function uvList(cv, st) {
    let out = (cv && Array.isArray(cv.uv) ? cv.uv : []).filter(u => Array.isArray(u) && u[1] > u[0] && (u[2] === "s" || u[2] === "b")).map(u => [u[0], u[1], u[2], false]);
    const fx = st && st._adv ? (st._adv.ne.global.uv_fix || []) : (st && typeof st.advGet === "function" ? ((st.advGet() || {}).global || {}).uv_fix || [] : []);
    for (const f of fx) { if (!(f.t1 > f.t0)) continue; out = out.filter(u => u[1] <= f.t0 || u[0] >= f.t1); out.push([f.t0, f.t1, f.kind, true]); }
    return out.sort((a, b) => a[0] - b[0]);
  }
  function relabel(st, cv, u) {   // 빗금 톡: 치찰음 → 호흡 → 아님 → 치찰음
    const A = state(st), nx = { s: "b", b: "n", n: "s" }[u[2]] || "s";
    change(A, st, cv, () => { const g = A.ne.global, L = (g.uv_fix || []).filter(f => !(near(f.t0, u[0]) && near(f.t1, u[1]))); L.push({ t0: r2(u[0]), t1: r2(u[1]), kind: nx }); g.uv_fix = L; });
    return nx;
  }
  function uvSheet(host, st, cv, rg) {
    const A = state(st), a = Math.min(rg[0], rg[1]), b = Math.max(rg[0], rg[1]);
    document.getElementById("advUv")?.remove();
    const segs = uvList(cv, st).filter(u => u[2] !== "n" && u[1] > a && u[0] < b), ns = segs.filter(u => u[2] === "s").length, nb = segs.filter(u => u[2] === "b").length;
    const rule = () => (A.ne.global.uv_gain || []).find(r => near(r.t0, a) && near(r.t1, b));
    const val = (k) => (rule() || {})[k] || 0;
    const set = (k, v) => change(A, st, cv, () => { const g = A.ne.global; g.uv_gain = g.uv_gain || []; let r = rule(); if (!r) { r = { t0: r2(a), t1: r2(b), s_db: 0, b_db: 0 }; g.uv_gain.push(r); } r[k] = v; });
    let kind = ns || !nb ? "s_db" : "b_db";
    const fmt = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}dB`, lim = { s_db: [-18, 9], b_db: [-24, 9] };
    const d = document.createElement("div"); d.id = "advUv"; d.className = "advG";
    const mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}.${Math.floor((x % 1) * 10)}`;
    d.innerHTML = `<div class="advGBox" role="dialog" aria-label="치찰음·호흡 볼륨"><div class="advGHd"><b>🌬 ${mm(a)}~${mm(b)}</b><span class="advGN">치찰음 ${ns}곳 · 호흡 ${nb}곳</span><button type="button" class="advX" aria-label="닫기">✕</button></div>
      <div class="advChips" style="margin:8px 0"><button type="button" data-k="s_db">ㅅ·ㅊ 치찰음</button><button type="button" data-k="b_db">숨소리</button></div>
      <div class="advPad" role="slider" aria-label="위아래로 끌어 크기 조절" tabindex="0"><b class="advPadV"></b><small>↕ 위아래로 끌기 · 두 번 톡 = 0dB</small></div>
      <div class="advBody"></div>
      <p class="advTip">고른 구간 안의 그 소리만 크게·작게(다른 소리는 그대로) · 빗금을 톡 하면 이름이 바뀌어요(치찰음 → 호흡 → 아님) · 진짜 소리는 완성본 다시 만들기 뒤</p></div>`;
    const pad = d.querySelector(".advPad"), pv = d.querySelector(".advPadV"), body = d.querySelector(".advBody");
    const row = stepper("크기", () => val(kind), (v) => set(kind, v), { step: 1, min: -24, max: 9, def: 0, fmt });
    body.appendChild(row);
    const paint = () => { pv.textContent = `${kind === "s_db" ? "치찰음" : "숨소리"} ${fmt(val(kind))}`; d.querySelectorAll("[data-k]").forEach(x => x.classList.toggle("on", x.dataset.k === kind)); row._paint(); };
    d.querySelectorAll("[data-k]").forEach(x => x.onclick = (e) => { e.stopPropagation(); kind = x.dataset.k; paint(); });
    let dr = null, lastTap = 0;
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); try { pad.setPointerCapture(e.pointerId); } catch {} dr = { y: e.clientY, v: val(kind), moved: false };
      const now = Date.now(); if (now - lastTap < 320) { set(kind, 0); paint(); dr = null; } lastTap = now; });
    pad.addEventListener("pointermove", (e) => { if (!dr) return; const dv = Math.round((dr.y - e.clientY) / 12), [lo, hi] = lim[kind], v = Math.max(lo, Math.min(hi, dr.v + dv));
      if (Math.abs(dr.y - e.clientY) > 4) dr.moved = true; if (v !== val(kind)) { set(kind, v); paint(); } });
    ["pointerup", "pointercancel"].forEach(ev => pad.addEventListener(ev, () => { dr = null; }));
    const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => { d.remove(); st.uvSel = null; }) : { close: () => { d.remove(); st.uvSel = null; } };
    d.querySelector(".advX").onclick = () => ly.close();
    d.addEventListener("click", (e) => { if (e.target === d) ly.close(); });
    d.addEventListener("pointerdown", (e) => e.stopPropagation());
    host.appendChild(d); paint();
    return d;
  }
  // ── 보정 엔진(11/06 사용자 '고급 보정 ② 엔진 비교'): 곡마다 PSOLA(기본)·WORLD 고르기 + 가장 많이 고친 20초 A/B(어느 쪽이 무엇인지 고르기 전엔 안 알려 줌) ──
  // (11/10 사용자 '지금 상태를 v2로') 기본 = 새 방식 v3(PSOLA) · 이전 v2 · WORLD — A/B 비교본은 v3 vs v2
  const ENG = { psola: "새 방식 v3", v2: "이전 v2", world: "WORLD" }, ENG_ALIAS = { v3: "psola" };
  function engineBox(st) {
    const w = document.createElement("div"); w.className = "advEng";
    const paint = () => { const e = st.engGet() || {}, mk = e.made, f = e.files || {}, pick = e.pick;
      w.innerHTML = `<div class="advRow"><span class="advL">보정 엔진</span><span class="advChips">${Object.entries(ENG).map(([k, t]) => `<button type="button" data-en="${k}" class="${(ENG_ALIAS[e.engine] || e.engine || "psola") === k ? "on" : ""}">${t}</button>`).join("")}</span></div>
        <p class="advD">새 방식 v3 = 음마다 중심만 옮기고 떨림·스쿱은 그대로, 조금 어긋난 음(중 18센트 안)은 안 건드림, 바뀔 때 부드럽게 · 이전 v2 = 11/10 전 방식 · WORLD = 목소리를 분석해 다시 만듦(큰 이동에 강하지만 숨소리가 얇아질 수 있음). 바꾸면 완성본을 다시 만들 때 적용돼요.</p>
        ${mk && f.A && f.B ? `<div class="advRow"><span class="advL">A/B 들어 보기 <small style="color:#8d96a3">${Math.floor(mk.t0 / 60)}:${String(Math.floor(mk.t0 % 60)).padStart(2, "0")}부터 20초 · 보컬만</small></span></div>
          <div class="advChips advAB">${f.o ? `<button type="button" data-ep="o">▶ 보정 전</button>` : ""}<button type="button" data-ep="A">▶ A</button><button type="button" data-ep="B">▶ B</button></div>
          <div class="advChips advAB" style="margin-top:6px"><button type="button" data-ew="A">A가 좋아요</button><button type="button" data-ew="B">B가 좋아요</button></div>
          <div class="advChips advAB" style="margin-top:6px"><button type="button" data-eab2 class="${e.ab ? "on" : ""}">${e.ab ? "✓ 다음 완성본 때 새 비교본(v3·v2)" : "🔁 새 비교본 만들기(v3·v2)"}</button></div>
          ${["psola", "world"].includes(mk.A) && ["psola", "world"].includes(mk.B) ? `<p class="advD">지금 비교본은 예전 것(PSOLA·WORLD)이에요</p>` : ""}
          ${pick ? `<p class="advD" style="color:#ffcf99">고른 쪽: ${pick} = ${ENG[ENG_ALIAS[mk[pick]] || mk[pick]] || mk[pick]}${(ENG_ALIAS[mk[pick]] || mk[pick]) === (ENG_ALIAS[e.engine] || e.engine || "psola") ? " → 이 곡 보정 방식" : " · 방식은 그대로(" + (ENG[ENG_ALIAS[e.engine] || e.engine || "psola"] || e.engine) + ")"}</p>` : ""}`
        : `<div class="advRow"><span class="advL">A/B 비교본</span><span class="advChips"><button type="button" data-eab class="${e.ab ? "on" : ""}">${e.ab ? "✓ 다음 완성본 때 만들기" : "만들기"}</button></span></div>
          <p class="advD">켜고 '완성본 새로 만들기'를 하면 가장 많이 고친 20초를 새 방식 v3·이전 v2로 만들어 A·B로 섞어 둬요. 어느 쪽이 무엇인지는 고른 뒤에 알려 줘요.</p>`}`;
      w.querySelectorAll("[data-en]").forEach(b => b.onclick = (ev) => { ev.stopPropagation(); Promise.resolve(st.engSet({ engine: b.dataset.en })).then(paint); });
      const ab = w.querySelector("[data-eab]"); if (ab) ab.onclick = (ev) => { ev.stopPropagation(); Promise.resolve(st.engSet({ engine_ab: !e.ab })).then(paint); };
      w.querySelectorAll("[data-eab2]").forEach(b => { b.addEventListener("pointerdown", (ev) => ev.stopPropagation()); b.onclick = (ev) => { ev.stopPropagation(); Promise.resolve(st.engSet({ engine_ab: !e.ab })).then(paint); }; });   // (11/10 19:03 사용자 '안 눌림') 다른 A/B 버튼과 같은 줄·같은 방식으로
      w.querySelectorAll("[data-ep]").forEach(b => b.onclick = (ev) => { ev.stopPropagation(); try { st.engPlay && st.engPlay(b, b.dataset.ep); } catch {} });
      // (11/09 21:23 사용자 고) A/B에서 고르면 몰래 엔진이 바뀌던 것 → 확인 창 한 번(바꾸기 / 고른 쪽만 기록)
      w.querySelectorAll("[data-ew]").forEach(b => b.onclick = (ev) => { ev.stopPropagation(); const k = b.dataset.ew, en = mk[k], nm = ENG[ENG_ALIAS[en] || en] || en;
        if (!en || (ENG_ALIAS[en] || en) === (ENG_ALIAS[e.engine] || e.engine || "psola")) { Promise.resolve(st.engSet({ engine_pick: k })).then(paint); return; }
        const host = w.closest("#tuneFs") || document.body, old = host.querySelector(".tfCfm"); if (old) old.remove();
        const cf = document.createElement("div"); cf.className = "tfCfm"; cf.setAttribute("role", "dialog");
        cf.innerHTML = `<div class="tfCfmBox"><b>이 곡 보정 엔진을 ${nm}(으)로 바꿀까요?</b><p>지금은 ${ENG[ENG_ALIAS[e.engine] || e.engine || "psola"] || e.engine}예요. 바꾸면 다음 '완성본 새로 만들기'부터 ${nm}(으)로 만들어요.</p><div class="tfCfmRow"><button type="button" data-cf="0">그대로 두기</button><button type="button" class="pri" data-cf="1">${nm}(으)로 바꾸기</button></div></div>`;
        cf.addEventListener("pointerdown", (x) => x.stopPropagation());
        const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => cf.remove()) : { close: () => cf.remove() };
        cf.addEventListener("click", (x) => { if (x.target === cf) ly.close(); });
        cf.querySelectorAll("[data-cf]").forEach(x => x.onclick = (y) => { y.stopPropagation(); ly.close(); Promise.resolve(st.engSet(x.dataset.cf === "1" ? { engine: en, engine_pick: k } : { engine_pick: k })).then(paint); });
        host.appendChild(cf); });
    };
    paint(); return w;
  }

  // ── 곡 전체(전체화면 위 '🎛 곡 전체') ──
  function globalSheet(host, st, cv) {
    const A = state(st), g = () => A.ne.global;
    document.getElementById("advG")?.remove();
    const d = document.createElement("div"); d.id = "advG"; d.className = "advG";
    d.innerHTML = `<div class="advGBox" role="dialog" aria-label="일괄 보정"><div class="advGHd"><b>🎛 일괄 보정</b><span class="advGN"></span><button type="button" class="advX" aria-label="닫기">✕</button></div><div class="advBody"></div>
      <div class="advGBtns"><button type="button" data-g="midi">🎹 MIDI 내보내기</button><button type="button" data-g="lat">🎧 소리 지연</button><button type="button" data-g="guide">👆 손짓 안내 다시 보기</button><button type="button" data-g="vib">📳 진동 시험</button></div><p class="advVibR" aria-live="polite"></p>
      <p class="advTip">일괄 보정은 폰에서 못 들려줘요 · 완성본 새로 만들기 뒤에 들려요.</p><p class="advTip">보컬·MR 두 파일로 올린 곡은 완성본을 새로 만들면 보정된 보컬만 담긴 WAV(24bit)도 드라이브 작업 폴더에 생겨요(vocal_tuned.wav).</p><div class="advDng"><button type="button" data-g="reset">🗑 모든 고침 지우고 처음 상태로 <small>(↶로 되살릴 수 있어요)</small></button><p class="advTip">음정·타이밍·디테일·펜·일괄 보정 전부 지움 → 서버가 처음 인식한 상태로 완성본 새로 만들기</p></div></div>`;
    const body = d.querySelector(".advBody"), G_ = (k, dft) => (g()[k] != null ? g()[k] : dft);
    const put = (k, v) => change(A, st, cv, () => { g()[k] = v; });
    const putLv = (k, v) => change(A, st, cv, () => { g().level = Object.assign({ quiet: 0, loud: 0 }, g().level || {}); g().level[k] = v; });
    const rows = [
      stepper("자동 보정 강도", () => G_("strength", 1), (v) => put("strength", v), { step: 0.1, min: 0, max: 1.5, def: 1, fmt: pct }),
      D(stepper("가까운 음은 그대로", () => G_("near", 8), (v) => put("near", v), { step: 2, min: 0, max: 50, def: 8, fmt: (v) => `${Math.round(v)}센트 안` }), "자동 보정할 때, 목표 음에서 이 값(센트·100센트=반음 1개) 안쪽으로 이미 가까운 곳은 건드리지 않아요. 크게 하면 자연스럽지만 덜 맞고, 0이면 전부 딱 맞춰요."),
      D(stepper("느린 흐름(전체)", () => G_("flat", 1), (v) => put("flat", v), { step: 0.25, min: 0, max: 2, def: 1, fmt: pct }), "음 하나 안에서 천천히 오르내리는 음정의 흔들림(비브라토보다 느린 변화)을 얼마나 남길지. 100% 그대로 · 0% 평평하게(깔끔·기계적) · 200% 두 배."),
      stepper("작은 음 키우기", () => (g().level || {}).quiet || 0, (v) => putLv("quiet", v), { step: 0.1, min: 0, max: 1, def: 0, fmt: (v) => (v > 0 ? "+" : "") + pct(v) }),
      stepper("큰 음 줄이기", () => (g().level || {}).loud || 0, (v) => putLv("loud", v), { step: 0.1, min: 0, max: 1, def: 0, inv: true, fmt: (v) => (v > 0 ? "−" : "") + pct(v) }),
      stepper("치찰음(ㅅ·ㅊ)", () => G_("sib_db", 0), (v) => put("sib_db", v), { step: 1, min: -12, max: 6, def: 0, fmt: (v) => `${v > 0 ? "+" : ""}${Math.round(v)}dB` }),
      D(stepper("포먼트(목소리 결)", () => G_("formant", 0), (v) => put("formant", v), { step: 0.25, min: -3, max: 3, def: 0, fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}반음` }), "포먼트 = 목소리의 울림 통로. 음정은 그대로 두고 음색만 이동. + 는 얇고 밝은 느낌, − 는 굵고 어두운 느낌. 그림에는 안 보이고 완성본에서 들어 보세요.")];
    rows.forEach(r => { if (!r._desc) { body.appendChild(r); return; } const w = document.createElement("div"), p = document.createElement("p"); p.className = "advD"; p.textContent = r._desc; w.appendChild(r); w.appendChild(p); body.appendChild(w); });
    if (typeof st.engGet === "function") body.appendChild(engineBox(st));   // (11/06 사용자 '고급 보정 ② 엔진 비교')
    const cnt = () => { d.querySelector(".advGN").textContent = `음 ${A.ne.notes.length}개 고침`; rows.forEach(r => r._paint && r._paint()); };
    cnt();
    const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => d.remove()) : { close: () => d.remove() };
    d.querySelector(".advX").onclick = () => ly.close();
    d.addEventListener("click", (e) => { if (e.target === d) ly.close(); });
    d.addEventListener("pointerdown", (e) => e.stopPropagation());
    const latLab = (x) => { try { const B = G.Brand || {}, m = B.outLatMode ? B.outLatMode() : "auto"; x.textContent = m === "auto" ? `🎧 소리 지연: 자동 ${(B.outLatAuto ? B.outLatAuto() : 0).toFixed(2)}초` : m === 0 ? "🎧 소리 지연: 끔" : `🎧 소리 지연: ${(m / 1000).toFixed(2)}초`; } catch {} };
    d.querySelectorAll('[data-g="lat"]').forEach(latLab);
    d.querySelectorAll("[data-g]").forEach(x => x.onclick = (e) => { e.stopPropagation();
      if (x.dataset.g === "undo") { if (!undo(A, st, cv)) x.textContent = "↶ 되돌릴 게 없어요"; else x.textContent = "↶ 한 단계 되돌리기"; cnt(); }
      if (x.dataset.g === "lat") { const B = G.Brand || {}, seq = ["auto", 0, 100, 150, 200, 250, 300], cur = B.outLatMode ? B.outLatMode() : "auto", nx = seq[(seq.indexOf(cur) + 1) % seq.length] ?? "auto"; if (B.outLatSet) B.outLatSet(nx); latLab(x); }   // (11/09 12:59) 블루투스 이어폰 지연: 자동 → 끔 → 0.1 … 0.3초
      if (x.dataset.g === "reset") { if (!(typeof st.resetAll === "function" && st.resetAll())) { change(A, st, cv, () => { A.ne = { notes: [], global: {} }; }); cnt(); } }   // (11/09 01:47) 곡 전체 처음으로(확인 창) — 기록 기능이 없는 화면만 예전처럼 디테일만
      if (x.dataset.g === "midi") midiDownload(cv, st.title || "보컬");
      if (x.dataset.g === "vib") {   // (11/06 22:09 사용자 '진동이 안 느껴져') 이 기기·브라우저에서 진동이 되는지 바로 확인
        const out = d.querySelector(".advVibR"), ua = navigator.userAgent || "", has = typeof navigator.vibrate === "function"; let ok = false; try { ok = has && navigator.vibrate([300, 150, 300]); } catch {}
        const ios = /iPhone|iPad|iPod/.test(ua) || (/Macintosh/.test(ua) && "ontouchend" in document), act = navigator.userActivation ? navigator.userActivation.hasBeenActive : null;
        if (out) out.textContent = !has ? (ios ? "아이폰·아이패드 브라우저는 진동을 지원하지 않아요(화면 표시로 대신해요)" : "이 브라우저는 진동을 지원하지 않아요") : ok ? "지금 '드르륵 · 드르륵' 두 번 울렸어야 해요 · 안 느껴지면 폰 설정 → 소리 및 진동 → 진동 세기(터치·시스템 진동)를 올려 주세요" : `브라우저가 진동을 막았어요(${act === false ? "화면을 한 번 톡 한 뒤" : "잠시 뒤"} 다시 눌러 주세요)`;
        return; }
      if (x.dataset.g === "guide") { ly.close(); setTimeout(() => { try { st.advGuide && st.advGuide(); } catch {} }, 320); } });
    host.appendChild(d);
  }

  // ── MIDI 내보내기: 정음(목표음) 덩어리 = 음 하나 · 120BPM 480틱(초 = 960틱) ──
  function notesFromCurve(cv) {
    const kt = cv.target ? 2 + (cv.levels || []).length : 0, P = cv.pts || [], out = [];
    if (!kt) return out;
    let cur = null;
    for (const p of P) {
      const v = p[kt]; const m = v == null ? null : Math.round(v / 100);
      if (cur && (m !== cur.m || p[0] - cur.t1 > 0.06)) { if (cur.t1 - cur.t0 >= 0.06) out.push(cur); cur = null; }
      if (m != null && m >= 0 && m <= 127) { if (!cur) cur = { m, t0: p[0], t1: p[0] + 0.01 }; else cur.t1 = p[0] + 0.01; }
    }
    if (cur && cur.t1 - cur.t0 >= 0.06) out.push(cur);
    return out;
  }
  function midiBytes(notes) {
    const ev = [], tk = (s) => Math.round(s * 960);
    notes.forEach(n => { ev.push([tk(n.t0), 0x90, n.m, 90]); ev.push([tk(n.t1), 0x80, n.m, 0]); });
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const vlq = (v) => { const b = [v & 0x7f]; while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80); return b; };
    const trk = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20];   // 120BPM
    let last = 0; ev.forEach(([t, s, m, v]) => { trk.push(...vlq(t - last), s, m, v); last = t; });
    trk.push(0x00, 0xff, 0x2f, 0x00);
    const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    return new Uint8Array([0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, ...u32(trk.length), ...trk]);
  }
  function midiDownload(cv, title) {
    const notes = notesFromCurve(cv);
    if (!notes.length) { try { G.Tune && G.Tune.undo && G.Tune.undo("내보낼 음이 없어요"); } catch {} return; }
    const url = URL.createObjectURL(new Blob([midiBytes(notes)], { type: "audio/midi" })), a = document.createElement("a");
    a.href = url; a.download = `${String(title).replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}_음정.mid`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── 스타일 ──
  const css = `.tfFix .tfA{display:none}.tfFix.amode .tfA{display:block}.tfFix.amode .tfP,.tfFix.amode .tfT{display:none!important}
#tuneFs .tfFixMd button[data-md="a"].on{background:#ffb86b!important;color:#2a1500!important}
.advPanel{margin-top:6px}.advTabs{display:flex;gap:6px;flex-wrap:wrap}.advTabs button{min-height:0!important;height:32px!important;padding:0 12px!important;margin:0!important;border-radius:17px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#cfd3da!important;font-size:13.5px!important;font-weight:800}
.advTabs button.on{background:#ffb86b!important;color:#2a1500!important;border-color:#ffb86b!important}.advTabs .advRst{margin-left:auto!important}
.advBody{margin-top:6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2px 10px}
.advPanel .advBody{max-height:min(30vh,210px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-right:2px}
#tuneFs .tfFix.amode .tfFixBox{padding-top:6px!important;padding-bottom:6px!important}
.advD{margin:-2px 2px 6px;font-size:11px;line-height:1.4;color:#8a95a1}.advRow{display:flex;align-items:center;gap:6px;min-height:42px}.advL{flex:1;font-size:13.5px;color:#b6bdc7;white-space:nowrap}.advRow.on .advL{color:#ffb86b;font-weight:800}
.advSc{position:relative;flex:none;width:150px;height:44px;box-sizing:border-box;border-radius:12px;border:1.5px solid #3b4250;background:linear-gradient(90deg,#11141a,#171c24 50%,#11141a);display:flex;flex-direction:column;align-items:center;justify-content:center;touch-action:none;-webkit-user-select:none;user-select:none;cursor:ew-resize;outline:none}.advSc:focus-visible{border-color:#9cc3ff}.advSc .advV{min-width:0;font-size:15px;line-height:1.1}.advSc.on .advV{color:#ffcf99}.advSc.on::after{content:"";position:absolute;top:5px;right:7px;width:6px;height:6px;border-radius:50%;background:#ffb86b}.advSc.act{border-color:#ffb86b;box-shadow:0 0 0 3px rgba(255,184,107,.18)}.advScA{position:absolute;top:50%;transform:translateY(-50%);font-style:normal;font-weight:900;font-size:15px;color:#5b6370;pointer-events:none}.advScA.a1{left:7px}.advSc .advScA.a2{right:7px}.advScT{position:absolute;left:10px;right:10px;bottom:3px;height:5px;background:repeating-linear-gradient(90deg,#3b4250 0 1px,transparent 1px 8px);pointer-events:none;opacity:.8}.advScL{font-size:11px;color:#8d96a3;font-weight:700;line-height:1.1;white-space:nowrap}.advSc.on .advScL{color:#ffb86b}.advScB{position:absolute;left:50%;bottom:calc(100% + 6px);transform:translateX(-50%);background:#ffb86b;color:#1b1206;font-weight:900;font-size:15px;padding:4px 10px;border-radius:10px;white-space:nowrap;pointer-events:none;z-index:5;box-shadow:0 4px 12px rgba(0,0,0,.5)}.advScB.tip{font-size:12px;background:#ffd27a}.advCells{display:flex;gap:8px;align-items:stretch;margin:2px 0}.advCells .advSc{flex:1;width:auto;min-width:0;height:54px}.advCells .advChips{flex:1.3;min-width:0}.advCells .advChips button{flex:1;height:54px!important;padding:0 4px!important}.advScL em{font-style:normal;font-size:10px;font-weight:700;color:#6f7884;margin-left:4px}.advScI{position:absolute;inset:6px 18px;width:calc(100% - 36px);height:calc(100% - 12px);pointer-events:none;opacity:.19}.advScI path{fill:none;stroke:#cfd3da;stroke-width:2.2;vector-effect:non-scaling-stroke;stroke-linecap:round;stroke-linejoin:round}.advSc.on .advScI{opacity:.28}.advSc.on .advScI path{stroke:#ffb86b}.advScI .dash{stroke-dasharray:3 4;opacity:.55}.advSc>:not(.advScI){position:relative}.advSc>.advScA,.advSc>.advScT,.advSc>.advScB{position:absolute}/* (11/06 19:36 사용자 '터치로 끌기가 잘 안 됨') 전체화면의 touch-action:manipulation(#tuneFs .tfFix *)이 칸의 none을 덮어써서 손가락 끌기를 브라우저가 스크롤로 가져가던 것 */#tuneFs .advSc,#tuneFs .advSc *,.advSc,.advSc *{touch-action:none!important}.advTip.desc{color:#cfd3da;font-size:12.5px}.advTip.desc b{color:#ffbe7a}.advVibR{margin:6px 2px 0;font-size:12px;line-height:1.45;color:#ffcf99}.advVibR:empty{display:none}/* (11/06 19:22 사용자) 이름은 늘 주황 · 바꾼 칸 = 주황 테두리 + 은은한 빛(점 대신) · 끄는 중 = 더 밝게 */.advCells .advSc .advScL{color:#ffbe7a!important}.advCells .advSc .advScL em{color:#8a6a4a!important}.advSc.on{border-color:#ffb86b!important;box-shadow:0 0 0 1px rgba(255,184,107,.35),0 0 14px rgba(255,184,107,.28)!important}.advSc.on::after{display:none!important}.advSc.on .advV{color:#ffe2bf!important}.advSc.act{box-shadow:0 0 0 2px rgba(255,184,107,.5),0 0 20px rgba(255,184,107,.45)!important}/* (11/06 18:57 사용자) 위아래 값(흐름 기울기·원래 떨림·떨림 폭) 칸: 오른쪽에 세로 눈금 + ▴ 위 · ▾ 아래 */.advSc.vert{cursor:ns-resize}.advSc.vert.on::after{right:auto!important;left:8px}.advSc.vert .advScA{left:auto!important;right:9px!important;transform:none;font-size:12px}.advSc.vert .advScA.a1{top:3px}.advSc.vert .advScA.a2{top:auto;bottom:3px}.advSc.vert .advScT{left:auto!important;right:10px!important;top:17px!important;bottom:17px!important;width:7px!important;height:auto!important;background:repeating-linear-gradient(180deg,#3b4250 0 1px,transparent 1px 4px)!important}.advSc.vert .advScL,.advSc.vert .advV{margin-right:14px}/* (11/06 18:34 사용자 시안) 눈금 낮게 · 이름 크게 · 숫자 작게(바꾼 칸만 주황) */.advScT{height:3px!important;bottom:4px!important;opacity:.55!important}.advScL{font-size:13.5px!important;color:#cfd3da!important;font-weight:800!important}.advSc.on .advScL{color:#ffb86b!important}.advSc .advV{font-size:12.5px!important;font-weight:700!important;color:#9aa3ad}.advSc.on .advV{color:#ffcf99}.advScA{font-size:13px!important;color:#454c58!important}.advCells .advSc{gap:1px}.advB{min-height:0!important;width:44px;height:40px!important;padding:0!important;margin:0!important;border-radius:12px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#e8e8ea!important;font-size:20px!important;font-weight:900;touch-action:manipulation}
.advDuo{display:flex;gap:8px;min-height:42px}.advDuo .advRow{flex:1;min-width:0;gap:3px}.advDuo .advL{flex:none;font-size:13px}.advDuo .advRow .advB{width:32px!important;min-width:0!important;flex:none}.advDuo .advV{min-width:0;flex:1;font-size:12px;white-space:nowrap}
.advV{min-width:82px;text-align:center;font-weight:800;font-size:14px;color:#e8e8ea;font-variant-numeric:tabular-nums}
.advChips{display:flex;gap:6px}.advChips button{min-height:0!important;height:36px!important;padding:0 12px!important;margin:0!important;border-radius:12px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#cfd3da!important;font-size:13px!important;font-weight:800}.advChips button.on{background:#ffb86b!important;color:#2a1500!important;border-color:#ffb86b!important}
.advTip{grid-column:1/-1;margin:2px 0 0;font-size:11.5px;color:#7d8590;line-height:1.4}
.advG{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}.advGBox{width:min(760px,100%);max-height:86%;overflow:auto;box-sizing:border-box;background:#1a1e25;border:1.5px solid #3b4250;border-radius:18px 18px 0 0;padding:12px 14px calc(14px + env(safe-area-inset-bottom));color:#e8e8ea}
.advGHd{display:flex;align-items:center;gap:10px}.advGN{color:#9aa3ad;font-size:12.5px}.advX{margin-left:auto!important;min-height:0!important;height:34px!important;width:40px;padding:0!important;border-radius:12px!important;background:#11141a!important;border:1.5px solid #3b4250!important;color:#e8e8ea!important}
.advDng{margin-top:16px;padding-top:12px;border-top:1px solid #3b425066}.advDng button{width:100%;height:44px;margin:0!important;border-radius:12px!important;border:1.5px dashed #ff8a8a77!important;background:transparent!important;color:#ff9a9a!important;font-weight:700;font-size:14px!important}.advDng small{font-weight:500;opacity:.8}.advGBtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.advGBtns button{flex:1;min-width:150px;min-height:0!important;height:44px!important;margin:0!important;border-radius:12px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#e8e8ea!important;font-weight:800;font-size:14px!important}
.advPad{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:120px;border-radius:16px;border:1.5px dashed #ffb86b;background:#21170b;color:#ffcf99;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ns-resize}.advPad b{font-size:22px}.advPad small{color:#b9a58a;font-size:12px}
#tuneFs .gdBox{max-width:340px;text-align:left}#tuneFs .gdL{margin:10px 0 6px;padding:0;list-style:none}#tuneFs .gdL li{display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-top:1px solid #2a313c;font-size:14px;color:#cfd3da}#tuneFs .gdL li:first-child{border-top:0}#tuneFs .gdL em{font-style:normal;font-weight:800;color:#ffcf99;white-space:nowrap}#tuneFs .gdS{font-size:12px;color:#8d96a3;margin:4px 0 10px}
.advEng{grid-column:1/-1;margin-top:8px;padding-top:8px;border-top:1px solid #2a313c}.advAB button{min-width:72px}
#tuneFs .tfCtx{position:absolute;z-index:40;display:flex;flex-direction:column;min-width:180px;background:#1a1e25;border:1.5px solid #3b4250;border-radius:12px;padding:4px;box-shadow:0 8px 24px rgba(0,0,0,.5)}#tuneFs .tfCtx button{all:unset;padding:9px 12px;border-radius:8px;font-size:14px;color:#e8e8ea;cursor:pointer}#tuneFs .tfCtx button:hover{background:#2a313c}
#tuneFs .tfAdvG.on{background:#ffb86b!important;color:#2a1500!important}
#tuneFs .tfAdvG{margin:0 0 0 8px!important;min-height:0!important;height:28px!important;padding:0 11px!important;border-radius:14px!important;border:1.5px solid #ffb86b!important;background:#2a1a08!important;color:#ffcf99!important;font-size:12.5px!important;font-weight:800;white-space:nowrap}`;
  try { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); } catch {}

  function resetNote(st, cv, b) { const A = state(st); change(A, st, cv, () => { A.ne.notes = (A.ne.notes || []).filter(x => !(near(x.t0, b.t0) && near(x.t1, b.t1))); }); }   // 이 음의 고급 고침만 지움
  G.TuneAdv = { scrub, panel, resetNote, globalSheet, preview, state, uvList, relabel, uvSheet, UV_NAME, addDraw, drawAt, removeDraw, flatNote, cleanStroke, undoLast: (st, cv) => undo(state(st), st, cv), _t: { shapeNote, notesFromCurve, midiBytes, clean, N_DEF } };
})(typeof window !== "undefined" ? window : globalThis);
