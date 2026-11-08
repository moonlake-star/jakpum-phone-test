// (10/30 사용자) 튠 화면 — Waves Tune처럼 음정선이 재생 위치와 함께 오른쪽→왼쪽으로 흐름. 선생님 앱·수강생 노트 공용.
// curve = 메이크업 서버가 저장한 pitch_curve.json: { fps, scale:[음이름 번호], levels:[1,2,3], pts:[[초, 원음, 약, 중, 강], ...] } (값 = MIDI×100 센트)
// 노랑 = 실제로 부른 음, 하늘색 = 보정된 음, 주황 세로선 = 지금(10/31 사용자 C안 변형). 두 선 사이 노랑 = 고친 곳(진할수록 많이).
// 아래 줄 = 고친 양(위 = 올림 · 아래 = 내림, 끝까지 = 반음 ½ 이상). 확대(기본): 지금 음 근처 ±4반음, 전체: 곡 전체 음역.
// 음정 인식은 AI 추정(숨소리·자음에서 선이 튈 수 있음) — 참고용.
(function (G) {
  const BAR_GAP = 0.5;   // 정음 막대 이어 붙이는 최대 틈(초) — 서버 pitch.BRIDGE_S와 같게
  const DT_JUMP = 2;   // (11/03 10:24 사용자) 그래프 두 번 톡 = 2초 이동
  const HANDLE_R = 15;
  const LONG_MS = 600, FINE = 0.25;   // (11/06 16:36 사용자) 꾹 0.6초가 지나면 켜지고 진동   // (11/06 16:13 사용자) 꾹 누르는 시간 · 미세 조절은 손가락 움직임의 1/4만큼
  const BEAT_SNAP = 0.12;   // (11/06) 박자 맞춤: 음 시작이 박에서 이만큼(초) 안이면 박에 붙임
  // (11/06 16:36 사용자) 다른 강사도 알 수 있게: 고른 음 둘레에 손짓 안내 글 — 손짓을 두 번 써 보면 그 글은 사라짐(이 기기 기억)
  const LEARN_KEY = "tune_learn_v1", LEARN_N = 2;
  const learnGet = () => { try { return JSON.parse(localStorage.getItem(LEARN_KEY) || "{}") || {}; } catch { return {}; } };
  const learned = (k) => (learnGet()[k] || 0) >= LEARN_N;
  const learn = (k) => { try { const o = learnGet(); o[k] = (o[k] || 0) + 1; localStorage.setItem(LEARN_KEY, JSON.stringify(o)); } catch {} };
  const learnReset = () => { try { localStorage.removeItem(LEARN_KEY); localStorage.removeItem("tune_adv_guide_v1"); } catch {} };
  const buzz = (ms) => { try { navigator.vibrate && navigator.vibrate(Math.max(20, ms || 25)); } catch {} };   // (11/06 22:09) 20ms보다 짧으면 갤럭시 등에서 거의 안 느껴짐   // 아이폰 사파리는 진동을 지원 안 함 → 대신 화면에 퍼지는 동그라미
  const beatNear = (cv, t) => { const B = cv && cv.beats && cv.beats.t; if (!B || !B.length) return null; let lo = 0, hi = B.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (B[m] <= t) lo = m; else hi = m; } return Math.abs(B[lo] - t) <= Math.abs(B[hi] - t) ? B[lo] : B[hi]; };   // (11/06) 보정 모드 큰 손잡이 반지름(px) — 손가락·펜으로 잡기 쉽게
  const WIN = 8, HEAD = 0.4, NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], LANE = 34, ZOOM_HALF = 400;
  function range(cv) {
    if (cv._rng) return cv._rng;
    const a = (cv.pts || []).map(p => p[1]).filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return (cv._rng = [5700, 7200]);
    const lo = a[Math.floor(a.length * 0.03)], hi = a[Math.min(a.length - 1, Math.floor(a.length * 0.97))];
    return (cv._rng = [Math.floor(lo / 100) * 100 - 250, Math.ceil(hi / 100) * 100 + 250]);
  }
  function col(cv, lv) { const L = cv.levels || [], i = L.indexOf(+lv); return lv > 0 ? (i >= 0 ? 2 + i : L.length ? 2 + L.length - 1 : 0) : 0; }   // (11/02 17:30) 새 음정선은 강[3]만 — 없는 단계를 찾으면 가장 센 단계   // pts 안 위치(0 = 없음)
  function fitAt(cv, t, k) {   // [가장 낮은 음, 가장 높은 음, 가운데] — 짧은 도약음도 포함, 앞뒤와 동떨어진 한 점(숨소리·자음)만 제외
    const P = cv.pts || [], idx = []; for (let i = 0; i < P.length; i++) { const p = P[i]; if (p[0] < t - WIN * HEAD) continue; if (p[0] > t + WIN * (1 - HEAD)) break; idx.push(i); }
    if (idx.length < 3) return null;
    let lo = Infinity, hi = -Infinity;
    for (const i of idx) {
      const a = P[i - 1], b = P[i + 1], p = P[i], near = (q) => q && Math.abs(q[0] - p[0]) < 0.13 && Math.abs(q[1] - p[1]) < 300;
      if (!near(a) && !near(b)) continue;   // 혼자 튄 점
      for (const v of k ? [p[1], p[k]] : [p[1]]) { if (v < lo) lo = v; if (v > hi) hi = v; }
    }
    return Number.isFinite(lo) ? [lo, hi, (lo + hi) / 2] : null;
  }
  // 고친 양을 반음 단위로: 51센트 → "↓ 0.5반음 내림"(반음 = 피아노 건반 한 칸)
  // (10/30 16:06 사용자 시안 승인) 수강생 기준 '내가 어떻게 불렀나': 고친 양의 반대 방향. d = 고친 양(센트)
  function sangLabel(d) { const s = (Math.abs(d) / 100).toFixed(1); return d < 0 ? { txt: `↑ ${s}반음 높게 불렀어요`, c: "#ff9f5a" } : { txt: `↓ ${s}반음 낮게 불렀어요`, c: "#9cc3ff" }; }
  function semiLabel(d) { const s = Math.abs(d) / 100; return `${d > 0 ? "↑" : "↓"} ${s >= 0.95 ? s.toFixed(1).replace(/\.0$/, "") : s.toFixed(1)}반음 ${d > 0 ? "올림" : "내림"}`; }
  function delta(cv, k, t) {   // 지금 위치의 고친 양(센트)
    if (!k) return null; let best = null;
    for (const p of cv.pts || []) { if (Math.abs(p[0] - t) < 0.06) { best = p[k] - p[1]; break; } if (p[0] > t + 0.06) break; }
    return best;
  }
  // ── 음정 주석(10/30 사용자 시안 승인): 초안 = 노란 점선, 확인 = 초록 실선. 그 구간을 지날 때만 말풍선 ──
  const SRC = { lesson: "이번 레슨", habit: "선생님 강조", knowledge: "보컬 지식", teacher: "선생님" };
  function wrapTxt(g, s, maxW) { const out = []; let line = ""; for (const ch of String(s)) { if (ch === "\n") { out.push(line); line = ""; continue; } if (g.measureText(line + ch).width > maxW && line) { out.push(line); line = ch.trim() ? ch : ""; } else line += ch; } if (line) out.push(line); return out.slice(0, 4); }
  function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
  function noteBand(st, full) {   // 주석 칸 두 층 높이(drawNotes와 같은 계산)
    const stu = !st.teacher, fs = full ? (stu ? 17 : 14) : (stu ? 13.5 : 11.5), lh = fs + 5, pad = full ? 9 : 7, maxL = full ? 2 : 1;
    const sh = pad * 2 + (stu ? 2 : (fs - 1) + 4) + maxL * lh; return sh * 2 + 6 + 10;
  }
  function drawNotes(g, st, t, xs, L, w, T, H, full, top, occ, vis, yf) {
    let all = typeof st.notes === "function" ? (st.notes() || []) : []; const hits = []; st.hits = hits;
    if (st.editing) { const { d, n } = st.editing; all = all.includes(n) ? all.map(x => (x === n ? { ...n, ...d } : x)) : all.concat([{ ...d, status: d.status || "ok" }]); }   // 고치는 중: 바뀐 자리로 미리 보기
    if (!all.length) return;
    // (10/30 16:42 사용자 시안 승인) 세로 줄 대신 음정선 위 점 · 구간은 그 구간 음정선이 빛나게
    const pAt = (tt) => { let best = null, bd = 1e9; for (const p of vis || []) { if (p[1] == null) continue; const dd = Math.abs(p[0] - tt); if (dd < bd) { bd = dd; best = p; } } return best ? { y: yf(best[1]), on: bd < 0.1 } : null; };
    const dots = new Map();
    // (10/30 17:27 사용자 시안 승인) 주석마다 칸·색·번호 고정: 레슨 전체 시간 순 번호, 홀수 = 위 칸·민트, 짝수 = 아래 칸·라일락
    const kf = (n) => n.id || n.t0 + ":" + n.text, endT = (n) => Math.max(+n.t1, +n.t0 + 0.5), inWin = (n) => t >= +n.t0 - 1.5 && t <= endT(n) + 1.5;   // 1.5초 미리
    const allS = all.slice().sort((a, b) => (+a.t0 - +b.t0) || String(kf(a)).localeCompare(String(kf(b))));
    const gnum = new Map(allS.map((n, i) => [kf(n), i + 1])), slotOf = (n) => (gnum.get(kf(n)) - 1) % 2, byK = new Map(all.map(n => [kf(n), n]));
    const near = all.filter(inWin).sort((a, b) => Math.abs(t - a.t0) - Math.abs(t - b.t0));
    const now = performance.now(); st.fin = st.fin || {}; st.fout = st.fout || {};   // 0.15초 페이드 인·아웃
    let sl = st.slots || [null, null];
    for (const si of [0, 1]) { const cur = sl[si] && byK.get(sl[si]);
      const tgt = cur && inWin(cur) && slotOf(cur) === si ? cur : near.find(n => slotOf(n) === si) || null, tk = tgt ? kf(tgt) : null;   // 떠 있는 건 구간 안이면 그대로
      if (sl[si] === tk) { if (tk) delete st.fout[tk]; continue; }
      if (sl[si] && byK.has(sl[si])) { const ok0 = sl[si]; if (st.fout[ok0] == null) st.fout[ok0] = now; if (now - st.fout[ok0] < 150) continue; delete st.fout[ok0]; delete st.fin[ok0]; }
      sl[si] = tk; if (tk) st.fin[tk] = now; }
    st.slots = sl;
    const shown = sl.map(k => (k ? byK.get(k) || null : null)), numOf = (n) => gnum.get(kf(n)) || 0;
    const PAL = ["111,224,176", "196,163,255"], colOf = (n) => (shown.includes(n) ? PAL[slotOf(n)] : "150,158,170");
    g.save(); g.beginPath(); g.rect(L, T, w - L, H); g.clip();
    for (const n of all) { const a = xs(+n.t0), b = xs(+n.t1); if (b < L - 8 || a > w + 8) continue;
      const ok = n.status === "ok", c = colOf(n), ed = st.editing && (st.editing.n === n || (st.editing.d.t0 === n.t0 && st.editing.d.t1 === n.t1));
      if (+n.t1 - +n.t0 >= 0.35) {   // 구간: 그 구간 음정선을 두껍게 빛나게
        const seg = (vis || []).filter(p => p[1] != null && p[0] >= +n.t0 && p[0] <= +n.t1);
        for (const [wd, al, cc] of [[12, 0.22, c], [3.2, 1, "255,224,102"]]) { g.strokeStyle = `rgba(${cc},${al})`;   /* (10/31 15:43 사용자) 구간 안 음정선은 노랑 그대로 — 주석 색은 은은한 테두리와 ├─┤ 막대에만 */ g.lineWidth = wd; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); let prev = null;
          for (const p of seg) { const X = xs(p[0]), Y = yf(p[1]); if (prev != null && p[0] - prev < 0.13) g.lineTo(X, Y); else g.moveTo(X, Y); prev = p[0]; } g.stroke(); }
        // (10/30 16:48 사용자 시안 승인) 구간 = 음정선 바로 위 ├──┤ 괄호, 말풍선 화살표가 괄호 가운데를 가리킴
        let top = 1e9; for (const p of seg) { const Y = yf(p[1]); if (Y < top) top = Y; } if (top > 1e8) { const s0 = pAt(+n.t0); top = s0 ? s0.y : T + H / 2; }
        const yb = Math.max(T + 6, top - (full ? 14 : 10)), tk = full ? 5 : 4, xa = Math.max(L, a), xb = Math.min(w, b);
        g.strokeStyle = `rgb(${c})`; g.lineWidth = ed ? 2.6 : 2; g.lineCap = "butt"; g.beginPath(); g.moveTo(xa, yb); g.lineTo(xb, yb);
        if (a >= L) { g.moveTo(a, yb - tk); g.lineTo(a, yb + tk); } if (b <= w) { g.moveTo(b, yb - tk); g.lineTo(b, yb + tk); } g.stroke();
        dots.set(n, { x: (xa + xb) / 2, y: yb, c, r: 2 }); continue; }
      const s = pAt(+n.t0); if (!s) continue; const R = (full ? 7 : 5) * (ed ? 1.3 : 1);   // 시작 점 = 그 시간에 부른 음 위
      if (!s.on) { g.strokeStyle = `rgb(${c})`; g.lineWidth = 1.5; g.beginPath(); g.arc(a, s.y, 3.5, 0, Math.PI * 2); g.stroke(); }   // 소리 없는 곳 = 가까운 음 높이에 작은 빈 고리(10/31: 음정선 안 가리게 작게)
      dots.set(n, { x: a, y: s.y, c, r: R + 3 }); }
    g.restore();
    const stu = !st.teacher, fs = full ? (stu ? 17 : 14) : (stu ? 13.5 : 11.5), lh = fs + 5, pad = full ? 9 : 7, nr = full ? 11 : 9, xr = st.teacher && !st.noX ? (full ? 12 : 10) : 0;
    const maxL = full ? 2 : 1, sh = pad * 2 + (stu ? 2 : (fs - 1) + 4) + maxL * lh, x = L + 4, bw = w - L - 8, gap = 6, bot = T + H - 6;
    const fmtT = (s) => `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`;
    for (const n of [...dots.keys()].sort((a, b) => shown.includes(a) - shown.includes(b))) { const dt = dots.get(n); const c = colOf(n);   // 모든 주석 점에 고정 번호(칸에 없는 건 회색)   // 음정선 위 번호 점(칸 아래에 깔리게 먼저)
      const k2 = kf(n), fa = (st.fin[k2] != null ? Math.min(1, (now - st.fin[k2]) / 150) : 1) * (st.fout[k2] != null ? Math.max(0, 1 - (now - st.fout[k2]) / 150) : 1);
      // (10/31 07:57 사용자) 번호가 음정선을 가리지 않게: 선 위엔 작은 점, 번호는 위로 띄운 작은 깃발
      const br = full ? 8.5 : 7, by = Math.max(T + br + 1, dt.y - (full ? 22 : 17));
      g.save(); g.globalAlpha = fa; g.strokeStyle = `rgb(${c})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(dt.x, dt.y - 3); g.lineTo(dt.x, by + br); g.stroke();
      g.fillStyle = `rgb(${c})`; g.beginPath(); g.arc(dt.x, dt.y, 2.6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(dt.x, by, br, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#10201a"; g.font = `900 ${full ? 11 : 9}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(numOf(n)), dt.x, by + 0.5); g.restore();
      dt.r = 4; }
    shown.forEach((n, i) => { if (!n) return;
      const k = kf(n), fi = st.fin[k] != null ? Math.min(1, (now - st.fin[k]) / 150) : 1, fo = st.fout[k] != null ? Math.max(0, 1 - (now - st.fout[k]) / 150) : 1;
      const ok = n.status === "ok", c = colOf(n), past = t > endT(n) + 0.15, al = fi * fo,   // (10/30 18:37 사용자) 지나간 주석도 흐려지지 않게 — 사라질 때만 0.15초 페이드
        num = numOf(n);
      const y = i === 1 ? bot - sh : bot - sh * 2 - gap;
      g.save(); g.globalAlpha = al;
      const dt = dots.get(n); if (dt) {   // 칸 → 번호 점 점선 화살표
        const sx = Math.max(x + 24, Math.min(x + bw - 24, dt.x + (num === 1 ? -14 : 14))), sy = y, tx = dt.x, ty = dt.y + dt.r + 2;
        if (sy - ty > 10) { const cy1 = sy - (sy - ty) * 0.45, hl = full ? 9 : 7;
          g.strokeStyle = `rgb(${c})`; g.fillStyle = `rgb(${c})`; g.lineWidth = 1.5; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(sx, sy); g.quadraticCurveTo(sx, cy1, tx, ty + hl * 0.7); g.stroke(); g.setLineDash([]);
          g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx - hl * 0.45, ty + hl); g.lineTo(tx + hl * 0.45, ty + hl); g.closePath(); g.fill(); } }
      g.fillStyle = "rgba(24,28,35,.95)"; rr(g, x, y, bw, sh, 10); g.fill();
      g.strokeStyle = `rgb(${c})`; g.lineWidth = 1.5; if (!ok) g.setLineDash([4, 3]); rr(g, x, y, bw, sh, 10); g.stroke(); g.setLineDash([]);
      g.fillStyle = `rgb(${c})`; g.beginPath(); g.arc(x + pad + nr, y + pad + nr, nr, 0, Math.PI * 2); g.fill();
      g.fillStyle = "#10201a"; g.font = `900 ${full ? 13 : 11}px system-ui, sans-serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(num), x + pad + nr, y + pad + nr + 0.5); g.textAlign = "left";
      const tx0 = x + pad + nr * 2 + 8, tmax = bw - (tx0 - x) - pad - (xr ? xr * 2 + 6 : 0);
      const tag = (st.teacher ? (ok ? "✓ 확인" : "AI 초안" + (SRC[n.src] ? " · " + SRC[n.src] : "")) : "🎤 선생님 한마디") + " · " + fmtT(+n.t0);
      g.textBaseline = "top"; if (!stu) { g.font = `bold ${fs - 2}px system-ui, sans-serif`; g.fillStyle = `rgb(${c})`; g.fillText(tag, tx0, y + pad); }
      g.font = `${fs}px system-ui, sans-serif`; let lines = wrapTxt(g, n.text || "", tmax);
      if (lines.length > maxL) { const keep = lines.slice(0, maxL); let l2 = keep[maxL - 1]; while (l2 && g.measureText(l2 + "…").width > tmax) l2 = l2.slice(0, -1); keep[maxL - 1] = l2 + "…"; lines = keep; }   // 작은 화면 1줄·전체화면 2줄, 넘으면 … (눌러서 전체 보기)
      g.fillStyle = "#f1f1f1"; const ty0 = stu ? y + pad + 3 + (lines.length < maxL ? (maxL - lines.length) * lh / 2 : 0) : y + pad + fs + 2; lines.forEach((s2, j) => g.fillText(s2, tx0, ty0 + j * lh)); g.textBaseline = "middle";
      let xx = null; if (xr) { xx = { cx: x + bw - xr - 6, cy: y + xr + 6, r: xr };
        g.fillStyle = "#3a2a2a"; g.beginPath(); g.arc(xx.cx, xx.cy, xr, 0, Math.PI * 2); g.fill(); g.strokeStyle = "#ff9a9a"; g.lineWidth = 1.2; g.stroke();
        const q = xr * 0.42; g.lineWidth = 2; g.beginPath(); g.moveTo(xx.cx - q, xx.cy - q); g.lineTo(xx.cx + q, xx.cy + q); g.moveTo(xx.cx + q, xx.cy - q); g.lineTo(xx.cx - q, xx.cy + q); g.stroke(); }
      if (st.hold && kf(st.hold.n) === k) { const pr = Math.min(1, (now - st.hold.at) / 600);   // (10/30 17:34 사용자 시안 승인) 꾹 누르는 동안 1초 진행 바(칸 위쪽 테두리)
        g.save(); rr(g, x, y, bw, sh, 10); g.clip(); g.shadowColor = `rgba(${c},.8)`; g.shadowBlur = 8; g.fillStyle = `rgb(${c})`; g.fillRect(x, y, bw * pr, 4); g.restore(); }   // (10/30 17:39 사용자) 칸 위쪽 테두리
      g.restore();
      hits.push({ x, y, w: bw, h: sh, n, xx }); });
  }
  // (11/07 09:47 사용자 시안 고) 고급 모드: 한마디 칸은 숨긴 채 음표 옆에 번호(기본 모드와 같은 번호) — 보라 = 확인, 흐린 보라 = AI 초안 · 지나갈 때·번호 톡 = 말풍선 1.5초
  // (11/07 10:43 사용자 시안 고) 주석 = 음정선 위 번호 깃발 + 말풍선 — 고급(auto=false): 번호만, 톡 하면 말풍선 · 기본·수강생 전체화면(auto=true): 재생이 그 구간에 오면 저절로 말풍선
  // 겹치면(동시에 둘) 앞 것은 음정선 위, 뒤 것은 깃발·말풍선 모두 아래로
  const POP_MIN = 3;   // 짧은 주석도 말풍선 최소 3초
  function popWin(n, t) { return t >= +n.t0 - 0.3 && t <= Math.max(+n.t1 || 0, +n.t0 + POP_MIN); }
  function drawFlags(g, st, t, xs, L, w, T, HP, vis, yf, auto) {
    const all = typeof st.notes === "function" ? (st.notes() || []) : []; if (!all.length) return null;
    const kf = (n) => n.id || n.t0 + ":" + n.text, allS = all.slice().sort((a, b) => (+a.t0 - +b.t0) || String(kf(a)).localeCompare(String(kf(b))));
    const act = auto ? allS.filter(n => popWin(n, t) && xs(+n.t0) >= L - 10 && xs(+n.t0) <= w + 10).sort((a, b) => Math.abs(t - a.t0) - Math.abs(t - b.t0)).slice(0, 2).sort((a, b) => +a.t0 - +b.t0) : [];
    const pin = st.popPin && st.popPin.k, hits = []; g.save(); g.beginPath(); g.rect(L, T, w - L, HP); g.clip();
    allS.forEach((n, i) => { const x = xs(+n.t0); if (x < L - 10 || x > w + 10) return;
      let best = null, bd = 1e9; for (const p of vis || []) { if (p[1] == null) continue; const dd = Math.abs(p[0] - +n.t0); if (dd < bd) { bd = dd; best = p; } }
      const k = kf(n), ai = act.indexOf(n), down = ai === 1, br = 8.5, py = best && bd < 0.6 ? yf(best[1]) : T + HP / 2;
      const by = down ? Math.min(T + HP - br - 1, py + 22) : Math.max(T + br + 1, py - 22);
      const c = n.status !== "ok" ? "150,158,170" : auto ? ((i + 1) % 2 ? "111,224,176" : "196,163,255") : "196,163,255";
      g.strokeStyle = `rgb(${c})`; g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, down ? py + 3 : py - 3); g.lineTo(x, down ? by - br : by + br); g.stroke();
      g.fillStyle = `rgb(${c})`; g.beginPath(); g.arc(x, py, 2.6, 0, Math.PI * 2); g.fill(); g.beginPath(); g.arc(x, by, br, 0, Math.PI * 2); g.fill();
      if (ai >= 0 || pin === k) { g.strokeStyle = `rgba(${c},.5)`; g.lineWidth = 2; g.beginPath(); g.arc(x, by, br + 3.5, 0, Math.PI * 2); g.stroke(); }
      g.fillStyle = "#10201a"; g.font = "900 11px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(String(i + 1), x, by + 0.5);
      hits.push({ x, y: by, n, num: i + 1, k, c, down, act: ai >= 0 }); });
    g.restore(); return hits;
  }
  function hitNote(st, x, y) {   // { n, del } — ✕ 둘레는 손가락 크기로 넉넉히
    for (const h of st.hits || []) { if (h.xx && Math.hypot(x - h.xx.cx, y - h.xx.cy) <= h.xx.r + 10) return { n: h.n, del: true };
      if (x >= h.x && x <= h.x + h.w && y >= h.y && y <= h.y + h.h) return { n: h.n, del: false }; } return null; }
  function undo(msg, onUndo, ms = 4000, label = "되돌리기") {   // 4초 동안 '되돌리기'(시간·이름은 바꿀 수 있음)
    document.getElementById("tuneUndo")?.remove();
    const el = document.createElement("div"); el.id = "tuneUndo"; el.setAttribute("role", "status");
    el.innerHTML = `<span></span><button type="button"></button>`; el.querySelector("span").textContent = msg; el.querySelector("button").textContent = label;
    (document.getElementById("tuneFs") || document.body).appendChild(el);
    const tm = setTimeout(() => el.remove(), ms);
    el.querySelector("button").onclick = () => { clearTimeout(tm); el.remove(); onUndo && onUndo(); };
  }
  function timeAt(st, x) { const m = st.map; return m ? Math.max(0, m.t0 + (x - m.L) / Math.max(1, m.w - m.L) * m.W8) : null; }
  // 주석 고치기 시트(선생님만). onSave(새 주석) / onDelete()
  let lastView = null;   // 마지막으로 주석을 누른 그래프(작은 화면/전체화면)
  function mkView(st, getPrev, setPrev, getT, seek) {
    let raf = 0;
    return {
      focus(tt) { cancelAnimationFrame(raf); const from = getPrev() ?? (+getT() || 0), to = Math.max(0, tt), t0 = performance.now();
        const step = (now) => { const k = Math.min(1, (now - t0) / 300), e = 1 - Math.pow(1 - k, 3); setPrev(from + (to - from) * e); if (k < 1) raf = requestAnimationFrame(step); }; raf = requestAnimationFrame(step); },
      edit(d, n) { st.editing = { d, n }; },
      done() { cancelAnimationFrame(raf); st.editing = null; const tt = getPrev(); setPrev(null); if (tt != null) try { seek(tt, true); } catch {} },
    };
  }
  function sheet(n, o) {
    document.getElementById("tuneSheet")?.remove();
    const fmt = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(2).padStart(5, "0")}`, isNew = !n.id;
    const d = { ...n, t0: +n.t0, t1: +n.t1 };
    const el = document.createElement("div"); el.id = "tuneSheet"; el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "음정 주석");
    const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
    el.innerHTML = `<div class="tsBox"><div class="tsHead"><b class="tsRng"></b><span class="tsSrc">${isNew ? "새 주석" : n.status === "ok" ? "✓ 확인됨" : "AI 초안 · " + esc(SRC[n.src] || "AI")}</span></div>
      <div class="tsTxW"><textarea class="tsTx" rows="3" maxlength="80" placeholder="여기에 짧게 적어 주세요 (예: 끝음 내려갈 때 배 힘 유지)">${esc(n.text)}</textarea>${isNew ? "" : `<button type="button" class="tsClr">전체 지우기</button>`}</div>
      ${n.evidence ? `<div class="tsEv">근거 · ${esc(n.evidence)}</div>` : ""}
      <div class="tsAdj"><span>시작</span><button type="button" data-a="s-">−0.1초</button><button type="button" data-a="s+">+0.1초</button><span>끝</span><button type="button" data-a="e-">−0.1초</button><button type="button" data-a="e+">+0.1초</button></div>
      <div class="tsRow">${isNew ? `<button type="button" class="tsCancel">취소</button>` : `<button type="button" class="tsCancel">닫기</button><button type="button" class="tsDel">삭제</button>`}<button type="button" class="tsOk">${isNew ? "저장" : "✓ 확인"}</button></div></div>`;
    (document.getElementById("tuneFs") || document.body).appendChild(el);
    // (10/31 08:21 사용자) 새로 쓰는 주석도 '한 점' 또는 '구간'으로 — 위 칸에서 바꾸고, 구간이면 시작·끝을 0.1초씩
    let spot = d.t1 - d.t0 < 0.35;
    const adj = el.querySelector(".tsAdj"), kind = document.createElement("div"); kind.className = "tsKind";
    kind.innerHTML = `<button type="button" data-k="p">● 한 점</button><button type="button" data-k="r">├─┤ 구간</button>`; adj.parentNode.insertBefore(kind, adj);
    const V = lastView; V && V.edit(d, n); V && V.focus(d.t0);   // (10/30 16:41 사용자 시안 승인) 창을 열면 그래프가 그 자리로 스르륵
    const paint = () => { el.querySelector(".tsRng").textContent = spot ? fmt(d.t0) : `${fmt(d.t0)} ~ ${fmt(d.t1)}`;
      kind.querySelectorAll("[data-k]").forEach(b => { const on = (b.dataset.k === "p") === spot; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); }); };
    const R2 = (x) => Math.round(x * 100) / 100, MIN = 0.4;
    const renderAdj = () => {
      adj.innerHTML = spot ? `<span>위치</span><button type="button" data-a="p-">−0.1초</button><button type="button" data-a="p+">+0.1초</button>`
        : `<span>시작</span><button type="button" data-a="s-">−0.1초</button><button type="button" data-a="s+">+0.1초</button><span>끝</span><button type="button" data-a="e-">−0.1초</button><button type="button" data-a="e+">+0.1초</button>`;
      const stepBy = (a) => { const v = a[1] === "+" ? 0.1 : -0.1;   // (10/31 08:12 사용자) 0.1초 단위
        if (a[0] === "p") { d.t0 = Math.max(0, R2(d.t0 + v)); d.t1 = d.t0; } else if (a[0] === "s") d.t0 = Math.max(0, Math.min(R2(d.t1 - MIN), R2(d.t0 + v))); else d.t1 = Math.max(R2(d.t0 + MIN), R2(d.t1 + v));
        paint(); V && V.focus(a[0] === "e" ? d.t1 : d.t0); try { navigator.vibrate && navigator.vibrate(8); } catch {} };   // 바꾼 쪽 자리로 그래프가 따라감 · 살짝 진동
      // (10/31 08:30 사용자) 길게 누르고 있으면 진동과 함께 계속 눌리기: 0.4초 뒤부터 0.1초마다, 1.5초 넘으면 더 빠르게
      adj.querySelectorAll("[data-a]").forEach(b => { let tm = null, t0 = 0;
        const stop = () => { clearTimeout(tm); tm = null; };
        const tick = () => { stepBy(b.dataset.a); tm = setTimeout(tick, performance.now() - t0 > 1500 ? 50 : 100); };
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); stop(); t0 = performance.now(); stepBy(b.dataset.a); tm = setTimeout(tick, 400); try { b.setPointerCapture(e.pointerId); } catch {} });
        ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, stop));
        b.addEventListener("contextmenu", (e) => e.preventDefault());
        b.onclick = (e) => { if (e.detail === 0) stepBy(b.dataset.a); };   // 키보드(Enter)로 누른 경우만(손가락은 위에서 처리)
      });
    };
    kind.querySelectorAll("[data-k]").forEach(b => b.onclick = () => { const want = b.dataset.k === "p"; if (want === spot) return; spot = want;
      d.t1 = spot ? d.t0 : R2(d.t0 + 1.0); renderAdj(); paint(); V && V.focus(d.t0); });
    renderAdj(); paint();
    // (10/31 15:47 사용자) 폰 뒤로 버튼 = 주석 창만 닫기(오늘의 베스트 전체화면은 그대로)
    if (!sheetClose) try { history.pushState(Object.assign({}, history.state || {}, { tuneSheet: true }), ""); } catch {}
    let closed = false;
    const close = (fromPop) => { if (closed) return; closed = true; el.remove(); V && V.done(); if (lastView === V) lastView = null; if (sheetClose === close) sheetClose = null;
      if (fromPop !== true) try { if (history.state && history.state.tuneSheet) { const nl = dropL(); skipPop = true; history.go(-1 - nl); } } catch {} };
    sheetClose = close;
    // (10/31 08:09 버그) 위 칸을 톡 하면 창이 뜬 직후 같은 손가락의 'click'이 창 바깥(어두운 곳)에 떨어져 바로 닫혔음 → 뜬 뒤 0.45초 안의 바깥 클릭은 무시
    const openedAt = performance.now();
    el.onclick = (e) => { if (e.target === el && performance.now() - openedAt > 450) close(); };
    el.querySelector(".tsCancel").onclick = close;
    // (11/02 17:32 사용자 버그) 글을 쓰다 [취소]·[저장]을 누르면 키보드가 먼저 내려가며 창이 밑으로 움직여, 손을 뗄 때 버튼이 손가락 밑에 없어 '클릭'이 안 됐음
    // → 이 버튼들은 손을 떼는 순간(pointerup — 누른 버튼으로 옴) 바로 실행 · 누를 때 키보드를 내리지 않음
    const ACT = ".tsCancel,.tsOk,.tsDel";
    el.querySelectorAll(ACT).forEach(b => { let downAt = 0, firedAt = -1e9;
      b.addEventListener("pointerdown", () => { downAt = performance.now(); });
      b.addEventListener("pointerup", (e) => { if (!downAt || e.pointerType === "mouse") return; downAt = 0; firedAt = performance.now(); b.click(); });
      b.addEventListener("click", (e) => { if (e.isTrusted && performance.now() - firedAt < 700) { e.stopImmediatePropagation(); e.preventDefault(); } }, true); });   // 뒤따르는 진짜 클릭은 한 번 더 실행 안 함
    // (10/31 08:58 사용자) 글 칸에 커서가 있는 채로 미세 조정·한 점/구간 버튼을 누르면 키보드가 자꾸 올라옴 → 글 칸 밖 버튼을 누르는 순간 글 칸에서 커서를 빼서 키보드를 내림
    el.addEventListener("pointerdown", (e) => { const b = e.target.closest && e.target.closest("button"); if (!b || b.classList.contains("tsClr") || b.matches(ACT)) return;
      const ae = document.activeElement; if (ae && ae.classList && ae.classList.contains("tsTx")) ae.blur(); }, true);
    el.querySelector(".tsClr") && (el.querySelector(".tsClr").onclick = () => { const ta = el.querySelector(".tsTx"); ta.value = ""; ta.focus(); });
    // (10/30 17:38 사용자 시안 승인) 삭제 = 확인 팝업('다음부터 묻지 않기' 체크하면 이 폰에선 바로 삭제)
    const doDel = () => { close(); o.onDelete && o.onDelete(n); };
    el.querySelector(".tsDel") && (el.querySelector(".tsDel").onclick = () => {
      let skip = false; try { skip = localStorage.getItem("tune_del_noask") === "1"; } catch {}
      if (skip) return doDel();
      const cf = document.createElement("div"); cf.className = "tsCf";
      cf.innerHTML = `<div class="tsCfBox" role="alertdialog" aria-label="주석 삭제 확인"><b>이 주석을 정말 삭제할까요?</b><p></p><label class="tsCk"><input type="checkbox"> 다음부터 묻지 않기</label><div class="tsCfRow"><button type="button" class="cfNo">취소</button><button type="button" class="cfYes">삭제</button></div></div>`;
      cf.querySelector("p").textContent = "“" + String(n.text || "").slice(0, 60) + "”";
      el.querySelector(".tsBox").appendChild(cf);
      cf.querySelector(".cfNo").onclick = () => cf.remove();
      cf.querySelector(".cfYes").onclick = () => { if (cf.querySelector("input").checked) { try { localStorage.setItem("tune_del_noask", "1"); } catch {} } doDel(); };
    });
    el.querySelector(".tsOk").onclick = () => { const tx = el.querySelector(".tsTx").value.trim(); if (!tx) { el.querySelector(".tsTx").focus(); return; }
      close(); o.onSave && o.onSave({ ...d, text: tx, status: "ok", t0: Math.round(d.t0 * 100) / 100, t1: Math.round(d.t1 * 100) / 100 }); };
    // (11/02 17:32 사용자) 새 주석도 창이 뜨자마자 키보드를 올리지 않음(창과 키보드가 동시에 올라와 출렁였음) — 글 칸을 톡 하면 키보드
    // (10/31 09:04 사용자) 상자를 누른 손가락의 뒤따르는 클릭이 막 열린 글 칸에 떨어지면 키보드가 바로 올라옴 → 열고 0.45초 동안은 글 칸이 키보드를 못 띄움(글을 한 번 더 눌러야 올라옴, 새 주석은 예전처럼 바로)
    if (!isNew) { const ta = el.querySelector(".tsTx"); ta.readOnly = true;
      ta.addEventListener("focus", () => { if (performance.now() - openedAt < 450) ta.blur(); });
      setTimeout(() => { ta.readOnly = false; }, 450); }
  }
  // (11/02) 정음 막대 색 = 기준: 선생님 노랑 · MIDI 보라 · 악보 초록 · 원곡 하늘 · 키·스케일만 회색(기준 정보가 없는 예전 것은 초록)
  const SRC_C = { teacher: "rgba(255,210,122,.42)", midi: "rgba(199,164,255,.36)", sheet: "rgba(127,217,154,.52)", youtube: "rgba(127,217,255,.32)", scale: "rgba(127,217,154,.46)" };   // (11/06 22:05 사용자) 키·스케일만도 예전처럼 초록(회색은 흰색처럼 보여 덜 눈에 띔)
  function srcCol(cv, tt) {
    if ((cv._fixes || []).some(x => tt >= x.t0 && tt <= x.t1)) return SRC_C.teacher;
    if (!cv._src) return "rgba(127,217,154,.46)";   // (11/06 22:09 사용자) 초록 더 잘 보이게
    const s = cv._src.find(x => tt >= x[0] && tt <= x[1]); return s ? SRC_C[s[3]] || SRC_C.sheet : cv._midi ? SRC_C.midi : SRC_C.scale;
  }
  // ── (11/02 16:45 사용자 시안 승인) 전주·간주 화면: 카운트다운 · 반주 파형 · 박자 점 · 다가오는 멜로디 미리보기 · 첫 음 건반 ──
  function waveOf(buf) {   // AudioBuffer → 0.05초마다 크기 + 박자(주기·위상) 추정. 한 번만 계산해 둠
    if (!buf || !buf.getChannelData) return null; if (buf._jw) return buf._jw;
    const sr = buf.sampleRate, hop = Math.round(sr * 0.05), n = Math.floor(buf.length / hop), ch = [];
    for (let c = 0; c < Math.min(2, buf.numberOfChannels); c++) ch.push(buf.getChannelData(c));
    const pk = new Float32Array(n);
    for (let i = 0; i < n; i++) { let m = 0; for (const d of ch) for (let j = i * hop, e = j + hop; j < e; j += 8) { const v = Math.abs(d[j]); if (v > m) m = v; } pk[i] = m; }
    let mx = 0; for (const v of pk) if (v > mx) mx = v; if (mx > 0) for (let i = 0; i < n; i++) pk[i] /= mx;
    const on = new Float32Array(n); for (let i = 1; i < n; i++) on[i] = Math.max(0, pk[i] - pk[i - 1]);
    let bl = 0, bs = 0; for (let L = 7; L <= 20; L++) { let s = 0; for (let i = L; i < n; i++) s += on[i] * on[i - L]; if (s > bs) { bs = s; bl = L; } }   // 0.35~1초(60~170BPM)
    let ph = 0, pb = -1; if (bl) for (let p = 0; p < bl; p++) { let s = 0; for (let i = p; i < n; i += bl) s += on[i]; if (s > pb) { pb = s; ph = p; } }
    return (buf._jw = { pk, hop: 0.05, per: bl * 0.05, ph: ph * 0.05 });
  }
  function introDraw(g, cv, st, t, nx, m) {
    const { L, w, T, HP, t0, W8, y, kt } = m, left = Math.max(0, nx[0] - t), sec = Math.ceil(left);
    const wv = typeof st.wave === "function" ? waveOf(st.wave()) : null, now = performance.now();
    g.save(); g.globalAlpha = Math.max(0, Math.min(1, (left - 0.4) / 2.6));   // (11/02 16:53 사용자) 노래 3초 전쯤부터 스르륵 사라짐
    if (g.globalAlpha <= 0) { g.restore(); return; }
    if (wv) {   // 반주 크기 파형(아래쪽, 흐리게)
      const bh = HP * 0.26, by = T + HP - 4, bw = Math.max(2, (w - L) / (W8 / wv.hop) - 1);
      for (let x = L; x < w; x += bw + 1) { const tt = t0 + (x - L) / (w - L) * W8, i = Math.floor(tt / wv.hop); if (i < 0 || i >= wv.pk.length) continue;
        const h = wv.pk[i] * bh; g.fillStyle = tt <= t ? "rgba(127,138,153,.55)" : "rgba(127,138,153,.3)"; g.fillRect(x, by - h, bw, h); }
      if (wv.per) { const ph = ((t - wv.ph) % wv.per + wv.per) % wv.per, a = Math.max(0, 1 - ph / (wv.per * 0.6)), xs0 = L + (t - t0) / W8 * (w - L);   // 박자 점(세로줄 위)
        g.fillStyle = `rgba(255,159,90,${(0.3 + 0.7 * a).toFixed(2)})`; g.beginPath(); g.arc(xs0, T + HP * 0.3, 5 + 5 * a, 0, 7); g.fill(); }
    }
    // 카운트다운
    const cx = L + (w - L) / 2, big = 48;
    g.textAlign = "center"; g.textBaseline = "middle"; g.fillStyle = "#ffe066"; g.font = `900 ${big}px system-ui, sans-serif`; g.fillText(String(sec), cx, T + HP * 0.16 + 10);
    // 첫 음 건반 깜빡임
    const fm = Math.round((kt && nx[kt] != null ? nx[kt] : nx[1]) / 100), fy = y(fm * 100), blink = 0.45 + 0.55 * Math.abs(Math.sin(now / 380));
    g.fillStyle = `rgba(255,159,90,${blink.toFixed(2)})`; g.fillRect(0, fy - 9, L - 3, 18);
    // (11/02 16:52 사용자) 안내 글·미리보기 점선은 뺌 — 첫 음 건반 깜빡임만
    g.restore();
  }
  function tgCol(cv) { return cv.target ? 2 + (cv.levels || []).length : 0; }   // 정음(목표음) 열(서버 v2부터)
  // (11/06 21:50 사용자) 음표를 위아래로 옮기면(반음·미세) 하늘색 '보정 후' 선도 바로 같이 움직이게: 그 구간 보정 후 음높이 = 서버 값 + (새 정음 − 서버가 고른 정음) (근사 · 정확한 건 완성본 다시 만들기 뒤)
  function syncCorr(cv) {
    const o_ = cv._orig, ks = cv._kShift || (cv._kShift = {}), kt = tgCol(cv); if (!kt || !cv.pts) return; const L = (cv.levels || []).length; if (!L) return;
    const idx = new Set([...Object.keys(o_ || {}), ...Object.keys(ks)]); if (!idx.size) return; const base = cv._advBase, kc = 2 + L - 1;
    for (const si of idx) { const i = +si, p = cv.pts[i]; if (!p) continue; const o0 = o_ && si in o_ ? o_[si] : null;
      const want = o0 != null && p[kt] != null ? p[kt] - o0 : 0, d = want - (ks[si] || 0); if (!d) continue;
      for (let c = 2; c < 2 + L; c++) if (p[c] != null) p[c] += d;
      if (base && base[i] != null) base[i] += d;   // 고급 보정 미리보기(adv.js)가 되돌릴 때 쓰는 기준도 같이
      if (want) ks[si] = want; else delete ks[si]; } }
  function draw(el, cv, t, lv, st) {
    if (!el || !el.getContext || !cv) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const r = G.devicePixelRatio || 1; if (el.width !== Math.round(w * r) || el.height !== Math.round(h * r)) { el.width = Math.round(w * r); el.height = Math.round(h * r); }   // 높이만 바뀌어도 다시 맞춤(옛 그림이 늘어나 터치 위치가 위로 어긋나던 버그)
    const g = el.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
    const full = !!(st && st.full), W8 = full ? (st.win || 6) / (st.xz || 1) : WIN, k = col(cv, lv), lane = k && h > 110 && !(st && st.advOn) ? (full ? 64 : LANE) : 0, H = h - lane, T = lane, kt = tgCol(cv);   // (10/30 15:39 사용자) 고친 양 = 그래프 위
    if (cv._orig || cv._kShift) { try { syncCorr(cv); } catch {} }
    let [lo, hi] = range(cv);
    if (full && (st.yz || 1) > 1) {   // 전체화면 핀치 확대: 배율은 손가락으로만 바뀜. 가운데는 지금 음을 부드럽게 따라가고, 손으로 위아래로 밀면 그 자리에 머묾
      const half = (hi - lo) / 2 / st.yz, now = Date.now();
      if ((!st.panAt || now - st.panAt > 4000) && !st.sel && !st.dragging && !st.msel) {   // (11/06 21:48 사용자 '음표를 위아래로 옮길 때 화면이 엉뚱하게 움직임') 음을 고르거나 옮기는 중엔 따라가지 않음 · 재생 중엔 지금 부르는 음(노란선 근처)을 화면 가운데로 따라감 — 화면 밖 음도 들어오게
        const v = []; for (const p of cv.pts || []) { if (p[0] < t - 0.6) continue; if (p[0] > t + 1.2) break; v.push(p[1]); }
        let c = null; if (v.length) { v.sort((a, b) => a - b); c = v[Math.floor(v.length / 2)]; } else { const f = fitAt(cv, t, 0); if (f) c = f[2]; }
        if (c != null) st.yc = st.yc == null ? c : st.yc + (c - st.yc) * 0.15; }
      const c = st.yc ?? (lo + hi) / 2; lo = c - half; hi = c + half;
    } else if (full && st.yo) { lo += st.yo; hi += st.yo; }   // (11/02 19:48 사용자) 확대 안 해도 위아래로 밀어 보기
    if (full && st.focusC != null) {   // 고치기 창이 뜨며 그래프가 줄어들 때 고른 막대가 화면 안(위아래 20% 안쪽)에 오게 한 번 옮김
      const fc = st.focusC, m = (hi - lo) * 0.2; st.focusC = null;
      const mn = st.focusMin; st.focusMin = false;
      if (fc < lo + m || fc > hi - m) { const sh = mn ? (fc < lo + m ? fc - (lo + m) : fc - (hi - m)) : fc - (lo + hi) / 2; /* 끄는 중(mn)엔 화면 안쪽으로 들어올 만큼만 살짝 */ if ((st.yz || 1) > 1) { st.yc = (st.yc ?? (lo + hi) / 2) + sh; st.panAt = Date.now(); } else st.yo = (st.yo || 0) + sh; lo += sh; hi += sh; }
    }
    if (st && st.zoom && !full) {   // 확대: 화면 안(지금 앞뒤 8초) 음이 모두 들어오게 — 기본 ±4반음, 크게 도약하면 그만큼 넓힘(10/30 13:28 사용자)
      const f = fitAt(cv, t, k);
      if (f) { const tl = Math.min(f[0] - 150, f[2] - ZOOM_HALF), th = Math.max(f[1] + 150, f[2] + ZOOM_HALF);
        // 넓힐 땐 빠르게(도약음이 화면 밖으로 안 나가게), 좁힐 땐 천천히(10/30 13:40 사용자)
        if (st.lo == null) { st.lo = tl; st.hi = th; } else { st.lo += (tl - st.lo) * (tl < st.lo ? 0.45 : 0.06); st.hi += (th - st.hi) * (th > st.hi ? 0.45 : 0.06); } }
      if (st.lo != null) { lo = st.lo; hi = st.hi; }
    }
    // (10/31 07:57 사용자) 주석 칸이 음정선을 가리지 않게: 주석이 있으면 아래쪽은 칸 자리로 비워 두고 음정선은 그 위에만 그림
    const popM = !!st && !st.advOn;   // (11/07 10:48 사용자) 작은 그래프도   // (11/07) 전체화면 기본·수강생도 말풍선 방식 → 아래 주석 칸 없음
    const hasN = !popM && full && !!(st && typeof st.notes === "function" && (st.notes() || []).length) && H > 200 && !(st && st.notesHidden);   // (11/03 16:55 사용자 시안 승인) 강사 화면 보정본 = 주석 숨김   // 작은 화면은 덮개(전체화면으로 보기) 아래라 그대로
    const RB0 = hasN ? noteBand(st, full) : 0; let RB = RB0;
    if (full && st) { if (st.rbS == null || Math.abs(st.rbS - RB0) < 0.6) st.rbS = RB0; else st.rbS += (RB0 - st.rbS) * 0.22; RB = Math.round(st.rbS); }   // (11/07 09:31 사용자 영상) 🎛 고급을 켜면 주석 칸이 없어지며 음정선이 툭 내려갔음 → 0.3초 동안 부드럽게 옮겨 가 보던 음을 눈으로 따라갈 수 있게
    const HP = H - RB;
    const L = full ? 44 : 30, y = (c) => T + HP - 6 - (c - lo) / (hi - lo) * (HP - 12);
    const t0 = t - W8 * HEAD, xs = (tt) => L + (tt - t0) / W8 * (w - L), sc = cv.scale;
    g.font = (full ? "12px" : "10px") + " system-ui, sans-serif"; g.textBaseline = "middle";
    let lastY = -99;
    for (let m = Math.floor(hi / 100); m >= Math.ceil(lo / 100); m--) {
      const pc = ((m % 12) + 12) % 12, ins = !sc || sc.includes(pc), yy = Math.round(y(m * 100)) + 0.5;
      if (ins && sc) { g.fillStyle = "rgba(156,195,255,.06)"; g.fillRect(L, yy - 4, w - L, 8); }
      if (full && st && st.advOn && sc && ins) { const ya = y(m * 100 + 50), yb = y(m * 100 - 50); g.fillStyle = pc === sc[0] ? "rgba(156,195,255,.12)" : "rgba(156,195,255,.05)"; g.fillRect(L, ya + 0.5, w - L, Math.max(1, yb - ya - 1)); }   // (11/06) 보정 모드 음계 격자: 음계 음 = 줄 전체 띠(으뜸음은 진하게), 음계 밖 = 어두운 칸
      g.fillStyle = ins ? "#2c3440" : "#1b1f26"; g.fillRect(L, yy, w - L, 1);
      if (yy > T + HP) continue;
      if (full && (HP - 12) / ((hi - lo) / 100) > 60) { g.fillStyle = "#171b21"; for (const q of [25, 50, 75]) g.fillRect(L, Math.round(y(m * 100 - q)) + 0.5, w - L, 1); }   // 크게 확대하면 ¼반음 눈금
      if (full) continue;   // 전체화면은 아래에서 건반으로
      if (ins && yy - lastY >= 12) { g.fillStyle = sc && pc === sc[0] ? "#9cc3ff" : "#6b7480"; g.fillText(NAMES[pc] + (Math.floor(m / 12) - 1), 2, yy); lastY = yy; }   // 가까운 이름은 건너뜀
    }
    if (full) {   // (11/02 15:48 사용자) 왼쪽 음 이름 = 건반(누르는 동안 소리)
      const semi = (HP - 12) / ((hi - lo) / 100), KW = L - 3, fs = Math.max(8, Math.min(12, semi * 0.72));
      g.save(); g.beginPath(); g.rect(0, T, L, HP); g.clip(); g.font = fs + "px system-ui, sans-serif"; g.textBaseline = "middle";
      for (let m = Math.ceil(hi / 100) + 1; m >= Math.floor(lo / 100) - 1; m--) {
        const pc = ((m % 12) + 12) % 12, blk = [1, 3, 6, 8, 10].includes(pc), y0 = y(m * 100 + 50), y1 = y(m * 100 - 50), down = st && st.kbDown === m;
        g.fillStyle = down ? "#ff9f5a" : blk ? "#22262d" : "#e6e9ee"; g.fillRect(0, y0, blk ? KW * 0.62 : KW, Math.max(1, y1 - y0 - 0.6));
        if (semi >= 9 || pc === 0) { g.fillStyle = down ? "#111" : blk ? "#cfd5de" : (sc && pc === sc[0] ? "#2a5bd7" : "#2b2f36"); g.fillText(NAMES[pc] + (Math.floor(m / 12) - 1), 3, (y0 + y1) / 2); }
      }
      g.restore();
      if (st) { st.kb = { L, inv: (Y) => lo + (T + HP - 6 - Y) / (HP - 12) * (hi - lo) }; }
    }
    if (st) st.map = { L, W8, t0, w, T, H };
    const vis = []; for (const p of cv.pts || []) { if (p[0] < t0 - 0.3) continue; if (p[0] > t0 + W8 + 0.3) break; vis.push(p); }
    if (RB) { g.fillStyle = "#0c0e12"; g.fillRect(L, T + HP, w - L, RB); g.fillStyle = "#232a34"; g.fillRect(L, T + HP, w - L, 1); }   // 주석 칸 자리(음정선 아래)
    g.save(); g.beginPath(); g.rect(L, T, w - L, HP); g.clip();
    if (full && st && st.advOn && st.beatOn && cv.beats && cv.beats.t) {   // (11/06) 🥁 반주 박자 격자: 박 = 옅은 세로줄, 마디 첫 박(추정) = 조금 진하게 + 마디 번호
      const B = cv.beats.t, dn = cv.beats.down || 0; g.font = "10px system-ui, sans-serif"; g.textBaseline = "top";
      for (let i = 0; i < B.length; i++) { if (B[i] < t0 - 0.1) continue; if (B[i] > t0 + W8 + 0.1) break; const X = Math.round(xs(B[i])) + 0.5, bar = (i - dn) % 4 === 0;
        g.fillStyle = bar ? "rgba(255,207,153,.32)" : "rgba(255,207,153,.12)"; g.fillRect(X, T, 1, HP);
        if (bar && i >= dn) { g.fillStyle = "rgba(255,207,153,.6)"; g.fillText(String(Math.floor((i - dn) / 4) + 1), X + 3, T + 3); } } }
    if (full && kt) {   // 정음(목표음) = 초록 막대: 보정이 맞추려는 바로 그 음
      const bh = Math.max(6, (HP - 12) / ((hi - lo) / 100) * 0.55), bars = []; let run = null;
      const fxOf = (tt) => (cv._fixes || []).findIndex(x => tt >= x.t0 - 1e-6 && tt < x.t1 - 1e-6);   // 나눈·고친 구간 경계에서 막대도 끊음
      // 1) 막대 조각 모으기 → 2) 아주 짧은 조각(0.1초 미만, 선생님이 안 고친 것)은 막대로 안 그리고 옆 회색 막대에 합침(11/03 15:52 사용자: 가는 막대 하나가 따로 보임)
      const runs = [];
      for (let i = 0; i < vis.length; i++) { const p = vis[i], q = vis[i + 1]; if (p[kt] == null) { run = null; continue; }
        // (11/03 15:21 사용자) 한 음인데 가운데서 소리 높이를 못 잡은 짧은 틈(숨·자음·작아진 소리)에서 막대가 끊김 → 같은 정음이고 사이에 다른 점이 없으면 0.5초까지 한 막대(서버 BRIDGE_S와 같음)
        const cont = q && q[kt] === p[kt] && q[0] - p[0] < BAR_GAP && fxOf(q[0]) === fxOf(p[0]), x0 = xs(p[0]), x1 = cont ? xs(q[0]) : x0 + 2;
        if (!run) { run = { x0, x1, t0: p[0], t1: p[0], c: p[kt], y: y(p[kt]), h: bh, seg: [] }; runs.push(run); }
        run.seg.push([p, x0, x1]); run.x1 = x1; run.t1 = cont ? q[0] : p[0] + 0.04;
        if (!cont) { const fi = fxOf(run.t0); if (fi >= 0) { run.t0 = cv._fixes[fi].t0; run.t1 = cv._fixes[fi].t1; run.fx = true; } run = null; } }
      const tiny = new Set();
      for (const r of runs) {
        if (!r.fx && r.t1 - r.t0 < 0.1) { r.seg.forEach(([p]) => tiny.add(p)); continue; }
        // (11/09 01:21 사용자 A안) 음별 볼륨이 보이게: 키운 음 = 막대 두껍게 · 줄인 음 = 얇게 · 끈 음 = 흐리게+빗금 (꼬리표는 아래에서)
        const vn = ((st && st._adv && st._adv.ne && st._adv.ne.notes) || []).find(x => x.t0 <= (r.t0 + r.t1) / 2 && x.t1 >= (r.t0 + r.t1) / 2 && (x.mute || x.gain_db));
        r.gd = vn ? (vn.mute ? "m" : vn.gain_db) : 0; const rh = r.gd && r.gd !== "m" ? bh * Math.max(0.4, Math.min(1.8, Math.pow(10, r.gd / 40))) : bh; r.h = Math.max(rh, bh);
        for (const [p, x0, x1] of r.seg) { g.fillStyle = srcCol(cv, p[0]); const mv = (cv._tedits || []).some(x => p[0] >= x.t0 - 1e-6 && p[0] < x.t1 - 1e-6); if (mv) g.globalAlpha = 0.22; if (r.gd === "m") g.globalAlpha = 0.28; g.fillRect(x0, y(p[kt]) - rh / 2, Math.max(1, x1 - x0 + 0.5), rh); g.globalAlpha = 1; }
        if (r.gd === "m") { g.save(); g.beginPath(); g.rect(r.x0, r.y - bh / 2, Math.max(2, r.x1 - r.x0), bh); g.clip(); g.strokeStyle = "rgba(220,224,232,.55)"; g.lineWidth = 1.5; for (let X = r.x0 - bh; X < r.x1 + bh; X += 6) { g.beginPath(); g.moveTo(X, r.y + bh / 2); g.lineTo(X + bh, r.y - bh / 2); g.stroke(); } g.restore(); }   // 옮기는 중인 음은 원래 자리를 흐리게
        delete r.seg; bars.push(r); }
      // (11/03 15:35 사용자) 부른 음 선은 있는데 정음 막대가 없는 곳(ㅅ·ㅊ·ㅎ 뒤 모음, 꺾기·짧은 음 등 자동 보정이 일부러 안 건드린 곳)도 고칠 수 있게
      // → 선생님 화면에서만 회색 점선 막대(부른 높이에 가까운 음)로 보여 주고, 톡 하면 다른 막대처럼 고치기 창 — 고치기 전엔 자동 보정에 아무 영향 없음
      if (st && st.ghostOn) { let gr = null;
        const flush = () => { if (gr && gr.t1 - gr.t0 >= 0.1) { const sv = gr.v.slice().sort((a, b) => a - b), c = Math.round(sv[sv.length >> 1] / 100) * 100, gx0 = xs(gr.t0), gx1 = xs(gr.t1), yy = y(c);
            g.save(); g.fillStyle = "rgba(160,168,180,.16)"; g.fillRect(gx0, yy - bh / 2, Math.max(3, gx1 - gx0), bh); g.setLineDash([3, 3]); g.strokeStyle = "rgba(205,210,218,.65)"; g.lineWidth = 1.2; g.strokeRect(gx0, yy - bh / 2, Math.max(3, gx1 - gx0), bh); g.restore();
            bars.push({ x0: gx0, x1: gx1, t0: gr.t0, t1: gr.t1, c, y: yy, h: bh, ghost: true }); } gr = null; };
        for (const p of vis) { if ((p[kt] != null && !tiny.has(p)) || p[1] == null) { flush(); continue; } if (gr && p[0] - gr.tl > 0.13) flush(); if (!gr) gr = { t0: p[0], t1: p[0], tl: p[0], v: [] }; gr.v.push(p[1]); gr.tl = p[0]; gr.t1 = p[0] + 0.04; }
        flush(); }
      for (const b of bars) { const f = (cv._fixes || []).find(x => x.t0 < b.t1 && x.t1 > b.t0);   // 선생님이 고친 정음 = 노란 테두리(나누기만 한 조각은 경계 틈만)
        if (f && !f.cut) { g.strokeStyle = "#ffd27a"; g.lineWidth = 2; g.strokeRect(b.x0, b.y - b.h / 2, Math.max(4, b.x1 - b.x0), b.h); }
        if (f && f.cut) { g.fillStyle = "#0f1115"; g.fillRect(b.x0 - 1.5, b.y - b.h / 2 - 3, 3, b.h + 6); }
        if (st && st.sel && st.sel.t0 < b.t1 && st.sel.t1 > b.t0) { g.save(); g.shadowColor = "#9cc3ff"; g.shadowBlur = 10; g.strokeStyle = "#9cc3ff"; g.lineWidth = 3; g.strokeRect(b.x0 - 2, b.y - b.h / 2 - 2, Math.max(6, b.x1 - b.x0 + 4), b.h + 4); g.restore(); } }
      for (const b of bars) { if (!b.gd) continue;   // (11/09 A안) 볼륨 꼬리표: +4dB(주황) · −6dB·무음(하늘)
        const s = b.gd === "m" ? "무음" : `${b.gd > 0 ? "+" : "−"}${Math.abs(Math.round(b.gd))}dB`; g.font = "bold 10.5px system-ui, sans-serif"; g.textBaseline = "middle";
        const tw = g.measureText(s).width + 10, tx = b.x0 + 2, ty = b.y - b.h / 2 - 10, up = b.gd !== "m" && b.gd > 0;
        g.fillStyle = "rgba(17,20,26,.92)"; g.strokeStyle = up ? "#ffb86b" : "#7fb8ff"; g.lineWidth = 1.2; g.beginPath(); (g.roundRect ? g.roundRect(tx, ty - 7.5, tw, 15, 7) : g.rect(tx, ty - 7.5, tw, 15)); g.fill(); g.stroke();
        g.fillStyle = up ? "#ffcf99" : "#b9dcff"; g.fillText(s, tx + 5, ty + 0.5); }
      if (st) st.tbars = bars;
      // (11/03 13:08 사용자 시안) 타이밍·길이 고친 음 = 새 자리에 하늘색 막대 + 원래 자리 점선
      const tb = [];
      for (const te of cv._tedits || []) { if (te.nt1 < t0 - 0.5 || te.nt0 > t0 + W8 + 0.5) continue; const yy = y(te.c);
        g.save(); g.setLineDash([4, 3]); g.strokeStyle = "rgba(230,233,238,.55)"; g.lineWidth = 1.5; g.strokeRect(xs(te.t0), yy - bh / 2, Math.max(4, xs(te.t1) - xs(te.t0)), bh); g.restore();
        const x0 = xs(te.nt0), x1 = xs(te.nt1); g.fillStyle = "#5fd4ff"; g.fillRect(x0, yy - bh / 2, Math.max(3, x1 - x0), bh);
        if (st && st.sel && Math.abs(st.sel.t0 - te.t0) < 0.02) { g.fillStyle = "#e8f8ff"; g.fillRect(x0, yy - bh / 2, 3, bh); g.fillRect(x1 - 3, yy - bh / 2, 3, bh); }   // 고른 음: 양 끝 손잡이
        tb.push({ x0, x1, y: yy, h: bh, t0: te.t0, t1: te.t1, c: te.c, te }); }
      if (st) st.tebars = tb;
      if (st && st.advOn && G.TuneAdv && cv.uv) {   // (11/04 사용자) 치찰음(노란 빗금)·호흡(회색 빗금) — 고급 보정에서만, 가까운 음 막대 높이에
        const ub = [], near_ = (a, b) => { let best = null, bd = 9; for (const x of bars) { const dd = Math.max(0, x.t0 - b, a - x.t1); if (dd < bd && dd <= 0.6) { bd = dd; best = x; } } return best; };
        for (const u of G.TuneAdv.uvList(cv, st)) { if (u[1] < t0 - 0.2 || u[0] > t0 + W8 + 0.2) continue;
          const x0 = xs(u[0]), x1 = Math.max(x0 + 4, xs(u[1])), nb = near_(u[0], u[1]), yy = nb ? nb.y : T + HP - 14, hh = Math.max(12, bh * 1.2);
          g.save(); g.beginPath(); g.rect(x0, yy - hh / 2, x1 - x0, hh); g.clip();
          const c = u[2] === "s" ? "rgba(255,210,90,.85)" : u[2] === "b" ? "rgba(180,188,200,.7)" : "rgba(120,128,140,.35)";
          g.fillStyle = u[2] === "s" ? "rgba(255,210,90,.12)" : "rgba(180,188,200,.08)"; g.fillRect(x0, yy - hh / 2, x1 - x0, hh);
          g.strokeStyle = c; g.lineWidth = 1.2; for (let q = x0 - hh; q < x1 + hh; q += 5) { g.beginPath(); g.moveTo(q, yy + hh / 2); g.lineTo(q + hh, yy - hh / 2); g.stroke(); }
          g.restore(); if (u[3]) { g.strokeStyle = c; g.lineWidth = 1.5; g.strokeRect(x0, yy - hh / 2, x1 - x0, hh); }
          ub.push({ x0, x1, y: yy, h: hh, t0: u[0], t1: u[1], k: u[2], u }); }
        st.uvbars = ub;
        if (st.uvSel) { const a = xs(Math.min(st.uvSel[0], st.uvSel[1])), b2 = xs(Math.max(st.uvSel[0], st.uvSel[1])); g.fillStyle = "rgba(255,184,107,.16)"; g.fillRect(a, T, Math.max(2, b2 - a), HP); g.fillStyle = "#ffb86b"; g.fillRect(a, T, 2, HP); g.fillRect(b2 - 2, T, 2, HP); }
        for (const r of ((st._adv && st._adv.ne.global.uv_gain) || [])) { if (r.t1 < t0 || r.t0 > t0 + W8) continue; const a = xs(r.t0), b2 = xs(r.t1);
          g.fillStyle = "rgba(255,184,107,.07)"; g.fillRect(a, T, Math.max(2, b2 - a), HP); g.fillStyle = "#ffcf99"; g.font = "bold 11px system-ui, sans-serif"; g.textBaseline = "top";
          g.fillText([r.s_db ? `ㅅ ${r.s_db > 0 ? "+" : ""}${r.s_db}dB` : "", r.b_db ? `숨 ${r.b_db > 0 ? "+" : ""}${r.b_db}dB` : ""].filter(Boolean).join(" · "), Math.max(L + 2, a + 3), T + 4); }
      } else if (st) st.uvbars = null;
      if (st) st.hdl = null;
      if (st && (st.advOn || st.buMode) && st.sel) {   // (11/06 16:20 사용자) 고른 음 양 끝 = 화살표 손잡이(꾹 누른 채 좌우로 = 길이 미세) · 음 가운데를 잡아 위아래 = 음정, 좌우 = 자리
        const sb = (st.tebars || []).find(x => Math.abs(x.t0 - st.sel.t0) < 0.02) || bars.find(x => Math.abs(x.t0 - st.sel.t0) < 0.02 || (st.sel.t0 < x.t1 && st.sel.t1 > x.t0));
        if (sb && sb.x1 > L && sb.x0 < w && typeof st.onBarDragX === "function") { const R = HANDLE_R, hh = Math.max(26, sb.h + 12), lx = sb.x0, rx = sb.x1;
          const arrow = (x, dir, on) => { const x0 = dir < 0 ? x - R * 1.5 : x, x1 = dir < 0 ? x : x + R * 1.5, tip = dir < 0 ? x0 : x1, bk = dir < 0 ? x1 : x0, y0 = sb.y - hh / 2, y1 = sb.y + hh / 2, nk = R * 0.6 * -dir;
            g.beginPath(); g.moveTo(bk, y0); g.lineTo(tip - nk, y0); g.lineTo(tip, sb.y); g.lineTo(tip - nk, y1); g.lineTo(bk, y1); g.closePath(); g.fillStyle = on ? "#ffb86b" : "#e8f8ff"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#0b0d11"; g.stroke();
            g.fillStyle = "#0b0d11"; g.font = "bold 15px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(dir < 0 ? "‹" : "›", (x0 + x1) / 2, sb.y + 1); g.textAlign = "left"; };
          const nbH = (dir) => bars.some(x => x !== sb && Math.abs(x.y - sb.y) < hh && (dir < 0 ? x.x1 > lx - R * 1.5 && x.x0 < lx - 1 : x.x0 < rx + R * 1.5 && x.x1 > rx + 1));   // (11/09 00:21 사용자 '쪼갰더니 앞부분이 사라짐') 바로 옆 음(나눈 앞 조각)을 손잡이가 가렸음 → 그땐 반투명
          const drawA = (x, dir, on) => { const ga = g.globalAlpha; if (!on && nbH(dir)) g.globalAlpha = 0.42; arrow(x, dir, on); g.globalAlpha = ga; };
          if (lx >= L - 4) drawA(lx, -1, st.hdlArmed === "l"); if (rx <= w + 4) drawA(rx, 1, st.hdlArmed === "r");
          st.hdl = { l: { x: lx - R * 0.75, y: sb.y, r: R + 8 }, r: { x: rx + R * 0.75, y: sb.y, r: R + 8 } };
          const tips = [["v", "↕ 잡자마자 끌기 = ", "반음씩"], ["fine", "꾹 0.6초 → 위아래 = ", "미세"], ["dbl", "두 번 톡 = ", "가까운 음에 착"], ["arr", "‹ › 꾹 0.6초 → 끌기 = ", "앞·뒤 길이"]].filter(q => !learned(q[0]) && (q[0] !== "dbl" || st.advOn));
          if (tips.length && !st.dragging) { g.font = "11.5px system-ui, sans-serif"; g.textBaseline = "middle"; const cx = Math.max(L + 70, Math.min(w - 70, (Math.max(L, sb.x0) + Math.min(w, sb.x1)) / 2));
            const tag = (yy, a, b2) => { const wa = g.measureText(a).width; g.font = "bold 11.5px system-ui, sans-serif"; const wb = g.measureText(b2).width; g.font = "11.5px system-ui, sans-serif";
              const W_ = wa + wb + 14, X0 = Math.max(L + 2, Math.min(w - W_ - 2, cx - W_ / 2)); g.fillStyle = "rgba(24,29,37,.92)"; g.strokeStyle = "#3b4250"; g.lineWidth = 1;
              g.beginPath(); if (g.roundRect) g.roundRect(X0, yy - 10, W_, 20, 8); else g.rect(X0, yy - 10, W_, 20); g.fill(); g.stroke();
              g.fillStyle = "#cfd3da"; g.fillText(a, X0 + 7, yy); g.fillStyle = "#ffcf99"; g.font = "bold 11.5px system-ui, sans-serif"; g.fillText(b2, X0 + 7 + wa, yy); g.font = "11.5px system-ui, sans-serif"; };
            const up = tips.filter(q => q[0] === "v"), dn = tips.filter(q => q[0] !== "v"), top0 = sb.y - hh / 2 - 16;
            up.forEach((q, i) => { if (top0 - i * 24 > T + 10) tag(top0 - i * 24, q[1], q[2]); });
            dn.forEach((q, i) => { const yy = sb.y + hh / 2 + 16 + i * 24; if (yy < T + HP - 8) tag(yy, q[1], q[2]); }); } } }
      if (st) st.cutHit = null;
      if (full && st && st.sel && st.cutAtNow && st.map && !st.dragging && (!st.isPaused || st.isPaused()) && t > st.sel.t0 + 0.04 && t < st.sel.t1 - 0.04) {   // (11/06 22:20 사용자) 고른 음 위에 세로줄이 오면 줄 위에 ✂ — 톡 = 그 자리에서 나누기
        const sb = (st.tbars || []).find(x => Math.abs(x.t0 - st.sel.t0) < 0.02), mp = st.map, X = mp.L + (t - mp.t0) / Math.max(1e-6, mp.W8) * (mp.w - mp.L);
        if (sb && X > mp.L + 10 && X < mp.w - 10) { const R = 17, Y = Math.min(T + HP - R - 4, sb.y + Math.max(74, (sb.h || 10) / 2 + 68));   /* (11/09 00:11 사용자) 가위를 더 아래로 — '두 번 톡' 안내 밑 */
          g.beginPath(); g.arc(X, Y, R, 0, Math.PI * 2); g.fillStyle = "rgba(255,110,199,.92)"; g.fill(); g.lineWidth = 2; g.strokeStyle = "#1a0714"; g.stroke();
          g.fillStyle = "#1a0714"; g.font = "bold 18px system-ui,sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("✂", X, Y + 1); g.textAlign = "left"; g.textBaseline = "alphabetic";
          st.cutHit = { x: X, y: Y, r: R + 8 }; } }
      if (st && st.pulse && performance.now() - st.pulse.at < 700) {   // (11/06 22:02 사용자) 꾹 켜짐 표시를 더 크고 확실하게: 안쪽 채운 원 + 두 겹 퍼지는 고리(최대 반지름 ~90px)
        const k_ = (performance.now() - st.pulse.at) / 700, e_ = 1 - (1 - k_) ** 3, X_ = st.pulse.x, Y_ = st.pulse.y;
        g.beginPath(); g.arc(X_, Y_, 18 + 20 * e_, 0, Math.PI * 2); g.fillStyle = `rgba(255,184,107,${0.32 * (1 - k_)})`; g.fill();
        g.beginPath(); g.arc(X_, Y_, 20 + 70 * e_, 0, Math.PI * 2); g.strokeStyle = `rgba(255,184,107,${0.95 * (1 - k_)})`; g.lineWidth = 5 * (1 - k_) + 1.5; g.stroke();
        if (k_ > 0.15) { const k2 = (k_ - 0.15) / 0.85, e2 = 1 - (1 - k2) ** 3; g.beginPath(); g.arc(X_, Y_, 20 + 50 * e2, 0, Math.PI * 2); g.strokeStyle = `rgba(255,226,191,${0.7 * (1 - k2)})`; g.lineWidth = 3; g.stroke(); } }   // 꾹 0.6초 켜짐 표시(진동 없는 기기용)
      if (st && st.advOn && st._adv) for (const d of st._adv.ne.global.draw || []) { if (d.t1 < t0 || d.t0 > t0 + W8) continue;   // 펜으로 그린 선(점선 주황) — 펜 도구로 톡 하면 지움
        g.save(); g.setLineDash([5, 4]); g.strokeStyle = "rgba(255,184,107,.9)"; g.lineWidth = 2; g.beginPath(); d.pts.forEach((q, i) => { const X = xs(q[0]), Y = y(q[1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); g.restore(); }
      if (st && st.penPts && st.penPts.length > 1) { g.save(); g.strokeStyle = "#ffb86b"; g.lineWidth = 3; g.lineCap = "round"; g.lineJoin = "round"; g.beginPath(); st.penPts.forEach((q, i) => { const X = xs(q[0]), Y = y(q[1]); if (i) g.lineTo(X, Y); else g.moveTo(X, Y); }); g.stroke(); g.restore(); }
      if (st && st.msel) { const a = xs(st.msel[0]), b2 = xs(st.msel[1]), gr_ = !st.advOn, MC = gr_ ? "#7fd99a" : "#ff6ec7";   // (11/06 22:54 사용자 시안 ③) 기본 모드 = 초록(한마디용) · 동그라미 손잡이 · 고급 = 분홍(고치기용) · ‖ 손잡이
        g.fillStyle = gr_ ? "rgba(127,217,154,.10)" : "rgba(255,110,199,.14)"; g.fillRect(a, T, Math.max(2, b2 - a), HP); g.fillStyle = MC; g.fillRect(a, T, 2, HP); g.fillRect(b2 - 2, T, 2, HP);
        if (gr_) { /* 손잡이·💬 표시는 맨 위에(노란 칠에 안 가리게) — 아래 '기본 모드 구간 손잡이' */ }
        else { const gy = T + HP / 2 - 15; g.fillRect(a - 5, gy, 12, 30); g.fillRect(b2 - 8, gy, 12, 30); g.fillStyle = "#1a0714"; for (const gx of [a + 1, b2 - 2]) { g.fillRect(gx - 2, gy + 7, 1.5, 16); g.fillRect(gx + 1, gy + 7, 1.5, 16); } }   // (손잡이: 잡고 끌면 범위 조절)
        for (const b of bars.concat(tb)) if (b.t0 < st.msel[1] && b.t1 > st.msel[0]) { g.strokeStyle = MC; g.lineWidth = 2; g.strokeRect(b.x0 - 1, b.y - b.h / 2 - 1, Math.max(4, b.x1 - b.x0 + 2), b.h + 2); } }
    }
    if (k) {   // 두 선 사이 노랑(많이 고칠수록 진하게)
      for (let i = 1; i < vis.length; i++) {
        const a = vis[i - 1], b = vis[i]; if (b[0] - a[0] >= 0.13) continue;
        const d = Math.abs(b[k] - b[1]); if (d < 4) continue;
        g.fillStyle = `rgba(255,210,122,${Math.min(0.75, 0.15 + d / 60).toFixed(2)})`;
        g.beginPath(); g.moveTo(xs(a[0]), y(a[1])); g.lineTo(xs(b[0]), y(b[1])); g.lineTo(xs(b[0]), y(b[k])); g.lineTo(xs(a[0]), y(a[k])); g.closePath(); g.fill();
      }
    }
    const line = (kk, color, wd) => {
      g.strokeStyle = color; g.lineWidth = wd; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); let prev = null;
      for (const p of vis) { const X = xs(p[0]), Y = y(p[kk]); if (prev != null && p[0] - prev < 0.13) g.lineTo(X, Y); else g.moveTo(X, Y); prev = p[0]; }
      g.stroke();
    };
    line(1, "#ffe066", full ? 2.6 : 2);   // (10/31 15:34 사용자) 부른 음 = 밝은 노랑
    if (k) line(k, "#7fd9ff", full ? 2.6 : 2);
    g.restore();
    if (lane) {   // 고친 양 줄
      const top = 2, mid = top + (lane - 4) / 2, half = (lane - 6) / 2;
      g.fillStyle = "#151920"; g.fillRect(L, top, w - L, lane - 4); g.fillStyle = "#2c3440"; g.fillRect(L, Math.round(mid), w - L, 1);
      g.fillStyle = "#6b7480"; g.font = (full ? "11px" : "9px") + " system-ui, sans-serif"; g.fillText("고친 양", 0, mid);
      if (full) { g.fillText("높게", 4, top + 8); g.fillText("낮게", 4, top + lane - 12); }
      const bw = Math.max(1.5, (w - L) / (W8 * (cv.fps || 25)) * 0.8);
      for (const p of vis) { const X = xs(p[0]); if (X < L || X > w) continue; const d = p[k] - p[1]; if (Math.abs(d) < 2) continue;
        const hh = Math.max(-half, Math.min(half, -d / 50 * half)); g.fillStyle = Math.abs(d) <= 15 ? "#5b6573" : hh > 0 ? "#ffd27a" : "#9cc3ff"; g.fillRect(X, hh > 0 ? mid - hh : mid, bw, Math.abs(hh)); }   // 높게 부른 곳 = 위·노랑, 낮게 = 아래·파랑
    }
    // (10/31 15:38 사용자) 세로줄 오른쪽(아직 안 부른 쪽)도 어둡게 하지 않음 — 음정 선이 끝까지 같은 밝기
    g.fillStyle = "#ff9f5a"; g.fillRect(Math.round(xs(t)) - 1, 2, 2.5, h - 4);   // (10/31 15:34 사용자) 지금 세로줄 = 주황
    const kL = k || col(cv, (st && st.lvDef) || 2) || col(cv, (cv.levels || [])[0]), d = delta(cv, kL, t);   // 원음으로 들을 때도 '어떻게 불렀나'는 보여 줌
    let tagB = T + 8 + (full ? 22 : 16) + (st && st.teacher ? (full ? 16 : 12) : 0);   // 말풍선 자리 고정: '높게/낮게' 표시가 떴다 사라져도 말풍선은 안 움직임(10/30 16:18 사용자)
    const lb = st ? (st.lab = st.lab || { a: 0, d: null, seen: 0, at: 0 }) : { a: 1, d, seen: 0, at: 0 }, nowL = performance.now();   // (10/30 17:18 사용자) 0.15초 페이드
    if (st) { const dtl = Math.min(100, nowL - (lb.at || nowL)); lb.at = nowL;
      if (d != null && Math.abs(d) >= 5) { lb.d = d; lb.seen = nowL; lb.a = Math.min(1, lb.a + dtl / 150); }
      else if (nowL - lb.seen > 200) lb.a = Math.max(0, lb.a - dtl / 150); }   // 0.2초 안에 다시 나오면 그대로 유지(깜빡임 방지)
    const dL = st ? lb.d : d;
    if (dL != null && (st ? lb.a > 0.01 : Math.abs(dL) >= 5)) { const d = dL; g.save(); g.globalAlpha = st ? lb.a : 1;   // 지금 위치: 수강생 기준 현상(↑높게/↓낮게). 선생님은 아래에 작게 보정량
      const s = sangLabel(d), sub = st && st.teacher && k ? "보정: " + semiLabel(d).slice(2) : "";   // (10/30 17:33 사용자) 원음으로 들을 땐 '보정: …' 안 띄움
      g.font = (full ? "bold 15px" : "bold 11px") + " system-ui, sans-serif";
      const g2 = (full ? "12px" : "9.5px") + " system-ui, sans-serif", tw1 = g.measureText(s.txt).width; g.font = g2; const tw2 = sub ? g.measureText(sub).width : 0;
      const tw = Math.max(tw1, tw2), x0 = Math.min(w - tw - 8, Math.round(xs(t)) + 6), bh1 = full ? 22 : 16, bh2 = sub ? (full ? 16 : 12) : 0;
      g.fillStyle = "rgba(17,20,26,.85)"; g.fillRect(x0 - 3, T + 4, tw + 6, bh1 + bh2);
      g.font = (full ? "bold 15px" : "bold 11px") + " system-ui, sans-serif"; g.fillStyle = s.c; g.fillText(s.txt, x0, T + 4 + bh1 / 2);
      if (sub) { g.font = g2; g.fillStyle = "#a9b1bc"; g.fillText(sub, x0, T + 4 + bh1 + bh2 / 2 - 2); }
      g.restore(); }
    // (11/02 15:15 사용자 '왜 안 보여?') 지금 화면에 부른 음이 없으면(전주·간주) 다음 노래 시각을 알려 줌 — 작은 화면은 톡 하면 그 자리로
    if (st) st.gapNext = null;
    if (!vis.length && (cv.pts || []).length) {
      const nx = (cv.pts || []).find(p => p[0] > t + 0.3), pv = nx ? null : (cv.pts || []).at(-1);
      if (nx && st) st.gapNext = nx[0];
      const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
      const msg = nx ? `♪ 노래는 ${mmss(nx[0])}부터${full ? "" : " · 톡 하면 그 자리로"}` : pv ? "♪ 노래가 끝났어요" : "";
      if (full && nx && st) { introDraw(g, cv, st, t, nx, { L, w, T, HP, t0, W8, y, kt }); }
      else if (msg) { g.save(); g.font = (full ? "bold 16px" : "bold 13px") + " system-ui, sans-serif"; g.textAlign = "center"; const mx = L + (w - L) / 2, my = T + HP / 2, tw = g.measureText(msg).width;
        g.fillStyle = "rgba(17,20,26,.88)"; g.fillRect(mx - tw / 2 - 10, my - 15, tw + 20, 30); g.fillStyle = "#ffe066"; g.fillText(msg, mx, my); g.restore(); }
    }
    if (st && (st.notesHidden || popM)) { st.hits = []; st.popNH = (popM ? !st.notesHidden : full && st.advOn && st.advNotes) ? drawFlags(g, st, t, xs, L, w, T, HP, vis, y, popM) : null; }
    else if (st) { let oy0 = 1e9, oy1 = -1e9; for (const p of vis) { for (const kk of [1, k]) { if (!kk || p[kk] == null) continue; const Y = y(p[kk]); if (Y < oy0) oy0 = Y; if (Y > oy1) oy1 = Y; } }   // 지금 화면의 음정선 높이 범위
      drawNotes(g, st, t, xs, L, w, T, H, full, tagB, oy0 <= oy1 ? [oy0, oy1] : null, vis, y); }
    if (full && st && st.msel && !st.advOn && st.map) {   // (11/07) 기본 모드 구간 손잡이(초록 동그라미)·💬 표시 = 다른 그림 위에
      const mp = st.map, xs2 = (tt) => mp.L + (tt - mp.t0) / Math.max(1e-6, mp.W8) * (mp.w - mp.L), a = xs2(st.msel[0]), b2 = xs2(st.msel[1]), MC = "#7fd99a", gy = T + HP / 2;
      for (const [gx, dir] of [[a + 1, -1], [b2 - 1, 1]]) { if (gx < mp.L - 14 || gx > mp.w + 14) continue; g.beginPath(); g.arc(gx, gy, 13, 0, Math.PI * 2); g.fillStyle = MC; g.fill(); g.lineWidth = 2; g.strokeStyle = "#0b1a10"; g.stroke();
        g.fillStyle = "#0b1a10"; g.beginPath(); g.moveTo(gx + dir * 5, gy); g.lineTo(gx - dir * 3, gy - 5); g.lineTo(gx - dir * 3, gy + 5); g.closePath(); g.fill(); }
      if (b2 - a > 40 && typeof st.onAddRange === "function") { const lab = b2 - a >= 120 ? "💬 톡 = 한마디" : "💬", cx = Math.max(mp.L + 30, Math.min(mp.w - 30, (a + b2) / 2)), ty = T + HP - 26; g.font = "bold 12.5px system-ui, sans-serif"; const tw = g.measureText(lab).width + 20;
        g.fillStyle = MC; g.beginPath(); if (g.roundRect) g.roundRect(cx - tw / 2, ty - 12, tw, 24, 12); else g.rect(cx - tw / 2, ty - 12, tw, 24); g.fill(); g.fillStyle = "#0b1a10"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(lab, cx, ty + 1); g.textAlign = "left"; g.textBaseline = "alphabetic"; } }
    if (full && st && st.kbDown != null) {   // (11/02 16:28 사용자) 누른 건반은 손가락에 가려서 → 오른쪽에 음 이름 말풍선
      const m = st.kbDown, yy = Math.max(T + 22, Math.min(T + HP - 22, y(m * 100))), txt = NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
      g.save(); g.font = "bold 22px system-ui, sans-serif"; g.textBaseline = "middle"; const tw = g.measureText(txt).width, bx = L + 14, bw = tw + 28, bh = 40;
      g.fillStyle = "#ff9f5a"; g.beginPath(); g.moveTo(L + 4, yy); g.lineTo(bx + 1, yy - 8); g.lineTo(bx + 1, yy + 8); g.closePath(); g.fill();
      g.beginPath(); if (g.roundRect) g.roundRect(bx, yy - bh / 2, bw, bh, 12); else g.rect(bx, yy - bh / 2, bw, bh); g.fill();
      g.fillStyle = "#111"; g.fillText(txt, bx + 14, yy + 1); g.restore();
    }
  }
  // (11/07 10:43) 주석 말풍선(DOM): 그릴 때 만든 st.popNH(번호 깃발 자리)를 보고 띄우고·옮기고·지움 — 기본·수강생은 재생 구간 안이면 저절로(최대 2개, 뒤 것은 아래), 고급은 번호 톡 한 것만 · (10:48) 작은 그래프도(보기만)
  const fmtP = (x) => `${Math.floor(x / 60)}:${(x % 60).toFixed(1).padStart(4, "0")}`;
  function popSyncF(P) {   // P = { host, cvEl, st, o, popEls, small, pause, edit }
      const { host, cvEl, st, o, popEls, small } = P, H_ = st.popNH || [], now = performance.now(); if (!host || !host.isConnected) return;
      if (st.popPin && !st.advOn && now > st.popPin.until) st.popPin = null;
      const want = st.advOn ? [] : H_.filter(h => h.act); if (st.popPin) { const h = H_.find(q => q.k === st.popPin.k); if (h && !want.includes(h)) want.push(h); }
      const keys = new Set(want.map(h => h.k));
      for (const [k, el] of popEls) if (!keys.has(k)) { popEls.delete(k); el.classList.add("out"); setTimeout(() => el.remove(), 180); }
      const tch = !!o.teacher || typeof o.onNote === "function", adv = !!st.advOn, hw = host.clientWidth, act = !small;   // 작은 그래프: 보기만(톡은 그래프로 → 전체화면)
      for (const h of want) { let el = popEls.get(h.k), n = h.n;
        if (!el || el._txt !== n.text + "|" + n.status + "|" + adv) {
          if (!el) { el = document.createElement("div"); el.className = "tfPop" + (small ? " sm" : ""); el.setAttribute("role", "note"); if (act) el.addEventListener("pointerdown", (e) => e.stopPropagation()); host.insertBefore(el, small ? host.querySelector(".tuneDim,.tuneHint,.svAb") : null);   /* 작은 그래프: 어둡게 덮는 칸·전체화면 안내 아래에 */ popEls.set(h.k, el); }
          el._txt = n.text + "|" + n.status + "|" + adv; el._n = n; const ok = n.status === "ok", txt = String(n.text || ""), long = act && !tch && txt.length > 46;
          el.classList.toggle("stu", !tch); el.classList.toggle("long", long);
          el.innerHTML = `<div class="pH">${h.num} · ${tch ? (ok ? "✓ 확인" : "AI 초안") + " · " + fmtP(+n.t0) : "선생님 한마디"}</div><div class="pT"></div>${long ? `<span class="pMore">…더보기</span>` : ""}`
            + (!act ? "" : tch && adv && typeof o.onNote === "function" ? `<div class="pEd"><button type="button" data-pe="edit">✎ 고치기</button>${typeof o.onDelNote === "function" ? `<button type="button" data-pe="del">✕ 지우기</button>` : ""}</div>`
              : tch && typeof o.onDelNote === "function" ? `<button type="button" class="pX" data-pe="del" aria-label="주석 지우기">✕</button>` : "");
          el.querySelector(".pT").textContent = txt;
          el.onclick = (e) => { const b = e.target.closest("[data-pe]"), nn = el._n;
            if (!act) return; if (b && b.dataset.pe === "del") { st.popPin = null; P.pause(); o.onDelNote(nn); return; }
            if ((b && b.dataset.pe === "edit") || (tch && !adv && typeof o.onNote === "function")) { st.popPin = null; P.pause(); P.edit(nn); return; }
            if (!tch) el.classList.toggle("open"); }; }
        el.style.setProperty("--pc", `rgb(${h.c})`); el.classList.toggle("down", h.down);
        const cx = cvEl.offsetLeft + h.x, ew = el.offsetWidth || 240, left = Math.max(4, Math.min(hw - ew - 4, cx - 28));
        el.style.left = left + "px"; el.style.top = (cvEl.offsetTop + h.y + (h.down ? 15 : -15)) + "px"; el.style.setProperty("--ax", Math.max(10, Math.min(ew - 24, cx - left - 8)) + "px"); }
  }
  // 붙이기: getT()=지금 초, getLv()=보여 줄 보정 단계(0이면 원음만), seek(초). 화면에서 빠지면 저절로 멈춤.
  // 확대/전체 버튼: el 바로 앞에 붙임(Tune.controls). 기본 = 확대.
  function wire(el, cv, getT, getLv, seek, opts) {
    if (!el || !cv) return;
    const st = { zoom: true, lo: null, hi: null, notes: opts && opts.notes, teacher: !!(opts && opts.teacher), lvDef: opts && opts.lvDef, noX: !!(opts && opts.tapFull) };
    const bar = document.createElement("div"); bar.className = "tuneZoom";
    // (10/30 14:20 사용자) 작은 화면은 확대(지금 음 근처)로 고정 — 버튼은 '전체화면' 하나만, 잘 보이게
    bar.innerHTML = `<button type="button" data-fs="1" class="tfOpen" aria-label="음정선 전체화면으로 크게 보기"><span class="ic" aria-hidden="true">⛶</span>전체화면으로 크게 보기</button>`;
    // 작은 화면에도 가운데 표시(10/30 14:29 사용자): 멈춰 있으면 반투명 ❚❚, 톡 하면 ▶가 잠깐 — 전체화면과 같은 조작
    let box = el.parentNode;
    if (box && !box.classList.contains("tuneWrap")) { box = document.createElement("div"); box.className = "tuneWrap"; el.parentNode.insertBefore(box, el); box.appendChild(el); }
    box && box.querySelectorAll(".tuneMid").forEach(x => x.remove());
    const mid = document.createElement("span"); mid.className = "tuneMid"; mid.setAttribute("aria-hidden", "true"); box && box.appendChild(mid);
    const o0 = opts || {};
    if (!o0.tapFull) box && box.parentNode && box.parentNode.insertBefore(bar, box);   // (10/30 17:43 사용자) tapFull: 전체화면 버튼 없이 그래프를 누르면 전체화면
    const o = opts || {}, ctl = typeof o.play === "function" && typeof o.paused === "function";
    bar.querySelector("[data-fs]").onclick = () => openFull(el, cv, getT, getLv, seek, o);
    el._openFull = () => openFull(el, cv, getT, getLv, seek, o);   // (11/05) 다른 화면에서 바로 전체화면으로(오늘의 베스트 → ✏️ 음표 고치기)
    let drag = null, preview = null, shown = null;
    const view = mkView(st, () => preview, (v) => { preview = v; }, getT, seek);
    const showMid = (kind) => { mid.textContent = kind === "pause" ? "❚❚" : "▶"; mid.className = "tuneMid " + (kind === "pause" ? "stay" : "flash"); void mid.offsetWidth; mid.classList.add("go"); shown = kind; };
    const smPop = { host: box, cvEl: el, st, o: opts || {}, popEls: new Map(), small: true, pause: () => {}, edit: () => {} };
    const loop = () => { if (!el.isConnected) { bar.remove(); return; } draw(el, cv, preview ?? (+getT() || 0), +getLv() || 0, st);
      mid.style.visibility = st.hits && st.hits.length ? "hidden" : "";   // 말풍선이 떠 있으면 가운데 ❚❚는 숨김
      try { smPop.host = box; popSyncF(smPop); } catch {}   // (11/07 10:48) 작은 그래프도 말풍선(보기만)
      if (ctl) { const p = !!o.paused(); if (p && shown !== "pause" && !document.getElementById("tuneFs")) showMid("pause"); else if (!p && shown === "pause") showMid("play"); }
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const span = () => (el.clientWidth - 30) || 1;
    el.style.touchAction = "pan-y";
    if (o.tapFull) {   // 작은 화면은 보기만 — 톡 하면 세로 전체화면(재생·이동·주석 고치기는 거기서)
      el.style.cursor = "pointer"; let d0 = null;
      el.addEventListener("pointerdown", (e) => { d0 = { x: e.clientX, y: e.clientY, id: e.pointerId }; });
      el.addEventListener("pointerup", (e) => { const d = d0; d0 = null; if (!d || d.id !== e.pointerId) return; if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 10) return; openFull(el, cv, getT, getLv, seek, o); });
      el.addEventListener("pointercancel", () => { d0 = null; });
      mid.style.display = "none";
      return;
    }
    const canEdit = typeof o.onNote === "function";
    if (canEdit) el.addEventListener("contextmenu", (e) => e.preventDefault());
    el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, t: +getT() || 0, id: e.pointerId, moved: false };
      if (canEdit) { const d0 = drag, r0 = el.getBoundingClientRect(), h0 = hitNote(st, e.clientX - r0.left, e.clientY - r0.top); d0.h0 = h0;
        // (10/30 16:58 사용자) 주석 칸: 톡 하고 떼도, 0.6초 꾹 눌러도 고치기 · 누른 채 좌우로 밀면 화면 이동 / 빈 곳 0.39초 꾹 = 새 주석(11/03 13:10 사용자: 0.3→0.39)
        if (h0) { if (!h0.del) { st.hold = { n: h0.n, at: performance.now() }; d0.lp = setTimeout(() => { st.hold = null; if (drag !== d0 || d0.moved) return; d0.long = true; if (ctl && !o.paused()) o.play(); lastView = view; o.onNote(h0.n); }, 600); } }
        else if (typeof o.onAdd === "function") d0.lp = setTimeout(() => { if (drag !== d0 || d0.moved) return;
          d0.long = true; if (ctl && !o.paused()) o.play();
          const tt = timeAt(st, e.clientX - r0.left); if (tt != null) { lastView = view; o.onAdd(tt); } }, LONG_MS); } });   // (11/09) 0.39 → 0.6초
    el.addEventListener("pointermove", (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x; if (!drag.moved && Math.abs(dx) < 8) return; clearTimeout(drag.lp); st.hold = null;
      if (!drag.moved && Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }   // 세로로 밀면 화면 스크롤
      if (!drag.moved && ctl && !o.paused()) o.play();   // 밀기 시작하면 멈춤(재생은 톡으로)
      drag.moved = true; try { el.setPointerCapture(e.pointerId); } catch {}
      preview = Math.max(0, drag.t - dx / span() * WIN);
    });
    const up = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null; clearTimeout(d.lp); st.hold = null; if (d.long) return;
      if (d.moved) { const t = preview; preview = null; if (t != null) seek(t, ctl); return; }
      if (canEdit) { const r = el.getBoundingClientRect(), hn = d.h0 || hitNote(st, e.clientX - r.left, e.clientY - r.top); if (hn) { if (ctl && !o.paused()) o.play(); if (hn.del) { o.onDelNote && o.onDelNote(hn.n); } else { lastView = view; o.onNote(hn.n); } return; } }
      if (st.gapNext != null && o.paused && o.paused()) { seek(Math.max(0, st.gapNext - 1), true); return; }   // 전주에서 멈춰 있을 때 톡 = 노래 시작 1초 전으로
      if (ctl) { const was = o.paused(); o.play(); showMid(was ? "play" : "pause"); return; }   // 톡 = 재생·멈춤
      const r = el.getBoundingClientRect(), x = e.clientX - r.left;
      if (x > 30) seek(Math.max(0, d.t - WIN * HEAD + (x - 30) / span() * WIN));   // 조작 정보가 없으면 예전처럼 그 자리부터
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", () => { if (drag) clearTimeout(drag.lp); st.hold = null; drag = null; preview = null; });
  }
  // (11/02 15:48 사용자) 건반 소리: 누르는 동안 부드러운 피아노 비슷한 소리(사인파 + 약한 배음)
  let toneCtx = null, toneNow = null;
  // (11/03 15:48 사용자) 건반 소리 6dB 작게(0.28→0.14) · 가끔 두 번 눌린 듯 엄청 크게 나던 것: 같은 음이 아주 짧은 사이(80ms)에 또 불리면 무시 +
  //   소리가 겹쳐도 커지지 않게 끝에 제한기(리미터) 하나를 거쳐 나가게
  let toneOut = null;
  function tone(m) {
    try { toneCtx ??= new (G.AudioContext || G.webkitAudioContext)(); if (toneCtx.state === "suspended") toneCtx.resume(); } catch { return; }
    const c = toneCtx; if (toneNow && toneNow.m === m && performance.now() - toneNow.at < 80) return;
    if (!toneOut) { try { toneOut = c.createDynamicsCompressor(); toneOut.threshold.value = -14; toneOut.knee.value = 0; toneOut.ratio.value = 20; toneOut.attack.value = 0.002; toneOut.release.value = 0.1; toneOut.connect(c.destination); } catch { toneOut = c.destination; } }
    if (toneNow) { const o_ = toneNow, t_ = c.currentTime; toneNow = null; try { o_.g.gain.cancelScheduledValues(t_); o_.g.gain.setValueAtTime(o_.g.gain.value, t_); o_.g.gain.linearRampToValueAtTime(0, t_ + 0.015); o_.os.forEach(o => o.stop(t_ + 0.03)); } catch {} }   // 앞 소리는 빨리(15ms) 꺼서 겹치지 않게
    const f = 440 * 2 ** ((m - 69) / 12), g = c.createGain(), now = c.currentTime;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.14, now + 0.008); g.gain.exponentialRampToValueAtTime(0.06, now + 0.6); g.connect(toneOut);
    const os = [[1, 1], [2, 0.3], [3, 0.12]].map(([k, a]) => { const o = c.createOscillator(), ga = c.createGain(); o.type = "sine"; o.frequency.value = f * k; ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(now); return o; });
    toneNow = { g, os, m, at: performance.now() };
  }
  let toneIdleT = null; const toneIdle = () => { clearTimeout(toneIdleT); toneIdleT = setTimeout(() => { try { if (toneCtx && !toneNow && toneCtx.state === "running") toneCtx.suspend(); } catch {} }, 2000); };   // (11/05) 건반 소리를 다 쓰면 소리 장치를 쉬게(블루투스 연결을 붙잡지 않게)
  function toneOff() { if (!toneNow || !toneCtx) return; const { g, os } = toneNow, now = toneCtx.currentTime; toneNow = null; toneIdle();
    try { g.gain.cancelScheduledValues(now); g.gain.setValueAtTime(g.gain.value, now); g.gain.linearRampToValueAtTime(0, now + 0.12); os.forEach(o => o.stop(now + 0.15)); } catch {} }
  const noteName = (m) => NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
  // 정음 고치기 창: 초록 막대를 누르면(멈춘 상태) ▼▲로 고르고 저장 → onFix({t0,t1,midi}) · 원래대로 = midi:null
  // (11/02 17:02 사용자) 정음 고치기: 고른 막대는 파란 테두리 · ▼▲는 바로 저장(저장 버튼 없음) · 나누기는 ✂ 아이콘 하나 · 나눈 조각은 노란 테두리 없이 경계만
  // (11/03 02:54 사용자) 고친 정음은 바로바로 저장됨 — 창(고치기 창·전체화면)을 빠져나올 때 저장이 끝날 때까지 '저장 중…' → '✓ 저장됨' 잠깐 표시
  // (11/03 13:08 사용자 승인) 타이밍·길이 고치기 시간표 — ⚠ 서버 app/jakpum/timing.py clusters()/tmap()과 같은 규칙(시험 tests/time-edits.test.js가 같은 값인지 확인)
  // edits [{t0,t1,nt0,nt1}](원래 시간) → [[원래, 새], ...] (사이는 직선, 밖은 그대로)
  const TW = 0.4, TMIN = 0.03, TMAX = 4.0;
  function tmapOf(edits, dur) {
    const r4 = (x) => Math.round(x * 1e4) / 1e4;
    const eds = (edits || []).map(e => [r4(+e.t0), r4(+e.t1), r4(+e.nt0), r4(+e.nt1)]).filter(e => e.every(Number.isFinite) && e[0] >= 0 && e[0] < e[1] && e[2] >= 0 && e[2] < e[3] && e[1] - e[0] <= 30 && !(Math.abs(e[2] - e[0]) < 0.005 && Math.abs(e[3] - e[1]) < 0.005))
      .sort((a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2] || a[3] - b[3]);
    const groups = [];
    for (const e of eds) { const we = Math.max(TW, 1.5 * Math.max(Math.abs(e[2] - e[0]), Math.abs(e[3] - e[1]))), a = Math.max(0, Math.min(e[0], e[2]) - we), b = Math.min(dur, Math.max(e[1], e[3]) + we);
      const L = groups[groups.length - 1]; if (L && a <= L[1]) { L[1] = Math.max(L[1], b); L[2].push(e); } else groups.push([a, b, [e]]); }
    const ok = (P) => { for (let i = 0; i + 1 < P.length; i++) { const [o0, n0] = P[i], [o1, n1] = P[i + 1]; if (o1 - o0 < TMIN || n1 - n0 < TMIN) return false; const r = (n1 - n0) / (o1 - o0); if (r > TMAX || r < 1 / TMAX) return false; } return true; };
    const out = [[0, 0]];
    for (const [a, b, es0] of groups) { let es = es0.slice();
      while (es.length) { let P = es.flatMap(e => [[e[0], e[2]], [e[1], e[3]]]).sort((x, y) => x[0] - y[0] || x[1] - y[1]); P = [[a, a], ...P, [b, b]];
        if (a <= 0 && P[1][0] <= TMIN && P[1][1] <= TMIN) P = P.slice(1);
        if (ok(P)) { out.push(...P); break; } es = es.slice(0, -1); } }
    out.push([dur, dur]);
    const seen = new Set(), res = [];
    for (const [o_, n_] of out.sort((x, y) => x[0] - y[0] || x[1] - y[1])) { const k = Math.round(o_ * 1e4); if (seen.has(k)) continue; seen.add(k); res.push([r4(o_), r4(n_)]); }
    return res;
  }
  function mapT(t, tm, inv) {   // 시간표로 원래 → 새(inv면 새 → 원래). 시간표가 없으면 그대로
    if (!tm || tm.length < 2) return t; const A = inv ? 1 : 0, B = inv ? 0 : 1;
    if (t <= tm[0][A]) return t - tm[0][A] + tm[0][B];
    for (let i = 1; i < tm.length; i++) if (t <= tm[i][A]) { const p = tm[i - 1], q = tm[i], d = q[A] - p[A]; return d > 0 ? p[B] + (t - p[A]) / d * (q[B] - p[B]) : q[B]; }
    const l = tm[tm.length - 1]; return t - l[A] + l[B];
  }
  const saving = new Set(); let savedAt = 0, saveEl = null, saveTm = null;
  function fxSave(fn, f) { savedAt = Date.now(); let p; try { p = fn(f); } catch {} if (p && typeof p.then === "function") { saving.add(p); p.then(() => {}, () => {}).then(() => { saving.delete(p); saveTick(); }); } }
  function saveTick() { if (!saveEl) return; if (saving.size) { saveEl.textContent = "💾 저장 중…"; return; } saveEl.textContent = "✓ 저장됨"; clearTimeout(saveTm); saveTm = setTimeout(() => { if (saveEl) { saveEl.remove(); saveEl = null; } }, 1200); }
  function saveToast() { if (!saving.size && Date.now() - savedAt > 4000) return;   // 고친 게 없으면 안 띄움
    if (!saveEl) { saveEl = document.createElement("div"); saveEl.className = "tuneSaveT"; saveEl.setAttribute("role", "status"); document.body.appendChild(saveEl); }
    saveEl.textContent = "💾 저장 중…"; clearTimeout(saveTm); setTimeout(saveTick, saving.size ? 0 : 450); }
  function fixSheet(host, cv, b, onFix, getT, st) {
    const kt = tgCol(cv), m0 = Math.round(b.c) / 100, tNow = typeof getT === "function" ? +getT() || 0 : -1; let m = m0;
    const fixed = (cv._fixes || []).find(x => x.t0 < b.t1 && x.t1 > b.t0), isCut = !!(fixed && fixed.cut), atHead = tNow > b.t0 + 0.08 && tNow < b.t1 - 0.08, canCut = atHead || b.t1 - b.t0 >= 0.3;   // (11/03 02:20 사용자) ✂는 늘 보이게: 세로줄이 막대 안이면 그 자리, 아니면 막대 가운데에서 나눔
    const T0 = +b.t0.toFixed(2), T1 = +b.t1.toFixed(2);
    // (11/05 사용자) 합치기: 나눈 조각이 붙어 있으면(앞뒤 0.06초 안) 하나로 다시 붙임 — 오른쪽 조각 먼저, 없으면 왼쪽
    const fxs = cv._fixes || [], mgNb = fixed ? (fxs.find(x => x !== fixed && Math.abs(x.t0 - T1) < 0.06) || fxs.find(x => x !== fixed && Math.abs(x.t1 - T0) < 0.06) || null) : null;
    if (st) { st.sel = { t0: b.t0, t1: b.t1 }; st.focusC = b.c; st._selBar = b; }
    const had = !!host.querySelector(".tfFix:not(.tfDock)"); host.querySelectorAll(".tfFix").forEach(x => x.remove());
    const d = document.createElement("div"); d.className = "tfFix";
    const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    // (11/02 19:38 사용자 시안 승인) 다이어트: 첫 줄 = 원음/보정본 스위치 + 시간·저장 표시 / 둘째 줄 = 버튼 한 줄(▼ 음 ▲ ✂ ↺ ✓) + 작은 이름표
    // (11/03 13:08 사용자 시안 승인) 모드 [🎵 음정 | ⏱ 타이밍]: 타이밍 = ◀일찍·늦게▶(톡 0.02초, 꾹 계속) · 길이 −/+ · ↺ · 막대 가운데 끌기 = 옮기기, 끝 끌기 = 길이
    const tOn = !!(st && typeof st.onTime === "function"), tMode = tOn && st.fixMode === "t"; let tTm = null, tSave = () => {}, advBox = null;
    const uni = !!(tOn && st.advOn && st.onAdv && G.TuneAdv && G.TuneAdv.panel);   // (11/05 사용자 시안 승인) 보정 모드 = 탭 없는 한 창: 음정·타이밍·고급을 위에서 아래로, 창은 안 닫힘   // (닫을 때 쓰므로 먼저 둠)
    const bu = !!(tOn && !uni);   // (11/06 22:54 사용자 시안 ① 승인) 기본 모드(전체화면)도 고급과 같은 한 창: ▼ 음 ▲ ✂ ↺ + 위치·길이 끌기 칸 · 탭 없음
    if (st) st.bu = bu;
    if (bu) { d.classList.add("tfUni", "tfBu");
      d.innerHTML = `<div class="tfFixBox"><div class="tfUniTop"><span class="tfFixSt"></span>
        <div class="tfFixRow tfP"><button type="button" data-d="-1" aria-label="반음 내림">▼</button><button type="button" class="tfFixN" data-p aria-label="누르면 소리 · 위아래로 밀면 반음 · 꾹 누른 뒤 밀면 미세"></button><button type="button" data-d="1" aria-label="반음 올림">▲</button>${canCut ? `<button type="button" class="tfCut tfIc" data-cut aria-label="두 음으로 나누기(세로줄 자리, 막대 밖이면 가운데)">✂</button>` : ""}${mgNb ? `<button type="button" class="tfCut tfIc" data-merge aria-label="옆 조각과 하나로 합치기">⇔</button>` : ""}<button type="button" class="tfIc" data-r aria-label="톡 = 직전 저장으로, 1초 꾹 = 원본으로">↺</button></div></div><div class="tfBuT"></div></div>`; }
    else     if (uni) { d.classList.add("tfUni");
      d.innerHTML = `<div class="tfFixBox"><div class="tfUniTop"><span class="tfFixSt"></span>
        <div class="tfFixRow tfP"><button type="button" data-d="-1" aria-label="반음 내림">▼</button><button type="button" class="tfFixN" data-p aria-label="누르는 동안 이 음 소리"></button><button type="button" data-d="1" aria-label="반음 올림">▲</button><button type="button" class="tfIc tfSnap" data-snap aria-label="가까운 음에 맞춤(두 번 톡과 같음)">🧲</button>${canCut ? `<button type="button" class="tfCut tfIc" data-cut aria-label="두 음으로 나누기(세로줄 자리, 막대 밖이면 가운데)">✂</button>` : ""}${mgNb ? `<button type="button" class="tfCut tfIc" data-merge aria-label="옆 조각과 하나로 합치기">⇔</button>` : ""}</div></div><div class="tfUniAdv"></div><button type="button" class="tfOrg" data-r aria-label="이 음을 원본으로(음정·타이밍·고급 모두, 확인 창)">원본</button></div>`; }
    else d.innerHTML = `<div class="tfFixBox"><div class="tfFixHd">${tOn ? `<span class="tfFixMd" role="group" aria-label="고칠 것"><button type="button" data-md="p">🎵 음정</button><button type="button" data-md="t">⏱ 타이밍</button>${st && st.onAdv && st.advOn ? `<button type="button" data-md="a">🎛 고급</button>` : ""}</span>` : "<b>정음</b>"}<span class="tfFixTm">${mm(b.t0)}~${mm(b.t1)}</span><span class="tfFixSt"></span></div>
      ${tOn ? `<div class="tfFixRow tfT"><button type="button" data-tm="-1" aria-label="일찍(앞으로)">◀</button><button type="button" class="tfFixN tfTN" data-tp aria-label="이 음 듣기"></button><button type="button" data-tm="1" aria-label="늦게(뒤로)">▶</button><button type="button" class="tfIc" data-tl="-1" aria-label="짧게">−</button><button type="button" class="tfIc" data-tl="1" aria-label="길게">+</button><button type="button" class="tfIc" data-tr aria-label="톡 = 직전 저장으로, 1초 꾹 = 원본으로">↺</button></div>
      <div class="tfFixLab tfT"><span>일찍</span><span class="n">누르면 듣기</span><span>늦게</span><span class="i">짧게</span><span class="i">길게</span><span class="i">되돌리기</span></div>` : ""}
      <div class="tfFixRow tfP"><button type="button" data-d="-1" aria-label="반음 내림">▼</button><button type="button" class="tfFixN" data-p aria-label="누르는 동안 이 음 소리"></button><button type="button" data-d="1" aria-label="반음 올림">▲</button>${canCut ? `<button type="button" class="tfCut tfIc" data-cut aria-label="두 음으로 나누기(세로줄 자리, 막대 밖이면 가운데)">✂</button>` : ""}${mgNb ? `<button type="button" class="tfCut tfIc" data-merge aria-label="옆 조각과 하나로 합치기">⇔</button>` : ""}<button type="button" class="tfIc" data-r aria-label="톡 = 직전 저장으로, 1초 꾹 = 원본으로">↺</button></div>
      <div class="tfFixLab tfP"><span>톡 반음 · 꾹 미세</span><span class="n">누르면 소리</span><span>톡 반음 · 꾹 미세</span>${canCut ? `<span class="i">나누기</span>` : ""}${mgNb ? `<span class="i">합치기</span>` : ""}<span class="i">되돌리기</span></div></div>`;
    // (11/02 19:28 사용자 시안 승인) 전체화면이면 아래 이동 버튼·안내 문구 자리에(원음/보정본 큰 버튼은 그대로 위에)
    // (11/02 02:02 사용자 시안) 스위치 아래 칸(이동 버튼·안내)만 같은 높이의 고치기 창으로 바뀜 → 그래프·주석·스위치는 그대로
    const bot = host.querySelector(".tfBot");
    if (bot) { const h0 = had && bot._h0 ? bot._h0 : bot.offsetHeight; bot._h0 = h0; d.classList.add("inBot"); bot.appendChild(d);
      const gap = h0 - bot.offsetHeight; if (gap > 0) d.style.minHeight = (d.offsetHeight + gap) + "px"; }
    else host.appendChild(d);
    const prior = (cv._fixes || []).slice(), snap = {};
    (cv.pts || []).forEach((p, i) => { if (p[0] >= b.t0 - 0.001 && p[0] <= b.t1 + 0.001 && (p[kt] != null || (b.ghost && p[1] != null))) snap[i] = p[kt]; });   // 회색 막대(정음 없음)는 원래 값 = 없음(null)
    // (11/02 19:20 사용자) '처음 음으로' = 선생님이 고치기 전, 서버가 처음 고른 음(전에 고쳐 저장한 음이 아니라) — 서버 값은 cv._orig에 있음
    const o0 = cv._orig || {}, ov = Object.keys(snap).map(i => (i in o0 ? o0[i] : snap[i])).filter(v => v != null).sort((x, y) => x - y), mO = ov.length ? Math.round(ov[ov.length >> 1] / 100) : m0;
    // (11/03 10:50 사용자) 센트 단위 미세 조정: 음 이름 + ±센트 · 3반음 넘게 옮기면 소리 경고
    const nmC = (x) => { const r = Math.round(x), c = Math.round((x - r) * 100); return noteName(r) + (c ? `<small class="tfC">${c > 0 ? "+" : ""}${c}¢</small>` : ""); };
    const stEl = d.querySelector(".tfFixSt"), paint = () => { d.querySelector("[data-p]").innerHTML = `${nmC(m)}${Math.abs(m - mO) > 0.004 ? `<small>← ${noteName(mO)}</small>` : ""}`;
      if (Math.abs(m - mO) > 3) stEl.textContent = "⚠ 3반음 넘게 옮기면 소리가 어색할 수 있어요"; }; paint();
    // (11/03 11:13 사용자) 소리 = 멜로다인처럼 '목소리'로 그 음(보정 전 보컬이 있으면) · 없으면 사인파. 고르는 순간 1초, 음 이름 누르는 동안 계속
    let vh = null, vtm = null;
    const snd = (mm) => { clearTimeout(vtm); if (vh) { try { vh.stop(true); } catch {} vh = null; } toneOff(); if (st && st.voice) { try { vh = st.voice(b.t0, b.t1, mm); } catch { vh = null; } } if (!vh) tone(mm); };
    const sndOff = () => { clearTimeout(vtm); if (vh) { try { vh.stop(); } catch {} vh = null; } toneOff(); };
    const sndFor = (mm, ms) => { snd(mm); vtm = setTimeout(sndOff, ms); };
    if (!(st && st._quiet)) { try { sndFor(m, 1000); } catch {} }   // (11/06 18:02 사용자) 되돌리기·다시하기로 고를 땐 소리 안 냄
    if (st) st.selSnd = () => { try { sndFor(m, 1000); } catch {} };   // (11/03 15:30 사용자) 이미 고른 막대를 다시 톡 = 처음 고를 때처럼 1초 소리
    const same = () => Math.abs(m - mO) < 0.004, rnd = (x) => Math.round(x * 100) / 100;
    const keepFix = () => !!b.ghost || !(same() && !isCut);   // 회색 막대는 같은 음이어도 '이 음으로 맞춤' 기록   // 서버가 고른 음 그대로면 기록 없음(나눈 조각은 나눔 표시로 남김)
    const preview = () => { const o_ = cv._orig || (cv._orig = {}); for (const i in snap) { if (!(i in o_)) o_[i] = snap[i]; cv.pts[i][kt] = Math.round(m * 100); }
      for (const x of cv._tedits || []) if (Math.abs(x.t0 - b.t0) < 0.02 && Math.abs(x.t1 - b.t1) < 0.02) x.c = Math.round(m * 100);   // (11/06) 옮긴 음의 막대도 새 음 높이로
      cv._fixes = prior.filter(x => !(x.t0 < b.t1 && x.t1 > b.t0)).concat(keepFix() ? [{ t0: T0, t1: T1, midi: rnd(m), ...(isCut && same() ? { cut: true } : {}) }] : []); };
    let tm = null;
    const persist = () => { clearTimeout(tm); stEl.textContent = "저장 중…"; tm = setTimeout(() => { tm = null; try { fxSave(onFix, { t0: T0, t1: T1, midi: keepFix() ? rnd(m) : null, ...(isCut && same() ? { cut: true } : {}) }); } catch {} commit(); stEl.textContent = "✓ 저장됨"; }, 450); };
    const core = () => { if (st) { st.selSnd = null; st.snapSel = null; st.stepSel = null; st.advRepaint = null; st.cutAtNow = null; } try { sndOff(); } catch {} if (tTm) { clearTimeout(tTm); tTm = null; tSave(); commit(); } if (st) { if (st._dragBase != null && Math.abs(m - st._dragBase) > 0.004) persist(); st._dragBase = null; st.onBarDrag = null; st.onBarDragX = null; st.onBarDragEnd = null; st.onBarDragXEnd = null; st.stopAt = 0; } if (tm) { clearTimeout(tm); tm = null; try { fxSave(onFix, { t0: T0, t1: T1, midi: keepFix() ? rnd(m) : null, ...(isCut && same() ? { cut: true } : {}) }); } catch {} commit(); } toneOff(); if (st) st.sel = null; d.remove(); };
    // (11/02 20:26 사용자) 폰 뒤로(갤럭시 뒤로 밀기) = 고치기 창만 닫기(전체화면은 그대로) — 주석 창과 같은 방식(기록 한 칸)
    const leave = () => { if (sheetClose === close_) sheetClose = null; try { if (history.state && history.state.tuneSheet) { const nl = dropL(); skipPop = true; history.go(-1 - nl); } } catch {} };
    const close_ = (fromPop) => { core(); saveToast(); if (bot) bot._h0 = 0; if (fromPop === true) { if (sheetClose === close_) sheetClose = null; } else leave(); if (st && st.dock) st.dock(); };
    if (!had && !sheetClose) try { history.pushState(Object.assign({}, history.state || {}, { tuneSheet: true }), ""); } catch {}
    sheetClose = close_; close_._fix = true;
    const shut = () => close_();
    { let n = 0; try { n = +(localStorage.getItem("tune_fix_tip") || 0); } catch {} if (n < 3 && !uni) { try { localStorage.setItem("tune_fix_tip", String(n + 1)); } catch {}
      const cb = host.querySelector(".tfCvBox"), tip = document.createElement("div"); tip.className = "tfFixTip"; tip.textContent = "빈 곳 톡 = 고치기 창 닫기"; if (cb) { cb.appendChild(tip); setTimeout(() => tip.remove(), 2600); } } }
    d.addEventListener("pointerdown", (e) => e.stopPropagation()); d.addEventListener("contextmenu", (e) => e.preventDefault());
   // 아래 큰 스위치(창이 뜨면 숨김)와 같은 동작 · 켜짐 표시는 그림 그릴 때 같이
    const step = (dm, beep) => { m = rnd(m + dm); paint(); preview(); persist(); if (beep) sndFor(m, 500); };
    if (st) { st.snapSel = (mm) => { const was = m; step(rnd(mm) - m, true); return was; }; st.stepSel = (dm) => step(dm, true); st._bt = Date.now(); }   // (11/06) 두 번 톡 맞춤 — 같은 단추(▼▲)와 같은 저장 길
    // (11/03 10:50 사용자) ▼▲ 톡 = 반음 · 꾹 누르고 있으면 5센트씩 조금씩(소리 따라감) · 반음 단위는 막대를 누른 채 위아래로도
    d.querySelectorAll("[data-d]").forEach(x => { let hold = null, rep_ = null, long = false;
      const stop = () => { clearTimeout(hold); clearInterval(rep_); hold = rep_ = null; if (long) sndOff(); };
      x.addEventListener("pointerdown", (e) => { e.preventDefault(); long = false; try { x.setPointerCapture(e.pointerId); } catch {}
        hold = setTimeout(() => { long = true; snd(m); rep_ = setInterval(() => { step(+x.dataset.d * 0.05, false); snd(m); }, 90); }, 380); });
      x.addEventListener("pointerup", () => { const wasLong = long; stop(); if (!wasLong) step(+x.dataset.d, true); });
      ["pointercancel", "lostpointercapture"].forEach(ev => x.addEventListener(ev, stop));
      x.onclick = (e) => { if (e.detail === 0) step(+x.dataset.d, true); };   // 키보드(Enter)
      x.addEventListener("contextmenu", (e) => e.preventDefault()); });
    // (11/06 16:02 사용자) 끄는 동안엔 저장 안 함 → 손을 뗄 때 한 번만(제자리로 돌아오면 기록 없음) — 되돌리기 기록에 중간 단계가 안 남게
    if (st) { st.onBarDrag = (k, start) => { if (start) st._dragBase = m; const nm_ = rnd(st._dragBase + k); if (nm_ !== m) { if (Math.abs(nm_ - m) > 0.5) buzz(20); else if (Math.floor(nm_ * 20 + 1e-6) !== Math.floor(m * 20 + 1e-6)) buzz(10);   /* (11/06 21:59 사용자) 반음 한 칸 = 진동 · 미세는 5센트마다 짧게 */ m = nm_; st.focusC = m * 100; st.focusMin = true; paint(); preview(); sndFor(m, 400); } }; /* 끄는 음이 화면 밖으로 나가면 그만큼만 따라감 */
      st.onBarDragEnd = () => { if (st._dragBase != null && Math.abs(m - st._dragBase) > 0.004) persist(); st._dragBase = null; }; }
    const nb = d.querySelector("[data-p]");   // 음 이름을 누르는 동안 그 음 소리
    // (11/06 22:54 사용자 시안 ② 승인) 음 이름 칸에서 바로 위아래로 밀기 · (11/07 09:39 뒤바꿈) 바로 밀면 미세(2px = 1센트) · 꾹 0.6초(진동) 뒤 밀면 반음씩(24px마다) · 톡 = 소리
    let nd = null; if (st && st.onBarDrag) nb.classList.add("tfNScr");
    nb.addEventListener("pointerdown", (e) => { e.preventDefault(); snd(m); if (!(st && st.onBarDrag)) return; try { nb.setPointerCapture(e.pointerId); } catch {}
      const n_ = nd = { id: e.pointerId, y: e.clientY, fine: true, ax: false };   // (11/07 09:39 사용자) 이 칸은 ▼▲ 버튼이 옆에 있으니: 바로 밀면 미세(센트) · 꾹 0.6초(진동) 뒤 밀면 반음씩
      n_.lp = setTimeout(() => { if (nd !== n_ || n_.ax) return; n_.fine = false; buzz(40); nb.classList.remove("fineOn"); void nb.offsetWidth; nb.classList.add("fineOn"); }, LONG_MS); });
    nb.addEventListener("pointermove", (e) => { if (!nd || e.pointerId !== nd.id || !st || !st.onBarDrag) return; const dy = nd.y - e.clientY;
      if (!nd.ax) { if (Math.abs(dy) < 7) return; nd.ax = true; clearTimeout(nd.lp); st.onBarDrag(0, true); }
      st.onBarDrag(nd.fine ? Math.round(dy / 2) / 100 : Math.round(dy / 24), false); });
    const ndEnd = () => { if (!nd) return; const n_ = nd; nd = null; clearTimeout(n_.lp); nb.classList.remove("fineOn"); if (n_.ax && st && st.onBarDragEnd) { try { st.onBarDragEnd(); } catch {} } };
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(ev => nb.addEventListener(ev, ndEnd));
    nb.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });   // (11/03) 길게 눌러도 폰 진동(길게 누르기 반응) 안 나게 — 누르는 동안 소리만
    // (11/03 10:50 아이패드) 손을 떼도 소리가 안 멈추던 문제: 위 줄 주석에 떼기 처리가 묻혀 빠져 있었음 → 떼기·취소·터치 끝 모두에서 끔
    ["pointerup", "pointerleave", "pointercancel", "touchend", "touchcancel"].forEach(ev => nb.addEventListener(ev, sndOff));
    const cut = d.querySelector("[data-cut]");
    const doCut = (tAt) => {   // 세로줄 자리에서 나누기 → 두 조각(같은 음, 노란 테두리 없음) · 조각을 눌러 따로 고침
      clearTimeout(tm); tm = null;
      const ts = +(tAt != null ? tAt : atHead ? tNow : (b.t0 + b.t1) / 2).toFixed(2), a = { t0: T0, t1: ts, midi: rnd(m), cut: same() }, c = { t0: ts, t1: T1, midi: rnd(m), cut: same() };
      cv._fixes = prior.filter(x => !(x.t0 < b.t1 && x.t1 > b.t0)).concat([a, c]);
      try { fxSave(onFix, a); fxSave(onFix, c); } catch {} sndOff();
      fixSheet(host, cv, { t0: ts, t1: T1, c: Math.round(m * 100) }, onFix, getT, st); };
    if (cut) cut.onclick = () => doCut();
    if (st) st.cutAtNow = (tt) => { if (tt > b.t0 + 0.04 && tt < b.t1 - 0.04) { buzz(30); doCut(tt); } };   // (11/06 22:20 사용자) 세로줄 위 ✂ 톡 = 그 자리에서 나누기   // (11/03 08:14 사용자) 나누면 오른쪽 조각이 바로 골라진 채로(창은 그대로, 뒤로 가기 기록도 그대로)
    const mrg = d.querySelector("[data-merge]");
    if (mrg) mrg.onclick = () => {   // (11/05 사용자) 합치기: 나눈 조각 둘 → 한 음. 둘 다 '나누기만 한' 조각이고 음을 안 바꿨으면 고침 기록을 지워 서버가 처음 고른 한 음으로, 아니면 지금 고른 음으로 한 덩어리 고침
      clearTimeout(tm); tm = null;
      const o = mgNb, a0 = Math.min(T0, o.t0), a1 = Math.max(T1, o.t1), plain = isCut && !!o.cut && same(), f = { t0: a0, t1: a1, midi: plain ? null : rnd(m) };
      if (!plain) { const o_ = cv._orig || (cv._orig = {}); (cv.pts || []).forEach((p, i) => { if (p[0] >= a0 - 0.001 && p[0] <= a1 + 0.001 && p[kt] != null) { if (!(i in o_)) o_[i] = p[kt]; p[kt] = Math.round(m * 100); } }); }
      cv._fixes = prior.filter(x => !(x.t0 < a1 && x.t1 > a0)).concat(plain ? [] : [f]);
      try { fxSave(onFix, f); } catch {} sndOff();
      fixSheet(host, cv, { t0: a0, t1: a1, c: Math.round(m * 100) }, onFix, getT, st); };
    // (11/03 13:34 사용자) ↺ 톡 = 가장 최근에 저장했던 상태로(한 번씩 거꾸로) · 1초 꾹 = '원본으로 되돌릴까요?' 확인 → 이 음의 음정·타이밍 고침을 모두 지움(보컬 분리 + 기본 보정만 한 상태)
    let tGet = () => null, tSet = () => {}, tOrig = () => {};   // 타이밍 상태(타이밍 모드가 있을 때만 아래에서 채움)
    const H = st ? (st._hist || (st._hist = {})) : {}, hk = b.t0.toFixed(2) + "|" + b.t1.toFixed(2);   // 저장 기록(전체화면을 닫을 때까지)
    const curS = () => ({ m, t: tGet() }), eqS = (a, c) => !!a && !!c && Math.abs(a.m - c.m) < 0.004 && JSON.stringify(a.t) === JSON.stringify(c.t);
    let saved = null; const commit = () => { const c = curS(); if (saved && !eqS(saved, c)) (H[hk] || (H[hk] = [])).push(saved); saved = c; };
    const pSaveNow = () => { clearTimeout(tm); tm = null; preview(); try { fxSave(onFix, { t0: T0, t1: T1, midi: keepFix() ? rnd(m) : null, ...(isCut && same() ? { cut: true } : {}) }); } catch {} };
    const undo = () => { const L = H[hk] || []; if (tm || tTm) { clearTimeout(tm); clearTimeout(tTm); tm = tTm = null; commit(); }   // 아직 저장 대기 중인 것도 한 칸으로
      if (!L.length) { stEl.textContent = "되돌릴 저장이 없어요"; return; }
      const s_ = L.pop(); m = s_.m; paint(); pSaveNow(); if (s_.t) tSet(s_.t); saved = s_; stEl.textContent = "↺ 직전 저장으로 · 저장됨"; try { sndFor(m, 500); } catch {} };
    const toOrig = () => { clearTimeout(tm); tm = null; m = mO; paint(); for (const i in snap) cv.pts[i][kt] = i in o0 ? o0[i] : snap[i];   // m = mO; paint(); — 처음(서버가 고른) 음
      cv._fixes = prior.filter(x => !(x.t0 < b.t1 && x.t1 > b.t0)); try { fxSave(onFix, { t0: T0, t1: T1, midi: null }); } catch {}
      tOrig(); if (uni && advBox) { try { G.TuneAdv.resetNote(st, cv, b); G.TuneAdv.panel(advBox, b, st, cv); placeOrg(); } catch {} } H[hk] = []; saved = curS(); stEl.textContent = "↺ 원본으로 · 저장됨"; };
    const askOrig = () => { const old = (host.querySelector(".tfCfm")); if (old) old.remove();
      const cf = document.createElement("div"); cf.className = "tfCfm"; cf.setAttribute("role", "dialog");
      cf.innerHTML = `<div class="tfCfmBox"><b>원본으로 되돌릴까요?</b><p>이 음의 ${uni ? "음정·타이밍·고급" : "음정·타이밍"} 고침을 모두 지우고, 보컬 분리 후 기본 보정만 한 상태로 돌아가요.</p><div class="tfCfmRow"><button type="button" data-cf="0">취소</button><button type="button" class="pri" data-cf="1">확인</button></div></div>`;
      cf.addEventListener("pointerdown", (e) => e.stopPropagation());
      const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => cf.remove()) : { close: () => cf.remove() };   // 뒤로 가기 = 이 확인 창만 닫힘
      cf.addEventListener("click", (e) => { if (e.target === cf) ly.close(); });
      cf.querySelectorAll("[data-cf]").forEach(x => x.onclick = (e) => { e.stopPropagation(); ly.close(); if (x.dataset.cf === "1") toOrig(); });
      host.appendChild(cf); };
    d.querySelectorAll("[data-r],[data-tr]").forEach(x => { let hold = null, fired = false;
      const stop = () => { clearTimeout(hold); hold = null; x.classList.remove("hold"); };
      x.addEventListener("pointerdown", (e) => { e.preventDefault(); fired = false; try { x.setPointerCapture(e.pointerId); } catch {} x.classList.add("hold"); hold = setTimeout(() => { fired = true; stop(); askOrig(); }, 1000); });
      x.addEventListener("pointerup", () => { const f_ = fired; stop(); if (!f_) { if (uni) askOrig(); else undo(); } });
      ["pointercancel", "lostpointercapture"].forEach(ev => x.addEventListener(ev, stop));
      x.onclick = (e) => { if (e.detail === 0) { if (uni) askOrig(); else undo(); } };
      x.addEventListener("contextmenu", (e) => e.preventDefault()); });
    // ── 타이밍·길이 ──
    const setMd = (md) => { if (!tOn) return; if (md === "a" && !(st.onAdv && st.advOn)) md = "p"; st.fixMode = md; d.classList.toggle("tmode", md === "t"); d.classList.toggle("amode", md === "a");
      if (md === "a") { try { G.TuneAdv.panel(d.querySelector(".tfFixBox"), b, st, cv); } catch (e) { console.warn("고급 보정", e); } }   /* (11/04 사용자) 고급 보정 모드: 원장(과 원장이 열어 준 강사)만 */ d.querySelectorAll("[data-md]").forEach(x => { const on = x.dataset.md === md; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }); if (md === "t") sndOff(); };
    const orgBtn = d.querySelector(".tfOrg"), placeOrg = () => { const o = orgBtn, tb = advBox && advBox.querySelector(".advTabs"); if (o && tb) tb.appendChild(o); };   // (11/06 사용자) 원본 버튼 = 탭 줄(흐름·이어짐…) 오른쪽 빈 곳
    if (uni) { const sn = d.querySelector("[data-snap]"); if (sn) { sn.addEventListener("pointerdown", (e) => e.stopPropagation()); sn.onclick = () => { try { st.snapNote && st.snapNote(); } catch {} }; } }
    if (uni) { st.fixMode = "p"; advBox = d.querySelector(".tfUniAdv"); try { G.TuneAdv.panel(advBox, b, st, cv); placeOrg(); } catch (e) { console.warn("고급 보정", e); } st.advRepaint = () => { try { G.TuneAdv.panel(advBox, b, st, cv); placeOrg(); } catch {} }; }
    else if (tOn) { setMd(bu ? "p" : tMode ? "t" : "p");   /* (11/05 00:06 사용자 '음표 눌러도 나누기·위아래가 안 됨') 고급 보정을 켜도 음표를 누르면 늘 🎵 음정(기본)부터 — 🎛 고급은 탭 한 번 */ d.querySelectorAll("[data-md]").forEach(x => x.onclick = () => setMd(x.dataset.md)); }
    if (!tOn) { saved = curS(); return; }
    const L0 = b.t1 - b.t0, sameT = (x) => Math.abs(x.t0 - b.t0) < 0.02 && Math.abs(x.t1 - b.t1) < 0.02, te0 = (cv._tedits || []).find(sameT);
    let n0 = te0 ? te0.nt0 : b.t0, n1 = te0 ? te0.nt1 : b.t1;
    const r2 = (x) => Math.round(x * 100) / 100, tSame = () => Math.abs(n0 - b.t0) < 0.005 && Math.abs(n1 - b.t1) < 0.005;
    const tClamp = (edge) => {   // 옮기기 ±0.6초 · 길이 원래의 0.5~2배(최소 0.06초) — 서버가 받아들이는 범위 안
      const lo = Math.max(0.06, L0 * 0.5), hi = L0 * 2;
      if (edge === "l") { n0 = Math.max(0, b.t0 - 0.6, Math.min(b.t0 + 0.6, n0, n1 - lo)); n0 = Math.max(n0, n1 - hi); }
      else { n0 = Math.max(0, b.t0 - 0.6, Math.min(b.t0 + 0.6, n0)); n1 = Math.max(n0 + lo, Math.min(n0 + hi, n1)); }
      n0 = r2(n0); n1 = r2(n1); };
    const tn = d.querySelector("[data-tp]") || document.createElement("button"), tInfo = () => { const dt = n0 - b.t0, dl = (n1 - n0) - L0, f = (x) => (x > 0 ? "+" : "−") + Math.abs(x).toFixed(2) + "초"; return (Math.abs(dt) > 0.004 ? " · 앞뒤 " + f(dt) : "") + (Math.abs(dl) > 0.004 ? " · 길이 " + f(dl) : ""); }, tPaint0 = () => { const dt = n0 - b.t0, dl = (n1 - n0) - L0, sg = (x) => (x > 0.004 ? "+" : x < -0.004 ? "−" : "±") + Math.abs(x).toFixed(2);
      tn.innerHTML = `${sg(dt)}초<small>길이 ${Math.abs(dl) > 0.004 ? sg(dl) + "초" : "그대로"}</small>`; };
    let tPaint = tPaint0;   // (11/06) 기본 모드 위치·길이 칸도 같이 다시 그리도록 바꿔 끼울 수 있게
    const tPreview = () => { cv._tedits = (cv._tedits || []).filter(x => !sameT(x)).concat(tSame() ? [] : [{ t0: b.t0, t1: b.t1, nt0: n0, nt1: n1, c: Math.round(m * 100) }]); };   // 지금 음정 높이에(음정을 바꾼 뒤 옮겨도 막대가 제 높이)
    tSave = () => { try { fxSave(st.onTime, { t0: b.t0, t1: b.t1, nt0: n0, nt1: n1 }); } catch {} stEl.textContent = "✓ 저장됨" + (uni || bu ? tInfo() : ""); };
    const tPersist = () => { clearTimeout(tTm); stEl.textContent = "저장 중…" + (uni || bu ? tInfo() : ""); tTm = setTimeout(() => { tTm = null; tSave(); commit(); }, 450); };
    const tStep = (kind, dv) => { if (kind === "m") { n0 += dv; n1 += dv; tClamp("m"); } else { n1 += dv; tClamp("r"); } tPaint(); tPreview(); tPersist(); };
    tPaint();
    const buT = bu && d.querySelector(".tfBuT");
    if (buT && G.TuneAdv && G.TuneAdv.scrub) {   // 위치·길이 = 고급의 '끌어서 조절하는 칸'(좌우로 밀기 · 톡 한 칸 · 두 번 톡 원래대로)
      const sg_ = (x) => (Math.abs(x) < 0.005 ? "±0.00초" : (x > 0 ? "+" : "−") + Math.abs(x).toFixed(2) + "초");
      const cs = [G.TuneAdv.scrub("위치", () => r2(n0 - b.t0), (v) => { const L_ = n1 - n0; n0 = b.t0 + v; n1 = n0 + L_; tClamp("m"); tPaint(); tPreview(); tPersist(); }, { step: 0.02, min: -0.6, max: 0.6, def: 0, fmt: sg_ }, true),
        G.TuneAdv.scrub("길이", () => r2((n1 - n0) - L0), (v) => { n1 = n0 + L0 + v; tClamp("r"); tPaint(); tPreview(); tPersist(); }, { step: 0.02, min: -L0 * 0.5, max: L0, def: 0, fmt: (x) => (Math.abs(x) < 0.005 ? "그대로" : sg_(x)) }, true)];
      buT.className = "tfBuT advCells"; cs.forEach(c => buT.appendChild(c));
      tPaint = () => { tPaint0(); cs.forEach(c => c._paint && c._paint()); }; }
    d.querySelectorAll("[data-tm],[data-tl]").forEach(x => { let hold = null, rep_ = null, long = false; const kind = x.dataset.tm ? "m" : "l", dv = +(x.dataset.tm || x.dataset.tl) * 0.02;
      const stop = () => { clearTimeout(hold); clearInterval(rep_); hold = rep_ = null; };
      x.addEventListener("pointerdown", (e) => { e.preventDefault(); long = false; try { x.setPointerCapture(e.pointerId); } catch {}
        hold = setTimeout(() => { long = true; rep_ = setInterval(() => tStep(kind, dv), 90); }, 380); });
      x.addEventListener("pointerup", () => { const wasLong = long; stop(); if (!wasLong) tStep(kind, dv); });
      ["pointercancel", "lostpointercapture"].forEach(ev => x.addEventListener(ev, stop));
      x.onclick = (e) => { if (e.detail === 0) tStep(kind, dv); };
      x.addEventListener("contextmenu", (e) => e.preventDefault()); });
    tn.onclick = () => { if (tTm) { clearTimeout(tTm); tTm = null; tSave(); commit(); } setTimeout(() => { try { st.playSeg && st.playSeg(Math.max(0, Math.min(n0, b.t0) - 0.4), Math.max(n1, b.t1) + 0.3); } catch {} }, 60); };   // 고친 소리로 그 근처만 듣기
    tGet = () => [n0, n1];
    tSet = (t) => { n0 = t[0]; n1 = t[1]; tPaint(); tPreview(); clearTimeout(tTm); tTm = null; tSave(); };
    tOrig = () => { clearTimeout(tTm); tTm = null; n0 = b.t0; n1 = b.t1; tPaint(); tPreview(); try { fxSave(st.onTime, { t0: b.t0, t1: b.t1, nt0: b.t0, nt1: b.t1, reset: true }); } catch {} };   // 원래 녹음 시간으로(예전에 다시 만든 고침까지 지움)
    saved = curS();
    st.onBarDragX = (dt, edge, start) => { if (start) { st._tb = [n0, n1]; st._tbHome = true; st._tbAway = false; return; } const [a0, a1] = st._tb || [n0, n1];
      if (edge === "l") n0 = a0 + dt; else if (edge === "r") n1 = a1 + dt; else { n0 = a0 + dt; n1 = a1 + dt; }
      if (st.beatOn && edge !== "r") { const bt = beatNear(cv, n0); if (bt != null && Math.abs(bt - n0) <= BEAT_SNAP) { const dd = bt - n0; n0 = bt; if (edge === "c") n1 += dd; } }   // (11/06) 🥁 박자 맞춤: 음 시작을 가까운 박에 착(스마트 어택)
      // (11/06 17:59 사용자) 늘렸다 줄였다 하다 처음 자리(누르기 시작할 때 길이)로 돌아오면 진동 + 그 자리에 살짝 붙음(±0.015초)
      const DET = 0.015, home = Math.abs(n0 - a0) <= DET && Math.abs(n1 - a1) <= DET; if (home) { n0 = a0; n1 = a1; }
      if (home && !st._tbHome && st._tbAway) { buzz(40); st.pulse = st.hdl && st.hdl[edge] ? { x: st.hdl[edge].x, y: st.hdl[edge].y, at: performance.now() } : st.pulse; }
      st._tbHome = home; if (!home) st._tbAway = true;
      tClamp(edge === "c" ? "m" : edge); tPaint(); tPreview(); };
    st.onBarDragXEnd = () => { const b0 = st._tb; st._tb = null; if (b0 && (Math.abs(n0 - b0[0]) > 0.004 || Math.abs(n1 - b0[1]) > 0.004)) tPersist(); };   // 손 뗄 때 한 번만 저장
  }
  // (11/03 13:46 사용자 승인) 여러 음 고르기: 켜 둔 동안 그래프를 좌우로 끌면 그 구간의 음들이 골라짐(시간 이동은 두 손가락) → [↺ 원본으로] = 그 안의 음정·타이밍 고침만 지움(10초 되살리기)
  // (11/05 사용자 시안 승인 '다 고고') 얇은 도구줄: [☑ N음 · 구간 | ▼ ▲ ↺원본 ✕] + 안내 한 줄 · ▼▲ = 고른 음 전부 반음씩 한꺼번에(저장은 한 번에 묶어서)
  // barsIn = 화면에 그려지는 정음 막대(위 draw와 같은 규칙)를 시간 구간[a,b]로 모음 · 아주 짧은(0.1초 미만, 안 고친) 조각은 제외
  function barsIn(cv, a, b) {
    const kt = tgCol(cv); if (!kt) return [];
    const fx = cv._fixes || [], fxOf = (tt) => fx.findIndex(x => tt >= x.t0 - 1e-6 && tt < x.t1 - 1e-6), pts = cv.pts || [], runs = []; let run = null;
    for (let i = 0; i < pts.length; i++) { const p = pts[i], q = pts[i + 1];
      if (p[0] > b + BAR_GAP) break;
      if (p[kt] == null) { run = null; continue; }
      const cont = q && q[kt] === p[kt] && q[0] - p[0] < BAR_GAP && fxOf(q[0]) === fxOf(p[0]);
      if (!run) { run = { t0: p[0], t1: p[0], c: p[kt], idx: [] }; runs.push(run); }
      run.idx.push(i); run.t1 = cont ? q[0] : p[0] + 0.04;
      if (!cont) { const fi = fxOf(run.t0); if (fi >= 0) { run.t0 = fx[fi].t0; run.t1 = fx[fi].t1; run.fx = fx[fi]; } run = null; } }
    return runs.filter(r => (r.fx || r.t1 - r.t0 >= 0.1) && r.t0 < b && r.t1 > a);
  }
  // groupShift = 구간 안 정음 막대 전부를 semis 반음 옮김(화면·고침 기록 갱신) → 저장할 고침 목록을 돌려줌(서버 반영은 부른 쪽이 한 번에)
  function groupShift(cv, a, b, semis) {
    const kt = tgCol(cv), runs = barsIn(cv, a, b), out = [];
    if (!runs.length) return out;
    const o_ = cv._orig || (cv._orig = {}), r2 = (x) => Math.round(x * 100) / 100; let nf = (cv._fixes || []).slice();
    for (const r of runs) {
      const ov = r.idx.map(i => (i in o_ ? o_[i] : cv.pts[i][kt])).sort((x, y) => x - y), oC = ov[ov.length >> 1];   // 서버가 처음 고른 음
      const m = r2(r.c / 100 + semis), same = Math.abs(m * 100 - oC) < 0.4, isCut = !!(r.fx && r.fx.cut);
      for (const i of r.idx) { if (!(i in o_)) o_[i] = cv.pts[i][kt]; cv.pts[i][kt] = Math.round(m * 100); }
      const t0 = +r.t0.toFixed(2), t1 = +r.t1.toFixed(2), keep = !(same && !isCut), f = { t0, t1, midi: keep ? m : null, ...(isCut ? { cut: true } : {}) };   // 나눔 표시는 옮겨도 유지(서버는 이 표시를 안 봄 — 화면에서 나눈 조각을 계속 알아보기 위함)
      nf = nf.filter(x => !(x.t0 < t1 && x.t1 > t0)); if (keep) nf.push(f); out.push(f); }
    cv._fixes = nf.sort((x, y) => x.t0 - y.t0);
    return out;
  }
  function multiSheet(host, cv, st, keep, keepSel) {
    const o = st.o || {}, mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
    const had = keep || !!host.querySelector(".tfFix:not(.tfDock)"); host.querySelectorAll(".tfFix").forEach(x => x.remove());
    const d = document.createElement("div"); d.className = "tfFix tfMulti" + (st.advOn ? " tfUni" : " tfMGr"); const uvOn = !!(st.advOn && st.onAdv && G.TuneAdv && G.TuneAdv.uvSheet);   // 🌬 치찰음·호흡 = 보정 모드에서 고른 구간의 도구
    d.innerHTML = `<div class="tfFixBox"><div class="tfMB"><span class="tfMI"><b data-mn>☑ 음을 골라 주세요</b><span class="tfFixTm">꾹 누른 채 끌어요</span></span>
      ${!st.advOn && st.onAddRange ? `<button type="button" class="tfMNote" data-mnote disabled>💬 한마디</button>` : ""}      <button type="button" data-gd="-1" aria-label="고른 음 모두 반음 내림" disabled>▼</button><button type="button" data-gd="1" aria-label="고른 음 모두 반음 올림" disabled>▲</button>${uvOn ? `<button type="button" data-uv aria-label="치찰음·호흡 크기 조절" disabled>🌬</button>` : ""}
      <button type="button" class="tfMr" data-mr disabled>↺ 원본</button><button type="button" class="tfIc" data-mx aria-label="여러 음 고르기 끝내기">✕</button></div>
      <div class="tfMH tfFixSt">꾹 누른 채 끌어 고르기 · ${st.advOn ? "분홍 선을 잡아 끌면 범위 조절 · " : "초록 동그라미를 잡아 끌면 범위 조절 · 구간 안 톡 또는 💬 = 한마디 · "}빈 곳 톡 = 끝</div></div>`;
    const bot = host.querySelector(".tfBot");
    if (bot) { const h0 = had && bot._h0 ? bot._h0 : bot.offsetHeight; bot._h0 = h0; d.classList.add("inBot"); bot.appendChild(d);
      const gap = h0 - bot.offsetHeight; if (gap > 0) d.style.minHeight = (d.offsetHeight + gap) + "px"; }
    else host.appendChild(d);
    d.addEventListener("pointerdown", (e) => e.stopPropagation());
    const tmEl = d.querySelector(".tfFixTm"), stEl = d.querySelector(".tfFixSt"), nEl = d.querySelector("[data-mn]"), rb = d.querySelector("[data-mr]"), gds = [...d.querySelectorAll("[data-gd]")], uvBtn = d.querySelector("[data-uv]"), HINT = stEl.textContent + (uvOn ? " · 🌬 = 치찰음·호흡" : "");
    st.mMode = true; if (!keepSel) st.msel = null; st.sel = null;
    // 묶어 저장: ▼▲를 연달아 눌러도 0.45초 쉬면 한 번에 서버(드라이브)로 — 같은 막대는 마지막 값만
    let pend = new Map(), ptm = null;
    const flush = () => { clearTimeout(ptm); ptm = null; if (!pend.size) return; const list = [...pend.values()]; pend = new Map();
      try { if (typeof o.onFixMany === "function") fxSave(o.onFixMany, list); else for (const f of list) fxSave(o.onFix, f); } catch {} stEl.textContent = "✓ 저장됨"; };
    const paint = () => { const m_ = st.msel; let nb = 0, nf = 0;
      if (m_) { try { nb = barsIn(cv, m_[0], m_[1]).length; } catch {} try { nf = typeof o.countRange === "function" ? o.countRange(m_[0], m_[1]) : 0; } catch {} }
      if (!m_) { nEl.textContent = "☑ 음 고르기"; tmEl.textContent = "꾹 누른 채 끌어요"; }
      else { nEl.textContent = nb ? `☑ ${nb}음` : "☑ 0음"; tmEl.textContent = `${mm(m_[0])}~${mm(m_[1])}`; }
      gds.forEach(x => { x.disabled = !nb; }); { const mn_ = d.querySelector("[data-mnote]"); if (mn_) mn_.disabled = !(m_ && m_[1] - m_[0] >= 0.05); } if (uvBtn) uvBtn.disabled = !m_ || Math.abs(m_[1] - m_[0]) < 0.08; rb.disabled = !nf; rb.textContent = "↺ 원본";
      if (!pend.size && !stEl.textContent.startsWith("↺") && !stEl.textContent.startsWith("✓")) stEl.textContent = HINT; };
    st.onMSel = () => { if (pend.size) flush(); stEl.textContent = HINT; paint(); }; paint();
    gds.forEach(x => x.onclick = () => { const m_ = st.msel; if (!m_) return; const sm = +x.dataset.gd, out = groupShift(cv, m_[0], m_[1], sm);
      if (!out.length) return; for (const f of out) pend.set(f.t0 + "|" + f.t1, f); clearTimeout(ptm); ptm = setTimeout(flush, 450);
      stEl.textContent = `${sm > 0 ? "▲" : "▼"} ${out.length}음 옮겼어요 · 저장 중…`; paint(); });
    if (uvBtn) uvBtn.onclick = () => { const m_ = st.msel; if (!m_) return; flush(); try { G.TuneAdv.uvSheet(host.querySelector(".tfBox") || host, st, cv, m_.slice()); } catch (e) { console.warn("치찰음", e); } };
    rb.onclick = async () => { const m_ = st.msel; if (!m_) return; flush(); let n = 0; try { n = await o.onResetRange(m_[0], m_[1]); } catch {} st.msel = null; stEl.textContent = n ? `↺ ${n}곳 원본으로` : HINT; paint(); };
    const core = () => { flush(); st.mMode = false; st.msel = null; st.onMSel = null; d.remove(); };
    const leave = () => { if (sheetClose === close_) sheetClose = null; try { if (history.state && history.state.tuneSheet) { const nl = dropL(); skipPop = true; history.go(-1 - nl); } } catch {} };
    const close_ = (fromPop) => { core(); saveToast(); if (bot) bot._h0 = 0; if (fromPop === true) { if (sheetClose === close_) sheetClose = null; } else leave(); if (st && st.dock) st.dock(); };
    if (!had && !sheetClose) try { history.pushState(Object.assign({}, history.state || {}, { tuneSheet: true }), ""); } catch {}
    sheetClose = close_;
    d.querySelector("[data-mx]").onclick = () => close_();
    { const mn_ = d.querySelector("[data-mnote]"); if (mn_) mn_.onclick = () => { const r_ = st.msel ? st.msel.slice() : null; if (!r_) return; close_(); try { st.onAddRange(r_[0], r_[1]); } catch {} }; }   // (11/06 22:54 시안 ③) 💬 = 고른 구간 한마디
  }
  // ── 전체화면: 카드에서 커지며 가로로 돌아 폰 화면 가득. 상하 배율 고정(곡 전체 음역), 정음·부른 음·보정 음을 크게 ──
  // (11/03 10:38 사용자) '소리 불러오는 중'에 이 화면에서 쓸 수 있는 기능 팁을 보여 줌.
  // ⚠ 기능을 바꾸거나 없애면 여기 문구도 같이 고칠 것 — need = 그 기능을 만드는 코드 조각(tests/loading-tips.test.js가 코드에 있는지 확인해서, 기능이 사라지면 시험이 실패함)
  // when(o) = 이 화면(선생님/수강생, 고치기·주석·원음/보정본 있음)에서만
  const FS_TIPS = [
    { text: () => `주황 기준선 왼쪽·오른쪽을 두 번 톡 하면 ${DT_JUMP}초씩 뒤로·앞으로 가요`, need: "const j = le.x < hx ? -DT_JUMP : DT_JUMP" },
    { text: () => "그래프를 좌우로 밀면 시간이 이동해요(멈춘 채 옮겨져요)", need: 'drag.mode === "time"' },
    { text: () => "두 손가락으로 벌리면 확대, 오므리면 원래 크기예요", need: "st.yz = Math.max(1, Math.min(8, pinch.yz * r ** pinch.ep));" },
    { text: () => "그래프를 위아래로 밀면 화면 밖의 높은 음·낮은 음도 볼 수 있어요", need: "drag.yo + dB * per * (rot ? -1 : 1)" },
    { text: () => "왼쪽 건반을 누르고 있으면 그 음이 소리 나요 — 위아래로 밀면 따라 바뀌어요", need: "st.kbDown = m; tone(m);" },
    { text: () => "원음/보정본 스위치는 아무 쪽이나 톡 하면 바뀌어요 — 재생 중에도 같은 자리에서", need: 'want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m', when: (o) => typeof o.setMode === "function" },
    { text: () => "맨 위 '고친 양' 막대: 위로 솟으면 높게 불러 내린 곳, 아래로 내려가면 낮게 불러 올린 곳이에요", need: 'g.fillText("높게", 4, top + 8)', when: (o) => !!o.teacher },
    { text: () => "맨 위 막대가 위로 솟은 곳은 높게, 아래로 내려간 곳은 낮게 부른 곳이에요", need: 'g.fillText("높게", 4, top + 8)', when: (o) => !o.teacher },
    { text: () => "폰의 뒤로 가기(갤럭시는 화면 가장자리 밀기)로도 닫혀요", need: "if (fsClose) { fsClose();" },
    { text: () => "노래가 없는 전주·간주에선 '⏩ 노래 시작 1초 전으로'로 바로 넘어가요", need: "⏩ 노래 시작 1초 전으로" },
    { text: () => "멈춘 뒤 초록 정음 막대를 톡 하면 그 음을 고칠 수 있어요(▼▲, 바로 저장)", need: "hb = hitT(le) || hitBar(le);", when: (o) => typeof o.onFix === "function" },
    { text: () => "빈 곳을 꾹 누른 채 좌우로 끌면 여러 음 고르기 · 그냥 떼면 새 주석", need: "d0.armed = { x: l0.x, t: tt }; st.msel = [tt, tt]; armTip(true);", when: (o) => typeof o.onResetRange === "function" },
    { text: () => "여러 음을 고른 뒤 ▼▲ = 고른 음 전부를 반음씩 한꺼번에 · 끌다가 화면 끝에 닿으면 저절로 밀려요", need: 'data-gd="-1"', when: (o) => typeof o.onResetRange === "function" },
    { text: () => "↶ ↷ 되돌리기·다시하기 · 길게 누르면 작업 기록 창(원하는 시점으로 바로 이동)", need: 'data-ur="-1"', when: (o) => typeof o.histGet === "function" },
    { text: () => "위 🎛 고급: 켜면 음별 디테일 보정 · 고친 양·주석을 접어 그래프가 커져요", need: 'data-md2="1"', when: (o) => typeof o.onAdv === "function" },
    { text: () => "보정본에선 주석이 숨겨져요 · 위 💬 한마디 버튼(지나갈 때 반짝)으로 보기", need: "st.notesHidden = (pm && !st.noteShow)", when: (o) => !!o.teacher && typeof o.onNote === "function" },
    { text: () => "⏱ 타이밍: ◀▶ 일찍·늦게, −/+ 길이 · 막대 가운데를 끌면 옮기기, 끝을 끌면 길이", need: "st.onBarDragX = (dt, edge, start)", when: (o) => typeof o.onTime === "function" },
    { text: () => "타이밍 고친 음은 하늘색, 원래 자리는 점선 · 가운데 숫자를 누르면 그 근처만 들려요", need: 'g.fillStyle = "#5fd4ff"; g.fillRect(x0', when: (o) => typeof o.onTime === "function" },
    { text: () => "음 이름 칸: 누르면 소리 · 위아래로 밀면 미세(센트) · 꾹 누른 뒤 밀면 반음씩", need: 'n_.lp = setTimeout(() => { if (nd !== n_ || n_.ax) return; n_.fine = false; buzz(40);', when: (o) => typeof o.onFix === "function" },
    { text: () => "✂ 나누기: 세로줄이 막대 안이면 그 자리, 밖이면 가운데에서 나뉘고 오른쪽 조각이 골라져요", need: "fixSheet(host, cv, { t0: ts, t1: T1, c: Math.round(m * 100) }, onFix, getT, st)", when: (o) => typeof o.onFix === "function" },
    { text: () => "↺ 톡 = 직전 저장으로 되돌리기 · 1초 꾹 = 이 음을 원본으로(확인 후)", need: "hold = setTimeout(() => { fired = true; stop(); askOrig(); }, 1000)", when: (o) => typeof o.onFix === "function" },
    { text: () => "고치기 창은 그래프 빈 곳 톡·뒤로 가기로 닫혀요 — 고친 건 자동 저장돼요", need: "if (!onBar) { sheetClose(); lastTap = 0; return; }", when: (o) => typeof o.onFix === "function" },
    { text: () => "정음 막대 색 = 기준: 노랑 선생님 · 보라 MIDI · 하늘 원곡 · 초록 악보·키·스케일", need: "const SRC_C = {", when: (o) => typeof o.onFix === "function" },
    // (11/03 10:42 사용자) 수강생 화면은 보이는 것·할 수 있는 것이 달라서 팁도 따로
    { text: () => "노란 선 = 내가 부른 음 · 하늘색 = 보정한 음 · 초록 막대 = 맞춰야 할 음이에요", need: '<i style="background:#ffe066"></i>부른 음', when: (o) => !o.teacher },
    { text: () => "기준선 위 말풍선이 지금 몇 반음 높게·낮게 불렀는지 알려줘요", need: "반음 높게 불렀어요", when: (o) => !o.teacher },
    { text: () => "번호가 붙은 카드는 강사님 피드백이에요 — 그 자리를 들으며 하나씩 확인해 보세요", need: "function hitNote", when: (o) => !o.teacher && typeof o.notes === "function" },
    { text: () => "원음과 보정본을 번갈아 들어 보면 어느 음이 어긋났는지 귀로 바로 느껴져요", need: 'want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m', when: (o) => !o.teacher && typeof o.setMode === "function" },
    { text: () => "그래프 빈 곳을 길게 누르면 그 자리에 주석을 달 수 있어요", need: 'typeof o.onAdd === "function") d0.lp = setTimeout', when: (o) => typeof o.onAdd === "function" },
    { text: () => "주석 칸을 0.6초 꾹 누르면 내용을 고치거나 지울 수 있어요", need: "주석 칸 0.6초 꾹 = 고치기", when: (o) => typeof o.onNote === "function" },
    { text: () => "🌬 치찰음·호흡: 보정 모드에서 구간을 고르면 나오는 🌬 버튼 → 그 구간의 ㅅ·ㅊ(숨소리) 크기 조절", need: "G.TuneAdv.uvSheet(host.querySelector", when: (o) => typeof o.onAdv === "function" },
    { text: () => "보정 모드: 고른 음을 잡고 위아래 = 반음 · 꾹 0.6초 누른 뒤 위아래 = 미세", need: "if (drag.fine) drag.axis = \"v\"", when: (o) => typeof o.onAdv === "function" },
    { text: () => "보정 모드: 음 양 끝 ‹ › 화살표를 꾹 누른 채 좌우로 = 길이 미세 조절", need: "d0.hArmed = true", when: (o) => typeof o.onAdv === "function" },
    { text: () => "보정 모드: 음을 두 번 톡 = 가까운 음계 음에 맞추고 흐름 평평하게", need: "const snapNote = () =>", when: (o) => typeof o.onAdv === "function" },
    { text: () => "✏️ 펜: 음정선 위에 그리면 그 구간 음높이가 그린 대로 · 선 톡 = 지우기", need: "drag = { pen: true", when: (o) => typeof o.onAdv === "function" },
    { text: () => "🥁 박자: 반주 박자 격자 · 음을 끌어 옮기면 시작이 가까운 박에 붙어요", need: "st.beatOn && edge !== \"r\"", when: (o) => typeof o.onAdv === "function" }
  ];
  const fsTips = (o) => FS_TIPS.filter(x => !x.when || x.when(o));
  // (11/05 사용자) 되돌리기·다시하기(↶ ↷) + 길게 누르면 작업 기록 창 — 음을 다시 찾지 않아도 순서대로 한 단계씩
  // 앱이 histGet()(지금 고침 전체를 글자로) · histSet(글자)(그 상태로 되돌려 저장)를 주면 켜짐. 고치는 함수(onFix·onFixMany·onTime·onAdv·onResetRange)를 감싸 부를 때마다 한 칸 기록(0.5초 안에 이어지면 한 칸으로 합침) · (11/06) 전체화면을 닫아도 곡마다 기록 보관(histKey)
  function mkHist(o, onChange) {
    const cur = o.histGet(), key = o.histKey || null, c0 = histLoad(key);
    const H = c0 && c0.S[c0.ptr] === cur ? { S: c0.S.slice(), L: c0.L.slice(), ptr: c0.ptr, t: 0 } : { S: [cur], L: ["처음 상태(전체화면 열 때)"], ptr: 0, t: 0 };
    H.base = cur; H.keep = (disk) => histKeep(key, H, disk);
    const mmss = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
    const rec = (label) => { let post; try { post = o.histGet(); } catch { return; } if (post === H.S[H.ptr]) return; const now = performance.now();
      if (H.ptr > 0 && H.ptr === H.S.length - 1 && now - H.t < 500) { if (post === H.S[H.ptr - 1]) { H.S.pop(); H.L.pop(); H.ptr--; } else { H.S[H.ptr] = post; H.L[H.ptr] = label; } }
      else { H.S.length = H.ptr + 1; H.L.length = H.ptr + 1; H.S.push(post); H.L.push(label); H.ptr++; if (H.S.length > 101) { H.S.shift(); H.L.shift(); H.ptr--; } }
      H.t = now; H.keep(); onChange(); };
    const wrapF = (fn, lab, rg) => (typeof fn === "function" ? (...a) => { const r = fn(...a); let l = ""; try { l = lab(...a); } catch {}
      try { const q = rg && rg(...a); if (q && Number.isFinite(q[0]) && Number.isFinite(q[1])) { H.last = { t0: Math.min(q[0], q[1]), t1: Math.max(q[0], q[1]), at: performance.now() }; } } catch {}   // (11/07 09:16) '방금 고친 곳 듣기'용
      rec(l || "고침"); return r; } : fn);
    const fr = (f) => [Math.min(f.t0, f.nt0 ?? f.t0), Math.max(f.t1 ?? f.t0, f.nt1 ?? f.t1 ?? f.t0)];
    H.o = Object.assign({}, o, {
      onFix: wrapF(o.onFix, (f) => `${mmss(f.t0)} · ${f.midi == null ? "음 원본으로" : "음 → " + noteName(Math.round(f.midi))}`, fr),
      onFixMany: wrapF(o.onFixMany, (l) => `${mmss(l[0].t0)}~ · ${l.length}음 한꺼번에 옮김`, (l) => [Math.min(...l.map(x => x.t0)), Math.max(...l.map(x => x.t1 ?? x.t0))]),
      onTime: wrapF(o.onTime, (f) => `${mmss(f.t0)} · 타이밍${f.reset ? " 원본으로" : ""}`, fr),
      onAdv: wrapF(o.onAdv, () => "디테일 보정", () => (H.selGet ? H.selGet() : null)),
      onResetRange: wrapF(o.onResetRange, (a, b) => `${mmss(a)}~${mmss(b)} · 원본으로`, (a, b) => [a, b]) });
    H.go = async (i) => { if (i < 0 || i >= H.S.length || i === H.ptr) return false; H.ptr = i; H.keep(); onChange();   // (11/06 18:02) 화면 상태는 histSet이 바로 바꾸고, 인터넷 저장은 기다리지 않음(예전엔 저장 끝날 때까지 ~1초 기다린 뒤 음을 골랐음)
      try { const p = o.histSet(H.S[i]); if (p && typeof p.then === "function") p.catch((e) => console.warn("되돌리기", e)); } catch (e) { console.warn("되돌리기", e); } return true; };
    H.canU = () => H.ptr > 0; H.canR = () => H.ptr < H.S.length - 1;
    return H;
  }
  // (11/06 17:13 사용자) 전체화면을 닫았다 다시 열어도 되돌리기 기록이 남게: 곡(o.histKey)마다 메모리 + 이 기기(localStorage)에 보관
  // 다시 열 때 지금 고침이 기록의 마지막(현재) 상태와 같을 때만 이어 씀(다른 기기·다른 화면에서 바뀌었으면 새로 시작 — 엉뚱한 상태로 되돌리는 사고 방지)
  const HIST_KEY = "tune_hist_v1", HIST_N = 50, HIST_SONGS = 6, HIST_CHARS = 1500000, histMem = {};
  function histRead() { try { const v = JSON.parse(localStorage.getItem(HIST_KEY) || "{}"); return v && typeof v === "object" ? v : {}; } catch { return {}; } }
  function histLoad(key) { if (!key) return null; if (histMem[key]) return histMem[key]; const c = histRead()[key]; return c && Array.isArray(c.S) && Array.isArray(c.L) && c.S.length === c.L.length && c.ptr >= 0 && c.ptr < c.S.length ? c : null; }
  function histKeep(key, H, disk) { if (!key) return; let S = H.S.slice(), L = H.L.slice(), ptr = H.ptr; const cut = Math.max(0, S.length - HIST_N); if (cut) { S = S.slice(cut); L = L.slice(cut); ptr = Math.max(0, ptr - cut); }
    histMem[key] = { S, L, ptr, at: Date.now() }; if (!disk) return;
    try { const all = histRead(); all[key] = histMem[key]; let keys = Object.keys(all).sort((a, b) => (all[b].at || 0) - (all[a].at || 0)); for (const k of keys.slice(HIST_SONGS)) delete all[k];
      let js = JSON.stringify(all); const me = all[key];
      while (js.length > HIST_CHARS && me.S.length > 1) { const d = me.ptr > 0 ? 0 : me.S.length - 1; me.S.splice(d, 1); me.L.splice(d, 1); if (d === 0) me.ptr--; js = JSON.stringify(all); }   // 너무 크면 오래된 단계부터 버림
      localStorage.setItem(HIST_KEY, js); } catch {} }
  // 열었을 때(base)와 닫을 때(now) 고침을 비교해 몇 곳 바뀌었는지: 음정(fx) · 타이밍·길이(te) · 디테일(음별·곡 전체) · 펜(draw)
  function histCount(base, now) { const P = (js) => { try { return JSON.parse(js) || {}; } catch { return {}; } }; const a = P(base), b = P(now);
    const cnt = (A, B) => { const k = (x) => (x && Number.isFinite(+x.t0) ? Math.round(+x.t0 * 20) : JSON.stringify(x)), mA = new Map(), mB = new Map();
      for (const x of A || []) mA.set(k(x), (mA.get(k(x)) || "") + JSON.stringify(x)); for (const x of B || []) mB.set(k(x), (mB.get(k(x)) || "") + JSON.stringify(x));
      let n = 0; for (const key of new Set([...mA.keys(), ...mB.keys()])) if (mA.get(key) !== mB.get(key)) n++; return n; };
    const ga = (a.ne && a.ne.global) || {}, gb = (b.ne && b.ne.global) || {};
    let det = cnt(a.ne && a.ne.notes, b.ne && b.ne.notes) + cnt(ga.uv_fix, gb.uv_fix) + cnt(ga.uv_gain, gb.uv_gain);
    for (const k of new Set([...Object.keys(ga), ...Object.keys(gb)])) if (!["draw", "uv_fix", "uv_gain"].includes(k) && JSON.stringify(ga[k]) !== JSON.stringify(gb[k])) det++;
    return { fx: cnt(a.fx, b.fx), te: cnt(a.te, b.te), det, pen: cnt(ga.draw, gb.draw) }; }
  // (11/06 사용자 시안 A·B 승인) 전체화면을 나올 때 카드: 고친 게 있으면 '자동 저장됐어요 + 고친 곳·되돌리기 기록·소리 반영 안내' 6초 · 고친 게 없으면 안 띄움 · 저장 실패면 빨간 카드 + 다시 저장
  let exitEl = null;
  function exitCard(o, hist) {
    const c = hist && hist.base != null ? histCount(hist.base, (() => { try { return o.histGet(); } catch { return hist.base; } })()) : null;
    const n = c ? c.fx + c.te + c.det + c.pen : 0, ss = () => { try { return typeof o.saveState === "function" ? o.saveState() || {} : {}; } catch { return {}; } };
    if (!c) { saveToast(); return; }   // 되돌리기를 안 쓰는 화면은 예전 짧은 알림
    if (!n && !ss().fail) return;
    if (exitEl) exitEl.remove();
    const el = exitEl = document.createElement("div"); el.className = "tuneExit"; el.setAttribute("role", "status");
    const chip = (ic, lab, v) => (v ? `<span>${ic} ${lab} <b>${v}곳</b></span>` : "");
    const steps = hist.S.length - 1;
    let tm = null; const close = () => { clearTimeout(tm); el.remove(); if (exitEl === el) exitEl = null; document.removeEventListener("pointerdown", outside, true); };
    const outside = (e) => { if (!el.contains(e.target)) close(); };
    const paint = () => { const s = ss();
      if (s.fail) { clearTimeout(tm); el.className = "tuneExit bad";
        el.innerHTML = `<div class="teHd">⚠ 저장 못 한 고침이 있어요</div><div class="teLn">인터넷이 끊겼거나 저장이 안 됐어요 · 고친 내용은 앱을 닫기 전까지 남아 있어요 · 연결되면 <b>다시 저장</b>을 눌러 주세요</div><div class="teActs"><button type="button" data-x>나중에</button><button type="button" class="pri" data-retry>다시 저장</button></div>`;
        el.querySelector("[data-retry]").onclick = async (e) => { const b = e.currentTarget; b.disabled = true; b.textContent = "저장 중…"; try { await o.saveRetry(); } catch {} paint(); if (!ss().fail) { el.className = "tuneExit"; el.innerHTML = `<div class="teHd">✓ 저장됐어요</div>`; tm = setTimeout(close, 1800); } };
        el.querySelector("[data-x]").onclick = close; if (typeof o.saveRetry !== "function") el.querySelector("[data-retry]").remove(); return; }
      el.className = "tuneExit";
      el.innerHTML = `<div class="teHd">${s.busy ? "💾 저장 중…" : "✓ 자동 저장됐어요"}<small>방금 · 이 곡</small></div>
        <div class="teChips">${chip("🎵", "음정", c.fx)}${chip("📏", "타이밍·길이", c.te)}${chip("🎛", "디테일", c.det)}${chip("✏️", "펜", c.pen)}</div>
        ${steps > 0 ? `<div class="teLn">↶ 되돌리기 기록 <b>${steps}단계</b> — 다시 열어도 이어서 쓸 수 있어요</div>` : ""}
        <div class="teLn">🔊 완성본 소리에 넣으려면 <b>완성본 다시 만들기</b>를 눌러 주세요</div>
        <div class="teActs"><button type="button" data-x>닫기</button>${typeof o.remake === "function" ? `<button type="button" class="pri" data-mk>완성본 다시 만들기</button>` : ""}</div><i class="teBar"></i>`;
      el.querySelector("[data-x]").onclick = close; const mk = el.querySelector("[data-mk]"); if (mk) mk.onclick = () => { close(); try { o.remake(); } catch {} }; };
    document.body.appendChild(el); paint();
    const t0 = Date.now(); let busyT = null;   // 저장이 끝날 때까지 지켜보다가(최대 15초) 실패면 빨간 카드로 · 끝나면 6초 뒤 닫힘
    const watch = () => { if (!el.isConnected) return; const s = ss(); if (s.busy && Date.now() - t0 < 15000) { busyT = setTimeout(watch, 250); return; } paint(); if (!s.fail) { const b = el.querySelector(".teBar"); if (b) b.classList.add("go"); tm = setTimeout(close, 6000); } };
    watch(); setTimeout(() => document.addEventListener("pointerdown", outside, true), 0);
    return el; }
  function openFull(src, cv, getT, getLv, seek, o) {
    if (document.getElementById("tuneFs")) return;
    let histUI = () => {}; const hist = typeof o.histGet === "function" && typeof o.histSet === "function" ? mkHist(o, () => histUI()) : null; if (hist) o = hist.o;   // 되돌리기·다시하기
    const wrap = document.createElement("div"); wrap.id = "tuneFs"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "음정선 전체화면");
    const hasAb = typeof o.setMode === "function";
    wrap.innerHTML = `<div class="tfBox"><div class="tfTop"><b class="tfTitle">${String(o.title || "음정선").replace(/[<>&]/g, "")}</b><span class="tfTime"></span>
      <button type="button" class="tfX tfXp" aria-label="닫기"><i>✕</i>닫기</button><span class="tfBr"></span><span class="tfLeg"><span><i style="background:rgba(127,217,154,.6);height:8px"></i>정음</span><span><i style="background:#ffe066"></i>부른 음</span><span><i style="background:#7fd9ff"></i>보정 후</span><span class="tfLegC"><i style="background:#ffd27a;opacity:.6"></i>고친 곳</span></span>
      <button type="button" class="tfNoteChip" hidden aria-label="선생님 한마디 보기"><i class="tfCk" aria-hidden="true"></i>💬 한마디 <b></b></button>
      <button type="button" class="tfX" aria-label="닫기"><i>✕</i>닫기</button></div>
      <div class="tfCvBox"><canvas class="tfCv"></canvas><span class="tfMid" aria-hidden="true"></span><button type="button" class="tfSkip off">⏩ 노래 시작 1초 전으로</button><span class="tfBye" aria-live="polite">닫을 때는 <b>✕</b> 또는 폰의 <b>뒤로 가기</b></span></div>
      <div class="tfBot"><span class="tfHint">톡 = 재생·멈춤 · 좌우로 밀면 이동<span class="tfSep"> · </span><br>두 손가락으로 벌리면 확대 · 기준선 왼쪽·오른쪽 두 번 톡 = 2초 뒤로·앞으로<span class="tfSep"> · </span><br>${typeof o.onFix === "function" ? "건반 = 그 음 소리 · 멈춘 뒤 초록 정음 막대 톡 = 정음 고치기" : "왼쪽 건반을 누르면 그 음 소리"}</span>
      <span class="tfCtl">${hasAb ? `<span class="tfAbW"><span class="tfAbL">듣는 소리</span><span class="tfAb" role="group" aria-label="듣는 소리: 원음·보정본"><button type="button" data-m="o">🎤 원음</button><i class="tfSwap" aria-hidden="true">⇄</i><button type="button" data-m="p">✨ 보정본</button></span></span>` : ""}<span class="tfNav"><button type="button" data-j="0" aria-label="처음으로">⏮ 처음</button><button type="button" data-j="-5" aria-label="5초 뒤로">-5초</button><button type="button" class="tfPP" data-pp="1" aria-label="재생/일시정지">▶</button><button type="button" data-j="5" aria-label="5초 앞으로">+5초</button></span></span>
      <span class="tfNote">자동 단순 보정이라 정확하지 않을 수 있어요.<br>정식 음원은 전문 엔지니어가 한 음 한 음 더 정밀하게 다듬어요.</span></div></div>`;
    document.body.appendChild(wrap);
    wrap.style.opacity = "0"; requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(() => { wrap.style.transition = "opacity .18s ease"; wrap.style.opacity = "1"; }, 120)));   // (11/07 09:31 사용자 영상) 처음 0.2초 그래프·버튼이 자리 잡으며 움찔하던 걸 안 보이게: 자리 잡은 뒤 나타남
    wrap.addEventListener("dblclick", (e) => e.preventDefault());   // (11/03 10:50 아이패드) 버튼을 연타해도 화면이 확대되지 않게(확대는 두 손가락으로만)
    const box = wrap.querySelector(".tfBox"), cvEl = wrap.querySelector(".tfCv"), st = { full: true, xz: 1, yz: 1, yc: null, panAt: 0, notes: o.notes, teacher: !!o.teacher, lvDef: o.lvDef, wave: o.wave }; wrap._st = st;   /* 시험·점검용(화면 상태 읽기) */
    const rot = false;   // (10/30 17:51 사용자) 가로도 남김 — 세로로 들면 세로, 폰을 돌리면 가로
    const layout = () => { const W = G.innerWidth, H = G.innerHeight, port = H > W;
      box.style.width = W + "px"; box.style.height = H + "px"; box.style.transform = "translate(-50%,-50%)";
      box.classList.toggle("port", port); st.win = port ? 3 : 6;
      // (11/03 17:49 사용자) 아이패드처럼 큰 화면에선 버튼이 너무 작음 → 화면 짧은 쪽 길이에 맞춰 위·아래 버튼 줄을 키움(폰 = 그대로, 최대 1.5배)
      box.style.setProperty("--ui", Math.min(1.5, Math.max(1, Math.min(W, H) / 480)).toFixed(3)); };
    layout();
    try {   // 열 때: 카드 자리에서 커지며 돌아감
      const r = src.getBoundingClientRect(), W = parseFloat(box.style.width), s = Math.max(0.2, r.width / W);
      const dx = r.left + r.width / 2 - G.innerWidth / 2, dy = r.top + r.height / 2 - G.innerHeight / 2;
      box.animate([{ transform: `translate(-50%,-50%) translate(${dx}px,${dy}px) scale(${s})`, opacity: 0.6 }, { transform: box.style.transform, opacity: 1 }],
        { duration: 420, easing: "cubic-bezier(.3,.7,.2,1)" });
    } catch {}
    // 크롬 '진짜 전체화면'은 쓰지 않음(크롬 회색 안내가 뜨므로, 10/30 14:52 사용자) — 앱 화면 안에서 가득. 뒤로 가기 = 닫기
    G.addEventListener("resize", layout); G.addEventListener("orientationchange", layout);
    try { history.pushState(Object.assign({}, history.state || {}, { tuneFs: true }), ""); } catch {}
    const bye = wrap.querySelector(".tfBye"); bye && bye.remove();   // (10/30 19:46 사용자) '닫을 때는…' 안내 없앰
    // (10/30 17:18 사용자) 가로 회전 안내는 없앰 — 주석 2층은 세로가 더 편함
    // (10/30 17:51 사용자 시안 승인) 수강생: 선생님이 확인한 주석이 있으면 열 때 2.5초 안내 — 레슨마다 처음 두 번만, 톡 하면 닫힘
    // (10/30 21:51 사용자) 원음/보정본 비교 안내도 같이 · 3.5초
    const tipN = o.tip && (typeof o.notes === "function" ? (o.notes() || []).length : 0), tipL = [tipN ? o.tip : "", o.tipAb || ""].filter(Boolean);
    if (tipL.length) { let n = 0; const key = "tune_tip_" + String(o.tipKey || o.title || "").slice(0, 80);
      try { n = +(localStorage.getItem(key) || 0); } catch {}
      if (n < 2) { try { localStorage.setItem(key, String(n + 1)); } catch {}
        const rp = document.createElement("div"); rp.className = "tfRot"; rp.setAttribute("role", "status");
        rp.innerHTML = `<div class="rpBox"><div style="font-size:38px;margin-bottom:6px" aria-hidden="true">🎤</div><p style="font-size:15px;color:#f1f1f1;line-height:1.5;word-break:keep-all"></p><div class="rpBar"><i style="animation-duration:3.5s"></i></div></div>`;
        const pe = rp.querySelector("p"); tipL.forEach((s, i) => { if (i) pe.appendChild(document.createElement("br")), pe.appendChild(document.createElement("br")); pe.appendChild(document.createTextNode(String(s))); });
        const shut = () => { if (!rp.isConnected) return; rp.classList.add("out"); setTimeout(() => rp.remove(), 300); };
        rp.addEventListener("pointerdown", (e) => { e.stopPropagation(); shut(); });
        bye && bye.remove();   // 안내가 겹치지 않게 '닫을 때는…'은 이번엔 생략
        setTimeout(() => { if (!wrap.isConnected) return; wrap.appendChild(rp); setTimeout(shut, 3500); }, 400); } }
    const done = () => { if (hist) { hist.keep(true); try { document.removeEventListener("visibilitychange", hidKeep); } catch {} } exitCard(o, hist); try { document.removeEventListener("keydown", st.onKey); } catch {} G.removeEventListener("resize", layout); G.removeEventListener("orientationchange", layout); wrap.remove(); if (fsClose === done) fsClose = null; };
    fsClose = done;
    const hidKeep = () => { if (document.visibilityState === "hidden" && hist) hist.keep(true); };   // 앱을 내리거나 꺼도 기록 보관
    if (hist) document.addEventListener("visibilitychange", hidKeep);
    const close = () => { const sh = !!sheetClose, nl = dropL(); if (sh) sheetClose(true); done(); try { if (history.state && history.state.tuneFs) { skipPop = true; history.go(-1 - nl - (sh && history.state.tuneSheet ? 1 : 0)); } } catch {} };   // 주석 창·팁 목록이 열린 채 닫으면 그 기록까지 같이 정리
    wrap.querySelectorAll(".tfX").forEach(b => b.onclick = close);
    const tm = wrap.querySelector(".tfTime"), mid = wrap.querySelector(".tfMid"), skipB = wrap.querySelector(".tfSkip");
    skipB.addEventListener("pointerdown", (e) => e.stopPropagation());
    skipB.onclick = () => { if (st.gapNext != null) { st.panAt = 0; try { seek(Math.max(0, st.gapNext - 1), typeof o.paused === "function" ? o.paused() : true); } catch {} } };
    const isPaused = () => (typeof o.paused === "function" ? o.paused() : true); st.isPaused = isPaused; st.onAddRange = typeof o.onAdd === "function" ? (a, b) => o.onAdd(a, b) : null; st.buMode = typeof o.onTime === "function" && typeof o.onFix === "function";   // (11/06 22:54) 기본 모드도 음표 손잡이·잡고 끌기·꾹 미세(고급과 같은 손짓)
    // 가운데 표시: 멈추면 ❚❚가 살짝 튀어나와 머묾, 재생하면 ▶가 잠깐 떴다가 사라짐(10/30 14:27 사용자)
    const showMid = (kind) => { mid.textContent = kind === "pause" ? "❚❚" : kind === "back" ? "⏪" + DT_JUMP : kind === "fwd" ? DT_JUMP + "⏩" : "▶"; mid.className = "tfMid " + (kind === "pause" ? "stay" : "flash"); void mid.offsetWidth; mid.classList.add("go"); };
    st.voice = typeof o.voice === "function" ? o.voice : null;
    st.onTime = typeof o.onTime === "function" ? o.onTime : null;
    // (11/04 17:41 사용자) 기본 = '기본 보정 모드'. '고급 보정 모드'는 원장·원장이 열어 준 강사에게만 버튼이 보이고, 눌러야 켜짐(adv.js)
    st.onAdv = typeof o.onAdv === "function" && G.TuneAdv ? o.onAdv : null; st.advGet = o.advGet; st.engGet = typeof o.engGet === "function" ? o.engGet : null; st.engSet = o.engSet; st.engPlay = o.engPlay; st.title = o.title; st.advOn = false; if (st.fixMode === "a") st.fixMode = "p";
    st.ghostOn = typeof o.onFix === "function";   // 회색 막대는 고칠 수 있는 화면(선생님)에서만
    st.noteShow = false;   // 보정본에서 [💬 주석]으로 켜 둔 동안은 계속 보임(이 화면을 닫을 때까지)
    st.o = o; st.mMode = false; st.msel = null;   // (11/03 13:08) 타이밍·길이 고치기(선생님 메이크업 화면만)
    const popP = { host: null, cvEl, st, o, popEls: new Map(), pause: () => pauseNow(), edit: (nn) => { lastView = view; o.onNote(nn); } };
    const popSync = () => { popP.host = wrap.querySelector(".tfCvBox"); popSyncF(popP); };
    st.playSeg = (t0, t1) => { st.panAt = 0; try { seek(Math.max(0, t0 - 0.05), true); } catch {} if (isPaused()) toggle(); st.stopAt = t1 + 0.05; };   // (11/03 10:50 사용자) 멜로다인처럼 그 음 구간만 듣기
    const toggle = () => { st.stopAt = 0; const was = isPaused(); try { o.play && o.play(); } catch {} showMid(was ? "play" : "pause"); if (was) { st.panAt = 0; st.waitAt = performance.now(); } else st.waitAt = 0; };   // (11/02 20:31) 눌렀는데 아직 안 나오면 '불러오는 중' 표시
    const pauseNow = () => { if (!isPaused()) { try { o.play && o.play(); } catch {} } showMid("pause"); };
    st.snapNote = () => snapNote();   // 고치기 창 🧲 단추
    const snapNote = () => {   // 부른 음(가운데값)에 가장 가까운 음계 음으로 정음을 맞추고, 그 음 흐름을 평평하게(멜로다인 두 번 클릭처럼)
      const b = st.sel; if (!b || !st.snapSel) return; const sung = (cv.pts || []).filter(p => p[0] >= b.t0 && p[0] <= b.t1 && p[1] != null).map(p => p[1]).sort((x, y) => x - y);
      if (sung.length < 3) { undo("부른 음이 너무 짧아 맞출 수 없어요"); return; }
      const med = sung[sung.length >> 1] / 100, sc = cv.scale, c = [Math.floor(med) - 1, Math.floor(med), Math.ceil(med), Math.ceil(med) + 1].filter(x => !sc || sc.includes(((x % 12) + 12) % 12));
      const mm = (c.length ? c : [Math.round(med)]).sort((x, y) => Math.abs(x - med) - Math.abs(y - med))[0];
      const was = st.snapSel(mm); try { if (G.TuneAdv && G.TuneAdv.flatNote) { G.TuneAdv.flatNote(st, cv, b); if (st.advRepaint) st.advRepaint(); } } catch {}   // 아래 '흐름' 칸도 0%로 다시 그림
      undo(`${noteName(mm)}에 맞추고 흐름을 평평하게 했어요`, () => { try { if (st.snapSel) st.snapSel(was); G.TuneAdv.undoLast(st, cv); } catch {} }); };
    const showUv = (k) => { try { undo(`이 자리 = ${({ s: "치찰음(ㅅ·ㅊ)", b: "호흡", n: "아님(보통 소리)" })[k] || k} · 한 번 더 톡 = 다음 이름`, () => { try { G.TuneAdv.undoLast(st, cv); } catch {} }); } catch {} };
    let lastTap = 0;
    if (isPaused()) setTimeout(() => showMid("pause"), 430);   // 처음 열었을 때 멈춰 있으면 ❚❚ 대기
    const resetZoom = () => { st.xz = 1; st.yz = 1; st.yc = null; st.yo = 0; st.panAt = 0; };
    const endT = () => { const p = cv && cv.pts; return p && p.length ? +p[p.length - 1][0] || 0 : 1e9; };
    wrap.querySelectorAll("[data-j]").forEach(b => b.onclick = () => {   // 처음 / -5초 / +5초(10/30 14:49 사용자) — 재생 중이면 계속, 멈춰 있으면 멈춘 채
      const j = +b.dataset.j, now = +getT() || 0, t = j === 0 ? 0 : Math.max(0, Math.min(endT(), now + j));
      st.panAt = 0; try { seek(t, isPaused()); } catch {} });
    wrap.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { try { const cur = o.mode ? o.mode() : "p", want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m; o.setMode(want); } catch {} });   // (11/02 19:30) 켜진 쪽을 눌러도 바뀜(진짜 스위치)
    const nChip = wrap.querySelector(".tfNoteChip");
    if (st.onAdv) {   // 위 줄: [🎛 고급 보정] → 켜면 [🎛 곡 전체][기본으로]
      try { G.TuneAdv.preview(cv, G.TuneAdv.state(st).ne); } catch {}
      const xb = wrap.querySelector(".tfTop .tfX:not(.tfXp)") || wrap.querySelector(".tfTop .tfX"), mk = (cls, txt) => { const b = document.createElement("button"); b.type = "button"; b.className = "tfAdvG " + cls; b.textContent = txt; b.addEventListener("pointerdown", (e) => e.stopPropagation()); xb.parentNode.insertBefore(b, xb); return b; };
      // (11/05 사용자 '추천모드로 진행') [👂 확인 | 🎛 보정] 두 칸 토글 · 보정 모드에서만 일괄 보정·치찰음/호흡 · 원음/보정본 스위치는 두 모드 모두 그대로 · 모드를 바꿔도 재생 위치·확대·선택은 그대로
      const seg = document.createElement("span"); seg.className = "tfModeSeg"; seg.setAttribute("role", "group"); seg.setAttribute("aria-label", "고급 보정");
      seg.innerHTML = `<button type="button" data-md2="1" class="tfAdvOne" aria-label="고급 보정 켜기·끄기">🎛 고급</button>`; /* (11/06 22:49 사용자) [확인|보정] 두 칸 → [🎛 고급] 한 개(누르면 켜짐·다시 누르면 기본) */ seg.addEventListener("pointerdown", (e) => e.stopPropagation()); xb.parentNode.insertBefore(seg, xb); { const br = document.createElement("i"); br.className = "tfBrk"; br.setAttribute("aria-hidden", "true"); xb.parentNode.insertBefore(br, xb); }   /* (11/07 09:43 사용자) 세로 고급: 위 줄 [고급] … [닫기] · 아래 줄 [일괄 보정][펜][박자] · 시간·배율 글자 없앰 */
      const gl = mk("advGlB", "🎛 일괄 보정"), pen = mk("advPenB", "✏️ 펜"), bt = mk("advBeatB", "🥁 박자");
      const nbB = typeof o.notes === "function" ? mk("advNoteB", "💬 한마디") : null;
      try { st.advNotes = localStorage.getItem("tune_adv_notes") !== "0"; } catch { st.advNotes = true; }
      if (nbB) { nbB.innerHTML = `<i aria-hidden="true"></i>💬 한마디`; nbB.onclick = () => { st.advNotes = !st.advNotes; try { localStorage.setItem("tune_adv_notes", st.advNotes ? "1" : "0"); } catch {} if (!st.advNotes) st.popPin = null; paintAdv(); }; }
      bt.onclick = () => { if (!(cv.beats && cv.beats.t && cv.beats.t.length)) { undo("이 곡은 아직 박자 정보가 없어요 · 완성본을 다시 만들면 생겨요(반주가 있는 곡)", null, 4500, "확인"); return; }
        st.beatOn = !st.beatOn; if (st.beatOn) undo(`박자 ${Math.round(cv.beats.bpm)}BPM · 음 끝을 끌어 옮기면 시작이 가까운 박에 붙어요${cv.beats.conf < 0.3 ? " · 박 찾기가 불확실한 곡이에요" : ""}`, null, 4500, "확인"); paintAdv(); };   // (11/06) 박자 격자·맞춤
      pen.setAttribute("aria-pressed", "false");
      const paintAdv = () => { gl.hidden = !st.advOn; pen.hidden = !st.advOn; bt.hidden = !st.advOn; if (nbB) { nbB.hidden = !st.advOn || !((o.notes() || []).length); nbB.classList.toggle("on", !!st.advNotes); nbB.setAttribute("aria-pressed", st.advNotes ? "true" : "false"); } bt.classList.toggle("on", !!st.beatOn); bt.setAttribute("aria-pressed", st.beatOn ? "true" : "false"); if (!st.advOn) st.penTool = false; pen.classList.toggle("on", !!st.penTool); pen.setAttribute("aria-pressed", st.penTool ? "true" : "false"); pen.textContent = st.penTool ? "✏️ 그리는 중 · 끝" : "✏️ 펜"; wrap.classList.toggle("advOn", st.advOn);
        seg.querySelectorAll("[data-md2]").forEach(x => { const on_ = !!st.advOn; x.classList.toggle("on", on_); x.setAttribute("aria-pressed", on_ ? "true" : "false"); x.textContent = on_ ? "🎛 고급 켜짐" : "🎛 고급"; }); };
      st.dock = () => { if (!st.advOn || typeof st.onTime !== "function" || !st.onAdv || !G.TuneAdv || wrap.querySelector(".tfFix")) return;   // (11/05 사용자) 보정 모드 = 늘 떠 있는 고치기 창(음을 안 골랐으면 안내만)
        const bt = wrap.querySelector(".tfBot"); if (!bt) return; const dk = document.createElement("div"); dk.className = "tfFix inBot tfUni tfDock";
        dk.innerHTML = `<div class="tfFixBox"><p class="tfDockMsg">초록 음표를 누르면 여기서<br>음정 · 타이밍 · 고급을 한꺼번에 고쳐요</p></div>`; dk.addEventListener("pointerdown", (e) => e.stopPropagation()); bt.appendChild(dk); };
      const advGuide = (force) => {   // (11/06 16:36 사용자) 보정 모드 처음 들어오면 손짓 안내 한 번(일괄 보정 창에서 다시 보기)
        try { if (!force && localStorage.getItem("tune_adv_guide_v1") === "1") return; } catch {}
        wrap.querySelectorAll(".tfGuide").forEach(x => x.remove()); const gd = document.createElement("div"); gd.className = "tfRot tfGuide"; gd.setAttribute("role", "dialog"); gd.setAttribute("aria-label", "보정 모드 손짓");
        gd.innerHTML = `<div class="rpBox gdBox"><b style="font-size:16px">🎛 보정 모드 손짓</b><ol class="gdL"><li><span>초록 음 톡</span><em>음 고르기</em></li><li><span>↕ 잡자마자 위아래</span><em>반음씩</em></li><li><span>꾹 0.6초(진동) → 위아래</span><em>미세 조절</em></li><li><span>두 번 톡</span><em>가까운 음에 착</em></li><li><span>양 끝 ‹ › 꾹 0.6초 → 좌우</span><em>앞·뒤 길이</em></li><li><span>두 손가락</span><em>확대 · 이동</em></li></ol><p class="gdS">고른 음 옆에도 안내가 떠요 · 두 번씩 써 보면 사라져요</p><button type="button" class="rpOk">알겠어요</button></div>`;
        const gone = () => { try { localStorage.setItem("tune_adv_guide_v1", "1"); } catch {} gd.classList.add("out"); setTimeout(() => gd.remove(), 300); };
        const ly = G.Brand && G.Brand.layer ? G.Brand.layer(gone) : { close: gone };   // 뒤로 가기 = 이 안내만 닫기
        gd.addEventListener("pointerdown", (e) => e.stopPropagation()); gd.addEventListener("click", (e) => { if (e.target === gd || e.target.closest(".rpOk")) ly.close(); }); wrap.appendChild(gd); };
      st.advGuide = () => { learnReset(); advGuide(true); };
      const landTip = () => { if (!wrap.querySelector(".tfBox.port") || Math.min(G.innerWidth, G.innerHeight) > 700) return;   // (11/05 사용자) 폰을 세로로 들고 보정 모드로 들어가면 안내 팝업 — '다시 보지 않기' 체크하면 이후 안 뜸
        try { if (localStorage.getItem("tune_land_tip_off") === "1") return; } catch {}
        wrap.querySelectorAll(".tfLandTip").forEach(x => x.remove()); const rp = document.createElement("div"); rp.className = "tfRot tfLandTip"; rp.setAttribute("role", "dialog");
        rp.innerHTML = `<div class="rpBox"><div class="rpPh" aria-hidden="true"><b><i></i></b><u>↺</u></div><p style="font-size:15px;color:#f1f1f1;line-height:1.5;word-break:keep-all">폰에선 가로 모드가 보정 시 더 편리할 수 있어요</p><label class="rpNo"><input type="checkbox" class="rpNoCk"> 다시 보지 않기</label><button type="button" class="rpOk">확인</button></div>`;
        const shut = () => { if (!rp.isConnected) return; try { if (rp.querySelector(".rpNoCk").checked) localStorage.setItem("tune_land_tip_off", "1"); } catch {} rp.classList.add("out"); setTimeout(() => rp.remove(), 300); };
        rp.addEventListener("pointerdown", (e) => { e.stopPropagation(); }); rp.addEventListener("click", (e) => { if (e.target === rp || e.target.closest(".rpOk")) shut(); }); wrap.appendChild(rp); };
      seg.querySelectorAll("[data-md2]").forEach(x => x.onclick = () => { const v = !st.advOn; st.advOn = v; if (st.fixMode === "a") st.fixMode = "p";
        // (11/06 15:32 사용자) 음을 고른 채 확인↔보정을 바꾸면 그 음의 고치기 창이 새 모드로 바로 열림(다른 음을 눌렀다 다시 누를 필요 없이)
        const keep = st.sel && st._selBar && typeof o.onFix === "function" && wrap.querySelector(".tfFix:not(.tfDock):not(.tfMulti)") ? st._selBar : null;
        paintAdv(); if (sheetClose && (keep || wrap.querySelector(".tfMulti"))) { try { sheetClose(); } catch {} } wrap.querySelectorAll(".tfFix").forEach(y => y.remove());
        if (keep) { try { fixSheet(wrap, cv, keep, o.onFix, getT, st); } catch (e) { console.warn("고치기 창", e); } if (v) { landTip(); if (!wrap.querySelector(".tfLandTip")) advGuide(); } } else if (v) { landTip(); if (!wrap.querySelector(".tfLandTip")) advGuide(); st.dock && st.dock(); } });
      pen.onclick = () => { st.penTool = !st.penTool; st.penPts = null; if (st.penTool) { pauseNow(); undo("음정선 위에 그리면 그 구간 음높이가 그린 대로 · 그린 선을 톡 = 지우기", null, 4500, "확인"); } paintAdv(); };   // (11/06) 펜으로 그리기
      gl.onclick = () => { try { G.TuneAdv.globalSheet(wrap.querySelector(".tfBox") || wrap, st, cv); } catch (e) { console.warn("고급 보정", e); } };
      paintAdv(); }
    const editGo = typeof o.onFix !== "function" && typeof o.onEdit === "function" ? () => { const t = +getT() || 0; close(); try { o.onEdit(t); } catch (e) { console.warn("편집", e); } } : null;
    if (editGo) {   // (11/05 00:14 사용자 '고급 버튼이 어디 있냐') 고치기 기능이 없는 전체화면(레슨 '오늘의 베스트')에서 → 음표 고치기 화면으로
      const xb = wrap.querySelector(".tfTop .tfX:not(.tfXp)") || wrap.querySelector(".tfTop .tfX"), b = document.createElement("button");
      b.type = "button"; b.className = "tfAdvG tfEditB"; b.textContent = "✏️ 음표 고치기"; b.addEventListener("pointerdown", (e) => e.stopPropagation()); b.onclick = editGo;
      if (xb && xb.parentNode) xb.parentNode.insertBefore(b, xb); }
    if (hist) {   // ↶ ↷ (톡 = 한 단계, 길게 = 작업 기록 창)
      const xb = wrap.querySelector(".tfTop .tfX:not(.tfXp)") || wrap.querySelector(".tfTop .tfX"), ur = document.createElement("span"); ur.className = "tfUR"; ur.setAttribute("role", "group"); ur.setAttribute("aria-label", "되돌리기·다시하기");
      ur.innerHTML = `<button type="button" data-ur="-1" aria-label="되돌리기">↶</button><button type="button" data-ur="1" aria-label="다시하기">↷</button>`; ur.addEventListener("pointerdown", (e) => e.stopPropagation());
      const ub = ur.querySelector('[data-ur="-1"]'), rb = ur.querySelector('[data-ur="1"]'), abw = wrap.querySelector(".tfAbW");
      // (11/07 09:16 사용자) '고친 곳 미리듣기 (근사) ⓘ' 안내 팝업 대신 → 고치고 나면 바로 들어 보는 버튼: 마지막으로 고친 곳 1.5초 앞부터 보정본으로, 그 음 끝 1초 뒤 멈춤
      hist.selGet = () => (st.sel && Number.isFinite(st.sel.t0) ? [st.sel.t0, st.sel.t1 ?? st.sel.t0] : null);
      const PV_PRE = 1.5, PV_POST = 1, PV_SHOW = 6000;
      st.advBadge = () => { const L = hist.last, n = hist.ptr, host = wrap.querySelector(".tfCvBox"); let el = wrap.querySelector(".tfAdvPv");
        if (!L || n < 1 || !host) { if (el) el.remove(); return; }
        if (!el) { el = document.createElement("button"); el.type = "button"; el.className = "tfAdvPv"; el.setAttribute("aria-live", "polite"); el.addEventListener("pointerdown", (e) => e.stopPropagation()); host.appendChild(el); el.onclick = () => st.pvJump(); }
        const on = !!st.pvJ && !isPaused();
        el.classList.toggle("play", on);
        el.innerHTML = on ? `<span class="ic">❚❚</span>고친 곳 듣는 중` : `<span class="ic">▶</span>방금 고친 곳 듣기<small>${n > 1 ? `고친 ${n}곳` : `${PV_PRE}초 전부터`}</small>`;
        if (L.at !== el._at) { el._at = L.at; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); clearTimeout(st.pvHideT); st.pvHideT = setTimeout(() => { try { st.advBadge(); } catch {} }, PV_SHOW + 50); }
        el.classList.toggle("gone", !on && performance.now() - L.at > PV_SHOW); };   // (11/09 00:40 사용자 '거의 계속 떠 있음') 고친 뒤 6초만 보이고 사라짐 · 다시 고치면 또 나옴
      st.pvJump = () => { const L = hist.last; if (!L) return;
        if (st.pvJ && !isPaused()) { st.pvJ = 0; st.stopAt = 0; pauseNow(); st.advBadge(); return; }   // 듣는 중 다시 누르면 멈춤
        try { if (typeof o.mode === "function" && typeof o.setMode === "function" && o.mode() !== "p") o.setMode("p"); } catch {}   // 원음이었으면 보정본으로
        st.playSeg(Math.max(0, L.t0 - PV_PRE) + 0.05, L.t1 + PV_POST); st.pvJ = 1; st.advBadge();
        clearInterval(st.pvJT); st.pvJT = setInterval(() => { if (!wrap.isConnected || isPaused()) { clearInterval(st.pvJT); st.pvJ = 0; try { st.advBadge(); } catch {} } }, 200); };
      { const onPv = () => { if (!wrap.isConnected) { document.removeEventListener("advpv", onPv); return; } st.advBadge(); }; document.addEventListener("advpv", onPv); st.advBadge(); }
      if (abw) { const row = document.createElement("span"); row.className = "tfAbRow"; abw.before(row); row.append(ub, abw, rb); [ub, rb].forEach(x => x.addEventListener("pointerdown", (e) => e.stopPropagation())); }   // (11/05 사용자) 원음|보정본은 붙인 채 폭만 줄이고, 좌 ↶ · 우 ↷
      else { const sg = wrap.querySelector(".tfModeSeg"); if (sg) sg.after(ur); else xb.parentNode.insertBefore(ur, xb); }
      const tip = (t) => { const cb = wrap.querySelector(".tfCvBox"); if (!cb) return; cb.querySelectorAll(".tfUTip").forEach(x => x.remove()); const el = document.createElement("div"); el.className = "tfFixTip tfUTip"; el.textContent = t; cb.appendChild(el); setTimeout(() => el.remove(), 1700); };
      let histEl = null;
      // (11/06 17:03 사용자) 되돌리기·다시하기 = 바뀐 음을 바로 골라 보여 줌(한 음 = 고치기 창, 여러 음 = 여러 음 고르기)
      const histSnap = () => ({ fx: (cv._fixes || []).map(x => JSON.stringify(x)), te: (cv._tedits || []).map(x => JSON.stringify({ t0: x.t0, t1: x.t1, nt0: x.nt0, nt1: x.nt1 })),
        ne: ((st._adv && st._adv.ne.notes) || (typeof st.advGet === "function" ? ((st.advGet() || {}).notes || []) : [])).map(x => JSON.stringify(x)) });
      const histDiff = (a, b) => { const out = []; for (const k of ["fx", "te", "ne"]) { const A_ = new Set(a[k]), B_ = new Set(b[k]);
        for (const x of [...a[k].filter(v => !B_.has(v)), ...b[k].filter(v => !A_.has(v))]) { try { const o_ = JSON.parse(x); if (Number.isFinite(o_.t0) && Number.isFinite(o_.t1)) out.push([o_.t0, o_.t1]); } catch {} } }
        out.sort((x, y) => x[0] - y[0]); const m_ = []; for (const r of out) { const L_ = m_[m_.length - 1]; if (L_ && r[0] <= L_[1] + 0.02) L_[1] = Math.max(L_[1], r[1]); else m_.push(r.slice()); } return m_; };
      const selectChanged = (rs) => { if (!rs.length) return; const a = rs[0][0], b = rs[rs.length - 1][1], vis = st.map ? st.map.W8 : 6;
        if (!(st.map && a >= st.map.t0 + 0.4 && b <= st.map.t0 + st.map.W8 - 0.4)) { try { seek(Math.max(0, a - Math.min(1, vis * 0.2) + vis * HEAD), true); } catch {} }   // 바뀐 음이 화면 안에 다 들어오게(가장자리에서 잘리면 일부만 골라짐)
        // (11/06 18:02 사용자) 바로 고르기: 저장(인터넷)을 기다리지 않고 다음 그림 두 장(약 0.03초) 뒤 — 막대가 새 음 높이로 다시 그려진 뒤에 고름 · 소리 없이
        const raf = G.requestAnimationFrame ? (f) => G.requestAnimationFrame(f) : (f) => setTimeout(f, 16);
        raf(() => raf(() => { const bars = (st.tbars || []).filter(x => x.t1 > a + 0.005 && x.t0 < b - 0.005); st._quiet = true;
          try { if (rs.length === 1 && bars.length === 1 && typeof o.onFix === "function") { try { fixSheet(wrap, cv, bars[0], o.onFix, getT, st); } catch {} return; }
          if (typeof o.onResetRange === "function") { st.msel = [a, b]; try { multiSheet(wrap, cv, st, false, true); } catch {} }
          else if (bars[0] && typeof o.onFix === "function") { try { fixSheet(wrap, cv, bars[0], o.onFix, getT, st); } catch {} } } finally { st._quiet = false; } })); };
      const paintHist = () => { if (!histEl) return; const ol = histEl.querySelector("ol"); ol.innerHTML = ""; for (let i = hist.S.length - 1; i >= 0; i--) { const li = document.createElement("li"), b = document.createElement("button"); b.type = "button"; b.dataset.i = i;
          b.className = i === hist.ptr ? "cur" : i > hist.ptr ? "fut" : ""; b.textContent = (i === hist.ptr ? "✓ " : "") + hist.L[i]; li.appendChild(b); ol.appendChild(li); } };
      histUI = () => { ub.disabled = !hist.canU(); rb.disabled = !hist.canR(); paintHist(); try { st.advBadge(); } catch {} };
      const closeHist = () => { if (histEl) { histEl.remove(); histEl = null; } };
      const openHist = () => { closeHist(); histEl = document.createElement("div"); histEl.className = "tfHist"; histEl.setAttribute("role", "dialog"); histEl.setAttribute("aria-label", "작업 기록");
        histEl.innerHTML = `<div class="tfHistBox"><div class="tfHistHd"><b>작업 기록</b><span>누르면 그 시점으로</span><button type="button" class="tfHistX" aria-label="닫기">✕</button></div><ol></ol></div>`;
        histEl.addEventListener("pointerdown", (e) => e.stopPropagation()); (wrap.querySelector(".tfBox") || wrap).appendChild(histEl);
        const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => { if (histEl) { histEl.remove(); histEl = null; } }) : { close: closeHist };
        histEl.addEventListener("click", (e) => { if (e.target === histEl || e.target.closest(".tfHistX")) { ly.close(); return; } const b = e.target.closest("[data-i]"); if (b) step(+b.dataset.i); });
        paintHist(); const cur = histEl.querySelector(".cur"); if (cur) cur.scrollIntoView({ block: "nearest" }); };
      const step = async (i) => { try { if (sheetClose) sheetClose(); } catch {} if (i > hist.S.length - 1) i = hist.S.length - 1;   // 열린 고치기 창이 있으면 먼저 닫음(대기 중인 저장도 기록에 들어감)
        const from = hist.ptr, snap0 = histSnap(); if (!(await hist.go(i))) return;
        if (st.onAdv && G.TuneAdv) { st._adv = null; try { G.TuneAdv.preview(cv, G.TuneAdv.state(st).ne); } catch {} }
        st.sel = null; tip(i < from ? `↶ ${hist.L[from]} 취소` : `↷ ${hist.L[i]} 다시`);
        try { selectChanged(histDiff(snap0, histSnap())); } catch (e) { console.warn("되돌린 음 고르기", e); } };
      [ub, rb].forEach(b => { let tm_ = null, fired = false; const stop = () => { clearTimeout(tm_); tm_ = null; };
        b.addEventListener("pointerdown", (e) => { e.preventDefault(); fired = false; try { b.setPointerCapture(e.pointerId); } catch {} tm_ = setTimeout(() => { fired = true; tm_ = null; try { navigator.vibrate && navigator.vibrate(15); } catch {} openHist(); }, 500); });
        b.addEventListener("pointerup", () => { const f_ = fired; stop(); if (!f_ && !b.disabled) step(hist.ptr + +b.dataset.ur); });
        ["pointercancel", "lostpointercapture"].forEach(ev => b.addEventListener(ev, stop)); b.onclick = (e) => { if (e.detail === 0 && !b.disabled) step(hist.ptr + +b.dataset.ur); }; b.addEventListener("contextmenu", (e) => e.preventDefault()); });
      histUI(); }
    if (nChip) { nChip.addEventListener("pointerdown", (e) => e.stopPropagation()); nChip.onclick = () => { st.noteShow = !st.noteShow; }; }
    const ppB = wrap.querySelector("[data-pp]"); if (ppB) ppB.onclick = () => toggle();   // (10/31 08:11 사용자) 재생/일시정지 버튼
    const fmt = (x) => `${Math.floor((x || 0) / 60)}:${String(Math.floor((x || 0) % 60)).padStart(2, "0")}`;
    // 손가락: 한 손가락 좌우 = 시간 이동(재생은 멈춤, 가운데 ▶로 다시), 위아래 = 음 높이 이동(확대했을 때), 두 손가락 = 핀치 확대, 톡 = 재생/멈춤
    const hitBar = (le) => { if (!st.tbars || !st.tbars.length) return null; let best = null, bd = 1e9;   // 가장 가까운 정음 막대(위아래 22px·좌우 8px 안)
      for (const b of st.tbars) { if (le.x < b.x0 - 8 || le.x > b.x1 + 8) continue; const dy = Math.abs(le.y - b.y); if (dy <= Math.max(22, b.h) && dy < bd) { bd = dy; best = b; } } return best; };
    let armEl = null; const armTip = (on) => { if (armEl) { armEl.remove(); armEl = null; } if (!on) return; const cb = wrap.querySelector(".tfCvBox"); if (!cb) return;
      armEl = document.createElement("div"); armEl.className = "tfFixTip"; armEl.textContent = "떼면 새 주석 · 그대로 좌우로 끌면 여러 음 고르기"; cb.appendChild(armEl); };
    const hitT = (le) => { for (const b of st.tebars || []) if (le.x >= b.x0 - 8 && le.x <= b.x1 + 8 && Math.abs(le.y - b.y) <= Math.max(22, b.h)) return b; return null; };   // 타이밍 고친 막대(새 자리)
    const loc = (cx, cy, r) => (rot ? { x: cy - r.top, y: r.right - cx } : { x: cx - r.left, y: cy - r.top });   // 돌린 화면에서도 캔버스 안 좌표
    const along = (e) => (rot ? e.clientY : e.clientX), across = (e) => (rot ? e.clientX : e.clientY);
    const span = () => (cvEl.clientWidth - 44) || 1, tall = () => cvEl.clientHeight || 1;
    const pts = new Map(); let drag = null, pinch = null, preview = null;
    const view = mkView(st, () => preview, (v) => { preview = v; }, getT, seek);
    cvEl.style.touchAction = "none"; cvEl.addEventListener("contextmenu", (e) => e.preventDefault());
    cvEl.style.webkitTouchCallout = "none"; cvEl.style.userSelect = "none"; cvEl.style.webkitUserSelect = "none";
    cvEl.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });   // (11/06 16:13 사용자) 건반 등 꾹 눌러도 폰 진동(길게 누르기 반응) 없게
    // 여러 음 고르기 중 가장자리 자동 스크롤: 끝 32px 안에 손가락이 있으면 50ms마다 화면 폭의 2.5%씩(끝에 가까울수록 빠르게) 시간을 밀고, 고른 구간을 그만큼 늘림 · 뗄 때 그 자리로 이동(재생은 안 함)
    const edgeAuto = (d) => { const mp = st.map; if (!mp) return; const ZN = 32, x = d.lx;
      d.v = x > mp.w - ZN ? Math.min(1, (x - (mp.w - ZN)) / ZN) : x < mp.L + ZN ? -Math.min(1, (mp.L + ZN - x) / ZN) : 0;
      if (!d.v) { clearInterval(d.auto); d.auto = null; return; }
      if (d.auto) return;
      d.auto = setInterval(() => { const m2 = st.map; if (drag !== d || !m2 || !d.v) { clearInterval(d.auto); d.auto = null; return; }
        const cur = preview ?? (+getT() || 0); preview = Math.max(0, Math.min(endT(), cur + d.v * m2.W8 * 0.025));
        const x2 = Math.max(m2.L, Math.min(m2.w, d.lx)), b2 = m2.t0 + (x2 - m2.L) / Math.max(1, m2.w - m2.L) * m2.W8, a2 = d.armed.t;
        st.msel = [Math.max(0, Math.min(a2, b2)), Math.max(a2, b2)]; if (st.onMSel) st.onMSel(); }, 50); };
    cvEl.addEventListener("pointerdown", (e) => {
      if (pts.size === 0 && st.cutHit && st.cutAtNow) { const lc = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()); if (Math.hypot(lc.x - st.cutHit.x, lc.y - st.cutHit.y) <= st.cutHit.r) { e.preventDefault(); try { st.cutAtNow(+getT() || 0); } catch {} return; } }   // ✂ 톡
      pts.set(e.pointerId, { a: along(e), b: across(e) }); try { cvEl.setPointerCapture(e.pointerId); } catch {}
      if (pts.size === 2) { const [p1, p2] = [...pts.values()]; drag = null; preview = null;
        // (11/06 19:59 사용자 B) 어느 방향으로 벌려도 위아래·좌우 똑같은 비율(사진 확대처럼)
        const h_ = Math.cos(Math.atan2(Math.abs(p1.b - p2.b), Math.abs(p1.a - p2.a))) ** 2;   // (11/06 20:07 사용자 A·B 절충) 1 = 좌우로 벌림 · 0 = 위아래
        pinch = { d: Math.hypot(p1.a - p2.a, p1.b - p2.b), et: 0.5 + 0.5 * h_, ep: 1 - 0.5 * h_, xz: st.xz, yz: st.yz, mid: (p1.a + p2.a) / 2, t: +getT() || 0 }; return; }
      if (e.pointerType === "pen") st.penSeen = true;
      if (pts.size === 1 && st.penTool && st.advOn && st.map && st.kb && (e.pointerType === "pen" || e.pointerType === "mouse" || !st.penSeen)) {   // (11/06) ✏️ 펜으로 그리기 — 애플펜슬을 한 번 쓰면 그 뒤로 손가락은 이동·확대만
        const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()); if (l0.x >= st.kb.L) { pauseNow(); const mp = st.map, tq = mp.t0 + (l0.x - mp.L) / Math.max(1, mp.w - mp.L) * mp.W8;
          st.penPts = [[tq, st.kb.inv(l0.y)]]; drag = { pen: true, id: e.pointerId, cx: e.clientX, cy: e.clientY, x0: l0.x, moved: false }; return; } }
      if (pts.size === 1 && (st.advOn || st.buMode) && st.sel && st.kb && st.map) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), H_ = st.hdl, hit = (c) => c && Math.hypot(l0.x - c.x, l0.y - c.y) <= c.r;
        // (11/06 16:20 사용자) ① 양 끝 화살표: 바로 끌면 안 움직임 — 꾹(0.35초) 누른 뒤 좌우로 = 길이 미세
        const ed = H_ ? (hit(H_.l) ? "l" : hit(H_.r) ? "r" : null) : null;
        if (ed && st.onBarDragX) { const d0 = drag = { hArm: true, edge: ed, x0: l0.x, y0: l0.y, id: e.pointerId, cx: e.clientX, cy: e.clientY };
          const armH = () => { if (drag !== d0 || d0.cancel) return; d0.hArmed = true; st.hdlArmed = ed; st.onBarDragX(0, ed, true); if (e.pointerType !== "mouse") { buzz(50); st.pulse = { x: l0.x, y: l0.y, at: performance.now() }; } };
          if (e.pointerType === "mouse") armH(); else d0.lp = setTimeout(armH, LONG_MS); return; }   // (11/06 ③) 마우스는 정확하니 꾹 없이 바로
        // ② 고른 음 가운데: 바로 위아래 = 반음씩 · 바로 좌우 = 자리 옮기기 · 꾹 누른 뒤 = 둘 다 미세 · 두 번 톡 = 가까운 음에 착
        const hb0 = hitBar(l0);
        if (hb0 && Math.abs(hb0.t0 - st.sel.t0) < 0.02 && l0.x >= st.kb.L && st.onBarDrag) { const d0 = drag = { selBody: true, x0: l0.x, y0: l0.y, axis: null, fine: false, id: e.pointerId, cx: e.clientX, cy: e.clientY, a: along(e), b: across(e), t: +getT() || 0, mode: null };
          if (e.pointerType === "mouse" && e.altKey) d0.fine = true;   // (11/06 ③) 마우스: Alt(Option)+끌기 = 미세
          else d0.lp = setTimeout(() => { if (drag !== d0 || d0.axis) return; d0.fine = true; buzz(40); st.pulse = { x: l0.x, y: l0.y, at: performance.now() }; }, LONG_MS); return; } }
      if (pts.size === 1 && e.pointerType === "mouse" && e.button === 0 && st.advOn && typeof o.onResetRange === "function" && st.map && st.kb) {   // (11/06 ③) 마우스: 빈 곳 끌기 = 여러 음 고르기(이동은 휠)
        const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect());
        if (l0.x >= st.kb.L && !hitT(l0) && !hitBar(l0)) { const tt = timeAt(st, l0.x); drag = { a: along(e), b: across(e), t: +getT() || 0, id: e.pointerId, mode: null, cx: e.clientX, cy: e.clientY, armed: { x: l0.x, t: tt, mouse: true } }; return; } }
      if (pts.size === 1 && st.onBarDragX && st.fixMode === "t" && st.sel && st.kb && st.map) { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0);   // (11/03 13:08) 타이밍 모드: 고른 막대 가운데 끌기 = 옮기기, 양 끝 = 길이
        const tb = (st.tebars || []).find(x => Math.abs(x.t0 - st.sel.t0) < 0.02) || (st.tbars || []).find(x => Math.abs(x.t0 - st.sel.t0) < 0.02);
        if (tb && l0.x >= st.kb.L && Math.abs(l0.y - tb.y) <= Math.max(22, tb.h) && l0.x >= tb.x0 - 16 && l0.x <= tb.x1 + 16) {
          const E = Math.min(14, (tb.x1 - tb.x0) / 3), edge = l0.x <= tb.x0 + E ? "l" : l0.x >= tb.x1 - E ? "r" : "c";
          drag = { barX: true, x0: l0.x, edge, id: e.pointerId, cx: e.clientX, cy: e.clientY }; st.onBarDragX(0, edge, true); return; } }
      if (pts.size === 1 && st.onBarDrag && st.sel && st.kb && st.fixMode !== "t") { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0), hb0 = hitBar(l0);   // (11/03 10:50 사용자) 고른 막대를 누른 채 위아래 = 반음씩
        if (hb0 && Math.abs(hb0.t0 - st.sel.t0) < 0.02 && l0.x >= st.kb.L) { drag = { bar: true, y0: l0.y, k: 0, id: e.pointerId, cx: e.clientX, cy: e.clientY, a: along(e), b: across(e), t: +getT() || 0, mode: null }; st.onBarDrag(0, true); return; } }
      if (pts.size === 1 && st.kb) { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0);   // 건반: 누르는 동안 그 음 소리
        if (l0.x < st.kb.L) { const m = Math.round(st.kb.inv(l0.y) / 100); st.kbDown = m; tone(m); drag = { kb: true, id: e.pointerId }; return; } }
      if (pts.size === 1) { drag = { a: along(e), b: across(e), t: +getT() || 0, id: e.pointerId, mode: null, yc: st.yc, cx: e.clientX, cy: e.clientY };
        // (11/05 사용자) 고른 구간의 분홍 세로선(양 끝)을 바로 잡아 좌우로 끌면 범위 조절(꾹 누를 필요 없음, 스크롤한 뒤에도) — 반대쪽 끝은 고정 · 가장자리에 닿으면 자동 스크롤
        if (st.mMode && st.msel && st.map && typeof o.onResetRange === "function") { const d0 = drag, mp = st.map, l0 = loc(d0.cx, d0.cy, cvEl.getBoundingClientRect()), px = (t) => mp.L + (t - mp.t0) / Math.max(1e-6, mp.W8) * (mp.w - mp.L),
            dl = Math.abs(l0.x - px(st.msel[0])), dr = Math.abs(l0.x - px(st.msel[1])), side = Math.min(dl, dr) <= 22 ? (dl <= dr ? 0 : 1) : -1;
          if (side >= 0) { d0.edgeLp = true; pauseNow(); d0.armed = { x: l0.x, t: st.msel[1 - side], keep: true }; } }
        if (typeof o.onNote === "function" && !drag.edgeLp) { const d0 = drag, r0 = cvEl.getBoundingClientRect(), l0 = loc(d0.cx, d0.cy, r0), h0 = hitNote(st, l0.x, l0.y);
          d0.h0 = h0;
          if (h0) { if (!h0.del) { st.hold = { n: h0.n, at: performance.now() }; d0.lp = setTimeout(() => { st.hold = null; if (drag !== d0 || d0.mode) return; d0.long = true; pauseNow(); lastView = view; o.onNote(h0.n); }, 600); } }   // 주석 칸 0.6초 꾹 = 고치기(10/30 19:48 사용자)
          else if (typeof o.onAdd === "function") d0.lp = setTimeout(() => { if (drag !== d0 || d0.mode) return;
            const tt = timeAt(st, l0.x);
            // (11/03 13:53 사용자) 꾹 누른 뒤: 그냥 떼면 새 주석 · 떼지 않고 좌우로 끌면 여러 음 고르기(따로 버튼 없이) — 선생님 화면만
            if (st.kb && (hitT(l0) || hitBar(l0))) return;   // (11/06 22:18 사용자) 여러 음 고르기·새 주석은 빈 곳 꾹에서만 — 음표 위 꾹은 아무것도 안 함(보정 모드는 미세 음정)
            if (typeof o.onResetRange === "function" && st.map && tt != null) { pauseNow(); d0.armed = { x: l0.x, t: tt }; st.msel = [tt, tt]; armTip(true); buzz(40); return; }   // (11/06 21:59) 구간 고르기 시작 = 진동
            d0.long = true; pauseNow();
            if (tt != null) { lastView = view; o.onAdd(tt); } }, LONG_MS); } }   // (11/09 00:21 사용자) 빈 곳 꾹 0.39초 → 0.6초
        // (11/06 21:47 사용자) 보정 모드: 고르지 않은 음표도 꾹(0.6초) 누르면 그 음을 고르면서 바로 미세 음정(위아래) + 진동
        if ((st.advOn || st.buMode) && typeof o.onFix === "function" && e.pointerType !== "mouse" && st.kb && st.map && !drag.edgeLp && !drag.h0) { const d0 = drag, l0 = loc(d0.cx, d0.cy, cvEl.getBoundingClientRect()), hb = hitBar(l0);
          if (hb && l0.x >= st.kb.L && !(st.sel && Math.abs(hb.t0 - st.sel.t0) < 0.02)) { clearTimeout(d0.lp); d0.lp = setTimeout(() => { if (drag !== d0 || d0.mode) return; pauseNow();
            st._quiet = true; try { fixSheet(wrap, cv, hb, o.onFix, getT, st); } catch {} st._quiet = false; if (!st.onBarDrag) return;
            const l1 = loc(d0.cx, d0.cy, cvEl.getBoundingClientRect());   // 고치기 칸이 열리며 그래프가 움직였을 수 있어 다시 잼
            drag = { selBody: true, fine: true, axis: null, x0: l1.x, y0: l1.y, id: d0.id, cx: d0.cx, cy: d0.cy, a: d0.a, b: d0.b, t: d0.t, mode: null, lp: null };
            buzz(40); st.pulse = { x: l1.x, y: l1.y, at: performance.now() }; }, LONG_MS); } }   // 음표 위 꾹은 여러 음 고르기보다 이것이 먼저
    });
    cvEl.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) { if (e.pointerType === "mouse") mouseHover(e); return; } pts.set(e.pointerId, { a: along(e), b: across(e) });
      if (pinch && pts.size >= 2) { const [p1, p2] = [...pts.values()], r = pinch.d > 30 ? Math.hypot(p1.a - p2.a, p1.b - p2.b) / pinch.d : 1;   // (11/06 B) 위아래·좌우 같은 비율 r
        if (st.mMode) { preview = Math.max(0, pinch.t - ((p1.a + p2.a) / 2 - pinch.mid) / span() * ((st.win || 6) / st.xz)); return; }   // 여러 음 고르기 중엔 두 손가락 = 시간 이동
        st.yz = Math.max(1, Math.min(8, pinch.yz * r ** pinch.ep)); st.xz = Math.max(1, Math.min(8, pinch.xz * r ** pinch.et));   // 둘 다 커지되 벌린 방향 쪽이 더: 좌우로 벌리면 시간 r배·음 높이 √r배, 위아래면 반대, 대각선은 둘 다 r^0.75
        if (st.yz > 1 && st.yc == null) { const f = fitAt(cv, +getT() || 0, 0); st.yc = f ? f[2] : null; }
        return; }
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.hArm) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map;
        if (!drag.hArmed) { if (Math.hypot(l0.x - drag.x0, l0.y - drag.y0) > 8) { clearTimeout(drag.lp); drag.cancel = true; } return; }
        if (!mp || drag.cancel) return; drag.moved = true; st.onBarDragX(Math.round((l0.x - drag.x0) / Math.max(1, mp.w - mp.L) * mp.W8 * FINE * 100) / 100, drag.edge, false); return; }
      if (drag.selBody) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map, dx = l0.x - drag.x0, dy = l0.y - drag.y0;
        if (!drag.axis) { if (Math.max(Math.abs(dx), Math.abs(dy)) < 8) return; clearTimeout(drag.lp);
          // (11/06 17:03 사용자) 음 자체 좌우 옮기기는 뺌 — 꾹 누른 뒤엔 위아래 미세만, 그냥 좌우로 밀면 평소처럼 화면 이동
          if (drag.fine) drag.axis = "v"; else if (Math.abs(dy) >= Math.abs(dx)) drag.axis = "v"; else { drag.selBody = false; drag.mode = "time"; pauseNow(); return; }
          st.onBarDrag(0, true); }
        drag.moved = true; st.dragging = true;
        if (drag.axis === "v") { if (drag.cpp == null) drag.cpp = st.kb.inv(drag.y0) - st.kb.inv(drag.y0 + 1); const c = (drag.y0 - l0.y) * drag.cpp / 100; /* (11/06) 누를 때의 눈금으로 계산(끄는 중 화면이 움직여도 값이 튀지 않게) */ st.onBarDrag(drag.fine ? Math.round(c * FINE * 100) / 100 : Math.round(c), false); }
        return; }
      if (drag.pen) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (!mp || !st.kb || !st.penPts) return; if (Math.abs(l0.x - drag.x0) >= 4) drag.moved = true;
        st.penPts.push([mp.t0 + (Math.max(mp.L, Math.min(mp.w, l0.x)) - mp.L) / Math.max(1, mp.w - mp.L) * mp.W8, st.kb.inv(l0.y)]); return; }
      if (drag.msel) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (!mp) return; if (Math.abs(l0.x - drag.x0) >= 4) drag.moved = true;
        if (drag.moved) { const tx = (x) => mp.t0 + (Math.max(mp.L, Math.min(mp.w, x)) - mp.L) / Math.max(1, mp.w - mp.L) * mp.W8, a = tx(drag.x0), b = tx(l0.x); st.msel = [Math.max(0, Math.min(a, b)), Math.max(a, b)]; if (st.onMSel) st.onMSel(); } return; }
      if (drag.barX) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (Math.abs(l0.x - drag.x0) >= 3) drag.moved = true;
        if (drag.moved && mp && st.onBarDragX) st.onBarDragX(Math.round((l0.x - drag.x0) / Math.max(1, mp.w - mp.L) * mp.W8 * 100) / 100, drag.edge, false); return; }
      if (drag.bar) { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0); if (drag.cpp == null) drag.cpp = st.kb.inv(drag.y0) - st.kb.inv(drag.y0 + 1); const k = Math.round((drag.y0 - l0.y) * drag.cpp / 100);
        if (k !== drag.k) { drag.k = k; drag.moved = true; if (st.onBarDrag) st.onBarDrag(k, false); } return; }
      if (drag.kb) { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0), m = Math.round(st.kb.inv(l0.y) / 100); if (m !== st.kbDown) { st.kbDown = m; tone(m); } return; }   // 건반 위로 밀면 따라 바뀜
      const dA = along(e) - drag.a, dB = across(e) - drag.b;
      if (drag.armed && drag.armed.mouse && !drag.moved) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()); if (Math.abs(l0.x - drag.armed.x) < 6) return; pauseNow(); st.msel = [drag.armed.t, drag.armed.t]; }
      if (drag.armed) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (!mp) return;   // 꾹 누른 채 끌기 = 여러 음 고르기
        if (!drag.moved && Math.abs(l0.x - drag.armed.x) < 12) return; drag.moved = true; armTip(false);
        const tx = (x) => mp.t0 + (Math.max(mp.L, Math.min(mp.w, x)) - mp.L) / Math.max(1, mp.w - mp.L) * mp.W8, a = drag.armed.t, b = tx(l0.x); st.msel = [Math.max(0, Math.min(a, b)), Math.max(a, b)];
        drag.lx = l0.x; edgeAuto(drag);   // (11/05 사용자) 손가락이 화면 가장자리에 닿으면 그래프가 저절로 밀려서 더 멀리까지 고를 수 있게
        if (!wrap.querySelector(".tfMulti")) multiSheet(wrap, cv, st, false, true); else if (st.onMSel) st.onMSel(); return; }
      if (!drag.mode) { if (Math.max(Math.abs(dA), Math.abs(dB)) < 8) return; clearTimeout(drag.lp); st.hold = null; drag.mode = Math.abs(dA) >= Math.abs(dB) ? "time" : "pitch"; if (drag.mode === "time") pauseNow(); }
      if (drag.mode === "time") preview = Math.max(0, drag.t - dA / span() * ((st.win || 6) / st.xz));
      else if (st.yz > 1) { const [lo, hi] = range(cv), per = (hi - lo) / st.yz / tall(); st.yc = (drag.yc ?? (lo + hi) / 2) + dB * per * (rot ? -1 : 1); st.panAt = Date.now(); }
      else { const [lo, hi] = range(cv), per = (hi - lo) / tall(); if (drag.yo == null) drag.yo = st.yo || 0; st.yo = Math.max(-(hi - lo) * 0.6, Math.min((hi - lo) * 0.6, drag.yo + dB * per * (rot ? -1 : 1))); }   // 확대 안 했을 때도 위아래로(곡 음역의 60%까지)
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (pinch) { st.hold = null; if (pts.size === 0) { pinch = null; if (st.mMode && preview != null) { const t_ = preview; preview = null; try { seek(t_, true); } catch {} } } return; }
      if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; clearTimeout(d.lp); st.hold = null;
      if (d.armed && d.armed.mouse && !d.moved) delete d.armed;   // 마우스로 빈 곳을 그냥 누름 = 평소처럼 재생/멈춤
      if (d.armed) { armTip(false); clearInterval(d.auto); d.auto = null; if (preview != null) { const t_ = preview; preview = null; try { seek(t_, true); } catch {} } if (d.moved) { if (st.onMSel) st.onMSel(); return; } if (d.armed.keep) return; st.msel = null; if (e.type === "pointerup") { if (st.notesHidden) st.noteShow = true; lastView = view; o.onAdd(d.armed.t); } return; }   // 숨긴 채 새 주석 = 주석 칸 보이기   // 끌지 않고 뗌 = 새 주석(예전과 같음)
      if (d.long) return;
      if (d.hArm) { clearTimeout(d.lp); st.hdlArmed = null; if (d.hArmed) { if (d.moved) learn("arr"); if (st.onBarDragXEnd) try { st.onBarDragXEnd(); } catch {} } else if (!d.cancel && e.type === "pointerup") undo("‹ › 화살표는 꾹 누른 채 좌우로 끌면 길이가 바뀌어요", null, 2500, "확인"); return; }
      if (d.selBody) { clearTimeout(d.lp); st.dragging = false;
        if (d.axis) learn(d.fine ? "fine" : "v");
        if (d.axis === "v" && st.onBarDragEnd) { try { st.onBarDragEnd(); } catch {} return; }
        if (d.axis || d.fine || e.type !== "pointerup") return;
        if (st.snapSel && Date.now() - (st._bt || 0) < 350) { st._bt = 0; learn("dbl"); snapNote(); return; }   // 두 번 톡 = 가까운 음에 착
        st._bt = Date.now(); if (st.selSnd) st.selSnd(); return; }
      if (d.pen) { const raw = st.penPts || []; st.penPts = null;
        if (d.moved) { const dd = G.TuneAdv.addDraw(st, cv, raw); if (dd) undo(`그린 선으로 바꿨어요(${(dd.t1 - dd.t0).toFixed(1)}초) · ▶로 들어 보세요`, () => { try { G.TuneAdv.undoLast(st, cv); } catch {} }); else undo("조금 더 길게 그려 주세요(0.05초 넘게)"); }
        else if (raw[0]) { const hit = G.TuneAdv.drawAt(st, raw[0][0]); if (hit) { G.TuneAdv.removeDraw(st, cv, hit); undo("그린 선을 지웠어요", () => { try { G.TuneAdv.undoLast(st, cv); } catch {} }); } }
        return; }
      if (st.advOn && G.TuneAdv && st.uvbars && !d.mode && e.type === "pointerup" && isPaused()) {   // 고급 보정: 빗금 톡 = 이름 바꾸기(치찰음 → 호흡 → 아님)
        const le = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()), u = st.uvbars.find(x => le.x >= x.x0 - 4 && le.x <= x.x1 + 4 && Math.abs(le.y - x.y) <= x.h / 2 + 4);
        if (u && !(hitT(le) || hitBar(le))) { const k = G.TuneAdv.relabel(st, cv, u.u); showUv(k); return; } }
      if (d.kb) { toneOff(); st.kbDown = null; return; }
      if (st.mMode && !d.mode && e.type === "pointerup" && sheetClose && !st.advOn && st.msel && typeof o.onAdd === "function" && st.map) {   // (11/06 22:49 사용자) 기본 모드: 고른 구간 안을 톡 = 그 구간에 한마디(주석) 창 — 구간이 자동으로 들어감
        const lt = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()), tq = timeAt(st, lt.x), [ra, rb] = st.msel;
        if (tq != null && rb - ra >= 0.05 && tq >= ra && tq <= rb) { sheetClose(); lastTap = 0; pauseNow(); lastView = view; try { o.onAdd(ra, rb); } catch {} return; } }
      if (st.mMode && !d.mode && e.type === "pointerup" && sheetClose) { sheetClose(); lastTap = 0; return; }   // (11/03 13:58 사용자) 여러 음 고르기 중 빈 곳 톡 = 끝내기 · (13:59) 끌기는 평소처럼 화면 이동, 다시 고르기는 꾹 누른 채 끌기
      if ((d.bar || d.barX) && !d.moved && e.type === "pointerup" && st.advOn && st.snapSel && !d.hdl && Date.now() - (st._bt || 0) < 350) { st._bt = 0; snapNote(); return; }   // (11/06) 보정 모드: 음 두 번 톡 = 가까운 음계 음에 맞춤 + 흐름 평평하게
      if ((d.bar || d.barX) && !d.moved && e.type === "pointerup") st._bt = Date.now();
      if ((d.bar || d.barX) && !d.moved && e.type === "pointerup" && st.selSnd) { st.selSnd(); return; }   // 고른 막대 다시 톡 = 소리
      if (d.bar && st.onBarDragEnd) { try { st.onBarDragEnd(); } catch {} }
      if (d.barX && st.onBarDragXEnd) { try { st.onBarDragXEnd(); } catch {} }
      if (d.bar || d.barX || d.msel) return;   // 고른 막대를 위아래(음정)·좌우(타이밍)로 옮긴 것(재생/멈춤 아님)
      if (!d.mode && e.type === "pointerup" && typeof o.onFix === "function" && isPaused() && st.tbars) {   // 멈춘 상태에서 초록 정음 막대 톡 = 정음 고치기
        const le = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()), hb = hitT(le) || hitBar(le);   // (11/03 10:31 아이패드) 누른 자리(뗀 자리 아님) + 손가락 크기만큼 넉넉하게
        if (hb) { fixSheet(wrap, cv, hb, o.onFix, getT, st); return; } }
      if (editGo && !d.mode && e.type === "pointerup" && isPaused() && st.tbars) { const le = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()); if (hitT(le) || hitBar(le)) { editGo(); return; } }   // 멈춘 채 초록 막대 톡 = 음표 고치기 화면으로
      if (!d.mode && e.type === "pointerup" && !st.advOn && wrap.querySelector(".tfFix") && sheetClose && sheetClose._fix) {   // (11/03 02:02 사용자) 고치기 창이 떠 있으면 빈 곳 톡 = 창 닫기(재생/멈춤 아님) · 다른 막대는 위에서 바로 바뀜
        const le = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()), onBar = hitT(le) || hitBar(le);
        if (!onBar) { sheetClose(); lastTap = 0; return; } }
      if (!d.mode && e.type === "pointerup" && st.popNH && st.popNH.length) { const le = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), h = st.popNH.find(q => Math.hypot(le.x - q.x, le.y - q.y) <= 16);   // 번호 톡 = 그 말풍선(고급은 고치기·지우기 버튼)
        if (h) { st.popPin = st.popPin && st.popPin.k === h.k ? null : { k: h.k, until: performance.now() + 4000 }; lastTap = 0; return; } }
      if (!d.mode && e.type === "pointerup" && st.popPin) { st.popPin = null; lastTap = 0; return; }   // 떠 있는 말풍선은 빈 곳 톡으로 닫기
      if (!d.mode && e.type === "pointerup" && typeof o.onNote === "function") { const r = cvEl.getBoundingClientRect(), le = loc(e.clientX, e.clientY, r), hn = d.h0 || hitNote(st, le.x, le.y);   /* 누를 때 맞은 칸 우선(떼는 사이 칸이 바뀌어도) */ if (hn) { pauseNow(); if (hn.del) { o.onDelNote && o.onDelNote(hn.n); } else { lastView = view; o.onNote(hn.n); } return; } }
      if (d.mode === "time") { const t = preview; preview = null; if (t != null) seek(t, true); return; }   // 이동만, 재생은 안 함
      if (!d.mode && e.type === "pointerup") { const now = Date.now();   // 톡 = 재생/멈춤 · 기준선 왼쪽 두 번 톡 = 2초 뒤로, 오른쪽 = 2초 앞으로(11/03 10:24)
        if (now - lastTap < 320) { toggle(); lastTap = 0;   // 첫 톡의 재생/멈춤은 되돌리고
          const r0 = cvEl.getBoundingClientRect(), le = loc(e.clientX, e.clientY, r0), L = (st.kb && st.kb.L) || 44, hx = L + HEAD * ((rot ? r0.height : r0.width) - L);
          const j = le.x < hx ? -DT_JUMP : DT_JUMP, nt = Math.max(0, Math.min(endT(), (+getT() || 0) + j)); st.panAt = 0; try { seek(nt, isPaused()); } catch {} showMid(j < 0 ? "back" : "fwd"); }
        // (11/09 01:36 사용자) 음표를 고른 채 빈 곳 톡 = 다시 재생(선택 해제 안 함) — 00:40 '선택 해제만'은 되돌림
        else { toggle(); lastTap = now; } }   // (11/06 17:37 사용자) 빈 곳 톡으로 재생이 시작되면 고른 음표는 선택 해제(고친 건 닫을 때 저장됨)
    };
    // ── (11/06 사용자 '고급 보정 ③ 마우스 모드') 블루투스 마우스·트랙패드: 따로 켜지 않고 마우스를 쓰면 바로 ──
    let mouseHi = false;
    const mouseHello = () => { if (mouseHi) return; mouseHi = true; try { if (localStorage.getItem("tune_mouse_tip_v1") === "1") return; localStorage.setItem("tune_mouse_tip_v1", "1"); } catch {}
      undo("🖱 마우스: 휠 = 앞뒤 이동 · Ctrl+휠 = 확대 · 빈 곳 끌기 = 여러 음 고르기 · 우클릭 = 메뉴 · Alt+끌기 = 미세 · ↑↓ 반음 · 스페이스 = 재생", null, 7000, "확인"); };
    cvEl.addEventListener("pointerdown", (e) => { if (e.pointerType === "mouse") mouseHello(); }, true);
    cvEl.addEventListener("wheel", (e) => { e.preventDefault(); mouseHello();
      if (e.ctrlKey || e.metaKey) { st.xz = Math.max(1, Math.min(4, (st.xz || 1) * Math.exp(-e.deltaY * 0.004))); return; }   // 트랙패드 꼬집기도 여기로 옴
      if (e.altKey) { st.yz = Math.max(1, Math.min(12, (st.yz || 1) * Math.exp(-e.deltaY * 0.004))); if (st.yz > 1 && st.yc == null) { const f = fitAt(cv, +getT() || 0, 0); st.yc = f ? f[2] : null; } return; }
      const dd = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY, W = (st.win || 6) / (st.xz || 1), px = e.deltaMode === 1 ? dd * 16 : dd;
      const nt = Math.max(0, Math.min(endT(), (+getT() || 0) + px / span() * W)); st.panAt = 0; try { seek(nt, isPaused()); } catch {} }, { passive: false });
    const mouseHover = (e) => { if (!st.map || !st.kb) return; const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), H_ = st.hdl, onH = H_ && [H_.l, H_.r].some(c => c && Math.hypot(l0.x - c.x, l0.y - c.y) <= c.r);
      const hb = l0.x >= st.kb.L ? (hitT(l0) || hitBar(l0)) : null, onSel = hb && st.sel && Math.abs(hb.t0 - st.sel.t0) < 0.02;
      cvEl.style.cursor = st.penTool ? "crosshair" : onH ? "ew-resize" : onSel ? "grab" : hb ? "pointer" : l0.x < st.kb.L ? "pointer" : st.advOn ? "text" : "default"; };
    cvEl.addEventListener("contextmenu", (e) => {   // 우클릭: 음 위면 그 음을 고르고 작은 메뉴(가까운 음에 맞춤·나누기·원본으로)
      if (!st.advOn || typeof o.onFix !== "function") return; const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), hb = hitT(l0) || hitBar(l0); if (!hb) return;
      pauseNow(); if (!(st.sel && Math.abs(hb.t0 - st.sel.t0) < 0.02)) { try { fixSheet(wrap, cv, hb, o.onFix, getT, st); } catch {} }
      wrap.querySelectorAll(".tfCtx").forEach(x => x.remove()); const mn = document.createElement("div"); mn.className = "tfCtx"; mn.setAttribute("role", "menu");
      const r0 = wrap.getBoundingClientRect(); mn.style.left = Math.min(r0.width - 190, e.clientX - r0.left) + "px"; mn.style.top = Math.min(r0.height - 150, e.clientY - r0.top) + "px";
      mn.innerHTML = `<button type="button" data-c="snap">🧲 가까운 음에 맞춤</button><button type="button" data-c="cut">✂ 여기서 나누기</button><button type="button" data-c="org">원본으로</button>`;
      const shut = () => { mn.remove(); document.removeEventListener("pointerdown", away, true); }, away = (ev) => { if (!mn.contains(ev.target)) shut(); };
      mn.querySelectorAll("[data-c]").forEach(b => b.onclick = () => { const c = b.dataset.c; shut(); setTimeout(() => { const fx = wrap.querySelector(".tfFix:not(.tfDock)"); if (!fx) return;
        if (c === "snap") { try { st.snapNote && st.snapNote(); } catch {} } else if (c === "cut") { const tt = timeAt(st, l0.x); try { seek(tt, true); } catch {} setTimeout(() => fx.querySelector("[data-cut]")?.click(), 60); } else fx.querySelector("[data-r]")?.click(); }, 30); });
      wrap.appendChild(mn); setTimeout(() => document.addEventListener("pointerdown", away, true), 0); });
    st.onKey = (e) => {   // 키보드(블루투스 키보드·맥): 스페이스 재생 · ↑↓ 반음(Alt면 미세) · ←→ 2초 · Ctrl+Z 되돌리기 · Esc 창 닫기
      if (!wrap.isConnected) return; const tg = e.target; if (tg && (tg.tagName === "INPUT" || tg.tagName === "TEXTAREA" || tg.isContentEditable)) return;
      const fx = wrap.querySelector(".tfFix:not(.tfDock):not(.tfMulti)"), k = e.key;
      if (k === " ") { e.preventDefault(); toggle(); return; }
      if ((k === "ArrowUp" || k === "ArrowDown") && fx && st.stepSel) { e.preventDefault(); st.stepSel((k === "ArrowUp" ? 1 : -1) * (e.altKey ? 0.05 : 1)); return; }
      if (k === "ArrowLeft" || k === "ArrowRight") { e.preventDefault(); const nt = Math.max(0, Math.min(endT(), (+getT() || 0) + (k === "ArrowLeft" ? -DT_JUMP : DT_JUMP))); try { seek(nt, isPaused()); } catch {} return; }
      if ((e.ctrlKey || e.metaKey) && (k === "z" || k === "Z" || k === "y")) { const redo = k === "y" || e.shiftKey; const b = wrap.querySelector(`[data-ur="${redo ? 1 : -1}"]`); if (b && !b.disabled) { e.preventDefault(); b.click(); } return; }
      if (k === "Escape" && sheetClose) { e.preventDefault(); try { sheetClose(); } catch {} } };
    document.addEventListener("keydown", st.onKey);
    cvEl.addEventListener("pointerup", end); cvEl.addEventListener("pointercancel", (e) => { preview = null; end(e); });
    const ldEl = document.createElement("div"); ldEl.className = "tfLoad"; ldEl.setAttribute("aria-live", "polite"); ldEl.innerHTML = `<div class="tfTipH"><span class="tfHg" aria-label="소리 불러오는 중">⏳</span><span>[Tip]</span><span class="tfPn">톡 하면 닫혀요</span></div><p class="tfTip"></p>`;   // (11/03 11:39 사용자) 큰 돌림표·💡 빼고 작은 모래시계 + [Tip](11/03 11:40)
    const ldTips = fsTips(o); let tipI = -1, ldOn = false; wrap.querySelector(".tfCvBox").appendChild(ldEl);
    // (11/03 14:47 사용자) 팁 창이 떠 있는 동안(사라지는 중 포함) 아래 화면은 눌리지 않음 · 창이든 바깥이든 톡 = 바로 닫힘(페이드 없이)
    //   누른 채 끌기(창이 따라 움직임)·0.6초 넘게 꾹 = 붙잡음(저절로 안 사라짐) · 안 건드리면 다 불러온 뒤 2초 보이고 1.8초 페이드 · 팁은 한 번에 하나, 아무거나
    const LD_LINGER = 1000, LD_LONG = 600, LD_FADE = 1300;   /* (11/03 15:02 사용자) 대기 1초 · (15:13) 전체화면 팁 창만 페이드 1.3초 */
    let ldPin = false, ldDown = 0, ldShown = false, ldLinger = 0, ldWas = false, ldG = null, ldFadeTo = 0, ldDis = false, ldEat = 0;
    const ldShut = () => { ldPin = false; ldLinger = 0; ldFadeTo = 0; ldDown = 0; ldG = null; ldDis = true; ldEl.classList.add("now"); ldEl.classList.remove("fd"); setTimeout(() => ldEl.classList.remove("now"), 80); };
    ldEl.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); const fading = !ldShown && performance.now() < ldFadeTo; if (!ldShown && !fading) return; ldDown = performance.now();   // (11/03 14:57 사용자) 사라지는 중에 팁 창을 누르면 다시 또렷해지며 고정
      ldG = { x: e.clientX, y: e.clientY, dx: +ldEl.dataset.dx || 0, dy: +ldEl.dataset.dy || 0, moved: false, fading }; if (fading) { ldPin = true; ldFadeTo = 0; } ldLinger = 0; try { ldEl.setPointerCapture(e.pointerId); } catch {} });
    ldEl.addEventListener("pointermove", (e) => { if (!ldDown || !ldG) return; e.stopPropagation(); const ax = e.clientX - ldG.x, ay = e.clientY - ldG.y; if (!ldG.moved && Math.hypot(ax, ay) < 6) return; ldG.moved = true;
      const dx = ldG.dx + (rot ? ay : ax), dy = ldG.dy + (rot ? -ax : ay); ldEl.dataset.dx = dx; ldEl.dataset.dy = dy; ldEl.style.setProperty("--dx", dx + "px"); ldEl.style.setProperty("--dy", dy + "px"); });   // 돌린 화면에서도 손가락 방향대로
    const ldUp = (e) => { e.stopPropagation(); if (!ldDown) return; const long = performance.now() - ldDown >= LD_LONG, moved = !!(ldG && ldG.moved), fromFade = !!(ldG && ldG.fading); ldDown = 0; ldG = null;
      if (moved || long || fromFade) { ldPin = true; return; } ldShut(); };   // 톡 = 바로 닫기
    ldEl.addEventListener("pointerup", ldUp); ldEl.addEventListener("pointercancel", (e) => { ldDown = 0; ldG = null; ldPin = true; e.stopPropagation(); });
    // 창이 떠 있으면 아래 화면 터치는 '창 닫기'로만(버튼·그래프에 안 닿음)
    let ldQ = null, ldRe = false;   // (11/03 15:04 사용자) 소리 불러오는 중에 아래를 누르면: 기억해 뒀다가 다 불러오는 순간 창을 닫고 그 자리를 대신 눌러 줌
    const ldReplay = (q) => { const t = q && q.t; if (!t || !t.isConnected) return; const o = { bubbles: true, cancelable: true, clientX: q.x, clientY: q.y, pointerId: 9999, pointerType: q.pt || "touch", isPrimary: true }; ldRe = true;
      try { t.dispatchEvent(new PointerEvent("pointerdown", o)); t.dispatchEvent(new PointerEvent("pointerup", o)); } catch {} try { t.dispatchEvent(new MouseEvent("click", o)); } catch {} ldRe = false; };
    // (11/03 15:10 사용자) 창이 떠 있어도 끌기(시간 이동·스크롤)는 그대로 됨 · 톡(누르고 바로 뗌)만 붙잡음:
    //   불러오는 중 톡 = 기억했다가 다 불러오는 순간 창을 닫고 그 자리를 대신 눌러 줌 · 다 불러온 뒤 톡 = 창만 닫힘 · 사라지는 동안은 아래가 그대로 눌림
    // (11/03 17:23 사용자 C안) 전체화면에선 팁을 그래프 위 박스 대신 아래 안내 문구 자리에 한 줄로 — 그래프를 가리지 않고 터치도 막지 않음
    const TIP_LINE = true; let tlOn = false, tlEl = null;
    // (11/03 18:06 사용자) 이 화면은 팁 UI 전의 '소리 불러오는 중…' 표시로 되돌림(돌림표 + 문구, 터치 안 막음, 소리가 나오면 바로 사라짐) — 팁은 아래 [💡 팁 보기]로만
    const OLD_LOAD = true, ldOld = document.createElement("div"); ldOld.className = "tfLoadOld"; ldOld.setAttribute("aria-live", "polite"); ldOld.innerHTML = `<i></i><b>노래 불러오는 중…</b><small>긴 곡은 처음 한 번 조금 걸려요</small>`;
    { const cb = wrap.querySelector(".tfCvBox"); if (cb) cb.appendChild(ldOld); }
    const openTips = (k) => { const L = ldTips.map(t => t.text()); if (!L.length) return; if (G.Brand && G.Brand.tipSheet) G.Brand.tipSheet(L, k >= 0 ? k : 0, wrap.querySelector(".tfBox") || wrap); };   // 돌린 화면 안에 띄워 같은 방향으로
    { const hint = wrap.querySelector(".tfHint"); if (hint && ldTips.length) { const tb = document.createElement("button"); tb.type = "button"; tb.className = "tfTipsBtn"; tb.textContent = "💡 팁 보기"; tb.addEventListener("pointerdown", (e) => e.stopPropagation()); tb.onclick = () => openTips(-1); hint.appendChild(tb); } }   // 언제든 팁 목록
    const tipLine = (v) => { const bot = wrap.querySelector(".tfBot"), hint = bot && bot.querySelector(".tfHint"); if (!bot || !hint) return;
      if (!tlEl) { tlEl = document.createElement("span"); tlEl.className = "tfTipLine"; tlEl.setAttribute("aria-live", "polite"); tlEl.setAttribute("role", "button"); tlEl.innerHTML = "<b>⏳ [Tip]</b> <span></span>"; bot.appendChild(tlEl);
        tlEl.addEventListener("pointerdown", (e) => e.stopPropagation()); tlEl.onclick = () => openTips(tipI); }   // (11/03 17:28 사용자) 아래 팁 한 줄 톡 = 팁 목록
      if (v && !tlOn) { const rb = bot.getBoundingClientRect(), rh = hint.getBoundingClientRect(); const R = rot ? { left: rh.top - rb.top, top: rb.right - rh.right, width: rh.height, height: rh.width } : { left: rh.left - rb.left, top: rh.top - rb.top, width: rh.width, height: rh.height };
        Object.assign(tlEl.style, { left: R.left + "px", top: R.top + "px", width: Math.max(R.width, 200) + "px", minHeight: R.height + "px" }); }
      if (v !== tlOn) { tlOn = v; tlEl.classList.toggle("on", v); bot.classList.toggle("tipOn", v); } };
    let ldTap = null;
    wrap.addEventListener("pointerdown", (e) => { if (ldRe || !ldShown || ldEl.contains(e.target)) { ldTap = null; return; } ldTap = { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.target, pt: e.pointerType, moved: false }; }, true);
    wrap.addEventListener("pointermove", (e) => { if (ldTap && e.pointerId === ldTap.id && Math.hypot(e.clientX - ldTap.x, e.clientY - ldTap.y) > 8) ldTap.moved = true; }, true);
    wrap.addEventListener("pointerup", (e) => { const q = ldTap; if (ldRe || !q || e.pointerId !== q.id) return; ldTap = null; if (q.moved || !ldShown) return;
      // (11/03 17:22 사용자) 그래프 빈 곳·재생 버튼 톡 = 창은 바로 사라지고 재생은 막지 않음: 불러오는 중이면 이미 재생이 시작되는 중이라 창만 닫고(멈춤으로 안 바뀜), 다 불러온 뒤면 원래대로 재생/멈춤
      const main = q.t === cvEl || (ppB && ppB.contains(q.t));
      if (main && !ldWas) { ldShut(); return; }
      e.stopPropagation(); ldEat = performance.now() + 700;   // 톡: 아래에는 '취소'로 알려 정리(재생/멈춤 안 됨)
      try { q.t.dispatchEvent(new PointerEvent("pointercancel", { bubbles: true, pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY })); } catch {}
      if (ldWas && !main) { ldQ = q; return; } ldShut(); }, true);   // (11/03 15:18 사용자) 불러오는 중 그래프 빈 곳 톡 = 창만 닫고 재생은 그대로 이어짐(재생/멈춤을 다시 누른 걸로 치지 않음)
    wrap.addEventListener("click", (e) => { if (!ldRe && performance.now() < ldEat) { e.stopPropagation(); e.preventDefault(); } }, true);
    const loop = () => { if (!wrap.isConnected) return;
      if (st.stopAt && !isPaused() && (+getT() || 0) >= st.stopAt) { st.stopAt = 0; toggle(); }   // 🎤 목소리 듣기: 그 음 끝에서 멈춤
      { const w = st.waitAt ? performance.now() - st.waitAt : 0, on = !!st.waitAt && isPaused() && w > 350 && w < 45000; if (st.waitAt && (!isPaused() || w >= 45000)) st.waitAt = 0; if (!on) { if (ldQ && ldWas) { const q = ldQ; ldQ = null; ldShut(); ldDis = false; setTimeout(() => ldReplay(q), 0); } else if (ldWas && (ldShown || tlOn) && !ldPin && !ldDis) ldLinger = performance.now() + LD_LINGER; ldDis = false; } else ldLinger = 0; ldWas = on; const vis = (on && !ldDis) || ldPin || ldDown > 0 || performance.now() < ldLinger;
        if (vis && !ldShown && !ldEl.classList.contains("on")) { ldEl.dataset.dx = ldEl.dataset.dy = 0; ldEl.style.setProperty("--dx", "0px"); ldEl.style.setProperty("--dy", "0px"); }   /* 새로 뜰 땐 제자리 */ if (ldShown && !vis && !ldEl.classList.contains("now")) ldFadeTo = performance.now() + LD_FADE; ldEl.classList.toggle("on", vis && !TIP_LINE); ldEl.classList.toggle("pin", ldPin); ldEl.classList.toggle("fd", !TIP_LINE && !vis && performance.now() < ldFadeTo); ldEl.classList.toggle("tipOnly", !on); ldShown = vis && !TIP_LINE;
        if (TIP_LINE && !OLD_LOAD) tipLine(vis);
        if (OLD_LOAD) ldOld.classList.toggle("on", on); if (ppB) ppB.classList.toggle("ld", on);
        if (vis && ldTips.length && !ldOn) {   // 새로 뜰 때 팁 하나(아무거나, 바로 전 것과는 다르게) — 떠 있는 동안엔 안 바뀜
          let k = Math.floor(Math.random() * ldTips.length); if (ldTips.length > 1 && k === tipI) k = (k + 1 + Math.floor(Math.random() * (ldTips.length - 1))) % ldTips.length; tipI = k;
          ldEl.querySelector(".tfTip").textContent = ldTips[k].text(); if (tlEl) tlEl.querySelector("span").textContent = ldTips[k].text(); } ldOn = vis; }
      if (nChip) {   // 강사 화면 + 보정본 + 주석 있음 → 주석 칸 숨기고 [💬 주석 N] · 숨긴 주석 자리를 지날 때 버튼이 반짝(11/03 16:55 사용자)
        const ns = typeof o.notes === "function" ? (o.notes() || []) : [], tNow = +getT() || 0, pm = !!o.teacher && ns.length > 0 && (typeof o.mode === "function" ? o.mode() === "p" : false);
        st.notesHidden = (pm && !st.noteShow) || (!!st.advOn && ns.length > 0); const chipOn = pm && !st.advOn; if (nChip.hidden === chipOn) nChip.hidden = !chipOn;   // (11/05 사용자 '확인|보정') 보정 모드 = 주석·고친 양 줄을 접어 그래프를 크게
        if (chipOn) { const cnt = String(ns.length), bE = nChip.querySelector("b"); if (bE.textContent !== cnt) bE.textContent = cnt; nChip.classList.toggle("on", st.noteShow);
          nChip.classList.toggle("blink", st.notesHidden && ns.some(n => tNow >= +n.t0 - 0.3 && tNow <= Math.max(+n.t1 || 0, +n.t0 + 1.5))); }
        else nChip.classList.remove("blink"); }
      try { popSync(); } catch (e) { console.warn("주석 말풍선", e); }
      if (ppB) { const s = ppB.classList.contains("ld") ? "⏳" : isPaused() ? "▶" : "❚❚"; if (ppB.textContent !== s) { ppB.textContent = s; ppB.setAttribute("aria-label", isPaused() ? "재생" : "일시정지"); } } const t = preview ?? (+getT() || 0); draw(cvEl, cv, t, +getLv() || 0, st); mid.style.visibility = st.hits && st.hits.length ? "hidden" : "";
      tm.textContent = fmt(t) + (st.yz > 1.05 ? ` · ×${st.yz.toFixed(1)}` : "");
      { const show = st.gapNext != null && st.gapNext - t > 2; if (skipB.classList.contains("off") === show) skipB.classList.toggle("off", !show); }   // (11/03 16:19 사용자) 사라질 땐 1.8초 페이드
      if (hasAb) { const m = o.mode ? o.mode() : "p"; wrap.querySelectorAll("[data-m]").forEach(b => b.classList.toggle("on", b.dataset.m === m)); const pe = wrap.querySelector(".tfAdvPv"); if (pe && pe.hidden !== (m === "o")) pe.hidden = m === "o"; }   // 원음을 듣는 중엔 미리듣기 표시 숨김
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // 뒤로 가기: 열린 전체화면만 닫고, 앱 쪽 뒤로 가기 처리는 건너뛰게 e.tuneClosed 표시(선생님 앱 popstate가 확인)
  let fsClose = null, skipPop = false, sheetClose = null;
  const dropL = () => { try { return G.Brand && G.Brand.dropLayers ? G.Brand.dropLayers() : 0; } catch { return 0; } };
  if (typeof G.addEventListener === "function") G.addEventListener("popstate", (e) => {
    if (e && (e.layerClosed || e.jkSkip)) return;   // 맨 위 작은 창(Brand.layer)만 닫힘 · 칸 비우기(11/09) — 고치기 창·전체화면은 그대로
    if (skipPop) { skipPop = false; try { e.tuneClosed = true; } catch {} return; }
    if (sheetClose) { sheetClose(true); try { e.tuneClosed = true; } catch {} return; }   // 주석 창이 열려 있으면 그것만 닫음
    if (fsClose) { fsClose(); try { e.tuneClosed = true; } catch {} }
  });
  async function load(url) { const r = await fetch(url); if (!r.ok) throw new Error("음정선을 못 불러왔어요"); const j = await r.json(); return j && Array.isArray(j.pts) ? j : null; }
  const legend = (withCorr) => `<div class="tuneLeg"><span><i style="background:#ffe066"></i>부른 음정</span>${withCorr ? `<span><i style="background:#7fd9ff"></i>보정 후</span><span><i style="background:#ffd27a;opacity:.6"></i>고친 곳</span>` : ""}<span><i style="background:#ff9f5a;width:3px;height:11px"></i>지금</span></div>`;
  const css = `#tuneFs{position:fixed;inset:0;z-index:9999;background:rgba(8,10,13,.96)}#tuneFs .tfBox{position:absolute;left:50%;top:50%;display:flex;flex-direction:column;background:#0e1116;color:#eceff3;box-sizing:border-box;padding:8px 12px calc(8px + env(safe-area-inset-bottom))}
#tuneFs .tfTop,#tuneFs .tfBot{display:flex;align-items:center;gap:8px;flex:none}#tuneFs .tfTop{margin-bottom:6px}#tuneFs .tfTitle{font-size:15px}#tuneFs .tfTime{color:#a9b1bc;font-size:13px;font-variant-numeric:tabular-nums}
#tuneFs .tfAb{display:flex;margin-left:auto;border:1px solid #363c45;border-radius:10px;overflow:hidden}#tuneFs .tfAb button{border:0;border-radius:0;margin:0;background:#11141a;color:#a9b1bc;font-weight:800;min-height:34px;padding:0 14px}#tuneFs .tfAb button.on{background:#9cc3ff;color:#10141a}#tuneFs .tfAb button[data-m=p].on{background:#c9a6ff}
#tuneFs .tfX{margin-left:8px;display:flex;align-items:center;gap:6px;height:46px;padding:0 16px;border-radius:24px;border:2px solid #eceff3;background:#2a2f38;color:#fff;font-weight:800;font-size:15px;flex:none}#tuneFs .tfX i{font-style:normal;font-size:20px;line-height:1;margin-right:2px}#tuneFs .tfCv{flex:1;min-height:0;width:100%;display:block;border-radius:10px;background:#11141a}
#tuneFs .tfCvBox{position:relative;flex:1;min-height:0;display:flex}#tuneFs .tfAdvPv{position:absolute;left:50%;bottom:6px;transform:translateX(-50%);z-index:5;pointer-events:auto;cursor:pointer;white-space:nowrap;display:flex;align-items:center;gap:6px;font:800 12px/1.1 system-ui,sans-serif;color:#f6f0ff;background:linear-gradient(90deg,#8e6cf0,#b48cff);border:0;border-radius:16px;padding:2px 11px 2px 3px;min-height:0!important;box-shadow:0 3px 10px rgba(150,110,255,.4);transition:opacity .35s}#tuneFs .tfAdvPv.gone{opacity:0;pointer-events:none}#tuneFs .tfAdvPv .ic{width:18px;height:18px;border-radius:50%;background:#fff;color:#6b4fd6;display:grid;place-items:center;font-size:10px}#tuneFs .tfAdvPv small{font-weight:600;opacity:.85;font-size:10.5px}#tuneFs .tfAdvPv.play{background:rgba(40,30,70,.92);box-shadow:inset 0 0 0 2px #b48cff}#tuneFs .tfAdvPv.play .ic{background:#b48cff;color:#1b1430}#tuneFs .tfAdvPv.pop{animation:tfPvPop .45s cubic-bezier(.3,1.6,.5,1)}@keyframes tfPvPop{0%{transform:translateX(-50%) scale(.7);opacity:.3}100%{transform:translateX(-50%) scale(1);opacity:1}}#tuneFs .tfSkip{position:absolute;left:50%;transform:translateX(-50%);bottom:16%;z-index:5;white-space:nowrap;opacity:1;transition:opacity .2s ease;border:0;border-radius:12px;background:#9cc3ff;color:#111;font-weight:800;font-size:14px;padding:10px 14px}#tuneFs .tfSkip.off{opacity:0;visibility:hidden;pointer-events:none;transition:opacity 1.8s ease,visibility 0s linear 1.8s}/* (11/03 16:19 사용자) 그래프 가운데 아래쪽으로 */#tuneFs .tfMid{position:absolute;left:50%;top:9%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(156,195,255,.12);color:rgba(255,255,255,.55);font-size:18px;display:grid;place-items:center;pointer-events:none;opacity:0;transform:scale(.6)}
#tuneFs .tfMid.stay.go{animation:tfPop .22s cubic-bezier(.3,1.5,.5,1) forwards}#tuneFs .tfMid.flash.go{animation:tfFlash .3s ease-out forwards}
@keyframes tfPop{from{opacity:0;transform:scale(.6)}to{opacity:.8;transform:scale(1)}}@keyframes tfFlash{0%{opacity:0;transform:scale(.7)}25%{opacity:.8;transform:scale(1.05)}100%{opacity:0;transform:scale(1.2)}}
#tuneFs .tfBot{justify-content:space-between;align-items:flex-end;gap:16px}#tuneFs .tfHint{font-size:11.5px;color:#7d8590;line-height:1.4;word-break:keep-all;text-wrap:balance;max-width:34%}
#tuneFs .tfNote{font-size:11.5px;color:#c9b98f;text-align:right;line-height:1.45;word-break:keep-all;text-wrap:balance;max-width:36%}
#tuneFs .tfTop .tfLeg{margin-left:10px}#tuneFs .tfNoteChip{margin:0 0 0 auto!important;min-height:0!important;height:26px!important;padding:0 10px!important;border-radius:13px!important;border:1.5px solid #4a505c;background:#11141a;color:#e8e8ea;font-size:12.5px!important;font-weight:800;white-space:nowrap}#tuneFs .tfNoteChip[hidden]{display:none}#tuneFs .tfNoteChip+.tfX{margin-left:8px!important}#tuneFs .port .tfNoteChip{order:3;margin-left:auto!important}#tuneFs .port .tfTop .tfXp{order:4!important}#tuneFs .port .tfNoteChip:not([hidden]){margin-right:6px!important}#tuneFs .port .tfTop:has(.tfNoteChip:not([hidden])) .tfLeg span{white-space:nowrap;font-size:11px}#tuneFs .port .tfTop:has(.tfNoteChip:not([hidden])) .tfLeg{gap:6px}#tuneFs .port .tfTop .tfLeg span{white-space:nowrap}#tuneFs .tfNoteChip.on{background:#c7a4ff;color:#1a1030;border-color:#c7a4ff}#tuneFs .tfNoteChip{display:inline-flex;align-items:center;gap:5px}#tuneFs .tfNoteChip .tfCk{width:14px;height:14px;border-radius:4px;border:1.5px solid #b48cff;display:grid;place-items:center;font-style:normal;font-size:10px;line-height:1;flex:none}#tuneFs .tfNoteChip.on .tfCk{background:#1a1030;border-color:#1a1030;color:#c7a4ff}#tuneFs .tfNoteChip.on .tfCk:after{content:"✓"}   /* (11/07 10:04 사용자) 💬 한마디 버튼에 체크 상자 */#tuneFs .tfNoteChip.blink{animation:tfChipBlink .55s ease-in-out infinite alternate}@keyframes tfChipBlink{from{box-shadow:0 0 0 0 rgba(199,164,255,0);border-color:#4a505c;background:#11141a}to{box-shadow:0 0 14px 3px rgba(199,164,255,.9);border-color:#c7a4ff;background:#2a2140;color:#fff}}#tuneFs .tfXp,#tuneFs .tfBr{display:none}
#tuneFs .tfBye{position:absolute;left:50%;bottom:16px;transform:translateX(-50%);background:rgba(30,34,42,.85);border:1px solid rgba(255,255,255,.18);padding:8px 16px;border-radius:20px;font-size:14px;white-space:nowrap;pointer-events:none;opacity:0}#tuneFs .tfBye b{color:#ffd27a}#tuneFs .tfRot{position:absolute;inset:0;z-index:5;background:rgba(8,10,13,.45);display:flex;align-items:center;justify-content:center;animation:rpIn .25s ease-out}#tuneFs .tfRot.out{opacity:0;transition:opacity .3s}
#tuneFs .rpBox{color:#f1f1f1;width:min(260px,80vw);background:rgba(24,28,35,.97);border:1px solid rgba(255,210,122,.45);border-radius:18px;padding:18px 16px 14px;text-align:center;box-shadow:0 10px 30px rgba(0,0,0,.5)}#tuneFs .rpBox b{display:block;font-size:16px;margin-bottom:4px}#tuneFs .rpBox p{margin:0;font-size:13.5px;color:#b9bec7}
#tuneFs .rpIc{width:60px;height:56px;margin:0 auto 10px;position:relative}#tuneFs .rpIc i{position:absolute;left:18px;top:4px;width:22px;height:40px;border:3px solid #ffd27a;border-radius:6px;animation:rpTurn 1.4s ease-in-out infinite}#tuneFs .rpIc span{position:absolute;right:0;top:-6px;font-size:22px;color:#ffd27a}
#tuneFs .rpBar{height:3px;background:#2a2f38;border-radius:2px;margin-top:12px;overflow:hidden}#tuneFs .rpBar i{display:block;height:100%;width:100%;background:#ffd27a;animation:rpBar 2s linear forwards}
@keyframes rpIn{from{opacity:0}to{opacity:1}}@keyframes rpBar{to{width:0}}@keyframes rpTurn{0%,20%{transform:rotate(0)}60%,100%{transform:rotate(-90deg)}}
#tuneFs .tfBye.go{animation:tfBye 1.9s ease forwards}
@keyframes tfBye{0%{opacity:0}12%{opacity:1}80%{opacity:1}100%{opacity:0}}
#tuneFs .tfBox.port{padding-top:calc(10px + env(safe-area-inset-top))}#tuneFs .port .tfTop{flex-wrap:wrap;row-gap:8px}#tuneFs .port .tfTitle{font-size:17px}
#tuneFs .port .tfXp{display:block;margin-left:auto}#tuneFs .port .tfX:not(.tfXp){display:none}#tuneFs .port .tfBr{display:block;flex-basis:100%;height:0}
#tuneFs .port .tfLeg{margin-left:0}#tuneFs .port .tfLegC{display:none}#tuneFs .port .tfAb{margin-left:auto}
#tuneFs .port .tfBot{flex-direction:column;align-items:stretch;gap:10px;margin-top:10px}#tuneFs .tfCtl{display:flex;align-items:center;gap:10px;flex:none;align-self:center}#tuneFs .tfCtl .tfAb{margin:0;border-radius:22px;padding:3px;background:#11141a}#tuneFs .tfCtl .tfAb button{border:0;height:auto;min-width:0;border-radius:18px;min-height:38px;padding:0 16px;font-size:14px}#tuneFs .port .tfCtl{order:-1;flex-direction:column;gap:10px}#tuneFs .port .tfCtl .tfAb button{min-height:46px;padding:0 28px;font-size:16px}#tuneFs .port .tfNav{justify-content:center;gap:10px}#tuneFs .port .tfNav button{min-width:84px;height:46px;font-size:15px}
#tuneFs .port .tfHint,#tuneFs .port .tfNote{max-width:none;text-align:left}#tuneFs .port .tfHint br{display:none}#tuneFs .tfSep{display:none}#tuneFs .port .tfSep{display:inline}
#tuneFs .tfBot{margin-top:6px}#tuneFs .tfNav{display:flex;gap:8px;flex:none;align-self:center}#tuneFs .tfNav button{min-width:64px;padding:0 12px;font-size:14px;background:rgba(30,34,42,.75)}#tuneFs .tfNav .tfPP{min-width:58px;background:#9cc3ff;color:#10141a;border-color:#9cc3ff;font-size:16px;font-weight:900}#tuneFs .tfBot button{min-width:52px;height:38px;border-radius:10px;border:1px solid #363c45;background:#11141a;color:#eceff3;font-weight:800;margin:0}#tuneFs .tfBot .tfPP{background:#9cc3ff;color:#10141a;border:0;min-width:64px}
#tuneFs .tfLeg{display:flex;gap:12px;margin-left:auto;font-size:12px;color:#a9b1bc;flex-wrap:wrap}#tuneFs .tfLeg i{display:inline-block;width:16px;height:3px;border-radius:2px;vertical-align:middle;margin-right:4px}
@media (prefers-reduced-motion: reduce){#tuneFs .tfBox{animation:none}}
.tuneWrap{position:relative}.tuneMid{position:absolute;left:50%;top:44%;width:60px;height:60px;margin:-30px 0 0 -30px;border-radius:50%;background:rgba(156,195,255,.18);color:rgba(255,255,255,.8);font-size:22px;display:grid;place-items:center;pointer-events:none;opacity:0;transform:scale(.6)}
.tuneMid.stay.go{animation:tfPop .22s cubic-bezier(.3,1.5,.5,1) forwards}.tuneMid.flash.go{animation:tfFlash .3s ease-out forwards}
/* (11/02 20:26 사용자) '듣는 소리' 빼고 아래 버튼 높이만 70%로(46→32) */#tuneFs .tfAbL{display:none}#tuneFs,#tuneFs button,#tuneFs .tfFix,#tuneFs .tfFix *{touch-action:manipulation}#tuneFs .tfCv{touch-action:none}#tuneFs .tfBot .tfVoice{height:28px;min-height:0;padding:0 10px;margin:0 0 0 8px;border-radius:14px;border:1.5px solid #3b4250;background:#11141a;color:#eceff3;font-size:12.5px;font-weight:800}#tuneFs .tfC{font-size:12px;color:#ffd27a;margin-left:3px}.tuneExit{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);max-height:calc(100vh - 40px);overflow-y:auto;width:min(420px,calc(100vw - 28px));box-sizing:border-box;z-index:10003;background:#1b2028;border:1.5px solid #3c7a4f;border-radius:18px;padding:14px 14px 12px;box-shadow:0 0 0 100vmax rgba(0,0,0,.45),0 12px 30px rgba(0,0,0,.55);color:#e8e8ea;animation:tfTipIn .25s ease}   /* (11/07 09:22 사용자) 화면 가운데 + 뒤를 살짝 어둡게 */.tuneExit.bad{border-color:#a34b4b}.tuneExit .teHd{display:flex;align-items:center;gap:8px;font-weight:800;font-size:16px;color:#8fe3a8}.tuneExit.bad .teHd{color:#ff9a9a}.tuneExit .teHd small{margin-left:auto;color:#8d96a3;font-weight:600;font-size:12px}.tuneExit .teChips{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0 8px}.tuneExit .teChips:empty{display:none}.tuneExit .teChips span{padding:5px 10px;border-radius:12px;background:#11141a;border:1px solid #3b4250;font-size:13px}.tuneExit .teChips b{color:#ffcf99}.tuneExit .teLn{font-size:13px;color:#b6bdc7;margin:4px 0;line-height:1.45;word-break:keep-all}.tuneExit .teLn b{color:#e8e8ea}.tuneExit .teActs{display:flex;gap:8px;margin-top:10px}.tuneExit .teActs button{flex:1;margin:0;min-height:0!important;height:42px!important;border-radius:12px;border:1.5px solid #3b4250;background:#11141a;color:#cfd3da;font-weight:800;font-size:14px}.tuneExit .teActs button.pri{background:#9cc3ff;color:#0b0d11;border:0}.tuneExit.bad .teActs button.pri{background:#ffb86b}.tuneExit .teBar{position:absolute;left:0;bottom:0;height:3px;width:100%;background:#3c7a4f;transform-origin:left}.tuneExit .teBar.go{animation:teBar 6s linear forwards}@keyframes teBar{from{transform:scaleX(1)}to{transform:scaleX(0)}}.tuneSaveT{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10003;background:rgba(24,28,35,.96);border:1.5px solid #3b4250;color:#eceff3;font-weight:800;font-size:14px;border-radius:20px;padding:10px 18px;box-shadow:0 6px 20px rgba(0,0,0,.5);pointer-events:none;white-space:nowrap}/* (11/03 02:13 사용자) 앱 전체 button 최소 높이(52px)가 덮어써서 줄인 게 안 보였음 → 높이를 직접 고정: 닫기 28 · 스위치 46 · 재생 버튼 40(지금 스위치 높이) */#tuneFs .port .tfXp{height:28px!important;min-height:0!important;padding:0 10px!important;font-size:12.5px!important}#tuneFs .port .tfXp i{font-size:13px!important}#tuneFs .port .tfCtl .tfAb{height:60px;box-sizing:border-box}#tuneFs .port .tfCtl .tfAb button{min-height:0!important;height:50px!important;font-size:16px}#tuneFs .port .tfNav button{min-height:0!important;height:40px!important}#tuneFs .tfCtl .tfAb .tfSwap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;width:24px;height:24px;border-radius:50%;background:#1a1e25;border:1.5px solid #3b4250;color:#cfd3da;font-style:normal;font-size:13px;font-weight:900;display:grid;place-items:center;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.6)}#tuneFs .tfCtl .tfAb button[data-m="o"]{padding-right:16px!important}#tuneFs .tfCtl .tfAb button[data-m="p"]{padding-left:16px!important}#tuneFs .tfLoad.now{transition:none!important}#tuneFs .tfLoadOld{position:absolute;left:50%;top:42%;transform:translate(-50%,-50%);z-index:6;display:none;flex-direction:column;align-items:center;gap:6px;background:rgba(17,20,26,.92);border:1px solid #3b4250;border-radius:16px;padding:16px 20px;pointer-events:none;text-align:center;color:#eceff3}#tuneFs .tfLoadOld.on{display:flex}#tuneFs .tfLoadOld i{width:30px;height:30px;border-radius:50%;border:3px solid #3b4250;border-top-color:#9cc3ff;animation:tfSpin .9s linear infinite}#tuneFs .tfLoadOld b{font-size:15px}#tuneFs .tfLoadOld small{font-size:12px;color:#9aa3ad;white-space:nowrap}#tuneFs .tfTop,#tuneFs .tfBot{zoom:var(--ui,1)}#tuneFs .tfBot{position:relative}#tuneFs .tfTipsBtn{display:inline-flex;align-items:center;margin:6px 0 0 4px!important;min-height:0!important;height:30px!important;padding:0 13px!important;border-radius:15px!important;border:0!important;background:#ffd27a!important;color:#1d1606!important;font-size:13px!important;font-weight:800;box-shadow:0 2px 10px rgba(255,210,122,.35)}#tuneFs .tfTipLine{position:absolute;z-index:3;pointer-events:none;font-size:12px;line-height:1.45;color:#ffd27a;word-break:keep-all;background:#0b0d11;opacity:0;transition:opacity 1.3s ease}#tuneFs .tfTipLine b{color:#c9b58a}#tuneFs .tfTipLine.on{opacity:1;transition:opacity .2s ease;pointer-events:auto;cursor:pointer}#tuneFs .tfBot .tfHint{transition:opacity 1.3s ease}#tuneFs .tfBot.tipOn .tfHint{opacity:0;transition:opacity .2s ease}#tuneFs:has(.tfFix) .tfTipLine{display:none}#tuneFs .tfLoad.fd{pointer-events:auto}#tuneFs .tfLoad .tfPn{display:inline-block;margin-left:6px;font-size:11.5px;font-weight:700;color:#5fd4ff;background:rgba(95,212,255,.12);border-radius:8px;padding:1px 7px}#tuneFs .tfLoad.pin .tfPn{display:inline-block}#tuneFs .tfLoad{position:absolute;left:50%;top:36%;transform:translate(calc(-50% + var(--dx,0px)),calc(-50% + var(--dy,0px)));z-index:6;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 16px!important;width:min(300px,78%);box-sizing:border-box;background:rgba(17,20,26,.92);border:1px solid #3b4250;border-radius:16px;padding:16px 20px;pointer-events:none;text-align:center;opacity:0;visibility:hidden;transition:opacity 1.3s ease,visibility 0s linear 1.3s;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}#tuneFs .tfLoad.on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .2s ease}#tuneFs .tfLoad.tipOnly .tfHg{display:none}#tuneFs .tfTipH{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:#9aa3ad;align-self:flex-start}#tuneFs .tfHg{display:inline-block;font-size:14px;animation:tfHg 1.6s ease-in-out infinite}@keyframes tfHg{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}#tuneFs .tfLoad i{width:30px;height:30px;border-radius:50%;border:3px solid #3b4250;border-top-color:#9cc3ff;animation:tfSpin .9s linear infinite}#tuneFs .tfLoad b{font-size:15px}#tuneFs .tfLoad .tfTip{margin:2px 0 0;max-width:280px;font-size:14px;line-height:1.55;color:#ffd27a;word-break:keep-all;text-align:left}#tuneFs .tfLoad .tfTip:empty{display:none}#tuneFs .tfLoad small{font-size:12px;color:#9aa3ad}@keyframes tfSpin{to{transform:rotate(360deg)}}#tuneFs .port .tfCtl .tfAb button{min-height:32px}#tuneFs .port .tfNav button{height:32px}#tuneFs .port .tfCtl{gap:7px}#tuneFs:has(.tfFix:not(.tfUni)) .tfNav,#tuneFs:has(.tfFix) .tfAbH,#tuneFs:has(.tfFix) .tfHint,#tuneFs:has(.tfFix) .tfNote,#tuneFs:has(.tfFix) .tfSkip{display:none}#tuneFs .tfFix.inBot{display:flex!important;flex-direction:column}#tuneFs .tfFix.inBot .tfFixBox{flex:1;display:flex;flex-direction:column;justify-content:center}#tuneFs .tfFixHd b{font-size:14px}#tuneFs .tfFixTm{margin-left:8px!important}#tuneFs .tfFixSt{margin-left:auto}#tuneFs .tfFixTip{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:7;background:rgba(17,20,26,.92);border:1.5px dashed #ffd27a;color:#ffd27a;font-size:12.5px;font-weight:700;border-radius:12px;padding:6px 12px;pointer-events:none;white-space:nowrap;animation:tfTipIn .25s ease}@keyframes tfTipIn{from{opacity:0}to{opacity:1}}#tuneFs .tfTitle{display:none}#tuneFs .port .tfBr{display:none!important}#tuneFs .port .tfTop{flex-wrap:nowrap}#tuneFs .port .tfLeg{order:1;flex-wrap:nowrap;gap:10px}#tuneFs .port .tfTime{order:2;font-size:12px}#tuneFs .port .tfXp{order:3;margin-left:auto;height:32px;padding:0 12px;font-size:13px;border-width:1.5px;border-radius:16px}#tuneFs .port .tfXp i{font-size:15px}#tuneFs .tfX:not(.tfXp){height:34px;padding:0 12px;font-size:13px;border-width:1.5px}#tuneFs .tfFixHd{display:flex;align-items:center;gap:8px}#tuneFs .tfFixTm{margin-left:auto;font-size:12.5px;color:#9aa3ad;white-space:nowrap}#tuneFs .tfFixSt{color:#7fd99a;font-size:12px;white-space:nowrap}#tuneFs .tfFixAb{position:relative;display:flex;width:178px;flex:none;border-radius:20px;background:#0b0d11;border:1.5px solid #3b4250;padding:3px;box-shadow:inset 0 2px 5px rgba(0,0,0,.7);box-sizing:border-box;overflow:visible}#tuneFs .tfFixAb::before{content:"";position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:17px;background:#e8e8ea;transition:left .22s ease,background .22s}#tuneFs .tfFixAb:has([data-m="p"].on)::before{left:50%;background:linear-gradient(135deg,#c7a4ff,#8f6cf0)}#tuneFs .tfBot .tfFixAb button{position:relative;flex:1;height:auto;min-width:0;min-height:36px;padding:0 4px;border:0;border-radius:17px;background:transparent;color:#7d8590;font-size:13.5px;font-weight:800;white-space:nowrap}#tuneFs .tfBot .tfFixAb button.on{color:#111}#tuneFs .tfBot .tfFixRow{gap:6px;margin-top:8px}#tuneFs .tfBot .tfFixRow button{flex:1;padding:0;min-height:48px;font-size:17px}#tuneFs .tfMulti .tfMNote{background:#7fd99a!important;color:#0b1a10!important;border:0!important;font-weight:900}#tuneFs .tfMulti .tfMNote:disabled{opacity:.4}#tuneFs .tfMulti.tfMGr [data-mn]{color:#7fd99a!important}#tuneFs .tfBot .tfFixRow button.tfFixN.tfNScr{position:relative;touch-action:none!important;cursor:ns-resize}#tuneFs .tfFixN.tfNScr::after{content:"";position:absolute;right:9px;top:9px;bottom:9px;width:8px;background:repeating-linear-gradient(180deg,rgba(127,217,154,.55) 0 1px,transparent 1px 5px);border-radius:2px;pointer-events:none}#tuneFs .tfFixN.tfNScr::before{content:"▴\A▾";white-space:pre;position:absolute;left:8px;top:50%;transform:translateY(-50%);font-size:10px;line-height:1.5;color:rgba(127,217,154,.6);pointer-events:none}#tuneFs .tfFixN.fineOn{animation:tfNFine .7s ease}@keyframes tfNFine{0%{box-shadow:0 0 0 0 rgba(255,184,107,.9)}100%{box-shadow:0 0 0 22px rgba(255,184,107,0)}}#tuneFs .tfFix.tfBu .tfBuT{margin-top:8px}#tuneFs .tfBot .tfFixRow button.tfFixN{flex:2.1;font-size:21px}#tuneFs .tfBot .tfFixRow button.tfIc{flex:.9;font-size:20px}.tfFix .tfT{display:none}.tfFix.tmode .tfT{display:flex}.tfFix.tmode .tfP{display:none}.tfFixMd{display:inline-flex;border:1px solid #363c45;border-radius:14px;padding:2px;background:#11141a;margin-right:8px}.tfFixMd button{border:0;margin:0;border-radius:12px;background:transparent;color:#a9b1bc;font-weight:800;font-size:12.5px;min-height:0!important;height:26px;padding:0 9px;white-space:nowrap}.tfFixMd button.on{background:#7fd99a;color:#10201a}.tfFixMd button[data-md="t"].on{background:#5fd4ff;color:#06222c}.tfFixRow button.tfTN{color:#5fd4ff;background:#0d1a20;border-color:#2b5566;font-size:19px;line-height:1.1}.tfTN small{display:block;font-size:11px;margin:2px 0 0}#tuneFs .tfMm{margin:0 0 0 6px!important;min-height:0!important;height:26px!important;padding:0 9px!important;border-radius:13px!important;border:1.5px solid #4a505c!important;background:#11141a!important;color:#e8e8ea!important;font-size:12px!important;font-weight:800;white-space:nowrap}#tuneFs .tfBot .tfFixRow button.tfMr{flex:3;font-size:15px;background:#ff6ec7;color:#1a0714;border:0}#tuneFs .tfBot .tfFixRow button.tfMr:disabled{background:#2a2f38;color:#8b939e}.tfFixRow button[data-r],.tfFixRow button[data-tr]{position:relative;overflow:hidden}.tfFixRow button.hold::after{content:"";position:absolute;left:0;bottom:0;height:4px;width:100%;background:#ffd27a;transform-origin:left;animation:tfHold 1s linear forwards}@keyframes tfHold{from{transform:scaleX(0)}to{transform:scaleX(1)}}.tfCfm{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}.tfCfmBox{background:#1a1e25;border:1.5px solid #3b4250;border-radius:16px;padding:16px 18px;width:min(340px,100%);color:#e8e8ea;box-shadow:0 8px 30px rgba(0,0,0,.6)}.tfCfmBox b{font-size:16px}.tfCfmBox p{font-size:13.5px;color:#b6bdc7;line-height:1.5;margin:8px 0 14px;word-break:keep-all}.tfCfmRow{display:flex;gap:8px}.tfCfmRow button{flex:1;min-height:0!important;height:44px!important;border-radius:12px;border:1.5px solid #3b4250;background:#11141a;color:#e8e8ea;font-weight:800;font-size:15px;margin:0}.tfCfmRow button.pri{background:#ffd27a;color:#111;border:0}#tuneFs .tfFix .tfT{display:none!important}#tuneFs .tfFix.tmode .tfT{display:flex!important}#tuneFs .tfFix.tmode .tfP{display:none!important}#tuneFs .tfFixMd button{min-height:0!important;height:28px!important;padding:0 10px!important;background:transparent!important;color:#a9b1bc!important;border:0!important;font-size:12.5px!important}#tuneFs .tfFixMd button.on{background:#7fd99a!important;color:#10201a!important}#tuneFs .tfFixMd button[data-md="t"].on{background:#5fd4ff!important;color:#06222c!important}#tuneFs .tfBot .tfFixRow button.tfTN{color:#5fd4ff!important;background:#0d1a20!important;border-color:#2b5566!important;font-size:18px;line-height:1.1}#tuneFs .tfTN small{display:block;font-size:10.5px!important;margin:2px 0 0!important;color:#9aa3ad}#tuneFs .tfFixLab{display:flex;gap:6px;margin-top:3px;font-size:10.5px;color:#7d8590;line-height:1.2}#tuneFs .tfFixLab span{flex:1;text-align:center;white-space:nowrap;overflow:hidden}#tuneFs .tfFixLab .n{flex:2.1}#tuneFs .tfFixLab .i{flex:.9}#tuneFs .tfFix.inBot .tfFixBox{padding:8px 10px}#tuneFs .tfFix.inBot{position:static;padding:0;display:block;flex:1 1 auto}#tuneFs .tfFix.inBot .tfFixBox{width:100%;box-sizing:border-box;box-shadow:none}#tuneFs .tfBot .tfFixRow button{height:auto;min-width:0;min-height:46px;border:1.5px solid #3b4250;border-radius:12px;background:#11141a;color:#e8e8ea;font-size:16px}#tuneFs .tfBot .tfFixRow button.pri{background:#9cc3ff;color:#111;border:none}#tuneFs .tfBot .tfFixRow button.tfFixN{font-size:22px;font-weight:900;color:#7fd99a;background:#0f1a14;border-color:#2f5a40}#tuneFs .tfBot .tfFixRow button.tfCut{font-size:20px}
#tuneFs .tfAbW{display:flex;flex-direction:column;align-items:center;gap:5px}#tuneFs .tfAbL,#tuneFs .tfAbH{font-size:12px;color:#9aa3ad;line-height:1}#tuneFs .tfAbH{font-size:11.5px;color:#7d8590}#tuneFs:not(:has(.port)) .tfAbL,#tuneFs:not(:has(.port)) .tfAbH{display:none}
#tuneFs .tfCtl .tfAb{position:relative;display:flex;width:250px;max-width:70vw;border-radius:26px;background:#0b0d11;border:1.5px solid #3b4250;padding:4px;box-shadow:inset 0 2px 6px rgba(0,0,0,.7);box-sizing:border-box}
#tuneFs .tfCtl .tfAb::before{content:"";position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);border-radius:22px;background:#e8e8ea;box-shadow:0 3px 8px rgba(0,0,0,.6);transition:left .22s ease,background .22s}
#tuneFs .tfCtl .tfAb:has([data-m="p"].on)::before{left:50%;background:linear-gradient(135deg,#c7a4ff,#8f6cf0)}
#tuneFs .tfCtl .tfAb button,#tuneFs .tfCtl .tfAb button.on,#tuneFs .port .tfCtl .tfAb button{position:relative;flex:1;padding:0 6px;white-space:nowrap;background:transparent;color:#7d8590;transition:color .22s}#tuneFs .tfCtl .tfAb button.on{color:#111}
@media (prefers-reduced-motion: reduce){#tuneFs .tfCtl .tfAb::before{transition:none}}
.tfFixAb{display:flex;border:1px solid #363c45;border-radius:16px;overflow:hidden;padding:2px;background:#11141a;flex:none}.tfFixAb button{border:0;margin:0;border-radius:14px;background:transparent;color:#a9b1bc;font-weight:800;font-size:12.5px;min-height:30px;padding:0 10px;white-space:nowrap}.tfFixAb button.on{background:#c7a4ff;color:#1a1030}.tfFixAb button[data-m="o"].on{background:#e8e8ea;color:#111}.tfFix{position:absolute;left:0;right:0;bottom:0;z-index:30;display:flex;justify-content:center;padding:12px}.tfFixBox{background:#1a1e25;border:1.5px solid #3b4250;border-radius:16px;padding:12px 14px;width:min(420px,100%);color:#e8e8ea;box-shadow:0 -6px 24px rgba(0,0,0,.5)}.tfFixRow{display:flex;gap:8px;align-items:center;margin-top:10px}.tfFixRow button{flex:1;min-height:46px;border:1.5px solid #3b4250;border-radius:12px;background:#11141a;color:#e8e8ea;font-weight:800;font-size:16px}.tfFixRow button.pri{background:#9cc3ff;color:#111;border:none}.tfFixRow button.tfCut{flex:0 0 52px;font-size:20px}.tfFixRow button.tfFixN{flex:2;white-space:nowrap;font-size:22px;font-weight:900;color:#7fd99a;background:#0f1a14;border-color:#2f5a40;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:manipulation}.tfFixN small{font-size:13px;color:#9aa3ad;font-weight:700;margin-left:6px}.tfFix,.tfFix *{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}.tuneZoom{display:flex;gap:6px;margin:8px 0 4px}.tuneZoom .tfOpen{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;margin:0;border:0;border-radius:12px;background:linear-gradient(135deg,#ffd27a,#c8912e);color:#1a1307;font-weight:800;font-size:.95rem;box-shadow:0 2px 12px rgba(255,190,90,.25)}.tuneZoom .tfOpen .ic{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:rgba(26,19,7,.15);font-size:15px}.tuneZoom button{border:1px solid #363c45;border-radius:10px;background:#11141a;color:#a9b1bc;font-weight:700;font-size:.8rem;min-height:32px;padding:0 12px;margin:0}.tuneZoom button.on{background:#9cc3ff;color:#10141a;border-color:#9cc3ff}`;
  const css2 = `#tuneSheet{position:fixed;inset:0;z-index:10001;background:rgba(0,0,0,.45);display:flex;align-items:flex-end;justify-content:center}#tuneSheet .tsBox{width:min(520px,100%);box-sizing:border-box;background:#171a20;color:#eceff3;border:1px solid #363c45;border-radius:16px 16px 0 0;padding:14px 14px calc(14px + env(safe-area-inset-bottom))}
#tuneSheet .tsHead{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;font-size:14px}#tuneSheet .tsSrc{font-size:12px;color:#ffd27a}#tuneSheet .tsTx{width:100%;box-sizing:border-box;background:#0f1116;color:#f1f1f1;border:1px solid #3a3f49;border-radius:10px;padding:10px;font-size:16px;line-height:1.5;font-family:inherit;resize:none}
#tuneSheet .tsTxW{position:relative}#tuneSheet .tsTxW .tsTx{padding-right:104px}#tuneSheet .tsClr{position:absolute;right:8px;top:8px;margin:0;border:0;border-radius:12px;background:#2a2f38;color:#eceff3;font-weight:700;font-size:12.5px;min-height:30px;padding:0 10px}
#tuneUndo{position:fixed;left:50%;bottom:calc(24px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10002;display:flex;align-items:center;gap:14px;background:#2a2f38;color:#eceff3;border-radius:14px;padding:10px 12px 10px 16px;font-size:14px;box-shadow:0 4px 18px rgba(0,0,0,.4)}#tuneUndo button{margin:0;border:0;background:transparent;color:#ffd27a;font-weight:800;font-size:14px;min-height:34px;padding:0 6px}
#tuneSheet .tsBox{position:relative}#tuneSheet .tsCf{position:absolute;inset:0;background:rgba(0,0,0,.55);border-radius:16px 16px 0 0;display:flex;align-items:flex-start;justify-content:center;padding-top:30px}
#tuneSheet .tsCfBox{width:calc(100% - 40px);box-sizing:border-box;background:#1e2229;border:1px solid #3a3f49;border-radius:16px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,.6)}#tuneSheet .tsCfBox b{display:block;font-size:16px;margin-bottom:6px}#tuneSheet .tsCfBox p{margin:0 0 12px;font-size:13.5px;color:#b9bec7;word-break:keep-all}
#tuneSheet .tsCk{display:flex;align-items:center;gap:8px;font-size:14px;margin-bottom:14px}#tuneSheet .tsCk input{width:20px;height:20px;margin:0;accent-color:#7fd99a}
#tuneSheet .tsCfRow{display:flex;gap:8px}#tuneSheet .tsCfRow button{flex:1;min-height:46px;border-radius:22px;border:1px solid #3a3f49;background:#11141a;color:#eceff3;font-weight:800;font-size:15px;margin:0}#tuneSheet .tsCfRow .cfYes{background:#ff8a8a;color:#2a1010;border:0}
#tuneSheet .tsAdj button{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}#tuneSheet .tsKind{display:flex;gap:0;margin:8px 0 2px;border:1px solid #3a3f49;border-radius:12px;overflow:hidden}#tuneSheet .tsKind button{flex:1;min-height:40px;margin:0;border:0;border-radius:0;background:#11141a;color:#a9b1bc;font-weight:800;font-size:14px}#tuneSheet .tsKind button.on{background:#7fd99a;color:#0f1a14}
#tuneSheet .tsEv{font-size:12px;color:#a9b1bc;margin:8px 0;line-height:1.5;background:#11141a;border-radius:8px;padding:7px 9px}#tuneSheet .tsAdj{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:8px 0;font-size:12.5px;color:#a9b1bc}#tuneSheet .tsAdj button{border:1px solid #363c45;background:#11141a;color:#eceff3;border-radius:8px;min-height:34px;padding:0 10px;margin:0;font-weight:700}
#tuneSheet .tsRow{display:flex;gap:8px;margin-top:10px}#tuneSheet .tsRow button{flex:1;min-height:46px;border-radius:22px;border:1px solid #3a3f49;background:#11141a;color:#eceff3;font-weight:800;font-size:15px;margin:0}#tuneSheet .tsRow .tsOk{background:#7fd99a;color:#10201a;border:0}#tuneSheet .tsRow .tsDel{color:#ff9a9a}#tuneFs .tfMulti .tfMB{display:flex;align-items:center;gap:6px}#tuneFs .tfMulti .tfMI{flex:1;min-width:0;line-height:1.25}#tuneFs .tfMulti .tfMI b{display:block;font-size:14px;color:#ff8fd6;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tuneFs .tfMulti .tfMI .tfFixTm{display:block;margin:0!important;font-size:12px;color:#a9b1bc}#tuneFs .tfMulti .tfMB button{flex:none;min-width:40px;height:44px;margin:0;padding:0 6px;border-radius:22px;border:1.5px solid #4a505c;background:#11141a;color:#eceff3;font-weight:800;font-size:18px}#tuneFs .tfMulti .tfMB button:disabled{opacity:.4}#tuneFs .tfMulti .tfMB button.tfMr{background:#ff6ec7;color:#1a0714;border:0;font-size:14px;padding:0 12px}#tuneFs .tfMulti .tfMB button.tfMr:disabled{background:#2a2f38;color:#8b939e;opacity:1}#tuneFs .tfMulti .tfMH{white-space:normal!important;margin:6px 0 0!important;font-size:11.5px;line-height:1.3;color:#8b939e;text-align:center}#tuneFs .tfModeSeg{display:inline-flex;flex:none;border:1.5px solid #4a505c;border-radius:18px;padding:2px;background:#11141a;margin-right:4px}#tuneFs .tfModeSeg button{border:0;margin:0;border-radius:15px;background:transparent;color:#a9b1bc;font-weight:800;font-size:13px;min-height:0!important;height:30px;padding:0 12px;white-space:nowrap}#tuneFs .tfModeSeg button.on{background:#ffd27a;color:#1d1405}#tuneFs .tfModeSeg button[data-md2="1"].on{background:#ffb86b}#tuneFs.advOn .tfHint,#tuneFs.advOn .tfNote{display:none}#tuneFs.advOn .tfCtl .tfAb button,#tuneFs.advOn .port .tfCtl .tfAb button{min-height:0!important;height:34px!important;font-size:13px!important;padding:0 10px!important}#tuneFs.advOn .port .tfCtl .tfAb{height:auto!important}#tuneFs.advOn .tfLeg{display:none}#tuneFs.advOn .port .tfTop{flex-wrap:wrap;row-gap:6px}#tuneFs.advOn .port .tfModeSeg{order:0}#tuneFs.advOn .port .tfTime{order:1;margin-left:6px}#tuneFs.advOn .port .tfTop{position:relative;padding-right:60px}#tuneFs.advOn .port .tfModeSeg{margin-right:0}#tuneFs.advOn .port .tfTime{margin-left:0!important}#tuneFs.advOn .port .tfTop .tfX{position:absolute;right:0;top:4px;margin:0}#tuneFs.advOn .port .tfTop .tfAdvG{order:2}#tuneFs .tfBrk{display:none}#tuneFs.advOn .port .tfTop .tfAdvG{margin-left:0!important;padding:0 9px!important}#tuneFs.advOn .port .tfTop{padding-right:0!important;column-gap:6px}#tuneFs .tfAdvG.advNoteB.on{background:#2a2145!important;color:#efe6ff!important;border-color:#b48cff!important}#tuneFs .tfAdvG.advNoteB{display:inline-flex;align-items:center;gap:5px;border-color:#6d5bb0!important;color:#d9c8ff!important;background:#1e1830!important}#tuneFs .advNoteB i{width:14px;height:14px;border-radius:4px;border:1.5px solid #b48cff;display:grid;place-items:center;font-style:normal;font-size:10px;line-height:1}#tuneFs .advNoteB.on i{background:#b48cff;color:#1b1430}#tuneFs .advNoteB.on i:after{content:"✓"}#tuneFs .advNoteB.on{box-shadow:0 0 10px rgba(180,140,255,.4)}#tuneFs .advNoteB[hidden]{display:none}.tfPop.sm{pointer-events:none;z-index:auto;font-size:12.5px;max-width:min(230px,calc(100% - 8px));padding:5px 9px 6px;border-radius:12px}.tfPop.sm.stu{font-size:14px;max-width:min(240px,calc(100% - 8px))}.tfPop.sm .pH{font-size:10.5px;padding-right:0}.tfPop{position:absolute;z-index:6;width:max-content;max-width:min(280px,calc(100% - 8px));transform:translateY(-100%);background:rgba(24,28,36,.97);border:1.8px solid var(--pc,#c4a3ff);border-radius:14px;padding:7px 11px 8px;box-shadow:0 8px 22px rgba(0,0,0,.55);color:#eceff3;font:600 13.5px/1.4 system-ui,sans-serif;animation:tfPopIn .18s ease;cursor:pointer}.tfPop.down{transform:none}.tfPop.out{opacity:0;transition:opacity .18s}.tfPop .pH{font-size:11.5px;font-weight:800;color:var(--pc,#c4a3ff);margin-bottom:1px;padding-right:26px}.tfPop .pT{white-space:pre-wrap;word-break:keep-all}.tfPop.stu{max-width:min(320px,calc(100% - 8px));font-size:16px}.tfPop.stu .pH{padding-right:0;font-size:12.5px}.tfPop.long:not(.open) .pT{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}.tfPop.open .pMore{display:none}.tfPop .pMore{color:#9cc3ff;font-size:12.5px;font-weight:700}.tfPop .pX{position:absolute;right:7px;top:6px;width:24px;height:24px;min-height:0!important;padding:0!important;border-radius:50%;border:1.5px solid #e07a7a;background:transparent;color:#e07a7a;font-size:12px;line-height:1}.tfPop .pEd{display:flex;gap:6px;margin-top:7px}.tfPop .pEd button{flex:1;min-height:0!important;height:30px;border-radius:9px;border:0;font-size:12.5px;font-weight:700;background:#2e343d;color:#eceff3}.tfPop .pEd [data-pe=del]{background:#3a1f22;color:#ff9a9a}.tfPop:after{content:"";position:absolute;left:var(--ax,16px);bottom:-8px;border:8px solid transparent;border-bottom:0;border-top-color:var(--pc,#c4a3ff)}.tfPop.down:after{bottom:auto;top:-8px;border-top:0;border-bottom:8px solid var(--pc,#c4a3ff)}@keyframes tfPopIn{from{opacity:0}to{opacity:1}}#tuneFs.advOn .port .tfTop .tfBrk{display:block;flex-basis:100%;height:0;order:1}#tuneFs.advOn .port .tfTop .tfTime{display:none}#tuneFs .tfBox:not(.port) .tfTop .tfX{height:36px!important;min-height:0!important;padding:0 12px!important;font-size:13px!important;border-width:1.5px!important;border-radius:18px!important}#tuneFs .tfBox:not(.port) .tfTop .tfX i{font-size:16px}#tuneFs .tfUR{display:inline-flex;gap:4px;flex:none;margin:0 4px}#tuneFs .tfUR button{width:36px;height:36px;min-height:0!important;padding:0;margin:0;border-radius:18px;border:1.5px solid #4a505c;background:#11141a;color:#eceff3;font-size:19px;font-weight:800;line-height:1}#tuneFs .tfUR button:disabled{opacity:.35}#tuneFs .tfHist{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.5);display:flex;align-items:flex-end;justify-content:center}#tuneFs .tfHistBox{width:100%;max-width:520px;max-height:62%;display:flex;flex-direction:column;background:#161a21;border:1px solid #363c45;border-radius:18px 18px 0 0;padding:12px 12px 14px}#tuneFs .tfHistHd{display:flex;align-items:center;gap:8px;margin-bottom:8px}#tuneFs .tfHistHd b{font-size:15px}#tuneFs .tfHistHd span{font-size:12px;color:#8b939e;flex:1}#tuneFs .tfHistX{width:36px;height:36px;min-height:0!important;padding:0;border-radius:18px;border:1.5px solid #4a505c;background:#11141a;color:#eceff3;font-size:16px}#tuneFs .tfHist ol{list-style:none;margin:0;padding:0;overflow:auto;display:flex;flex-direction:column;gap:6px}#tuneFs .tfHist li{margin:0}#tuneFs .tfHist li button{width:100%;min-height:0!important;height:42px;text-align:left;padding:0 14px;border-radius:12px;border:1px solid #363c45;background:#11141a;color:#e8e8ea;font-size:14px;font-weight:700;margin:0}#tuneFs .tfHist li button.cur{border-color:#7fd99a;background:#14231b;color:#c9f5d6}#tuneFs .tfHist li button.fut{opacity:.5;border-style:dashed}#tuneFs.advOn .port .tfUR{order:0}#tuneFs .rpNo{display:flex;align-items:center;justify-content:center;gap:8px;margin-top:12px;font-size:14px;color:#cfd5dd;min-height:40px}#tuneFs .rpNo input{width:20px;height:20px;margin:0;accent-color:#ffd27a}#tuneFs .rpOk{margin:6px 0 0;width:100%;min-height:42px;border-radius:21px;border:0;background:#ffd27a;color:#2a1a00;font-weight:800;font-size:15px}/* (11/05 사용자 스크린샷) 가로 + 🎛 고급 창: 그래프가 얇은 띠로 눌리지 않게 — 창을 오른쪽 전체 높이 패널로, 그래프·원음/보정본은 왼쪽 */#tuneFs .tfBox:not(.port):has(.tfFix.inBot.tfUni){display:grid;grid-template-columns:minmax(0,1fr) min(360px,48vw);grid-template-rows:auto minmax(0,1fr) auto;column-gap:10px}#tuneFs .tfBox:not(.port):has(.tfFix.inBot.tfUni)>.tfTop{grid-column:1/-1;grid-row:1}#tuneFs .tfBox:not(.port):has(.tfFix.inBot.tfUni)>.tfCvBox{grid-column:1;grid-row:2;min-height:0;height:auto}#tuneFs .tfBox:not(.port):has(.tfFix.inBot.tfUni)>.tfBot{display:contents}#tuneFs .tfBox:not(.port):has(.tfFix.inBot.tfUni) .tfCtl{grid-column:1;grid-row:3;justify-self:center;margin-top:6px}#tuneFs .tfBox:not(.port) .tfFix.inBot.tfUni{grid-column:2;grid-row:2/4;min-height:0!important;max-height:100%;overflow-y:auto;margin:0}/* (11/05 사용자 시안 승인) 보정 모드 한 창: 위(시간·✂·↺ / 음정 / 타이밍)는 고정, 아래 고급만 스크롤 */#tuneFs .tfFix.inBot.tfUni{display:flex!important;flex-direction:column;height:clamp(190px,36vh,260px);flex:none;min-height:0!important;padding:0;margin:0}#tuneFs .tfFix.tfUni .tfFixBox{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;justify-content:flex-start!important;padding:0 8px 6px!important;display:block!important}#tuneFs .tfFix.tfUni .tfUniTop{position:sticky;top:0;z-index:2;background:#1a1e25;padding:6px 0 4px}#tuneFs .tfFix.tfUni .tfFixHd{display:flex;align-items:center;gap:8px;margin-bottom:4px;min-height:34px}#tuneFs .tfFix.tfUni .tfFixTm{font-size:12px;color:#9aa3ad}#tuneFs .tfFix.tfUni .tfFixSt{display:block;font-size:11.5px;color:#7fd99a;min-height:14px;line-height:14px;margin:0 0 2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#tuneFs .tfFix.tfUni .tfFixSt:empty{display:none}#tuneFs .tfBot .tfFix.tfUni .tfFixRow button.tfIc{flex:.9;font-size:19px}#tuneFs .tfFix.tfUni .tfOrgRow{display:flex;align-items:center;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid #2c3038;font-size:12px;color:#9aa3ad;line-height:1.4}#tuneFs .tfFix.tfUni .tfOrgRow span{flex:1}#tuneFs .tfFix.tfUni .tfOrgRow button{flex:none;height:36px;min-height:0!important;padding:0 14px;margin:0;border-radius:12px;border:1.5px solid #6b3a58;background:#11141a;color:#ffb3dd;font-size:13.5px;font-weight:800}#tuneFs .tfUniIc{margin-left:auto;display:flex;gap:6px;flex:none}#tuneFs .tfUniIc button{position:relative;overflow:hidden;width:40px;height:34px;min-height:0!important;padding:0;margin:0;border-radius:12px;border:1.5px solid #4a505c;background:#11141a;color:#eceff3;font-size:17px;font-weight:800;line-height:1}#tuneFs .tfUniIc button.hold::after{content:"";position:absolute;left:0;bottom:0;height:4px;width:100%;background:#ffd27a;transform-origin:left;animation:tfHold 1s linear forwards}#tuneFs .tfFix.tfUni .tfT{display:flex!important;margin-top:4px}#tuneFs .tfFix.tfUni .tfP{gap:4px}#tuneFs .tfBot .tfFix.tfUni .tfP button{flex:none;width:34px;min-width:0;min-height:0;height:44px;padding:0;font-size:15px}#tuneFs .tfBot .tfFix.tfUni .tfP button.tfTm{width:30px;font-size:14px;color:#5fd4ff;background:#0d1a20;border-color:#2b5566}#tuneFs .tfBot .tfFix.tfUni .tfP button.tfFixN{flex:1;width:auto;font-size:19px}#tuneFs .tfBot .tfFix.tfUni .tfP button.tfLen{font-size:12.5px;font-weight:800;color:#ffd27a;background:#1d1a0d;border-color:#5a4a1f}#tuneFs .tfFix.tfUni .tfFixLab{display:none!important}#tuneFs .tfBot .tfFix.tfUni .tfFixRow button{min-height:40px;height:40px;font-size:16px}#tuneFs .tfBot .tfFix.tfUni .tfP button.tfFixN{font-size:19px}#tuneFs .tfFix.tfUni .tfLb{flex:none;font-size:12px;color:#9aa3ad;padding:0 2px}#tuneFs .tfFix.tfUni .tfA{display:block}#tuneFs .tfFix.tfUni .tfFixTm,#tuneFs .tfFix.tfUni .tfFixSt{font-family:inherit}#tuneFs .port .tfNav{width:100%;box-sizing:border-box}#tuneFs .port .tfNav button{min-width:0;flex:1}#tuneFs .tfFix.tfUni .advPanel{margin-top:6px;border-top:1px solid #2c3038;padding-top:6px}#tuneFs .tfFix.tfUni .advPanel .advBody{max-height:none;overflow:visible}#tuneFs .tfFix.tfUni .advRst{display:none!important}#tuneFs .tfFix.tfUni .advTabs{flex-wrap:nowrap;overflow-x:auto}#tuneFs .tfFix.tfUni .advTabs{gap:3px}#tuneFs .tfFix.tfUni .advTabs button{flex:none;min-width:0!important;padding:0 8px!important;font-size:13px!important}#tuneFs .tfFix.tfUni .advTabs button.tfOrg{position:sticky;right:0;margin:0 0 0 auto!important;padding:0 9px!important;border:1.5px solid #6b3a58!important;background:#1a1218!important;color:#ffb3dd!important;font-weight:800}#tuneFs .tfDockMsg{margin:auto;text-align:center;color:#9aa3ad;font-size:14px;line-height:1.6}#tuneFs .tfFix.tfDock .tfFixBox{display:flex!important;align-items:center;justify-content:center}#tuneFs .tfBox:not(.port) .tfFix.inBot.tfUni{height:auto}#tuneFs .tfBox:not(.port):has(.tfUni) .tfNav{display:none}/* (11/09 01:04 사용자 시안 승인) 고급 창 세로 다이어트 — 그림·눈금은 그대로, 버튼 안팎 위아래 여백만 */#tuneFs .port .tfFix.inBot.tfUni{height:auto!important;max-height:260px}#tuneFs .tfFix.tfUni .tfUniTop{padding:4px 0 2px!important}#tuneFs .tfBot .tfFix.tfUni .tfP button,#tuneFs .tfBot .tfFix.tfUni .tfFixRow button{height:36px!important;min-height:0!important}#tuneFs .tfFix.tfUni .advPanel{margin-top:4px!important;padding-top:5px!important}#tuneFs .tfFix.tfUni .advTabs button{height:28px!important}#tuneFs .tfFix.tfUni .advCells{margin:0!important}#tuneFs .tfFix.tfUni .advBody{margin-top:-1px}#tuneFs .tfFix.tfUni .advCells+.advCells{margin-top:5px!important}#tuneFs .tfFix.tfUni .advCells .advSc{height:46px!important;gap:0!important}#tuneFs .tfFix.tfUni .advScI{inset:4px 18px!important;height:calc(100% - 8px)!important}#tuneFs .tfFix.tfUni .advSc.vert .advScT{top:13px!important;bottom:13px!important}#tuneFs .tfFix.tfUni .advSc.vert .advScA.a1{top:1px!important}#tuneFs .tfFix.tfUni .advSc.vert .advScA.a2{bottom:1px!important}#tuneFs .tfFix.tfUni .advTip{margin:4px 2px 0!important;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.3!important}#tuneFs .port .tfNav button{height:32px!important;font-size:14px!important}#tuneFs .port .tfCtl{row-gap:4px!important}
#tuneFs .tfFix.tfMulti.tfUni .tfMH{white-space:normal;flex:none;margin-top:6px}#tuneFs .tfFix.tfMulti.tfUni .tfFixBox{padding-top:8px!important}/* (11/05 사용자) 가로 모드 안내: 폰이 세로 → 가로로 돌아가는 움직임 */#tuneFs .rpPh{position:relative;width:72px;height:72px;margin:0 auto 8px}#tuneFs .rpPh b{position:absolute;left:50%;top:50%;width:30px;height:52px;margin:-26px 0 0 -15px;box-sizing:border-box;border:3px solid #ffd27a;border-radius:8px;background:#232a35;animation:rpTurn 2.6s ease-in-out infinite}#tuneFs .rpPh b i{position:absolute;left:50%;top:4px;width:8px;height:2px;margin-left:-4px;border-radius:1px;background:#ffd27a}#tuneFs .rpPh u{position:absolute;right:-2px;top:-2px;text-decoration:none;font-size:20px;line-height:1;color:#ffd27a;animation:rpArrow 2.6s ease-in-out infinite}@keyframes rpTurn{0%,18%{transform:rotate(0)}48%,76%{transform:rotate(-90deg)}100%{transform:rotate(0)}}@keyframes rpArrow{0%,18%{opacity:1}30%,76%{opacity:0}100%{opacity:1}}@media (prefers-reduced-motion:reduce){#tuneFs .rpPh b,#tuneFs .rpPh u{animation:none}#tuneFs .rpPh b{transform:rotate(-90deg)}#tuneFs .rpPh u{display:none}}
#tuneFs .tfAbRow{display:flex;align-items:center;justify-content:center;gap:8px;max-width:100%}#tuneFs .tfAbRow>button{width:44px;height:44px;min-height:0!important;flex:none;padding:0;margin:0;border-radius:22px;border:1.5px solid #4a505c;background:#11141a;color:#eceff3;font-size:21px;font-weight:800;line-height:1}#tuneFs .tfAbRow>button:disabled{opacity:.35}/* (11/06 18:13 사용자 '버튼 정렬') 세로: ↶ 스위치 ↷ 줄 · 처음 -5 ▶ +5 줄 · 아래 고치기 칸의 좌우 끝을 같게 */#tuneFs .port .tfCtl{align-self:stretch}#tuneFs .port .tfAbRow{width:100%;justify-content:space-between}#tuneFs .port .tfAbRow .tfAbW{flex:1;min-width:0}#tuneFs .port .tfAbRow .tfAb{width:100%!important;max-width:none!important}#tuneFs .port .tfNav{margin-left:0!important;margin-right:0!important;padding-left:0!important;padding-right:0!important;width:100%}#tuneFs .port .tfNav button{flex:1;min-width:0!important}#tuneFs .port .tfFix.inBot,#tuneFs .port .tfFix.inBot .tfFixBox{margin-left:0!important;margin-right:0!important}/* (11/06 18:13 사용자) 폰 가로(높이 낮음): 긴 안내 글이 좁은 기둥으로 찌그러져 음정선을 밀어냄 → 안내 글 숨김(💡 팁 보기로 볼 수 있음) */@media (max-height:560px){#tuneFs .tfBox:not(.port) .tfHint,#tuneFs .tfBox:not(.port) .tfNote{display:none!important}#tuneFs .tfBox:not(.port) .tfBot{justify-content:center}}/* (11/06 17:35 사용자) ↶ ↷ 더 크게 — 원음|보정본 스위치와 같은 높이(스위치 높이를 따라감) */#tuneFs .tfAbRow>button{height:auto!important;align-self:stretch;width:58px;border-radius:16px;font-size:26px}#tuneFs .tfAbRow .tfAb,#tuneFs .port .tfAbRow .tfAb{width:min(190px,calc(100vw - 150px))}#tuneFs .port .tfAbRow .tfAb button{padding:0 8px;font-size:15px}`;
  if (typeof document !== "undefined" && document.head) { const s2 = document.createElement("style"); s2.textContent = css2; document.head.appendChild(s2); }
  if (typeof document !== "undefined" && document.head) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }
  G.Tune = { tone, toneOff, draw, wire, load, legend, range, col, tgCol, fitAt, delta, semiLabel, sangLabel, sheet, undo, openFull, noteName, WIN, HEAD, ZOOM_HALF, tmapOf, mapT };
})(typeof window !== "undefined" ? window : globalThis);
