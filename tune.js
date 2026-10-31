// (10/30 사용자) 튠 화면 — Waves Tune처럼 음정선이 재생 위치와 함께 오른쪽→왼쪽으로 흐름. 선생님 앱·수강생 노트 공용.
// curve = 메이크업 서버가 저장한 pitch_curve.json: { fps, scale:[음이름 번호], levels:[1,2,3], pts:[[초, 원음, 약, 중, 강], ...] } (값 = MIDI×100 센트)
// 노랑 = 실제로 부른 음, 하늘색 = 보정된 음, 주황 세로선 = 지금(10/31 사용자 C안 변형). 두 선 사이 노랑 = 고친 곳(진할수록 많이).
// 아래 줄 = 고친 양(위 = 올림 · 아래 = 내림, 끝까지 = 반음 ½ 이상). 확대(기본): 지금 음 근처 ±4반음, 전체: 곡 전체 음역.
// 음정 인식은 AI 추정(숨소리·자음에서 선이 튈 수 있음) — 참고용.
(function (G) {
  const WIN = 8, HEAD = 0.4, NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"], LANE = 34, ZOOM_HALF = 400;
  function range(cv) {
    if (cv._rng) return cv._rng;
    const a = (cv.pts || []).map(p => p[1]).filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return (cv._rng = [5700, 7200]);
    const lo = a[Math.floor(a.length * 0.03)], hi = a[Math.min(a.length - 1, Math.floor(a.length * 0.97))];
    return (cv._rng = [Math.floor(lo / 100) * 100 - 250, Math.ceil(hi / 100) * 100 + 250]);
  }
  function col(cv, lv) { const i = (cv.levels || []).indexOf(+lv); return lv > 0 && i >= 0 ? 2 + i : 0; }   // pts 안 위치(0 = 없음)
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
  function undo(msg, onUndo) {   // 4초 동안 '되돌리기'
    document.getElementById("tuneUndo")?.remove();
    const el = document.createElement("div"); el.id = "tuneUndo"; el.setAttribute("role", "status");
    el.innerHTML = `<span></span><button type="button">되돌리기</button>`; el.querySelector("span").textContent = msg;
    (document.getElementById("tuneFs") || document.body).appendChild(el);
    const tm = setTimeout(() => el.remove(), 4000);
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
    const close = () => { el.remove(); V && V.done(); if (lastView === V) lastView = null; };
    // (10/31 08:09 버그) 위 칸을 톡 하면 창이 뜬 직후 같은 손가락의 'click'이 창 바깥(어두운 곳)에 떨어져 바로 닫혔음 → 뜬 뒤 0.45초 안의 바깥 클릭은 무시
    const openedAt = performance.now();
    el.onclick = (e) => { if (e.target === el && performance.now() - openedAt > 450) close(); };
    el.querySelector(".tsCancel").onclick = close;
    // (10/31 08:58 사용자) 글 칸에 커서가 있는 채로 미세 조정·한 점/구간 버튼을 누르면 키보드가 자꾸 올라옴 → 글 칸 밖 버튼을 누르는 순간 글 칸에서 커서를 빼서 키보드를 내림
    el.addEventListener("pointerdown", (e) => { const b = e.target.closest && e.target.closest("button"); if (!b || b.classList.contains("tsClr")) return;
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
    if (isNew) setTimeout(() => el.querySelector(".tsTx").focus(), 50);
    // (10/31 09:04 사용자) 상자를 누른 손가락의 뒤따르는 클릭이 막 열린 글 칸에 떨어지면 키보드가 바로 올라옴 → 열고 0.45초 동안은 글 칸이 키보드를 못 띄움(글을 한 번 더 눌러야 올라옴, 새 주석은 예전처럼 바로)
    if (!isNew) { const ta = el.querySelector(".tsTx"); ta.readOnly = true;
      ta.addEventListener("focus", () => { if (performance.now() - openedAt < 450) ta.blur(); });
      setTimeout(() => { ta.readOnly = false; }, 450); }
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
      if (full && !ins && yy - lastY >= 14) { g.fillStyle = "#3d4450"; g.fillText(NAMES[pc] + (Math.floor(m / 12) - 1), 4, yy); lastY = yy; }
      if (ins && yy - lastY >= 12) { g.fillStyle = sc && pc === sc[0] ? "#9cc3ff" : "#6b7480"; g.fillText(NAMES[pc] + (Math.floor(m / 12) - 1), 2, yy); lastY = yy; }   // 가까운 이름은 건너뜀
    }
    if (st) st.map = { L, W8, t0, w, T, H };
    const vis = []; for (const p of cv.pts || []) { if (p[0] < t0 - 0.3) continue; if (p[0] > t0 + W8 + 0.3) break; vis.push(p); }
    if (RB) { g.fillStyle = "#0c0e12"; g.fillRect(L, T + HP, w - L, RB); g.fillStyle = "#232a34"; g.fillRect(L, T + HP, w - L, 1); }   // 주석 칸 자리(음정선 아래)
    g.save(); g.beginPath(); g.rect(L, T, w - L, HP); g.clip();
    if (full && kt) {   // 정음(목표음) = 초록 막대: 보정이 맞추려는 바로 그 음
      const bh = Math.max(6, (HP - 12) / ((hi - lo) / 100) * 0.55);
      for (let i = 0; i < vis.length; i++) { const p = vis[i], q = vis[i + 1]; if (p[kt] == null) continue;
        const x0 = xs(p[0]), x1 = q && q[kt] === p[kt] && q[0] - p[0] < 0.13 ? xs(q[0]) : x0 + 2;
        g.fillStyle = "rgba(127,217,154,.28)"; g.fillRect(x0, y(p[kt]) - bh / 2, Math.max(1, x1 - x0 + 0.5), bh); }
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
    if (st) { let oy0 = 1e9, oy1 = -1e9; for (const p of vis) { for (const kk of [1, k]) { if (!kk || p[kk] == null) continue; const Y = y(p[kk]); if (Y < oy0) oy0 = Y; if (Y > oy1) oy1 = Y; } }   // 지금 화면의 음정선 높이 범위
      drawNotes(g, st, t, xs, L, w, T, H, full, tagB, oy0 <= oy1 ? [oy0, oy1] : null, vis, y); }
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
        // (10/30 16:58 사용자) 주석 칸: 톡 하고 떼도, 0.6초 꾹 눌러도 고치기 · 누른 채 좌우로 밀면 화면 이동 / 빈 곳 0.3초 꾹 = 새 주석
        if (h0) { if (!h0.del) { st.hold = { n: h0.n, at: performance.now() }; d0.lp = setTimeout(() => { st.hold = null; if (drag !== d0 || d0.moved) return; d0.long = true; if (ctl && !o.paused()) o.play(); lastView = view; o.onNote(h0.n); }, 600); } }
        else if (typeof o.onAdd === "function") d0.lp = setTimeout(() => { if (drag !== d0 || d0.moved) return;
          d0.long = true; if (ctl && !o.paused()) o.play();
          const tt = timeAt(st, e.clientX - r0.left); if (tt != null) { lastView = view; o.onAdd(tt); } }, 300); } });
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
      if (ctl) { const was = o.paused(); o.play(); showMid(was ? "play" : "pause"); return; }   // 톡 = 재생·멈춤
      const r = el.getBoundingClientRect(), x = e.clientX - r.left;
      if (x > 30) seek(Math.max(0, d.t - WIN * HEAD + (x - 30) / span() * WIN));   // 조작 정보가 없으면 예전처럼 그 자리부터
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", () => { if (drag) clearTimeout(drag.lp); st.hold = null; drag = null; preview = null; });
  }
  // ── 전체화면: 카드에서 커지며 가로로 돌아 폰 화면 가득. 상하 배율 고정(곡 전체 음역), 정음·부른 음·보정 음을 크게 ──
  function openFull(src, cv, getT, getLv, seek, o) {
    if (document.getElementById("tuneFs")) return;
    const wrap = document.createElement("div"); wrap.id = "tuneFs"; wrap.setAttribute("role", "dialog"); wrap.setAttribute("aria-label", "음정선 전체화면");
    const hasAb = typeof o.setMode === "function";
    wrap.innerHTML = `<div class="tfBox"><div class="tfTop"><b class="tfTitle">${String(o.title || "음정선").replace(/[<>&]/g, "")}</b><span class="tfTime"></span>
      <button type="button" class="tfX tfXp" aria-label="닫기"><i>✕</i>닫기</button><span class="tfBr"></span><span class="tfLeg"><span><i style="background:rgba(127,217,154,.6);height:8px"></i>정음</span><span><i style="background:#ffe066"></i>부른 음</span><span><i style="background:#7fd9ff"></i>보정 후</span><span class="tfLegC"><i style="background:#ffd27a;opacity:.6"></i>고친 곳</span></span>
      <button type="button" class="tfX" aria-label="닫기"><i>✕</i>닫기</button></div>
      <div class="tfCvBox"><canvas class="tfCv"></canvas><span class="tfMid" aria-hidden="true"></span><span class="tfBye" aria-live="polite">닫을 때는 <b>✕</b> 또는 폰의 <b>뒤로 가기</b></span></div>
      <div class="tfBot"><span class="tfHint">톡 = 재생·멈춤 · 좌우로 밀면 이동<span class="tfSep"> · </span><br>두 손가락으로 벌리면 확대 · 두 번 톡 = 원래 크기</span>
      <span class="tfCtl">${hasAb ? `<span class="tfAb"><button type="button" data-m="o">원음</button><button type="button" data-m="p">✨ 보정본</button></span>` : ""}<span class="tfNav"><button type="button" data-j="0" aria-label="처음으로">⏮ 처음</button><button type="button" data-j="-5" aria-label="5초 뒤로">-5초</button><button type="button" class="tfPP" data-pp="1" aria-label="재생/일시정지">▶</button><button type="button" data-j="5" aria-label="5초 앞으로">+5초</button></span></span>
      <span class="tfNote">자동 단순 보정이라 정확하지 않을 수 있어요.<br>정식 음원은 전문 엔지니어가 한 음 한 음 더 정밀하게 다듬어요.</span></div></div>`;
    document.body.appendChild(wrap);
    const box = wrap.querySelector(".tfBox"), cvEl = wrap.querySelector(".tfCv"), st = { full: true, xz: 1, yz: 1, yc: null, panAt: 0, notes: o.notes, teacher: !!o.teacher, lvDef: o.lvDef };
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
    const done = () => { G.removeEventListener("resize", layout); G.removeEventListener("orientationchange", layout); wrap.remove(); if (fsClose === done) fsClose = null; };
    fsClose = done;
    const close = () => { done(); try { if (history.state && history.state.tuneFs) { skipPop = true; history.back(); } } catch {} };
    wrap.querySelectorAll(".tfX").forEach(b => b.onclick = close);
    const tm = wrap.querySelector(".tfTime"), mid = wrap.querySelector(".tfMid");
    const isPaused = () => (typeof o.paused === "function" ? o.paused() : true);
    // 가운데 표시: 멈추면 ❚❚가 살짝 튀어나와 머묾, 재생하면 ▶가 잠깐 떴다가 사라짐(10/30 14:27 사용자)
    const showMid = (kind) => { mid.textContent = kind === "pause" ? "❚❚" : "▶"; mid.className = "tfMid " + (kind === "pause" ? "stay" : "flash"); void mid.offsetWidth; mid.classList.add("go"); };
    const toggle = () => { const was = isPaused(); try { o.play && o.play(); } catch {} showMid(was ? "play" : "pause"); if (was) st.panAt = 0; };
    const pauseNow = () => { if (!isPaused()) { try { o.play && o.play(); } catch {} } showMid("pause"); };
    let lastTap = 0;
    if (isPaused()) setTimeout(() => showMid("pause"), 430);   // 처음 열었을 때 멈춰 있으면 ❚❚ 대기
    const resetZoom = () => { st.xz = 1; st.yz = 1; st.yc = null; st.panAt = 0; };
    const endT = () => { const p = cv && cv.pts; return p && p.length ? +p[p.length - 1][0] || 0 : 1e9; };
    wrap.querySelectorAll("[data-j]").forEach(b => b.onclick = () => {   // 처음 / -5초 / +5초(10/30 14:49 사용자) — 재생 중이면 계속, 멈춰 있으면 멈춘 채
      const j = +b.dataset.j, now = +getT() || 0, t = j === 0 ? 0 : Math.max(0, Math.min(endT(), now + j));
      st.panAt = 0; try { seek(t, isPaused()); } catch {} });
    wrap.querySelectorAll("[data-m]").forEach(b => b.onclick = () => { try { o.setMode(b.dataset.m); } catch {} });
    const ppB = wrap.querySelector("[data-pp]"); if (ppB) ppB.onclick = () => toggle();   // (10/31 08:11 사용자) 재생/일시정지 버튼
    const fmt = (x) => `${Math.floor((x || 0) / 60)}:${String(Math.floor((x || 0) % 60)).padStart(2, "0")}`;
    // 손가락: 한 손가락 좌우 = 시간 이동(재생은 멈춤, 가운데 ▶로 다시), 위아래 = 음 높이 이동(확대했을 때), 두 손가락 = 핀치 확대, 톡 = 재생/멈춤
    const loc = (cx, cy, r) => (rot ? { x: cy - r.top, y: r.right - cx } : { x: cx - r.left, y: cy - r.top });   // 돌린 화면에서도 캔버스 안 좌표
    const along = (e) => (rot ? e.clientY : e.clientX), across = (e) => (rot ? e.clientX : e.clientY);
    const span = () => (cvEl.clientWidth - 44) || 1, tall = () => cvEl.clientHeight || 1;
    const pts = new Map(); let drag = null, pinch = null, preview = null;
    const view = mkView(st, () => preview, (v) => { preview = v; }, getT, seek);
    cvEl.style.touchAction = "none"; cvEl.addEventListener("contextmenu", (e) => e.preventDefault());
    cvEl.addEventListener("pointerdown", (e) => {
      pts.set(e.pointerId, { a: along(e), b: across(e) }); try { cvEl.setPointerCapture(e.pointerId); } catch {}
      if (pts.size === 2) { const [p1, p2] = [...pts.values()]; drag = null; preview = null;
        pinch = { d: Math.hypot(p1.a - p2.a, p1.b - p2.b), xz: st.xz, yz: st.yz }; return; }
      if (pts.size === 1) { drag = { a: along(e), b: across(e), t: +getT() || 0, id: e.pointerId, mode: null, yc: st.yc, cx: e.clientX, cy: e.clientY };
        if (typeof o.onNote === "function") { const d0 = drag, r0 = cvEl.getBoundingClientRect(), l0 = loc(d0.cx, d0.cy, r0), h0 = hitNote(st, l0.x, l0.y);
          d0.h0 = h0;
          if (h0) { if (!h0.del) { st.hold = { n: h0.n, at: performance.now() }; d0.lp = setTimeout(() => { st.hold = null; if (drag !== d0 || d0.mode) return; d0.long = true; pauseNow(); lastView = view; o.onNote(h0.n); }, 600); } }   // 주석 칸 0.6초 꾹 = 고치기(10/30 19:48 사용자)
          else if (typeof o.onAdd === "function") d0.lp = setTimeout(() => { if (drag !== d0 || d0.mode) return;
            d0.long = true; pauseNow();
            const tt = timeAt(st, l0.x); if (tt != null) { lastView = view; o.onAdd(tt); } }, 300); } }
    });
    cvEl.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return; pts.set(e.pointerId, { a: along(e), b: across(e) });
      if (pinch && pts.size >= 2) { const [p1, p2] = [...pts.values()], r = pinch.d > 30 ? Math.hypot(p1.a - p2.a, p1.b - p2.b) / pinch.d : 1;   // 어느 방향으로 벌려도 상하·좌우 같이 확대
        st.yz = Math.max(1, Math.min(12, pinch.yz * r)); st.xz = Math.max(1, Math.min(4, pinch.xz * Math.sqrt(r)));
        if (st.yz > 1 && st.yc == null) { const f = fitAt(cv, +getT() || 0, 0); st.yc = f ? f[2] : null; }
        return; }
      if (!drag || drag.id !== e.pointerId) return;
      const dA = along(e) - drag.a, dB = across(e) - drag.b;
      if (!drag.mode) { if (Math.max(Math.abs(dA), Math.abs(dB)) < 8) return; clearTimeout(drag.lp); st.hold = null; drag.mode = Math.abs(dA) >= Math.abs(dB) ? "time" : "pitch"; if (drag.mode === "time") pauseNow(); }
      if (drag.mode === "time") preview = Math.max(0, drag.t - dA / span() * ((st.win || 6) / st.xz));
      else if (st.yz > 1) { const [lo, hi] = range(cv), per = (hi - lo) / st.yz / tall(); st.yc = (drag.yc ?? (lo + hi) / 2) + dB * per * (rot ? -1 : 1); st.panAt = Date.now(); }
    });
    const end = (e) => {
      if (!pts.has(e.pointerId)) return; pts.delete(e.pointerId);
      if (pinch) { st.hold = null; if (pts.size === 0) pinch = null; return; }
      if (!drag || drag.id !== e.pointerId) return; const d = drag; drag = null; clearTimeout(d.lp); st.hold = null; if (d.long) return;
      if (!d.mode && e.type === "pointerup" && typeof o.onNote === "function") { const r = cvEl.getBoundingClientRect(), le = loc(e.clientX, e.clientY, r), hn = d.h0 || hitNote(st, le.x, le.y);   /* 누를 때 맞은 칸 우선(떼는 사이 칸이 바뀌어도) */ if (hn) { pauseNow(); if (hn.del) { o.onDelNote && o.onDelNote(hn.n); } else { lastView = view; o.onNote(hn.n); } return; } }
      if (d.mode === "time") { const t = preview; preview = null; if (t != null) seek(t, true); return; }   // 이동만, 재생은 안 함
      if (!d.mode && e.type === "pointerup") { const now = Date.now();   // 톡 = 재생/멈춤, 두 번 톡 = 원래 크기
        if (now - lastTap < 320) { resetZoom(); toggle(); lastTap = 0; } else { toggle(); lastTap = now; } }
    };
    cvEl.addEventListener("pointerup", end); cvEl.addEventListener("pointercancel", (e) => { preview = null; end(e); });
    const loop = () => { if (!wrap.isConnected) return; if (ppB) { const s = isPaused() ? "▶" : "❚❚"; if (ppB.textContent !== s) { ppB.textContent = s; ppB.setAttribute("aria-label", isPaused() ? "재생" : "일시정지"); } } const t = preview ?? (+getT() || 0); draw(cvEl, cv, t, +getLv() || 0, st); mid.style.visibility = st.hits && st.hits.length ? "hidden" : "";
      tm.textContent = fmt(t) + (st.yz > 1.05 ? ` · ×${st.yz.toFixed(1)}` : "");
      if (hasAb) { const m = o.mode ? o.mode() : "p"; wrap.querySelectorAll("[data-m]").forEach(b => b.classList.toggle("on", b.dataset.m === m)); }
      requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
  // 뒤로 가기: 열린 전체화면만 닫고, 앱 쪽 뒤로 가기 처리는 건너뛰게 e.tuneClosed 표시(선생님 앱 popstate가 확인)
  let fsClose = null, skipPop = false;
  if (typeof G.addEventListener === "function") G.addEventListener("popstate", (e) => {
    if (skipPop) { skipPop = false; try { e.tuneClosed = true; } catch {} return; }
    if (fsClose) { fsClose(); try { e.tuneClosed = true; } catch {} }
  });
  async function load(url) { const r = await fetch(url); if (!r.ok) throw new Error("음정선을 못 불러왔어요"); const j = await r.json(); return j && Array.isArray(j.pts) ? j : null; }
  const legend = (withCorr) => `<div class="tuneLeg"><span><i style="background:#ffe066"></i>부른 음정</span>${withCorr ? `<span><i style="background:#7fd9ff"></i>보정 후</span><span><i style="background:#ffd27a;opacity:.6"></i>고친 곳</span>` : ""}<span><i style="background:#ff9f5a;width:3px;height:11px"></i>지금</span></div>`;
  const css = `#tuneFs{position:fixed;inset:0;z-index:9999;background:rgba(8,10,13,.96)}#tuneFs .tfBox{position:absolute;left:50%;top:50%;display:flex;flex-direction:column;background:#0e1116;color:#eceff3;box-sizing:border-box;padding:8px 12px calc(8px + env(safe-area-inset-bottom))}
#tuneFs .tfTop,#tuneFs .tfBot{display:flex;align-items:center;gap:8px;flex:none}#tuneFs .tfTop{margin-bottom:6px}#tuneFs .tfTitle{font-size:15px}#tuneFs .tfTime{color:#a9b1bc;font-size:13px;font-variant-numeric:tabular-nums}
#tuneFs .tfAb{display:flex;margin-left:auto;border:1px solid #363c45;border-radius:10px;overflow:hidden}#tuneFs .tfAb button{border:0;border-radius:0;margin:0;background:#11141a;color:#a9b1bc;font-weight:800;min-height:34px;padding:0 14px}#tuneFs .tfAb button.on{background:#9cc3ff;color:#10141a}#tuneFs .tfAb button[data-m=p].on{background:#c9a6ff}
#tuneFs .tfX{margin-left:8px;display:flex;align-items:center;gap:6px;height:46px;padding:0 16px;border-radius:24px;border:2px solid #eceff3;background:#2a2f38;color:#fff;font-weight:800;font-size:15px;flex:none}#tuneFs .tfX i{font-style:normal;font-size:20px;line-height:1;margin-right:2px}#tuneFs .tfCv{flex:1;min-height:0;width:100%;display:block;border-radius:10px;background:#11141a}
#tuneFs .tfCvBox{position:relative;flex:1;min-height:0;display:flex}#tuneFs .tfMid{position:absolute;left:50%;top:50%;width:84px;height:84px;margin:-42px 0 0 -42px;border-radius:50%;background:rgba(156,195,255,.18);color:rgba(255,255,255,.8);font-size:30px;display:grid;place-items:center;pointer-events:none;opacity:0;transform:scale(.6)}
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
.tuneZoom{display:flex;gap:6px;margin:8px 0 4px}.tuneZoom .tfOpen{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:44px;margin:0;border:0;border-radius:12px;background:linear-gradient(135deg,#ffd27a,#c8912e);color:#1a1307;font-weight:800;font-size:.95rem;box-shadow:0 2px 12px rgba(255,190,90,.25)}.tuneZoom .tfOpen .ic{display:grid;place-items:center;width:26px;height:26px;border-radius:8px;background:rgba(26,19,7,.15);font-size:15px}.tuneZoom button{border:1px solid #363c45;border-radius:10px;background:#11141a;color:#a9b1bc;font-weight:700;font-size:.8rem;min-height:32px;padding:0 12px;margin:0}.tuneZoom button.on{background:#9cc3ff;color:#10141a;border-color:#9cc3ff}`;
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
  G.Tune = { draw, wire, load, legend, range, col, tgCol, centerAt, fitAt, delta, semiLabel, sangLabel, sheet, undo, openFull, WIN, HEAD, ZOOM_HALF };
})(typeof window !== "undefined" ? window : globalThis);
