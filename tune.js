// (10/30 사용자) 튠 화면 — Waves Tune처럼 음정선이 재생 위치와 함께 오른쪽→왼쪽으로 흐름. 선생님 앱·수강생 노트 공용.
// curve = 메이크업 서버가 저장한 pitch_curve.json: { fps, scale:[음이름 번호], levels:[1,2,3], pts:[[초, 원음, 약, 중, 강], ...] } (값 = MIDI×100 센트)
// 주황 = 실제로 부른 음, 하늘색 = 보정된 음, 노란 세로선 = 지금. 음정 인식은 AI 추정(숨소리·자음에서 선이 튈 수 있음).
(function (G) {
  const WIN = 8, HEAD = 0.4, NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
  function range(cv) {
    if (cv._rng) return cv._rng;
    const a = (cv.pts || []).map(p => p[1]).filter(Number.isFinite).sort((x, y) => x - y);
    if (!a.length) return (cv._rng = [5700, 7200]);
    const lo = a[Math.floor(a.length * 0.03)], hi = a[Math.min(a.length - 1, Math.floor(a.length * 0.97))];
    return (cv._rng = [Math.floor(lo / 100) * 100 - 250, Math.ceil(hi / 100) * 100 + 250]);
  }
  function col(cv, lv) { const i = (cv.levels || []).indexOf(+lv); return lv > 0 && i >= 0 ? 2 + i : 0; }   // pts 안 위치(0 = 없음)
  function draw(el, cv, t, lv) {
    if (!el || !el.getContext || !cv) return;
    const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return;
    const r = G.devicePixelRatio || 1; if (el.width !== Math.round(w * r)) { el.width = Math.round(w * r); el.height = Math.round(h * r); }
    const g = el.getContext("2d"); g.setTransform(r, 0, 0, r, 0, 0); g.clearRect(0, 0, w, h);
    const [lo, hi] = range(cv), L = 30, y = (c) => h - 6 - (c - lo) / (hi - lo) * (h - 12);
    const t0 = t - WIN * HEAD, xs = (tt) => L + (tt - t0) / WIN * (w - L), sc = cv.scale;
    g.font = "10px system-ui, sans-serif"; g.textBaseline = "middle";
    for (let m = Math.ceil(lo / 100); m <= Math.floor(hi / 100); m++) {
      const pc = ((m % 12) + 12) % 12, ins = !sc || sc.includes(pc), yy = Math.round(y(m * 100)) + 0.5;
      if (ins && sc) { g.fillStyle = "rgba(156,195,255,.06)"; g.fillRect(L, yy - 4, w - L, 8); }
      g.fillStyle = ins ? "#2c3440" : "#1b1f26"; g.fillRect(L, yy, w - L, 1);
      if (ins) { g.fillStyle = sc && pc === sc[0] ? "#9cc3ff" : "#6b7480"; g.fillText(NAMES[pc] + (Math.floor(m / 12) - 1), 2, yy); }
    }
    const line = (k, color, wd) => {
      g.strokeStyle = color; g.lineWidth = wd; g.lineJoin = "round"; g.lineCap = "round"; g.beginPath(); let prev = null;
      for (const p of cv.pts || []) {
        if (p[0] < t0 - 0.3) continue; if (p[0] > t0 + WIN + 0.3) break;
        const X = xs(p[0]), Y = y(p[k]);
        if (prev != null && p[0] - prev < 0.13) g.lineTo(X, Y); else g.moveTo(X, Y); prev = p[0];
      }
      g.stroke();
    };
    line(1, "#ff9f5a", 2);
    const k = col(cv, lv); if (k) line(k, "#7fd9ff", 2.4);
    g.fillStyle = "rgba(23,25,29,.35)"; g.fillRect(xs(t) + 2, 0, w, h);   // 아직 안 부른 쪽은 살짝 어둡게
    g.fillStyle = "#ffd27a"; g.fillRect(Math.round(xs(t)) - 1, 2, 2.5, h - 4);
  }
  // 붙이기: getT()=지금 초, getLv()=보여 줄 보정 단계(0이면 원음만), seek(초). 화면에서 빠지면 저절로 멈춤.
  function wire(el, cv, getT, getLv, seek) {
    if (!el || !cv) return;
    let drag = null, preview = null;
    const loop = () => { if (!el.isConnected) return; draw(el, cv, preview ?? (+getT() || 0), +getLv() || 0); requestAnimationFrame(loop); };
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
  const legend = (withCorr) => `<div class="tuneLeg"><span><i style="background:#ff9f5a"></i>부른 음정</span>${withCorr ? `<span><i style="background:#7fd9ff"></i>보정 후</span>` : ""}<span><i style="background:#ffd27a;width:3px;height:11px"></i>지금</span></div>`;
  G.Tune = { draw, wire, load, legend, range, col, WIN, HEAD };
})(typeof window !== "undefined" ? window : globalThis);
