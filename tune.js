// (10/30 사용자) 튠 화면 — Waves Tune처럼 음정선이 재생 위치와 함께 오른쪽→왼쪽으로 흐름. 선생님 앱·수강생 노트 공용.
// curve = 메이크업 서버가 저장한 pitch_curve.json: { fps, scale:[음이름 번호], levels:[1,2,3], pts:[[초, 원음, 약, 중, 강], ...] } (값 = MIDI×100 센트)
// 노랑 = 실제로 부른 음, 하늘색 = 보정된 음, 주황 세로선 = 지금(10/31 사용자 C안 변형). 두 선 사이 노랑 = 고친 곳(진할수록 많이).
// 아래 줄 = 고친 양(위 = 올림 · 아래 = 내림, 끝까지 = 반음 ½ 이상). 확대(기본): 지금 음 근처 ±4반음, 전체: 곡 전체 음역.
// 음정 인식은 AI 추정(숨소리·자음에서 선이 튈 수 있음) — 참고용.
(function (G) {
  const DT_JUMP = 2;   // (11/03 10:24 사용자) 그래프 두 번 톡 = 2초 이동
  const WIN = 8, HEAD = 0.4, NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], LANE = 34, ZOOM_HALF = 400;
  function range(cv) {
    if (cv._rng) return cv._rng;
    const a = (cv.pts || []).map(p => p[1]).filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return (cv._rng = [5700, 7200]);
    const lo = a[Math.floor(a.length * 0.03)], hi = a[Math.min(a.length - 1, Math.floor(a.length * 0.97))];
    return (cv._rng = [Math.floor(lo / 100) * 100 - 250, Math.ceil(hi / 100) * 100 + 250]);
  }
  function col(cv, lv) { const L = cv.levels || [], i = L.indexOf(+lv); return lv > 0 ? (i >= 0 ? 2 + i : L.length ? 2 + L.length - 1 : 0) : 0; }   // (11/02 17:30) 새 음정선은 강[3]만 — 없는 단계를 찾으면 가장 센 단계   // pts 안 위치(0 = 없음)
  function centerAt(cv, t) {   // 확대 화면 가운데 = 지금 앞뒤 화면 안 음의 가운데(튀는 점 제외)
    const v = []; for (const p of cv.pts || []) { if (p[0] < t - WIN * HEAD) continue; if (p[0] > t + WIN * (1 - HEAD)) break; v.push(p[1]); }
    if (v.length < 3) return null; v.sort((a, b) => a - b); const lo = v[Math.floor(v.length * 0.1)], hi = v[Math.floor(v.length * 0.9)];
    return (lo + hi) / 2;
  }
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
      if (fromPop !== true) try { if (history.state && history.state.tuneSheet) { skipPop = true; history.back(); } } catch {} };
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
  const SRC_C = { teacher: "rgba(255,210,122,.42)", midi: "rgba(199,164,255,.36)", sheet: "rgba(127,217,154,.34)", youtube: "rgba(127,217,255,.32)", scale: "rgba(140,150,165,.30)" };
  function srcCol(cv, tt) {
    if ((cv._fixes || []).some(x => tt >= x.t0 && tt <= x.t1)) return SRC_C.teacher;
    if (!cv._src) return "rgba(127,217,154,.28)";
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
    const { L, w, T, HP, t0, W8, y, kt } = m, left = Math.max(0, nx[0] - t), sec = Math.ceil(left), mmss = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
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
  function draw(el, cv, t, lv, st) {
    if (!el || !el.getContext || !cv) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const r = G.devicePixelRatio || 1; if (el.width !== Math.round(w * r)) { el.width = Math.round(w * r); el.height = Math.round(h * r); }
    const g = el.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
    const full = !!(st && st.full), W8 = full ? (st.win || 6) / (st.xz || 1) : WIN, k = col(cv, lv), lane = k && h > 110 ? (full ? 64 : LANE) : 0, H = h - lane, T = lane, kt = tgCol(cv);   // (10/30 15:39 사용자) 고친 양 = 그래프 위
    let [lo, hi] = range(cv);
    if (full && (st.yz || 1) > 1) {   // 전체화면 핀치 확대: 배율은 손가락으로만 바뀜. 가운데는 지금 음을 부드럽게 따라가고, 손으로 위아래로 밀면 그 자리에 머묾
      const half = (hi - lo) / 2 / st.yz, now = Date.now();
      if (!st.panAt || now - st.panAt > 4000) {   // 재생 중엔 지금 부르는 음(노란선 근처)을 화면 가운데로 따라감 — 화면 밖 음도 들어오게
        const v = []; for (const p of cv.pts || []) { if (p[0] < t - 0.6) continue; if (p[0] > t + 1.2) break; v.push(p[1]); }
        let c = null; if (v.length) { v.sort((a, b) => a - b); c = v[Math.floor(v.length / 2)]; } else { const f = fitAt(cv, t, 0); if (f) c = f[2]; }
        if (c != null) st.yc = st.yc == null ? c : st.yc + (c - st.yc) * 0.15; }
      const c = st.yc ?? (lo + hi) / 2; lo = c - half; hi = c + half;
    } else if (full && st.yo) { lo += st.yo; hi += st.yo; }   // (11/02 19:48 사용자) 확대 안 해도 위아래로 밀어 보기
    if (full && st.focusC != null) {   // 고치기 창이 뜨며 그래프가 줄어들 때 고른 막대가 화면 안(위아래 20% 안쪽)에 오게 한 번 옮김
      const fc = st.focusC, m = (hi - lo) * 0.2; st.focusC = null;
      if (fc < lo + m || fc > hi - m) { const sh = fc - (lo + hi) / 2; if ((st.yz || 1) > 1) { st.yc = (st.yc ?? (lo + hi) / 2) + sh; st.panAt = Date.now(); } else st.yo = (st.yo || 0) + sh; lo += sh; hi += sh; }
    }
    if (st && st.zoom && !full) {   // 확대: 화면 안(지금 앞뒤 8초) 음이 모두 들어오게 — 기본 ±4반음, 크게 도약하면 그만큼 넓힘(10/30 13:28 사용자)
      const f = fitAt(cv, t, k);
      if (f) { const tl = Math.min(f[0] - 150, f[2] - ZOOM_HALF), th = Math.max(f[1] + 150, f[2] + ZOOM_HALF);
        // 넓힐 땐 빠르게(도약음이 화면 밖으로 안 나가게), 좁힐 땐 천천히(10/30 13:40 사용자)
        if (st.lo == null) { st.lo = tl; st.hi = th; } else { st.lo += (tl - st.lo) * (tl < st.lo ? 0.45 : 0.06); st.hi += (th - st.hi) * (th > st.hi ? 0.45 : 0.06); } }
      if (st.lo != null) { lo = st.lo; hi = st.hi; }
    }
    // (10/31 07:57 사용자) 주석 칸이 음정선을 가리지 않게: 주석이 있으면 아래쪽은 칸 자리로 비워 두고 음정선은 그 위에만 그림
    const hasN = full && !!(st && typeof st.notes === "function" && (st.notes() || []).length) && H > 200;   // 작은 화면은 덮개(전체화면으로 보기) 아래라 그대로
    const RB = hasN ? noteBand(st, full) : 0, HP = H - RB;
    const L = full ? 44 : 30, y = (c) => T + HP - 6 - (c - lo) / (hi - lo) * (HP - 12);
    const t0 = t - W8 * HEAD, xs = (tt) => L + (tt - t0) / W8 * (w - L), sc = cv.scale;
    g.font = (full ? "12px" : "10px") + " system-ui, sans-serif"; g.textBaseline = "middle";
    let lastY = -99;
    for (let m = Math.floor(hi / 100); m >= Math.ceil(lo / 100); m--) {
      const pc = ((m % 12) + 12) % 12, ins = !sc || sc.includes(pc), yy = Math.round(y(m * 100)) + 0.5;
      if (ins && sc) { g.fillStyle = "rgba(156,195,255,.06)"; g.fillRect(L, yy - 4, w - L, 8); }
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
    if (full && kt) {   // 정음(목표음) = 초록 막대: 보정이 맞추려는 바로 그 음
      const bh = Math.max(6, (HP - 12) / ((hi - lo) / 100) * 0.55), bars = []; let run = null;
      const fxOf = (tt) => (cv._fixes || []).findIndex(x => tt >= x.t0 - 1e-6 && tt < x.t1 - 1e-6);   // 나눈·고친 구간 경계에서 막대도 끊음
      for (let i = 0; i < vis.length; i++) { const p = vis[i], q = vis[i + 1]; if (p[kt] == null) { run = null; continue; }
        const cont = q && q[kt] === p[kt] && q[0] - p[0] < 0.13 && fxOf(q[0]) === fxOf(p[0]), x0 = xs(p[0]), x1 = cont ? xs(q[0]) : x0 + 2;
        g.fillStyle = srcCol(cv, p[0]); { const mv = (cv._tedits || []).some(x => p[0] >= x.t0 - 1e-6 && p[0] < x.t1 - 1e-6); if (mv) g.globalAlpha = 0.22; g.fillRect(x0, y(p[kt]) - bh / 2, Math.max(1, x1 - x0 + 0.5), bh); g.globalAlpha = 1; }   // 옮기는 중인 음은 원래 자리를 흐리게
        if (!run) { run = { x0, x1, t0: p[0], t1: p[0], c: p[kt], y: y(p[kt]), h: bh }; bars.push(run); }
        run.x1 = x1; run.t1 = cont ? q[0] : p[0] + 0.04;
        if (!cont) { const fi = fxOf(run.t0); if (fi >= 0) { run.t0 = cv._fixes[fi].t0; run.t1 = cv._fixes[fi].t1; } run = null; } }
      for (const b of bars) { const f = (cv._fixes || []).find(x => x.t0 < b.t1 && x.t1 > b.t0);   // 선생님이 고친 정음 = 노란 테두리(나누기만 한 조각은 경계 틈만)
        if (f && !f.cut) { g.strokeStyle = "#ffd27a"; g.lineWidth = 2; g.strokeRect(b.x0, b.y - b.h / 2, Math.max(4, b.x1 - b.x0), b.h); }
        if (f && f.cut) { g.fillStyle = "#0f1115"; g.fillRect(b.x0 - 1.5, b.y - b.h / 2 - 3, 3, b.h + 6); }
        if (st && st.sel && st.sel.t0 < b.t1 && st.sel.t1 > b.t0) { g.save(); g.shadowColor = "#9cc3ff"; g.shadowBlur = 10; g.strokeStyle = "#9cc3ff"; g.lineWidth = 3; g.strokeRect(b.x0 - 2, b.y - b.h / 2 - 2, Math.max(6, b.x1 - b.x0 + 4), b.h + 4); g.restore(); } }
      if (st) st.tbars = bars;
      // (11/03 13:08 사용자 시안) 타이밍·길이 고친 음 = 새 자리에 하늘색 막대 + 원래 자리 점선
      const tb = [];
      for (const te of cv._tedits || []) { if (te.nt1 < t0 - 0.5 || te.nt0 > t0 + W8 + 0.5) continue; const yy = y(te.c);
        g.save(); g.setLineDash([4, 3]); g.strokeStyle = "rgba(230,233,238,.55)"; g.lineWidth = 1.5; g.strokeRect(xs(te.t0), yy - bh / 2, Math.max(4, xs(te.t1) - xs(te.t0)), bh); g.restore();
        const x0 = xs(te.nt0), x1 = xs(te.nt1); g.fillStyle = "#5fd4ff"; g.fillRect(x0, yy - bh / 2, Math.max(3, x1 - x0), bh);
        if (st && st.sel && Math.abs(st.sel.t0 - te.t0) < 0.02) { g.fillStyle = "#e8f8ff"; g.fillRect(x0, yy - bh / 2, 3, bh); g.fillRect(x1 - 3, yy - bh / 2, 3, bh); }   // 고른 음: 양 끝 손잡이
        tb.push({ x0, x1, y: yy, h: bh, t0: te.t0, t1: te.t1, c: te.c, te }); }
      if (st) st.tebars = tb;
      if (st && st.msel) { const a = xs(st.msel[0]), b2 = xs(st.msel[1]); g.fillStyle = "rgba(255,110,199,.14)"; g.fillRect(a, T, Math.max(2, b2 - a), HP); g.fillStyle = "#ff6ec7"; g.fillRect(a, T, 2, HP); g.fillRect(b2 - 2, T, 2, HP);   // 여러 음 고르기: 고른 구간(11/03 13:58 사용자: 주황 기준선·노랑과 헷갈려 분홍으로)
        for (const b of bars.concat(tb)) if (b.t0 < st.msel[1] && b.t1 > st.msel[0]) { g.strokeStyle = "#ff6ec7"; g.lineWidth = 2; g.strokeRect(b.x0 - 1, b.y - b.h / 2 - 1, Math.max(4, b.x1 - b.x0 + 2), b.h + 2); } }
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
    if (st) { let oy0 = 1e9, oy1 = -1e9; for (const p of vis) { for (const kk of [1, k]) { if (!kk || p[kk] == null) continue; const Y = y(p[kk]); if (Y < oy0) oy0 = Y; if (Y > oy1) oy1 = Y; } }   // 지금 화면의 음정선 높이 범위
      drawNotes(g, st, t, xs, L, w, T, H, full, tagB, oy0 <= oy1 ? [oy0, oy1] : null, vis, y); }
    if (full && st && st.kbDown != null) {   // (11/02 16:28 사용자) 누른 건반은 손가락에 가려서 → 오른쪽에 음 이름 말풍선
      const m = st.kbDown, yy = Math.max(T + 22, Math.min(T + HP - 22, y(m * 100))), txt = NAMES[((m % 12) + 12) % 12] + (Math.floor(m / 12) - 1);
      g.save(); g.font = "bold 22px system-ui, sans-serif"; g.textBaseline = "middle"; const tw = g.measureText(txt).width, bx = L + 14, bw = tw + 28, bh = 40;
      g.fillStyle = "#ff9f5a"; g.beginPath(); g.moveTo(L + 4, yy); g.lineTo(bx + 1, yy - 8); g.lineTo(bx + 1, yy + 8); g.closePath(); g.fill();
      g.beginPath(); if (g.roundRect) g.roundRect(bx, yy - bh / 2, bw, bh, 12); else g.rect(bx, yy - bh / 2, bw, bh); g.fill();
      g.fillStyle = "#111"; g.fillText(txt, bx + 14, yy + 1); g.restore();
    }
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
    let drag = null, preview = null, shown = null;
    const view = mkView(st, () => preview, (v) => { preview = v; }, getT, seek);
    const showMid = (kind) => { mid.textContent = kind === "pause" ? "❚❚" : "▶"; mid.className = "tuneMid " + (kind === "pause" ? "stay" : "flash"); void mid.offsetWidth; mid.classList.add("go"); shown = kind; };
    const loop = () => { if (!el.isConnected) { bar.remove(); return; } draw(el, cv, preview ?? (+getT() || 0), +getLv() || 0, st);
      mid.style.visibility = st.hits && st.hits.length ? "hidden" : "";   // 말풍선이 떠 있으면 가운데 ❚❚는 숨김
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
          const tt = timeAt(st, e.clientX - r0.left); if (tt != null) { lastView = view; o.onAdd(tt); } }, 390); } });
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
  function tone(m) {
    try { toneCtx ??= new (G.AudioContext || G.webkitAudioContext)(); if (toneCtx.state === "suspended") toneCtx.resume(); } catch { return; }
    toneOff(); const c = toneCtx, f = 440 * 2 ** ((m - 69) / 12), g = c.createGain(), now = c.currentTime;
    g.gain.setValueAtTime(0, now); g.gain.linearRampToValueAtTime(0.28, now + 0.008); g.gain.exponentialRampToValueAtTime(0.12, now + 0.6); g.connect(c.destination);
    const os = [[1, 1], [2, 0.3], [3, 0.12]].map(([k, a]) => { const o = c.createOscillator(), ga = c.createGain(); o.type = "sine"; o.frequency.value = f * k; ga.gain.value = a; o.connect(ga); ga.connect(g); o.start(now); return o; });
    toneNow = { g, os };
  }
  function toneOff() { if (!toneNow || !toneCtx) return; const { g, os } = toneNow, now = toneCtx.currentTime; toneNow = null;
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
    if (st) { st.sel = { t0: b.t0, t1: b.t1 }; st.focusC = b.c; }
    const had = !!host.querySelector(".tfFix"); host.querySelectorAll(".tfFix").forEach(x => x.remove());
    const d = document.createElement("div"); d.className = "tfFix";
    const mm = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;
    // (11/02 19:38 사용자 시안 승인) 다이어트: 첫 줄 = 원음/보정본 스위치 + 시간·저장 표시 / 둘째 줄 = 버튼 한 줄(▼ 음 ▲ ✂ ↺ ✓) + 작은 이름표
    // (11/03 13:08 사용자 시안 승인) 모드 [🎵 음정 | ⏱ 타이밍]: 타이밍 = ◀일찍·늦게▶(톡 0.02초, 꾹 계속) · 길이 −/+ · ↺ · 막대 가운데 끌기 = 옮기기, 끝 끌기 = 길이
    const tOn = !!(st && typeof st.onTime === "function"), tMode = tOn && st.fixMode === "t"; let tTm = null, tSave = () => {};   // (닫을 때 쓰므로 먼저 둠)
    d.innerHTML = `<div class="tfFixBox"><div class="tfFixHd">${tOn ? `<span class="tfFixMd" role="group" aria-label="고칠 것"><button type="button" data-md="p">🎵 음정</button><button type="button" data-md="t">⏱ 타이밍</button></span>` : "<b>정음</b>"}<span class="tfFixTm">${mm(b.t0)}~${mm(b.t1)}</span><span class="tfFixSt"></span></div>
      ${tOn ? `<div class="tfFixRow tfT"><button type="button" data-tm="-1" aria-label="일찍(앞으로)">◀</button><button type="button" class="tfFixN tfTN" data-tp aria-label="이 음 듣기"></button><button type="button" data-tm="1" aria-label="늦게(뒤로)">▶</button><button type="button" class="tfIc" data-tl="-1" aria-label="짧게">−</button><button type="button" class="tfIc" data-tl="1" aria-label="길게">+</button><button type="button" class="tfIc" data-tr aria-label="톡 = 직전 저장으로, 1초 꾹 = 원본으로">↺</button></div>
      <div class="tfFixLab tfT"><span>일찍</span><span class="n">누르면 듣기</span><span>늦게</span><span class="i">짧게</span><span class="i">길게</span><span class="i">되돌리기</span></div>` : ""}
      <div class="tfFixRow tfP"><button type="button" data-d="-1" aria-label="반음 내림">▼</button><button type="button" class="tfFixN" data-p aria-label="누르는 동안 이 음 소리"></button><button type="button" data-d="1" aria-label="반음 올림">▲</button>${canCut ? `<button type="button" class="tfCut tfIc" data-cut aria-label="두 음으로 나누기(세로줄 자리, 막대 밖이면 가운데)">✂</button>` : ""}<button type="button" class="tfIc" data-r aria-label="톡 = 직전 저장으로, 1초 꾹 = 원본으로">↺</button></div>
      <div class="tfFixLab tfP"><span>톡 반음 · 꾹 미세</span><span class="n">누르면 소리</span><span>톡 반음 · 꾹 미세</span>${canCut ? `<span class="i">나누기</span>` : ""}<span class="i">되돌리기</span></div></div>`;
    // (11/02 19:28 사용자 시안 승인) 전체화면이면 아래 이동 버튼·안내 문구 자리에(원음/보정본 큰 버튼은 그대로 위에)
    // (11/02 02:02 사용자 시안) 스위치 아래 칸(이동 버튼·안내)만 같은 높이의 고치기 창으로 바뀜 → 그래프·주석·스위치는 그대로
    const bot = host.querySelector(".tfBot");
    if (bot) { const h0 = had && bot._h0 ? bot._h0 : bot.offsetHeight; bot._h0 = h0; d.classList.add("inBot"); bot.appendChild(d);
      const gap = h0 - bot.offsetHeight; if (gap > 0) d.style.minHeight = (d.offsetHeight + gap) + "px"; }
    else host.appendChild(d);
    const prior = (cv._fixes || []).slice(), snap = {};
    (cv.pts || []).forEach((p, i) => { if (p[0] >= b.t0 - 0.001 && p[0] <= b.t1 + 0.001 && p[kt] != null) snap[i] = p[kt]; });
    // (11/02 19:20 사용자) '처음 음으로' = 선생님이 고치기 전, 서버가 처음 고른 음(전에 고쳐 저장한 음이 아니라) — 서버 값은 cv._orig에 있음
    const o0 = cv._orig || {}, ov = Object.keys(snap).map(i => (i in o0 ? o0[i] : snap[i])).sort((x, y) => x - y), mO = ov.length ? Math.round(ov[ov.length >> 1] / 100) : m0;
    // (11/03 10:50 사용자) 센트 단위 미세 조정: 음 이름 + ±센트 · 3반음 넘게 옮기면 소리 경고
    const nmC = (x) => { const r = Math.round(x), c = Math.round((x - r) * 100); return noteName(r) + (c ? `<small class="tfC">${c > 0 ? "+" : ""}${c}¢</small>` : ""); };
    const stEl = d.querySelector(".tfFixSt"), paint = () => { d.querySelector(".tfFixN").innerHTML = `${nmC(m)}${Math.abs(m - mO) > 0.004 ? `<small>← ${noteName(mO)}</small>` : ""}`;
      if (Math.abs(m - mO) > 3) stEl.textContent = "⚠ 3반음 넘게 옮기면 소리가 어색할 수 있어요"; }; paint();
    // (11/03 11:13 사용자) 소리 = 멜로다인처럼 '목소리'로 그 음(보정 전 보컬이 있으면) · 없으면 사인파. 고르는 순간 1초, 음 이름 누르는 동안 계속
    let vh = null, vtm = null;
    const snd = (mm) => { clearTimeout(vtm); if (vh) { try { vh.stop(true); } catch {} vh = null; } toneOff(); if (st && st.voice) { try { vh = st.voice(b.t0, b.t1, mm); } catch { vh = null; } } if (!vh) tone(mm); };
    const sndOff = () => { clearTimeout(vtm); if (vh) { try { vh.stop(); } catch {} vh = null; } toneOff(); };
    const sndFor = (mm, ms) => { snd(mm); vtm = setTimeout(sndOff, ms); };
    try { sndFor(m, 1000); } catch {}
    const same = () => Math.abs(m - mO) < 0.004, rnd = (x) => Math.round(x * 100) / 100;
    const keepFix = () => !(same() && !isCut);   // 서버가 고른 음 그대로면 기록 없음(나눈 조각은 나눔 표시로 남김)
    const preview = () => { const o_ = cv._orig || (cv._orig = {}); for (const i in snap) { if (!(i in o_)) o_[i] = snap[i]; cv.pts[i][kt] = Math.round(m * 100); }
      cv._fixes = prior.filter(x => !(x.t0 < b.t1 && x.t1 > b.t0)).concat(keepFix() ? [{ t0: T0, t1: T1, midi: rnd(m), ...(isCut && same() ? { cut: true } : {}) }] : []); };
    let tm = null;
    const persist = () => { clearTimeout(tm); stEl.textContent = "저장 중…"; tm = setTimeout(() => { tm = null; try { fxSave(onFix, { t0: T0, t1: T1, midi: keepFix() ? rnd(m) : null, ...(isCut && same() ? { cut: true } : {}) }); } catch {} commit(); stEl.textContent = "✓ 저장됨"; }, 450); };
    const core = () => { try { sndOff(); } catch {} if (tTm) { clearTimeout(tTm); tTm = null; tSave(); commit(); } if (st) { st.onBarDrag = null; st.onBarDragX = null; st.stopAt = 0; } if (tm) { clearTimeout(tm); tm = null; try { fxSave(onFix, { t0: T0, t1: T1, midi: keepFix() ? rnd(m) : null, ...(isCut && same() ? { cut: true } : {}) }); } catch {} commit(); } toneOff(); if (st) st.sel = null; d.remove(); };
    // (11/02 20:26 사용자) 폰 뒤로(갤럭시 뒤로 밀기) = 고치기 창만 닫기(전체화면은 그대로) — 주석 창과 같은 방식(기록 한 칸)
    const leave = () => { if (sheetClose === close_) sheetClose = null; try { if (history.state && history.state.tuneSheet) { skipPop = true; history.back(); } } catch {} };
    const close_ = (fromPop) => { core(); saveToast(); if (bot) bot._h0 = 0; if (fromPop === true) { if (sheetClose === close_) sheetClose = null; } else leave(); };
    if (!had && !sheetClose) try { history.pushState(Object.assign({}, history.state || {}, { tuneSheet: true }), ""); } catch {}
    sheetClose = close_; close_._fix = true;
    const shut = () => close_();
    { let n = 0; try { n = +(localStorage.getItem("tune_fix_tip") || 0); } catch {} if (n < 3) { try { localStorage.setItem("tune_fix_tip", String(n + 1)); } catch {}
      const cb = host.querySelector(".tfCvBox"), tip = document.createElement("div"); tip.className = "tfFixTip"; tip.textContent = "빈 곳 톡 = 고치기 창 닫기"; if (cb) { cb.appendChild(tip); setTimeout(() => tip.remove(), 2600); } } }
    d.addEventListener("pointerdown", (e) => e.stopPropagation()); d.addEventListener("contextmenu", (e) => e.preventDefault());
   // 아래 큰 스위치(창이 뜨면 숨김)와 같은 동작 · 켜짐 표시는 그림 그릴 때 같이
    const step = (dm, beep) => { m = rnd(m + dm); paint(); preview(); persist(); if (beep) sndFor(m, 500); };
    // (11/03 10:50 사용자) ▼▲ 톡 = 반음 · 꾹 누르고 있으면 5센트씩 조금씩(소리 따라감) · 반음 단위는 막대를 누른 채 위아래로도
    d.querySelectorAll("[data-d]").forEach(x => { let hold = null, rep_ = null, long = false;
      const stop = () => { clearTimeout(hold); clearInterval(rep_); hold = rep_ = null; if (long) sndOff(); };
      x.addEventListener("pointerdown", (e) => { e.preventDefault(); long = false; try { x.setPointerCapture(e.pointerId); } catch {}
        hold = setTimeout(() => { long = true; snd(m); rep_ = setInterval(() => { step(+x.dataset.d * 0.05, false); snd(m); }, 90); }, 380); });
      x.addEventListener("pointerup", () => { const wasLong = long; stop(); if (!wasLong) step(+x.dataset.d, true); });
      ["pointercancel", "lostpointercapture"].forEach(ev => x.addEventListener(ev, stop));
      x.onclick = (e) => { if (e.detail === 0) step(+x.dataset.d, true); };   // 키보드(Enter)
      x.addEventListener("contextmenu", (e) => e.preventDefault()); });
    if (st) st.onBarDrag = (k, start) => { if (start) st._dragBase = m; const nm_ = rnd(st._dragBase + k); if (nm_ !== m) { m = nm_; paint(); preview(); persist(); sndFor(m, 400); } };
    const nb = d.querySelector("[data-p]");   // 음 이름을 누르는 동안 그 음 소리
    nb.addEventListener("pointerdown", (e) => { e.preventDefault(); snd(m); });
    nb.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });   // (11/03) 길게 눌러도 폰 진동(길게 누르기 반응) 안 나게 — 누르는 동안 소리만
    // (11/03 10:50 아이패드) 손을 떼도 소리가 안 멈추던 문제: 위 줄 주석에 떼기 처리가 묻혀 빠져 있었음 → 떼기·취소·터치 끝 모두에서 끔
    ["pointerup", "pointerleave", "pointercancel", "touchend", "touchcancel"].forEach(ev => nb.addEventListener(ev, sndOff));
    const cut = d.querySelector("[data-cut]");
    if (cut) cut.onclick = () => {   // 세로줄 자리에서 나누기 → 두 조각(같은 음, 노란 테두리 없음) · 조각을 눌러 따로 고침
      clearTimeout(tm); tm = null;
      const ts = +(atHead ? tNow : (b.t0 + b.t1) / 2).toFixed(2), a = { t0: T0, t1: ts, midi: rnd(m), cut: same() }, c = { t0: ts, t1: T1, midi: rnd(m), cut: same() };
      cv._fixes = prior.filter(x => !(x.t0 < b.t1 && x.t1 > b.t0)).concat([a, c]);
      try { fxSave(onFix, a); fxSave(onFix, c); } catch {} sndOff();
      fixSheet(host, cv, { t0: ts, t1: T1, c: Math.round(m * 100) }, onFix, getT, st); };   // (11/03 08:14 사용자) 나누면 오른쪽 조각이 바로 골라진 채로(창은 그대로, 뒤로 가기 기록도 그대로)
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
      tOrig(); H[hk] = []; saved = curS(); stEl.textContent = "↺ 원본으로 · 저장됨"; };
    const askOrig = () => { const old = (host.querySelector(".tfCfm")); if (old) old.remove();
      const cf = document.createElement("div"); cf.className = "tfCfm"; cf.setAttribute("role", "dialog");
      cf.innerHTML = `<div class="tfCfmBox"><b>원본으로 되돌릴까요?</b><p>이 음의 음정·타이밍 고침을 모두 지우고, 보컬 분리 후 기본 보정만 한 상태로 돌아가요.</p><div class="tfCfmRow"><button type="button" data-cf="0">취소</button><button type="button" class="pri" data-cf="1">확인</button></div></div>`;
      cf.addEventListener("pointerdown", (e) => e.stopPropagation());
      cf.addEventListener("click", (e) => { if (e.target === cf) cf.remove(); });   // 바깥 톡 = 취소
      cf.querySelectorAll("[data-cf]").forEach(x => x.onclick = (e) => { e.stopPropagation(); cf.remove(); if (x.dataset.cf === "1") toOrig(); });
      host.appendChild(cf); };
    d.querySelectorAll("[data-r],[data-tr]").forEach(x => { let hold = null, fired = false;
      const stop = () => { clearTimeout(hold); hold = null; x.classList.remove("hold"); };
      x.addEventListener("pointerdown", (e) => { e.preventDefault(); fired = false; try { x.setPointerCapture(e.pointerId); } catch {} x.classList.add("hold"); hold = setTimeout(() => { fired = true; stop(); askOrig(); }, 1000); });
      x.addEventListener("pointerup", () => { const f_ = fired; stop(); if (!f_) undo(); });
      ["pointercancel", "lostpointercapture"].forEach(ev => x.addEventListener(ev, stop));
      x.onclick = (e) => { if (e.detail === 0) undo(); };
      x.addEventListener("contextmenu", (e) => e.preventDefault()); });
    // ── 타이밍·길이 ──
    const setMd = (md) => { if (!tOn) return; st.fixMode = md; d.classList.toggle("tmode", md === "t"); d.querySelectorAll("[data-md]").forEach(x => { const on = x.dataset.md === md; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }); if (md === "t") sndOff(); };
    if (tOn) { setMd(tMode ? "t" : "p"); d.querySelectorAll("[data-md]").forEach(x => x.onclick = () => setMd(x.dataset.md)); }
    if (!tOn) { saved = curS(); return; }
    const L0 = b.t1 - b.t0, sameT = (x) => Math.abs(x.t0 - b.t0) < 0.02 && Math.abs(x.t1 - b.t1) < 0.02, te0 = (cv._tedits || []).find(sameT);
    let n0 = te0 ? te0.nt0 : b.t0, n1 = te0 ? te0.nt1 : b.t1;
    const r2 = (x) => Math.round(x * 100) / 100, tSame = () => Math.abs(n0 - b.t0) < 0.005 && Math.abs(n1 - b.t1) < 0.005;
    const tClamp = (edge) => {   // 옮기기 ±0.6초 · 길이 원래의 0.5~2배(최소 0.06초) — 서버가 받아들이는 범위 안
      const lo = Math.max(0.06, L0 * 0.5), hi = L0 * 2;
      if (edge === "l") { n0 = Math.max(0, b.t0 - 0.6, Math.min(b.t0 + 0.6, n0, n1 - lo)); n0 = Math.max(n0, n1 - hi); }
      else { n0 = Math.max(0, b.t0 - 0.6, Math.min(b.t0 + 0.6, n0)); n1 = Math.max(n0 + lo, Math.min(n0 + hi, n1)); }
      n0 = r2(n0); n1 = r2(n1); };
    const tn = d.querySelector("[data-tp]"), tPaint = () => { const dt = n0 - b.t0, dl = (n1 - n0) - L0, sg = (x) => (x > 0.004 ? "+" : x < -0.004 ? "−" : "±") + Math.abs(x).toFixed(2);
      tn.innerHTML = `${sg(dt)}초<small>길이 ${Math.abs(dl) > 0.004 ? sg(dl) + "초" : "그대로"}</small>`; };
    const tPreview = () => { cv._tedits = (cv._tedits || []).filter(x => !sameT(x)).concat(tSame() ? [] : [{ t0: b.t0, t1: b.t1, nt0: n0, nt1: n1, c: b.c }]); };
    tSave = () => { try { fxSave(st.onTime, { t0: b.t0, t1: b.t1, nt0: n0, nt1: n1 }); } catch {} stEl.textContent = "✓ 저장됨"; };
    const tPersist = () => { clearTimeout(tTm); stEl.textContent = "저장 중…"; tTm = setTimeout(() => { tTm = null; tSave(); commit(); }, 450); };
    const tStep = (kind, dv) => { if (kind === "m") { n0 += dv; n1 += dv; tClamp("m"); } else { n1 += dv; tClamp("r"); } tPaint(); tPreview(); tPersist(); };
    tPaint();
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
    st.onBarDragX = (dt, edge, start) => { if (start) { st._tb = [n0, n1]; return; } const [a0, a1] = st._tb || [n0, n1];
      if (edge === "l") n0 = a0 + dt; else if (edge === "r") n1 = a1 + dt; else { n0 = a0 + dt; n1 = a1 + dt; }
      tClamp(edge === "c" ? "m" : edge); tPaint(); tPreview(); tPersist(); };
  }
  // (11/03 13:46 사용자 승인) 여러 음 고르기: 켜 둔 동안 그래프를 좌우로 끌면 그 구간의 음들이 골라짐(시간 이동은 두 손가락) → [↺ 원본으로] = 그 안의 음정·타이밍 고침만 지움(10초 되살리기)
  function multiSheet(host, cv, st, keep, keepSel) {
    const o = st.o || {}, mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}`;
    const had = keep || !!host.querySelector(".tfFix"); host.querySelectorAll(".tfFix").forEach(x => x.remove());
    const d = document.createElement("div"); d.className = "tfFix tfMulti";
    d.innerHTML = `<div class="tfFixBox"><div class="tfFixHd"><b>☑ 여러 음 고르기</b><span class="tfFixTm">끌어서 고르기</span><span class="tfFixSt"></span></div>
      <div class="tfFixRow"><button type="button" class="tfMr" data-mr disabled>↺ 원본으로</button><button type="button" class="tfIc" data-mx aria-label="여러 음 고르기 끝내기">✕</button></div>
      <div class="tfFixLab"><span class="n">꾹 누른 채 끌면 다시 고르기 · 빈 곳 톡 = 끝내기</span><span class="i">끝내기</span></div></div>`;
    const bot = host.querySelector(".tfBot");
    if (bot) { const h0 = had && bot._h0 ? bot._h0 : bot.offsetHeight; bot._h0 = h0; d.classList.add("inBot"); bot.appendChild(d);
      const gap = h0 - bot.offsetHeight; if (gap > 0) d.style.minHeight = (d.offsetHeight + gap) + "px"; }
    else host.appendChild(d);
    d.addEventListener("pointerdown", (e) => e.stopPropagation());
    const tmEl = d.querySelector(".tfFixTm"), stEl = d.querySelector(".tfFixSt"), rb = d.querySelector("[data-mr]");
    st.mMode = true; if (!keepSel) st.msel = null; st.sel = null;
    const paint = () => { const m_ = st.msel; if (!m_) { tmEl.textContent = "끌어서 고르기"; rb.disabled = true; rb.textContent = "↺ 원본으로"; return; }
      let n = 0; try { n = typeof o.countRange === "function" ? o.countRange(m_[0], m_[1]) : 0; } catch {}
      tmEl.textContent = `${mm(m_[0])}~${mm(m_[1])}`; rb.disabled = !n; rb.textContent = n ? `↺ 고른 ${n}곳 원본으로` : "고친 음이 없어요"; };
    st.onMSel = paint; paint();
    rb.onclick = async () => { const m_ = st.msel; if (!m_) return; let n = 0; try { n = await o.onResetRange(m_[0], m_[1]); } catch {} st.msel = null; paint(); if (n) stEl.textContent = `↺ ${n}곳 원본으로`; };
    const core = () => { st.mMode = false; st.msel = null; st.onMSel = null; d.remove(); };
    const leave = () => { if (sheetClose === close_) sheetClose = null; try { if (history.state && history.state.tuneSheet) { skipPop = true; history.back(); } } catch {} };
    const close_ = (fromPop) => { core(); saveToast(); if (bot) bot._h0 = 0; if (fromPop === true) { if (sheetClose === close_) sheetClose = null; } else leave(); };
    if (!had && !sheetClose) try { history.pushState(Object.assign({}, history.state || {}, { tuneSheet: true }), ""); } catch {}
    sheetClose = close_;
    d.querySelector("[data-mx]").onclick = () => close_();
  }
  // ── 전체화면: 카드에서 커지며 가로로 돌아 폰 화면 가득. 상하 배율 고정(곡 전체 음역), 정음·부른 음·보정 음을 크게 ──
  // (11/03 10:38 사용자) '소리 불러오는 중'에 이 화면에서 쓸 수 있는 기능 팁을 보여 줌.
  // ⚠ 기능을 바꾸거나 없애면 여기 문구도 같이 고칠 것 — need = 그 기능을 만드는 코드 조각(tests/loading-tips.test.js가 코드에 있는지 확인해서, 기능이 사라지면 시험이 실패함)
  // when(o) = 이 화면(선생님/수강생, 고치기·주석·원음/보정본 있음)에서만
  const FS_TIPS = [
    { text: () => `주황 기준선 왼쪽·오른쪽을 두 번 톡 하면 ${DT_JUMP}초씩 뒤로·앞으로 가요`, need: "const j = le.x < hx ? -DT_JUMP : DT_JUMP" },
    { text: () => "그래프를 좌우로 밀면 시간이 이동해요(멈춘 채 옮겨져요)", need: 'drag.mode === "time"' },
    { text: () => "두 손가락으로 벌리면 확대, 오므리면 원래 크기예요", need: "st.yz = Math.max(1, Math.min(12, pinch.yz * r))" },
    { text: () => "그래프를 위아래로 밀면 화면 밖의 높은 음·낮은 음도 볼 수 있어요", need: "drag.yo + dB * per * (rot ? -1 : 1)" },
    { text: () => "왼쪽 건반을 누르고 있으면 그 음이 소리 나요 — 위아래로 밀면 따라 바뀌어요", need: "st.kbDown = m; tone(m);" },
    { text: () => "원음/보정본 스위치는 아무 쪽이나 톡 하면 바뀌어요 — 재생 중에도 같은 자리에서", need: 'want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m', when: (o) => typeof o.setMode === "function" },
    { text: () => "맨 위 '고친 양' 막대: 위로 솟으면 높게 불러 내린 곳, 아래로 내려가면 낮게 불러 올린 곳이에요", need: 'g.fillText("높게", 4, top + 8)', when: (o) => !!o.teacher },
    { text: () => "맨 위 막대가 위로 솟은 곳은 높게, 아래로 내려간 곳은 낮게 부른 곳이에요", need: 'g.fillText("높게", 4, top + 8)', when: (o) => !o.teacher },
    { text: () => "폰의 뒤로 가기(갤럭시는 화면 가장자리 밀기)로도 닫혀요", need: "if (fsClose) { fsClose();" },
    { text: () => "노래가 없는 전주·간주에선 '⏩ 노래 시작 1초 전으로'로 바로 넘어가요", need: "⏩ 노래 시작 1초 전으로" },
    { text: () => "멈춘 뒤 초록 정음 막대를 톡 하면 그 음을 고칠 수 있어요(▼▲, 바로 저장)", need: "hb = hitT(le) || hitBar(le);", when: (o) => typeof o.onFix === "function" },
    { text: () => "빈 곳·음을 꾹 누른 채 좌우로 끌면 여러 음 고르기 · 그냥 떼면 새 주석", need: "d0.armed = { x: l0.x, t: tt }; st.msel = [tt, tt]; armTip(true);", when: (o) => typeof o.onResetRange === "function" },
    { text: () => "⏱ 타이밍: ◀▶ 일찍·늦게, −/+ 길이 · 막대 가운데를 끌면 옮기기, 끝을 끌면 길이", need: "st.onBarDragX = (dt, edge, start)", when: (o) => typeof o.onTime === "function" },
    { text: () => "타이밍 고친 음은 하늘색, 원래 자리는 점선 · 가운데 숫자를 누르면 그 근처만 들려요", need: 'g.fillStyle = "#5fd4ff"; g.fillRect(x0', when: (o) => typeof o.onTime === "function" },
    { text: () => "고치기 창에서 음 이름을 누르고 있으면 그 음이 목소리로 계속 소리 나요", need: 'nb.addEventListener("pointerdown", (e) => { e.preventDefault(); snd(m); });', when: (o) => typeof o.onFix === "function" },
    { text: () => "✂ 나누기: 세로줄이 막대 안이면 그 자리, 밖이면 가운데에서 나뉘고 오른쪽 조각이 골라져요", need: "fixSheet(host, cv, { t0: ts, t1: T1, c: Math.round(m * 100) }, onFix, getT, st)", when: (o) => typeof o.onFix === "function" },
    { text: () => "↺ 톡 = 직전 저장으로 되돌리기 · 1초 꾹 = 이 음을 원본으로(확인 후)", need: "hold = setTimeout(() => { fired = true; stop(); askOrig(); }, 1000)", when: (o) => typeof o.onFix === "function" },
    { text: () => "고치기 창은 그래프 빈 곳 톡·뒤로 가기로 닫혀요 — 고친 건 자동 저장돼요", need: "if (!onBar) { sheetClose(); lastTap = 0; return; }", when: (o) => typeof o.onFix === "function" },
    { text: () => "정음 막대 색 = 기준: 노랑 선생님 · 보라 MIDI · 초록 악보 · 하늘 원곡 · 회색 키·스케일만", need: "const SRC_C = {", when: (o) => typeof o.onFix === "function" },
    // (11/03 10:42 사용자) 수강생 화면은 보이는 것·할 수 있는 것이 달라서 팁도 따로
    { text: () => "노란 선 = 내가 부른 음 · 하늘색 = 보정한 음 · 초록 막대 = 맞춰야 할 음이에요", need: '<i style="background:#ffe066"></i>부른 음', when: (o) => !o.teacher },
    { text: () => "기준선 위 말풍선이 지금 몇 반음 높게·낮게 불렀는지 알려줘요", need: "반음 높게 불렀어요", when: (o) => !o.teacher },
    { text: () => "번호가 붙은 카드는 강사님 피드백이에요 — 그 자리를 들으며 하나씩 확인해 보세요", need: "function hitNote", when: (o) => !o.teacher && typeof o.notes === "function" },
    { text: () => "원음과 보정본을 번갈아 들어 보면 어느 음이 어긋났는지 귀로 바로 느껴져요", need: 'want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m', when: (o) => !o.teacher && typeof o.setMode === "function" },
    { text: () => "그래프 빈 곳을 길게 누르면 그 자리에 주석을 달 수 있어요", need: 'typeof o.onAdd === "function") d0.lp = setTimeout', when: (o) => typeof o.onAdd === "function" },
    { text: () => "주석 칸을 0.6초 꾹 누르면 내용을 고치거나 지울 수 있어요", need: "주석 칸 0.6초 꾹 = 고치기", when: (o) => typeof o.onNote === "function" },
  ];
  const fsTips = (o) => FS_TIPS.filter(x => !x.when || x.when(o));
  function openFull(src, cv, getT, getLv, seek, o) {
    if (document.getElementById("tuneFs")) return;
    const wrap = document.createElement("div"); wrap.id = "tuneFs"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "음정선 전체화면");
    const hasAb = typeof o.setMode === "function";
    wrap.innerHTML = `<div class="tfBox"><div class="tfTop"><b class="tfTitle">${String(o.title || "음정선").replace(/[<>&]/g, "")}</b><span class="tfTime"></span>
      <button type="button" class="tfX tfXp" aria-label="닫기"><i>✕</i>닫기</button><span class="tfBr"></span><span class="tfLeg"><span><i style="background:rgba(127,217,154,.6);height:8px"></i>정음</span><span><i style="background:#ffe066"></i>부른 음</span><span><i style="background:#7fd9ff"></i>보정 후</span><span class="tfLegC"><i style="background:#ffd27a;opacity:.6"></i>고친 곳</span></span>
      <button type="button" class="tfX" aria-label="닫기"><i>✕</i>닫기</button></div>
      <div class="tfCvBox"><canvas class="tfCv"></canvas><span class="tfMid" aria-hidden="true"></span><button type="button" class="tfSkip" hidden>⏩ 노래 시작 1초 전으로</button><span class="tfBye" aria-live="polite">닫을 때는 <b>✕</b> 또는 폰의 <b>뒤로 가기</b></span></div>
      <div class="tfBot"><span class="tfHint">톡 = 재생·멈춤 · 좌우로 밀면 이동<span class="tfSep"> · </span><br>두 손가락으로 벌리면 확대 · 기준선 왼쪽·오른쪽 두 번 톡 = 2초 뒤로·앞으로<span class="tfSep"> · </span><br>${typeof o.onFix === "function" ? "건반 = 그 음 소리 · 멈춘 뒤 초록 정음 막대 톡 = 정음 고치기" : "왼쪽 건반을 누르면 그 음 소리"}</span>
      <span class="tfCtl">${hasAb ? `<span class="tfAbW"><span class="tfAbL">듣는 소리</span><span class="tfAb" role="group" aria-label="듣는 소리: 원음·보정본"><button type="button" data-m="o">🎤 원음</button><i class="tfSwap" aria-hidden="true">⇄</i><button type="button" data-m="p">✨ 보정본</button></span></span>` : ""}<span class="tfNav"><button type="button" data-j="0" aria-label="처음으로">⏮ 처음</button><button type="button" data-j="-5" aria-label="5초 뒤로">-5초</button><button type="button" class="tfPP" data-pp="1" aria-label="재생/일시정지">▶</button><button type="button" data-j="5" aria-label="5초 앞으로">+5초</button></span></span>
      <span class="tfNote">자동 단순 보정이라 정확하지 않을 수 있어요.<br>정식 음원은 전문 엔지니어가 한 음 한 음 더 정밀하게 다듬어요.</span></div></div>`;
    document.body.appendChild(wrap);
    wrap.addEventListener("dblclick", (e) => e.preventDefault());   // (11/03 10:50 아이패드) 버튼을 연타해도 화면이 확대되지 않게(확대는 두 손가락으로만)
    const box = wrap.querySelector(".tfBox"), cvEl = wrap.querySelector(".tfCv"), st = { full: true, xz: 1, yz: 1, yc: null, panAt: 0, notes: o.notes, teacher: !!o.teacher, lvDef: o.lvDef, wave: o.wave };
    const rot = false;   // (10/30 17:51 사용자) 가로도 남김 — 세로로 들면 세로, 폰을 돌리면 가로
    const layout = () => { const W = G.innerWidth, H = G.innerHeight, port = H > W;
      box.style.width = W + "px"; box.style.height = H + "px"; box.style.transform = "translate(-50%,-50%)";
      box.classList.toggle("port", port); st.win = port ? 3 : 6; };
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
    const done = () => { saveToast(); G.removeEventListener("resize", layout); G.removeEventListener("orientationchange", layout); wrap.remove(); if (fsClose === done) fsClose = null; };
    fsClose = done;
    const close = () => { const sh = !!sheetClose; if (sh) sheetClose(true); done(); try { if (history.state && history.state.tuneFs) { skipPop = true; history.go(sh && history.state.tuneSheet ? -2 : -1); } } catch {} };   // 주석 창이 열린 채 닫으면 그 기록까지 같이 정리
    wrap.querySelectorAll(".tfX").forEach(b => b.onclick = close);
    const tm = wrap.querySelector(".tfTime"), mid = wrap.querySelector(".tfMid"), skipB = wrap.querySelector(".tfSkip");
    skipB.addEventListener("pointerdown", (e) => e.stopPropagation());
    skipB.onclick = () => { if (st.gapNext != null) { st.panAt = 0; try { seek(Math.max(0, st.gapNext - 1), typeof o.paused === "function" ? o.paused() : true); } catch {} } };
    const isPaused = () => (typeof o.paused === "function" ? o.paused() : true);
    // 가운데 표시: 멈추면 ❚❚가 살짝 튀어나와 머묾, 재생하면 ▶가 잠깐 떴다가 사라짐(10/30 14:27 사용자)
    const showMid = (kind) => { mid.textContent = kind === "pause" ? "❚❚" : kind === "back" ? "⏪" + DT_JUMP : kind === "fwd" ? DT_JUMP + "⏩" : "▶"; mid.className = "tfMid " + (kind === "pause" ? "stay" : "flash"); void mid.offsetWidth; mid.classList.add("go"); };
    st.voice = typeof o.voice === "function" ? o.voice : null;
    st.onTime = typeof o.onTime === "function" ? o.onTime : null;
    st.o = o; st.mMode = false; st.msel = null;   // (11/03 13:08) 타이밍·길이 고치기(선생님 메이크업 화면만)
    st.playSeg = (t0, t1) => { st.panAt = 0; try { seek(Math.max(0, t0 - 0.05), true); } catch {} if (isPaused()) toggle(); st.stopAt = t1 + 0.05; };   // (11/03 10:50 사용자) 멜로다인처럼 그 음 구간만 듣기
    const toggle = () => { st.stopAt = 0; const was = isPaused(); try { o.play && o.play(); } catch {} showMid(was ? "play" : "pause"); if (was) { st.panAt = 0; st.waitAt = performance.now(); } else st.waitAt = 0; };   // (11/02 20:31) 눌렀는데 아직 안 나오면 '불러오는 중' 표시
    const pauseNow = () => { if (!isPaused()) { try { o.play && o.play(); } catch {} } showMid("pause"); };
    let lastTap = 0;
    if (isPaused()) setTimeout(() => showMid("pause"), 430);   // 처음 열었을 때 멈춰 있으면 ❚❚ 대기
    const resetZoom = () => { st.xz = 1; st.yz = 1; st.yc = null; st.yo = 0; st.panAt = 0; };
    const endT = () => { const p = cv && cv.pts; return p && p.length ? +p[p.length - 1][0] || 0 : 1e9; };
    wrap.querySelectorAll("[data-j]").forEach(b => b.onclick = () => {   // 처음 / -5초 / +5초(10/30 14:49 사용자) — 재생 중이면 계속, 멈춰 있으면 멈춘 채
      const j = +b.dataset.j, now = +getT() || 0, t = j === 0 ? 0 : Math.max(0, Math.min(endT(), now + j));
      st.panAt = 0; try { seek(t, isPaused()); } catch {} });
    wrap.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { try { const cur = o.mode ? o.mode() : "p", want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m; o.setMode(want); } catch {} });   // (11/02 19:30) 켜진 쪽을 눌러도 바뀜(진짜 스위치)
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
    cvEl.addEventListener("pointerdown", (e) => {
      pts.set(e.pointerId, { a: along(e), b: across(e) }); try { cvEl.setPointerCapture(e.pointerId); } catch {}
      if (pts.size === 2) { const [p1, p2] = [...pts.values()]; drag = null; preview = null;
        pinch = { d: Math.hypot(p1.a - p2.a, p1.b - p2.b), xz: st.xz, yz: st.yz, mid: (p1.a + p2.a) / 2, t: +getT() || 0 }; return; }
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
        if (typeof o.onNote === "function") { const d0 = drag, r0 = cvEl.getBoundingClientRect(), l0 = loc(d0.cx, d0.cy, r0), h0 = hitNote(st, l0.x, l0.y);
          d0.h0 = h0;
          if (h0) { if (!h0.del) { st.hold = { n: h0.n, at: performance.now() }; d0.lp = setTimeout(() => { st.hold = null; if (drag !== d0 || d0.mode) return; d0.long = true; pauseNow(); lastView = view; o.onNote(h0.n); }, 600); } }   // 주석 칸 0.6초 꾹 = 고치기(10/30 19:48 사용자)
          else if (typeof o.onAdd === "function") d0.lp = setTimeout(() => { if (drag !== d0 || d0.mode) return;
            const tt = timeAt(st, l0.x);
            // (11/03 13:53 사용자) 꾹 누른 뒤: 그냥 떼면 새 주석 · 떼지 않고 좌우로 끌면 여러 음 고르기(따로 버튼 없이) — 선생님 화면만
            if (typeof o.onResetRange === "function" && st.map && tt != null) { pauseNow(); d0.armed = { x: l0.x, t: tt }; st.msel = [tt, tt]; armTip(true); return; }
            d0.long = true; pauseNow();
            if (tt != null) { lastView = view; o.onAdd(tt); } }, 390); } }
    });
    cvEl.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { a: along(e), b: across(e) });
      if (pinch && pts.size >= 2) { const [p1, p2] = [...pts.values()], r = pinch.d > 30 ? Math.hypot(p1.a - p2.a, p1.b - p2.b) / pinch.d : 1;   // 어느 방향으로 벌려도 상하·좌우 같이 확대
        if (st.mMode) { preview = Math.max(0, pinch.t - ((p1.a + p2.a) / 2 - pinch.mid) / span() * ((st.win || 6) / st.xz)); return; }   // 여러 음 고르기 중엔 두 손가락 = 시간 이동
        st.yz = Math.max(1, Math.min(12, pinch.yz * r)); st.xz = Math.max(1, Math.min(4, pinch.xz * Math.sqrt(r)));
        if (st.yz > 1 && st.yc == null) { const f = fitAt(cv, +getT() || 0, 0); st.yc = f ? f[2] : null; }
        return; }
      if (!drag || drag.id !== e.pointerId) return;
      if (drag.msel) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (!mp) return; if (Math.abs(l0.x - drag.x0) >= 4) drag.moved = true;
        if (drag.moved) { const tx = (x) => mp.t0 + (Math.max(mp.L, Math.min(mp.w, x)) - mp.L) / Math.max(1, mp.w - mp.L) * mp.W8, a = tx(drag.x0), b = tx(l0.x); st.msel = [Math.max(0, Math.min(a, b)), Math.max(a, b)]; if (st.onMSel) st.onMSel(); } return; }
      if (drag.barX) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (Math.abs(l0.x - drag.x0) >= 3) drag.moved = true;
        if (drag.moved && mp && st.onBarDragX) st.onBarDragX(Math.round((l0.x - drag.x0) / Math.max(1, mp.w - mp.L) * mp.W8 * 100) / 100, drag.edge, false); return; }
      if (drag.bar) { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0), k = Math.round((st.kb.inv(l0.y) - st.kb.inv(drag.y0)) / 100);
        if (k !== drag.k) { drag.k = k; drag.moved = true; if (st.onBarDrag) st.onBarDrag(k, false); } return; }
      if (drag.kb) { const r0 = cvEl.getBoundingClientRect(), l0 = loc(e.clientX, e.clientY, r0), m = Math.round(st.kb.inv(l0.y) / 100); if (m !== st.kbDown) { st.kbDown = m; tone(m); } return; }   // 건반 위로 밀면 따라 바뀜
      const dA = along(e) - drag.a, dB = across(e) - drag.b;
      if (drag.armed) { const l0 = loc(e.clientX, e.clientY, cvEl.getBoundingClientRect()), mp = st.map; if (!mp) return;   // 꾹 누른 채 끌기 = 여러 음 고르기
        if (!drag.moved && Math.abs(l0.x - drag.armed.x) < 12) return; drag.moved = true; armTip(false);
        const tx = (x) => mp.t0 + (Math.max(mp.L, Math.min(mp.w, x)) - mp.L) / Math.max(1, mp.w - mp.L) * mp.W8, a = drag.armed.t, b = tx(l0.x); st.msel = [Math.max(0, Math.min(a, b)), Math.max(a, b)];
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
      if (d.armed) { armTip(false); if (d.moved) { if (st.onMSel) st.onMSel(); return; } st.msel = null; if (e.type === "pointerup") { lastView = view; o.onAdd(d.armed.t); } return; }   // 끌지 않고 뗌 = 새 주석(예전과 같음)
      if (d.long) return;
      if (d.kb) { toneOff(); st.kbDown = null; return; }
      if (st.mMode && !d.mode && e.type === "pointerup" && sheetClose) { sheetClose(); lastTap = 0; return; }   // (11/03 13:58 사용자) 여러 음 고르기 중 빈 곳 톡 = 끝내기 · (13:59) 끌기는 평소처럼 화면 이동, 다시 고르기는 꾹 누른 채 끌기
      if (d.bar || d.barX || d.msel) return;   // 고른 막대를 위아래(음정)·좌우(타이밍)로 옮긴 것(재생/멈춤 아님)
      if (!d.mode && e.type === "pointerup" && typeof o.onFix === "function" && isPaused() && st.tbars) {   // 멈춘 상태에서 초록 정음 막대 톡 = 정음 고치기
        const le = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()), hb = hitT(le) || hitBar(le);   // (11/03 10:31 아이패드) 누른 자리(뗀 자리 아님) + 손가락 크기만큼 넉넉하게
        if (hb) { fixSheet(wrap, cv, hb, o.onFix, getT, st); return; } }
      if (!d.mode && e.type === "pointerup" && wrap.querySelector(".tfFix") && sheetClose && sheetClose._fix) {   // (11/03 02:02 사용자) 고치기 창이 떠 있으면 빈 곳 톡 = 창 닫기(재생/멈춤 아님) · 다른 막대는 위에서 바로 바뀜
        const le = loc(d.cx ?? e.clientX, d.cy ?? e.clientY, cvEl.getBoundingClientRect()), onBar = hitT(le) || hitBar(le);
        if (!onBar) { sheetClose(); lastTap = 0; return; } }
      if (!d.mode && e.type === "pointerup" && typeof o.onNote === "function") { const r = cvEl.getBoundingClientRect(), le = loc(e.clientX, e.clientY, r), hn = d.h0 || hitNote(st, le.x, le.y);   /* 누를 때 맞은 칸 우선(떼는 사이 칸이 바뀌어도) */ if (hn) { pauseNow(); if (hn.del) { o.onDelNote && o.onDelNote(hn.n); } else { lastView = view; o.onNote(hn.n); } return; } }
      if (d.mode === "time") { const t = preview; preview = null; if (t != null) seek(t, true); return; }   // 이동만, 재생은 안 함
      if (!d.mode && e.type === "pointerup") { const now = Date.now();   // 톡 = 재생/멈춤 · 기준선 왼쪽 두 번 톡 = 2초 뒤로, 오른쪽 = 2초 앞으로(11/03 10:24)
        if (now - lastTap < 320) { toggle(); lastTap = 0;   // 첫 톡의 재생/멈춤은 되돌리고
          const r0 = cvEl.getBoundingClientRect(), le = loc(e.clientX, e.clientY, r0), L = (st.kb && st.kb.L) || 44, hx = L + HEAD * ((rot ? r0.height : r0.width) - L);
          const j = le.x < hx ? -DT_JUMP : DT_JUMP, nt = Math.max(0, Math.min(endT(), (+getT() || 0) + j)); st.panAt = 0; try { seek(nt, isPaused()); } catch {} showMid(j < 0 ? "back" : "fwd"); }
        else { toggle(); lastTap = now; } }
    };
    cvEl.addEventListener("pointerup", end); cvEl.addEventListener("pointercancel", (e) => { preview = null; end(e); });
    const ldEl = document.createElement("div"); ldEl.className = "tfLoad"; ldEl.setAttribute("aria-live", "polite"); ldEl.innerHTML = `<div class="tfTipH"><span class="tfHg" aria-label="소리 불러오는 중">⏳</span><span>[Tip]</span><span class="tfPn">톡 하면 닫혀요</span></div><p class="tfTip"></p>`;   // (11/03 11:39 사용자) 큰 돌림표·💡 빼고 작은 모래시계 + [Tip](11/03 11:40)
    const ldTips = fsTips(o); let tipI = -1, ldOn = false; wrap.querySelector(".tfCvBox").appendChild(ldEl);
    // (11/03 14:47 사용자) 팁 창이 떠 있는 동안(사라지는 중 포함) 아래 화면은 눌리지 않음 · 창이든 바깥이든 톡 = 바로 닫힘(페이드 없이)
    //   누른 채 끌기(창이 따라 움직임)·0.6초 넘게 꾹 = 붙잡음(저절로 안 사라짐) · 안 건드리면 다 불러온 뒤 2초 보이고 1.8초 페이드 · 팁은 한 번에 하나, 아무거나
    const LD_LINGER = 2000, LD_LONG = 600, LD_FADE = 1800;
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
    wrap.addEventListener("pointerdown", (e) => { if (!ldShown || ldEl.contains(e.target)) return;   /* (11/03 14:56 사용자) 사라지는 1.8초 동안은 아래 화면 눌림 */ e.stopPropagation(); e.preventDefault(); ldEat = performance.now() + 700; ldShut(); }, true);
    wrap.addEventListener("click", (e) => { if (performance.now() < ldEat) { e.stopPropagation(); e.preventDefault(); } }, true);
    const loop = () => { if (!wrap.isConnected) return;
      if (st.stopAt && !isPaused() && (+getT() || 0) >= st.stopAt) { st.stopAt = 0; toggle(); }   // 🎤 목소리 듣기: 그 음 끝에서 멈춤
      { const w = st.waitAt ? performance.now() - st.waitAt : 0, on = !!st.waitAt && isPaused() && w > 350 && w < 45000; if (st.waitAt && (!isPaused() || w >= 45000)) st.waitAt = 0; if (!on) { if (ldWas && ldShown && !ldPin && !ldDis) ldLinger = performance.now() + LD_LINGER; ldDis = false; } else ldLinger = 0; ldWas = on; const vis = (on && !ldDis) || ldPin || ldDown > 0 || performance.now() < ldLinger;
        if (vis && !ldShown && !ldEl.classList.contains("on")) { ldEl.dataset.dx = ldEl.dataset.dy = 0; ldEl.style.setProperty("--dx", "0px"); ldEl.style.setProperty("--dy", "0px"); }   /* 새로 뜰 땐 제자리 */ if (ldShown && !vis && !ldEl.classList.contains("now")) ldFadeTo = performance.now() + LD_FADE; ldEl.classList.toggle("on", vis); ldEl.classList.toggle("pin", ldPin); ldEl.classList.toggle("fd", !vis && performance.now() < ldFadeTo); ldEl.classList.toggle("tipOnly", !on); ldShown = vis; if (ppB) ppB.classList.toggle("ld", on);
        if (vis && ldTips.length && !ldOn) {   // 새로 뜰 때 팁 하나(아무거나, 바로 전 것과는 다르게) — 떠 있는 동안엔 안 바뀜
          let k = Math.floor(Math.random() * ldTips.length); if (ldTips.length > 1 && k === tipI) k = (k + 1 + Math.floor(Math.random() * (ldTips.length - 1))) % ldTips.length; tipI = k;
          ldEl.querySelector(".tfTip").textContent = ldTips[k].text(); } ldOn = vis; }
      if (ppB) { const s = ppB.classList.contains("ld") ? "⏳" : isPaused() ? "▶" : "❚❚"; if (ppB.textContent !== s) { ppB.textContent = s; ppB.setAttribute("aria-label", isPaused() ? "재생" : "일시정지"); } } const t = preview ?? (+getT() || 0); draw(cvEl, cv, t, +getLv() || 0, st); mid.style.visibility = st.hits && st.hits.length ? "hidden" : "";
      tm.textContent = fmt(t) + (st.yz > 1.05 ? ` · ×${st.yz.toFixed(1)}` : "");
      { const show = st.gapNext != null && st.gapNext - t > 2; if (skipB.hidden === show) skipB.hidden = !show; }
      if (hasAb) { const m = o.mode ? o.mode() : "p"; wrap.querySelectorAll("[data-m]").forEach(b => b.classList.toggle("on", b.dataset.m === m)); }
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // 뒤로 가기: 열린 전체화면만 닫고, 앱 쪽 뒤로 가기 처리는 건너뛰게 e.tuneClosed 표시(선생님 앱 popstate가 확인)
  let fsClose = null, skipPop = false, sheetClose = null;
  if (typeof G.addEventListener === "function") G.addEventListener("popstate", (e) => {
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
#tuneFs .tfCvBox{position:relative;flex:1;min-height:0;display:flex}#tuneFs .tfSkip{position:absolute;right:12px;bottom:12px;z-index:5;border:0;border-radius:12px;background:#9cc3ff;color:#111;font-weight:800;font-size:14px;padding:10px 14px}#tuneFs .tfSkip[hidden]{display:none}#tuneFs .tfMid{position:absolute;left:50%;top:9%;width:48px;height:48px;margin:-24px 0 0 -24px;border-radius:50%;background:rgba(156,195,255,.12);color:rgba(255,255,255,.55);font-size:18px;display:grid;place-items:center;pointer-events:none;opacity:0;transform:scale(.6)}
#tuneFs .tfMid.stay.go{animation:tfPop .22s cubic-bezier(.3,1.5,.5,1) forwards}#tuneFs .tfMid.flash.go{animation:tfFlash .3s ease-out forwards}
@keyframes tfPop{from{opacity:0;transform:scale(.6)}to{opacity:.8;transform:scale(1)}}@keyframes tfFlash{0%{opacity:0;transform:scale(.7)}25%{opacity:.8;transform:scale(1.05)}100%{opacity:0;transform:scale(1.2)}}
#tuneFs .tfBot{justify-content:space-between;align-items:flex-end;gap:16px}#tuneFs .tfHint{font-size:11.5px;color:#7d8590;line-height:1.4;word-break:keep-all;text-wrap:balance;max-width:34%}
#tuneFs .tfNote{font-size:11.5px;color:#c9b98f;text-align:right;line-height:1.45;word-break:keep-all;text-wrap:balance;max-width:36%}
#tuneFs .tfTop .tfLeg{margin-left:10px}#tuneFs .tfXp,#tuneFs .tfBr{display:none}
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
/* (11/02 20:26 사용자) '듣는 소리' 빼고 아래 버튼 높이만 70%로(46→32) */#tuneFs .tfAbL{display:none}#tuneFs,#tuneFs button,#tuneFs .tfFix,#tuneFs .tfFix *{touch-action:manipulation}#tuneFs .tfCv{touch-action:none}#tuneFs .tfBot .tfVoice{height:28px;min-height:0;padding:0 10px;margin:0 0 0 8px;border-radius:14px;border:1.5px solid #3b4250;background:#11141a;color:#eceff3;font-size:12.5px;font-weight:800}#tuneFs .tfC{font-size:12px;color:#ffd27a;margin-left:3px}.tuneSaveT{position:fixed;left:50%;bottom:calc(28px + env(safe-area-inset-bottom));transform:translateX(-50%);z-index:10003;background:rgba(24,28,35,.96);border:1.5px solid #3b4250;color:#eceff3;font-weight:800;font-size:14px;border-radius:20px;padding:10px 18px;box-shadow:0 6px 20px rgba(0,0,0,.5);pointer-events:none;white-space:nowrap}/* (11/03 02:13 사용자) 앱 전체 button 최소 높이(52px)가 덮어써서 줄인 게 안 보였음 → 높이를 직접 고정: 닫기 28 · 스위치 46 · 재생 버튼 40(지금 스위치 높이) */#tuneFs .port .tfXp{height:28px!important;min-height:0!important;padding:0 10px!important;font-size:12.5px!important}#tuneFs .port .tfXp i{font-size:13px!important}#tuneFs .port .tfCtl .tfAb{height:46px;box-sizing:border-box}#tuneFs .port .tfCtl .tfAb button{min-height:0!important;height:38px!important;font-size:15px}#tuneFs .port .tfNav button{min-height:0!important;height:40px!important}#tuneFs .tfCtl .tfAb .tfSwap{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;width:24px;height:24px;border-radius:50%;background:#1a1e25;border:1.5px solid #3b4250;color:#cfd3da;font-style:normal;font-size:13px;font-weight:900;display:grid;place-items:center;pointer-events:none;box-shadow:0 1px 4px rgba(0,0,0,.6)}#tuneFs .tfCtl .tfAb button[data-m="o"]{padding-right:16px!important}#tuneFs .tfCtl .tfAb button[data-m="p"]{padding-left:16px!important}#tuneFs .tfLoad.now{transition:none!important}#tuneFs .tfLoad.fd{pointer-events:auto}#tuneFs .tfLoad .tfPn{display:inline-block;margin-left:6px;font-size:11.5px;font-weight:700;color:#5fd4ff;background:rgba(95,212,255,.12);border-radius:8px;padding:1px 7px}#tuneFs .tfLoad.pin .tfPn{display:inline-block}#tuneFs .tfLoad{position:absolute;left:50%;top:42%;transform:translate(calc(-50% + var(--dx,0px)),calc(-50% + var(--dy,0px)));z-index:6;display:flex;flex-direction:column;align-items:flex-start;gap:4px;padding:12px 16px!important;width:min(300px,78%);box-sizing:border-box;background:rgba(17,20,26,.92);border:1px solid #3b4250;border-radius:16px;padding:16px 20px;pointer-events:none;text-align:center;opacity:0;visibility:hidden;transition:opacity 1.8s ease,visibility 0s linear 1.8s;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}#tuneFs .tfLoad.on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity .2s ease}#tuneFs .tfLoad.tipOnly .tfHg{display:none}#tuneFs .tfTipH{display:flex;align-items:center;gap:6px;font-size:12.5px;font-weight:800;color:#9aa3ad;align-self:flex-start}#tuneFs .tfHg{display:inline-block;font-size:14px;animation:tfHg 1.6s ease-in-out infinite}@keyframes tfHg{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(360deg)}}#tuneFs .tfLoad i{width:30px;height:30px;border-radius:50%;border:3px solid #3b4250;border-top-color:#9cc3ff;animation:tfSpin .9s linear infinite}#tuneFs .tfLoad b{font-size:15px}#tuneFs .tfLoad .tfTip{margin:2px 0 0;max-width:280px;font-size:14px;line-height:1.55;color:#ffd27a;word-break:keep-all;text-align:left}#tuneFs .tfLoad .tfTip:empty{display:none}#tuneFs .tfLoad small{font-size:12px;color:#9aa3ad}@keyframes tfSpin{to{transform:rotate(360deg)}}#tuneFs .port .tfCtl .tfAb button{min-height:32px}#tuneFs .port .tfNav button{height:32px}#tuneFs .port .tfCtl{gap:7px}#tuneFs:has(.tfFix) .tfNav,#tuneFs:has(.tfFix) .tfAbH,#tuneFs:has(.tfFix) .tfHint,#tuneFs:has(.tfFix) .tfNote,#tuneFs:has(.tfFix) .tfSkip{display:none}#tuneFs .tfFix.inBot{display:flex!important;flex-direction:column}#tuneFs .tfFix.inBot .tfFixBox{flex:1;display:flex;flex-direction:column;justify-content:center}#tuneFs .tfFixHd b{font-size:14px}#tuneFs .tfFixTm{margin-left:8px!important}#tuneFs .tfFixSt{margin-left:auto}#tuneFs .tfFixTip{position:absolute;left:50%;top:14px;transform:translateX(-50%);z-index:7;background:rgba(17,20,26,.92);border:1.5px dashed #ffd27a;color:#ffd27a;font-size:12.5px;font-weight:700;border-radius:12px;padding:6px 12px;pointer-events:none;white-space:nowrap;animation:tfTipIn .25s ease}@keyframes tfTipIn{from{opacity:0}to{opacity:1}}#tuneFs .tfTitle{display:none}#tuneFs .port .tfBr{display:none!important}#tuneFs .port .tfTop{flex-wrap:nowrap}#tuneFs .port .tfLeg{order:1;flex-wrap:nowrap;gap:10px}#tuneFs .port .tfTime{order:2;font-size:12px}#tuneFs .port .tfXp{order:3;margin-left:auto;height:32px;padding:0 12px;font-size:13px;border-width:1.5px;border-radius:16px}#tuneFs .port .tfXp i{font-size:15px}#tuneFs .tfX:not(.tfXp){height:34px;padding:0 12px;font-size:13px;border-width:1.5px}#tuneFs .tfFixHd{display:flex;align-items:center;gap:8px}#tuneFs .tfFixTm{margin-left:auto;font-size:12.5px;color:#9aa3ad;white-space:nowrap}#tuneFs .tfFixSt{color:#7fd99a;font-size:12px;white-space:nowrap}#tuneFs .tfFixAb{position:relative;display:flex;width:178px;flex:none;border-radius:20px;background:#0b0d11;border:1.5px solid #3b4250;padding:3px;box-shadow:inset 0 2px 5px rgba(0,0,0,.7);box-sizing:border-box;overflow:visible}#tuneFs .tfFixAb::before{content:"";position:absolute;top:3px;bottom:3px;left:3px;width:calc(50% - 3px);border-radius:17px;background:#e8e8ea;transition:left .22s ease,background .22s}#tuneFs .tfFixAb:has([data-m="p"].on)::before{left:50%;background:linear-gradient(135deg,#c7a4ff,#8f6cf0)}#tuneFs .tfBot .tfFixAb button{position:relative;flex:1;height:auto;min-width:0;min-height:36px;padding:0 4px;border:0;border-radius:17px;background:transparent;color:#7d8590;font-size:13.5px;font-weight:800;white-space:nowrap}#tuneFs .tfBot .tfFixAb button.on{color:#111}#tuneFs .tfBot .tfFixRow{gap:6px;margin-top:8px}#tuneFs .tfBot .tfFixRow button{flex:1;padding:0;min-height:48px;font-size:17px}#tuneFs .tfBot .tfFixRow button.tfFixN{flex:2.1;font-size:21px}#tuneFs .tfBot .tfFixRow button.tfIc{flex:.9;font-size:20px}.tfFix .tfT{display:none}.tfFix.tmode .tfT{display:flex}.tfFix.tmode .tfP{display:none}.tfFixMd{display:inline-flex;border:1px solid #363c45;border-radius:14px;padding:2px;background:#11141a;margin-right:8px}.tfFixMd button{border:0;margin:0;border-radius:12px;background:transparent;color:#a9b1bc;font-weight:800;font-size:12.5px;min-height:0!important;height:26px;padding:0 9px;white-space:nowrap}.tfFixMd button.on{background:#7fd99a;color:#10201a}.tfFixMd button[data-md="t"].on{background:#5fd4ff;color:#06222c}.tfFixRow button.tfTN{color:#5fd4ff;background:#0d1a20;border-color:#2b5566;font-size:19px;line-height:1.1}.tfTN small{display:block;font-size:11px;margin:2px 0 0}#tuneFs .tfMm{margin:0 0 0 6px!important;min-height:0!important;height:26px!important;padding:0 9px!important;border-radius:13px!important;border:1.5px solid #4a505c!important;background:#11141a!important;color:#e8e8ea!important;font-size:12px!important;font-weight:800;white-space:nowrap}#tuneFs .tfBot .tfFixRow button.tfMr{flex:3;font-size:15px;background:#ff6ec7;color:#1a0714;border:0}#tuneFs .tfBot .tfFixRow button.tfMr:disabled{background:#2a2f38;color:#8b939e}.tfFixRow button[data-r],.tfFixRow button[data-tr]{position:relative;overflow:hidden}.tfFixRow button.hold::after{content:"";position:absolute;left:0;bottom:0;height:4px;width:100%;background:#ffd27a;transform-origin:left;animation:tfHold 1s linear forwards}@keyframes tfHold{from{transform:scaleX(0)}to{transform:scaleX(1)}}.tfCfm{position:absolute;inset:0;z-index:40;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:16px}.tfCfmBox{background:#1a1e25;border:1.5px solid #3b4250;border-radius:16px;padding:16px 18px;width:min(340px,100%);color:#e8e8ea;box-shadow:0 8px 30px rgba(0,0,0,.6)}.tfCfmBox b{font-size:16px}.tfCfmBox p{font-size:13.5px;color:#b6bdc7;line-height:1.5;margin:8px 0 14px;word-break:keep-all}.tfCfmRow{display:flex;gap:8px}.tfCfmRow button{flex:1;min-height:0!important;height:44px!important;border-radius:12px;border:1.5px solid #3b4250;background:#11141a;color:#e8e8ea;font-weight:800;font-size:15px;margin:0}.tfCfmRow button.pri{background:#ffd27a;color:#111;border:0}#tuneFs .tfFix .tfT{display:none!important}#tuneFs .tfFix.tmode .tfT{display:flex!important}#tuneFs .tfFix.tmode .tfP{display:none!important}#tuneFs .tfFixMd button{min-height:0!important;height:28px!important;padding:0 10px!important;background:transparent!important;color:#a9b1bc!important;border:0!important;font-size:12.5px!important}#tuneFs .tfFixMd button.on{background:#7fd99a!important;color:#10201a!important}#tuneFs .tfFixMd button[data-md="t"].on{background:#5fd4ff!important;color:#06222c!important}#tuneFs .tfBot .tfFixRow button.tfTN{color:#5fd4ff!important;background:#0d1a20!important;border-color:#2b5566!important;font-size:18px;line-height:1.1}#tuneFs .tfTN small{display:block;font-size:10.5px!important;margin:2px 0 0!important;color:#9aa3ad}#tuneFs .tfFixLab{display:flex;gap:6px;margin-top:3px;font-size:10.5px;color:#7d8590;line-height:1.2}#tuneFs .tfFixLab span{flex:1;text-align:center;white-space:nowrap;overflow:hidden}#tuneFs .tfFixLab .n{flex:2.1}#tuneFs .tfFixLab .i{flex:.9}#tuneFs .tfFix.inBot .tfFixBox{padding:8px 10px}#tuneFs .tfFix.inBot{position:static;padding:0;display:block;flex:1 1 auto}#tuneFs .tfFix.inBot .tfFixBox{width:100%;box-sizing:border-box;box-shadow:none}#tuneFs .tfBot .tfFixRow button{height:auto;min-width:0;min-height:46px;border:1.5px solid #3b4250;border-radius:12px;background:#11141a;color:#e8e8ea;font-size:16px}#tuneFs .tfBot .tfFixRow button.pri{background:#9cc3ff;color:#111;border:none}#tuneFs .tfBot .tfFixRow button.tfFixN{font-size:22px;font-weight:900;color:#7fd99a;background:#0f1a14;border-color:#2f5a40}#tuneFs .tfBot .tfFixRow button.tfCut{font-size:20px}
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
#tuneSheet .tsRow{display:flex;gap:8px;margin-top:10px}#tuneSheet .tsRow button{flex:1;min-height:46px;border-radius:22px;border:1px solid #3a3f49;background:#11141a;color:#eceff3;font-weight:800;font-size:15px;margin:0}#tuneSheet .tsRow .tsOk{background:#7fd99a;color:#10201a;border:0}#tuneSheet .tsRow .tsDel{color:#ff9a9a}`;
  if (typeof document !== "undefined" && document.head) { const s2 = document.createElement("style"); s2.textContent = css2; document.head.appendChild(s2); }
  if (typeof document !== "undefined" && document.head) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }
  G.Tune = { tone, toneOff, draw, wire, load, legend, range, col, tgCol, centerAt, fitAt, delta, semiLabel, sangLabel, sheet, undo, openFull, noteName, WIN, HEAD, ZOOM_HALF, tmapOf, mapT };
})(typeof window !== "undefined" ? window : globalThis);
