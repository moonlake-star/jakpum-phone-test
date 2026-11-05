/* 발성 연습을 '앱 안에서' 엽니다 — 주소창 없는 전체 화면 창(같은 사이트의 ../pitch/ 를 iframe으로). 선생님·수강생 앱 공용
   쓰는 법: <a href="../pitch/" data-pitch-open="teacher|student"> 를 누르면 열림(스크립트가 없으면 그냥 링크로 이동).
   뒤로 가기(갤럭시 밀기)·'← 돌아가기'로 닫히고, 닫을 때 마이크도 꺼져요(Brand.layer 규칙, AGENTS.md). */
(function (G) {
  if (!G.document) return;
  const CSS = "#pitchEmb{position:fixed;inset:0;z-index:10030;background:#12161a}#pitchEmb iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#12161a}";
  let cur = null;

  /* (11/05 사용자 시안 C+성장곡선) 입구 카드: 마이크 + 최근 14일 정확도 곡선 + '오늘 ○분 · 연속 ○일'. 카드 모양은 여기 한 곳에서만 정의(선생님·수강생 앱 공용) */
  const CARD_CSS = ".pitchGo{display:block;color:inherit;text-decoration:none;margin:0 0 8px;border-color:#363c45;padding:14px 16px}.pitchGo .pgHd{display:flex;align-items:center;gap:10px}.pitchGo .pgIc{width:36px;height:36px;border-radius:50%;background:#e48d16;color:#1a1000;display:flex;align-items:center;justify-content:center;flex:none}.pitchGo .pgTt{flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.pitchGo .pgTt b{font-size:1.2rem}.pitchGo .pgTt small{color:var(--muted);font-size:.8rem}.pitchGo .pgCh{color:var(--muted);font-size:1.4rem;line-height:1}.pitchGo .pgLb{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-top:10px;font-size:.78rem;color:var(--muted)}.pitchGo .pgLb em{font-style:normal;color:#ffc04d;font-size:.85rem}.pitchGo .pgLb i{font-style:normal;color:#7ad98a;margin-left:4px}.pitchGo .pgCurve{display:block;width:100%;height:56px;margin:4px 0 6px}.pitchGo .pgFt{display:flex;justify-content:space-between;gap:8px;font-size:.88rem}.pitchGo .pgL{color:var(--muted)}.pitchGo .pgR{color:#ffc04d;text-align:right}";
  const MIC = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
  const dk = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  function stat(who) {   // 이 기기에 저장된 내 연습 기록: 오늘 초 · 연속 일수(하루 목표를 채운 날, 연습 화면과 같은 기준) · 최근 14일 정확도. 없으면 null
    try { const D = JSON.parse(localStorage.getItem(who === "student" ? "vn_pitch_me" : "vn_pitch_teacher") || "null"); if (!D || !Array.isArray(D.sessions)) return null;
      const by = {}; for (const x of D.sessions) { if (!x || x.uid !== D.me || !x.day) continue; const d = by[x.day] || (by[x.day] = { sec: 0, vms: 0, sfs: 0 }); d.sec += +x.activeSec || 0; d.vms += +x.vms || 0; d.sfs += +x.sfs || 0; }
      const goal = ((D.settings || {})[D.me] || {}).goalSec || 180, now = new Date(), today = (by[dk(now)] || { sec: 0 }).sec;
      const c = new Date(now); if (!(today >= goal)) c.setDate(c.getDate() - 1); let n = 0; while (((by[dk(c)] || { sec: 0 }).sec >= goal) && n < 400) { n++; c.setDate(c.getDate() - 1); }
      const pts = []; for (let i = 13; i >= 0; i--) { const d = new Date(now); d.setDate(d.getDate() - i); const r = by[dk(d)]; if (r && r.vms > 0) pts.push({ x: 13 - i, v: Math.round(100 * r.sfs / r.vms) }); }
      return { sec: today, streak: n, any: Object.keys(by).length > 0, pts };
    } catch (e) { return null; } }
  function curveSvg(pts) {   // 점 2개 이상이면 곡선, 아니면 점선 자리
    if (!pts || pts.length < 2) return '<svg class="pgCurve" viewBox="0 0 340 56" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="52" x2="340" y2="52" stroke="#363c45"/><path d="M6 40 C70 40 90 30 150 28 C210 26 250 16 334 10" fill="none" stroke="#4a515b" stroke-width="2" stroke-dasharray="2 6" stroke-linecap="round"/><circle cx="6" cy="40" r="3" fill="#22262c" stroke="#e48d16" stroke-width="2"/></svg>';
    let lo = Math.max(0, Math.min.apply(null, pts.map((q) => q.v)) - 6), hi = Math.min(100, Math.max.apply(null, pts.map((q) => q.v)) + 6); if (hi - lo < 24) { const m = (hi + lo) / 2; lo = Math.max(0, m - 12); hi = Math.min(100, m + 12); }
    const X = (q) => 6 + q.x * (328 / 13), Y = (q) => 50 - (q.v - lo) / (hi - lo || 1) * 42, L = pts.map((q, i) => (i ? "L" : "M") + X(q).toFixed(1) + " " + Y(q).toFixed(1)).join(" "), last = pts[pts.length - 1];
    return '<svg class="pgCurve" viewBox="0 0 340 56" preserveAspectRatio="none" aria-hidden="true"><line x1="0" y1="52" x2="340" y2="52" stroke="#363c45"/><path d="' + L + " L" + X(last).toFixed(1) + ' 52 L' + X(pts[0]).toFixed(1) + ' 52 Z" fill="#e48d16" opacity=".16"/><path d="' + L + '" fill="none" stroke="#e48d16" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/><g fill="#22262c" stroke="#e48d16" stroke-width="2">' + pts.slice(0, -1).map((q) => '<circle cx="' + X(q).toFixed(1) + '" cy="' + Y(q).toFixed(1) + '" r="3"/>').join("") + '</g><circle cx="' + X(last).toFixed(1) + '" cy="' + Y(last).toFixed(1) + '" r="5" fill="#ffc04d"/></svg>';
  }
  function statText(who) {
    const s = stat(who), t = (sec) => sec < 60 ? Math.round(sec) + "초" : Math.floor(sec / 60) + "분";
    if (!s || !s.any) return { l: "연습하면 내 성장 곡선이 그려져요", r: "첫 연습 ›", lb: "", pts: [] };
    const p = s.pts, d = p.length > 1 ? p[p.length - 1].v - p[0].v : 0;
    return { l: s.sec > 0 ? "오늘 " + t(s.sec) + " 연습" : "오늘은 아직 연습 전", r: s.streak > 0 ? "연속 " + s.streak + "일" : "", pts: p,
      lb: p.length > 1 ? '<em>' + p[0].v + '% → ' + p[p.length - 1].v + '%' + (d > 0 ? '<i>▲' + d + '</i>' : d < 0 ? '<i style="color:#a9b1bc">▼' + (-d) + '</i>' : "") + '</em>' : '<em>기록 쌓는 중</em>' };
  }
  function cardInner(who) {
    if (!document.getElementById("pitchGoCss")) { const c = document.createElement("style"); c.id = "pitchGoCss"; c.textContent = CARD_CSS; document.head.appendChild(c); }
    const t = statText(who);
    return `<span class="pgHd"><span class="pgIc">${MIC}</span><span class="pgTt"><b>연습 천재</b><small>음정 · 비브라토 · 발성</small></span><span class="pgCh" aria-hidden="true">›</span></span><span class="pgLb"><span>최근 14일 정확도</span>${t.lb}</span>${curveSvg(t.pts)}<span class="pgFt"><span class="pgL">${t.l}</span><span class="pgR">${t.r}</span></span>`;
  }
  function paint() { document.querySelectorAll("a.pitchGo[data-pitch-open]").forEach((a) => { a.innerHTML = cardInner(a.dataset.pitchOpen); }); }
  function open(who) {
    if (cur) return;
    if (!document.getElementById("pitchEmbCss")) { const s = document.createElement("style"); s.id = "pitchEmbCss"; s.textContent = CSS; document.head.appendChild(s); }
    const d = document.createElement("div"); d.id = "pitchEmb";
    const f = document.createElement("iframe"); f.setAttribute("allow", "microphone; autoplay"); f.title = "연습 천재";
    f.src = "../pitch/?embed=1" + (who === "student" ? "&from=student" : "&as=teacher");
    d.appendChild(f); document.body.appendChild(d);
    const shut = () => { try { f.src = "about:blank"; } catch (e) {} d.remove(); cur = null; paint(); };
    const ly = G.Brand && G.Brand.layer ? G.Brand.layer(shut) : null;
    cur = { d, f, close: () => (ly ? ly.close() : shut()) };
  }
  G.PitchEmbed = { open, isOpen: () => !!cur, cardInner, statText, paint };
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest("[data-pitch-open]");
    if (!a) return; e.preventDefault(); open(a.dataset.pitchOpen);
  });
  G.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !cur || e.source !== cur.f.contentWindow) return;
    if (e.data && e.data.vnPitch === "close") cur.close();
  });
})(window);
