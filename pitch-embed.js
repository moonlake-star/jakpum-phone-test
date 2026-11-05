/* 발성 연습을 '앱 안에서' 엽니다 — 주소창 없는 전체 화면 창(같은 사이트의 ../pitch/ 를 iframe으로). 선생님·수강생 앱 공용
   쓰는 법: <a href="../pitch/" data-pitch-open="teacher|student"> 를 누르면 열림(스크립트가 없으면 그냥 링크로 이동).
   뒤로 가기(갤럭시 밀기)·'← 돌아가기'로 닫히고, 닫을 때 마이크도 꺼져요(Brand.layer 규칙, AGENTS.md). */
(function (G) {
  if (!G.document) return;
  const CSS = "#pitchEmb{position:fixed;inset:0;z-index:10030;background:#12161a}#pitchEmb iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#12161a}";
  let cur = null;

  /* (11/05 사용자 시안 C) 입구 카드: 마이크 + 소리 파형 + '오늘 ○분 · 연속 ○일'. 카드 모양은 여기 한 곳에서만 정의(선생님·수강생 앱 공용) */
  const CARD_CSS = ".pitchGo{display:block;color:inherit;text-decoration:none;margin:0 0 8px;border-color:#363c45;padding:14px 16px}.pitchGo .pgHd{display:flex;align-items:center;gap:10px}.pitchGo .pgIc{width:36px;height:36px;border-radius:50%;background:#e48d16;color:#1a1000;display:flex;align-items:center;justify-content:center;flex:none}.pitchGo .pgTt{flex:1;display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.pitchGo .pgTt b{font-size:1.2rem}.pitchGo .pgTt small{color:var(--muted);font-size:.8rem}.pitchGo .pgCh{color:var(--muted);font-size:1.4rem;line-height:1}.pitchGo .pgWave{display:block;width:100%;height:34px;margin:10px 0 6px}.pitchGo .pgFt{display:flex;justify-content:space-between;gap:8px;font-size:.88rem}.pitchGo .pgL{color:var(--muted)}.pitchGo .pgR{color:#ffc04d;text-align:right}";
  const MIC = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3M9 21h6"/></svg>';
  const WAVE = (() => { const h = [6, 14, 22, 10, 28, 18, 8, 24, 34, 20, 12, 26, 16, 30, 14, 6, 22, 10, 18, 8, 14, 6, 10, 4], o = [.35, .45, .55, .5, .7, .6, .5, .75, 1, .8, .6, .75, .65, .85, .6, .45, .7, .5, .55, .4, .4, .3, .3, .25];
    return '<svg class="pgWave" viewBox="0 0 340 34" preserveAspectRatio="none" aria-hidden="true"><g fill="#e48d16">' + h.map((v, i) => `<rect x="${i * 14}" y="${(34 - v) / 2}" width="6" height="${v}" rx="3" opacity="${o[i]}"/>`).join("") + "</g></svg>"; })();
  function stat(who) {   // 이 기기에 저장된 내 연습 기록(오늘 초, 연속 일수). 없으면 null
    try { const D = JSON.parse(localStorage.getItem(who === "student" ? "vn_pitch_me" : "vn_pitch_teacher") || "null"); if (!D || !Array.isArray(D.sessions)) return null;
      const by = {}; for (const x of D.sessions) { if (x && x.uid === D.me && x.day) by[x.day] = (by[x.day] || 0) + (+x.activeSec || 0); }
      const k = (d) => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
      const d = new Date(), today = by[k(d)] || 0; if (!today) d.setDate(d.getDate() - 1);
      let n = 0; while ((by[k(d)] || 0) > 0 && n < 400) { n++; d.setDate(d.getDate() - 1); }
      return { sec: today, streak: n, any: Object.keys(by).length > 0 };
    } catch (e) { return null; } }
  function statText(who) {
    const s = stat(who), t = (sec) => sec < 60 ? Math.round(sec) + "초" : Math.floor(sec / 60) + "분";
    if (!s || !s.any) return { l: "꾸준한 연습으로 기본기를 탄탄히", r: "시작하기" };
    return { l: s.sec > 0 ? "오늘 " + t(s.sec) + " 연습" : "오늘은 아직 연습 전", r: (s.streak > 0 ? "연속 " + s.streak + "일 · " : "") + "시작하기" };
  }
  function cardInner(who) {
    if (!document.getElementById("pitchGoCss")) { const c = document.createElement("style"); c.id = "pitchGoCss"; c.textContent = CARD_CSS; document.head.appendChild(c); }
    const t = statText(who);
    return `<span class="pgHd"><span class="pgIc">${MIC}</span><span class="pgTt"><b>연습 천재</b><small>음정 · 비브라토 · 발성</small></span><span class="pgCh" aria-hidden="true">›</span></span>${WAVE}<span class="pgFt"><span class="pgL">${t.l}</span><span class="pgR">${t.r}</span></span>`;
  }
  function paint() { document.querySelectorAll("a.pitchGo[data-pitch-open]").forEach((a) => { const t = statText(a.dataset.pitchOpen), l = a.querySelector(".pgL"), r = a.querySelector(".pgR"); if (l) l.textContent = t.l; if (r) r.textContent = t.r; }); }
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
