// (10/30 사용자) 튠 화면 — Waves Tune처럼 음정선이 재생 위치와 함께 오른쪽→왼쪽으로 흐름. 선생님 앱·수강생 노트 공용.
// curve = 메이크업 서버가 저장한 pitch_curve.json: { fps, scale:[음이름 번호], levels:[1,2,3], pts:[[초, 원음, 약, 중, 강], ...] } (값 = MIDI×100 센트)
// 주황 = 실제로 부른 음, 하늘색 = 보정된 음, 노란 세로선 = 지금. 두 선 사이 노랑 = 고친 곳(진할수록 많이).
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
  function fitAt(cv, t, k) {   // [가장 낮은 음, 가장 높은 음, 가운데] — 튀는 점(위아래 2%) 제외
    const v = []; for (const p of cv.pts || []) { if (p[0] < t - WIN * HEAD) continue; if (p[0] > t + WIN * (1 - HEAD)) break; v.push(p[1]); if (k) v.push(p[k]); }
    if (v.length < 3) return null; v.sort((a, b) => a - b);
    const lo = v[Math.floor(v.length * 0.02)], hi = v[Math.min(v.length - 1, Math.floor(v.length * 0.98))];
    return [lo, hi, (lo + hi) / 2];
  }
  // 고친 양을 반음 단위로: 51센트 → "↓ 0.5반음 내림"(반음 = 피아노 건반 한 칸)
  function semiLabel(d) { const s = Math.abs(d) / 100; return `${d > 0 ? "↑" : "↓"} ${s >= 0.95 ? s.toFixed(1).replace(/\.0$/, "") : s.toFixed(1)}반음 ${d > 0 ? "올림" : "내림"}`; }
  function delta(cv, k, t) {   // 지금 위치의 고친 양(센트)
    if (!k) return null; let best = null;
    for (const p of cv.pts || []) { if (Math.abs(p[0] - t) < 0.06) { best = p[k] - p[1]; break; } if (p[0] > t + 0.06) break; }
    return best;
  }
  function draw(el, cv, t, lv, st) {
    if (!el || !el.getContext || !cv) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const r = G.devicePixelRatio || 1; if (el.width !== Math.round(w * r)) { el.width = Math.round(w * r); el.height = Math.round(h * r); }
    const g = el.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
    const k = col(cv, lv), lane = k && h > 110 ? LANE : 0, H = h - lane;
    let [lo, hi] = range(cv);
    if (st && st.zoom) {   // 확대: 화면 안(지금 앞뒤 8초) 음이 모두 들어오게 — 기본 ±4반음, 크게 도약하면 그만큼 넓힘(10/30 13:28 사용자)
      const f = fitAt(cv, t, k);
      if (f) { const tl = Math.min(f[0] - 150, f[2] - ZOOM_HALF), th = Math.max(f[1] + 150, f[2] + ZOOM_HALF);
        if (st.lo == null) { st.lo = tl; st.hi = th; } else { st.lo += (tl - st.lo) * 0.12; st.hi += (th - st.hi) * 0.12; } }
      if (st.lo != null) { lo = st.lo; hi = st.hi; }
    }
    const L = 30, y = (c) => H - 6 - (c - lo) / (hi - lo) * (H - 12);
    const t0 = t - WIN * HEAD, xs = (tt) => L + (tt - t0) / WIN * (w - L), sc = cv.scale;
    g.font = "10px system-ui, sans-serif"; g.textBaseline = "middle";
    let lastY = -99;
    for (let m = Math.floor(hi / 100); m >= Math.ceil(lo / 100); m--) {
      const pc = ((m % 12) + 12) % 12, ins = !sc || sc.includes(pc), yy = Math.round(y(m * 100)) + 0.5;
      if (ins && sc) { g.fillStyle = "rgba(156,195,255,.06)"; g.fillRect(L, yy - 4, w - L, 8); }
      g.fillStyle = ins ? "#2c3440" : "#1b1f26"; g.fillRect(L, yy, w - L, 1);
      if (ins && yy - lastY >= 12) { g.fillStyle = sc && pc === sc[0] ? "#9cc3ff" : "#6b7480"; g.fillText(NAMES[pc] + (Math.floor(m / 12) - 1), 2, yy); lastY = yy; }   // 가까운 이름은 건너뜀
    }
    const vis = []; for (const p of cv.pts || []) { if (p[0] < t0 - 0.3) continue; if (p[0] > t0 + WIN + 0.3) break; vis.push(p); }
    g.save(); g.beginPath(); g.rect(L, 0, w - L, H); g.clip();
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
    line(1, "#ff9f5a", 2);
    if (k) line(k, "#7fd9ff", 2);
    g.restore();
    if (lane) {   // 고친 양 줄
      const top = H + 2, mid = top + (lane - 4) / 2, half = (lane - 6) / 2;
      g.fillStyle = "#151920"; g.fillRect(L, top, w - L, lane - 4); g.fillStyle = "#2c3440"; g.fillRect(L, Math.round(mid), w - L, 1);
      g.fillStyle = "#6b7480"; g.font = "9px system-ui, sans-serif"; g.fillText("고친 양", 0, mid);
      const bw = Math.max(1.5, (w - L) / (WIN * (cv.fps || 25)) * 0.8);
      for (const p of vis) { const X = xs(p[0]); if (X < L || X > w) continue; const d = p[k] - p[1]; if (Math.abs(d) < 2) continue;
        const hh = Math.max(-half, Math.min(half, d / 50 * half)); g.fillStyle = Math.abs(d) > 15 ? "#ffd27a" : "#5b6573"; g.fillRect(X, hh > 0 ? mid - hh : mid, bw, Math.abs(hh)); }
    }
    g.fillStyle = "rgba(23,25,29,.35)"; g.fillRect(xs(t) + 2, 0, w, H);   // 아직 안 부른 쪽은 살짝 어둡게
    g.fillStyle = "#ffd27a"; g.fillRect(Math.round(xs(t)) - 1, 2, 2.5, h - 4);
    const d = delta(cv, k, t);
    if (d != null && Math.abs(d) >= 5) {   // 지금 얼마나 고쳤나(반음 단위, 10/30 13:31 사용자)
      const s = semiLabel(d); g.font = "bold 11px system-ui, sans-serif";
      const tw = g.measureText(s).width, x0 = Math.min(w - tw - 8, Math.round(xs(t)) + 6);
      g.fillStyle = "rgba(17,20,26,.85)"; g.fillRect(x0 - 3, 4, tw + 6, 16); g.fillStyle = "#ffd27a"; g.fillText(s, x0, 12);
    }
  }
  // 붙이기: getT()=지금 초, getLv()=보여 줄 보정 단계(0이면 원음만), seek(초). 화면에서 빠지면 저절로 멈춤.
  // 확대/전체 버튼: el 바로 앞에 붙임(Tune.controls). 기본 = 확대.
  function wire(el, cv, getT, getLv, seek) {
    if (!el || !cv) return;
    const st = { zoom: true, lo: null, hi: null };
    const bar = document.createElement("div"); bar.className = "tuneZoom";
    bar.innerHTML = `<button type="button" data-z="1" class="on" aria-pressed="true">🔍 확대</button><button type="button" data-z="0" aria-pressed="false">전체</button>`;
    el.parentNode && el.parentNode.insertBefore(bar, el);
    bar.querySelectorAll("[data-z]").forEach(b => b.onclick = () => { st.zoom = b.dataset.z === "1"; st.lo = st.hi = null;
      bar.querySelectorAll("[data-z]").forEach(x => { const on = x === b; x.classList.toggle("on", on); x.setAttribute("aria-pressed", String(on)); }); });
    let drag = null, preview = null;
    const loop = () => { if (!el.isConnected) { bar.remove(); return; } draw(el, cv, preview ?? (+getT() || 0), +getLv() || 0, st); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
    const span = () => (el.clientWidth - 30) || 1;
    el.style.touchAction = "pan-y";
    el.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, t: +getT() || 0, id: e.pointerId, moved: false }; });
    el.addEventListener("pointermove", (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const dx = e.clientX - drag.x; if (!drag.moved && Math.abs(dx) < 8) return;
      if (!drag.moved && Math.abs(e.clientY - drag.y) > Math.abs(dx)) { drag = null; return; }   // 세로로 밀면 화면 스크롤
      drag.moved = true; try { el.setPointerCapture(e.pointerId); } catch {}
      preview = Math.max(0, drag.t - dx / span() * WIN);
    });
    const up = (e) => {
      if (!drag || drag.id !== e.pointerId) return;
      const d = drag; drag = null;
      if (d.moved) { const t = preview; preview = null; if (t != null) seek(t); return; }
      const r = el.getBoundingClientRect(), x = e.clientX - r.left;
      if (x > 30) seek(Math.max(0, d.t - WIN * HEAD + (x - 30) / span() * WIN));   // 톡 = 그 자리부터
    };
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", () => { drag = null; preview = null; });
  }
  async function load(url) { const r = await fetch(url); if (!r.ok) throw new Error("음정선을 못 불러왔어요"); const j = await r.json(); return j && Array.isArray(j.pts) ? j : null; }
  const legend = (withCorr) => `<div class="tuneLeg"><span><i style="background:#ff9f5a"></i>부른 음정</span>${withCorr ? `<span><i style="background:#7fd9ff"></i>보정 후</span><span><i style="background:#ffd27a;opacity:.6"></i>고친 곳</span>` : ""}<span><i style="background:#ffd27a;width:3px;height:11px"></i>지금</span></div>`;
  const css = `.tuneZoom{display:flex;gap:6px;margin:6px 0 2px}.tuneZoom button{border:1px solid #363c45;border-radius:10px;background:#11141a;color:#a9b1bc;font-weight:700;font-size:.8rem;min-height:32px;padding:0 12px;margin:0}.tuneZoom button.on{background:#9cc3ff;color:#10141a;border-color:#9cc3ff}`;
  if (typeof document !== "undefined" && document.head) { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); }
  G.Tune = { draw, wire, load, legend, range, col, centerAt, fitAt, delta, semiLabel, WIN, HEAD, ZOOM_HALF };
})(typeof window !== "undefined" ? window : globalThis);
