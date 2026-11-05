/* 발성 연습을 '앱 안에서' 엽니다 — 주소창 없는 전체 화면 창(같은 사이트의 ../pitch/ 를 iframe으로). 선생님·수강생 앱 공용
   쓰는 법: <a href="../pitch/" data-pitch-open="teacher|student"> 를 누르면 열림(스크립트가 없으면 그냥 링크로 이동).
   뒤로 가기(갤럭시 밀기)·'← 돌아가기'로 닫히고, 닫을 때 마이크도 꺼져요(Brand.layer 규칙, AGENTS.md). */
(function (G) {
  if (!G.document) return;
  const CSS = "#pitchEmb{position:fixed;inset:0;z-index:10030;background:#12161a}#pitchEmb iframe{position:absolute;inset:0;width:100%;height:100%;border:0;background:#12161a}";
  let cur = null;
  function open(who) {
    if (cur) return;
    if (!document.getElementById("pitchEmbCss")) { const s = document.createElement("style"); s.id = "pitchEmbCss"; s.textContent = CSS; document.head.appendChild(s); }
    const d = document.createElement("div"); d.id = "pitchEmb";
    const f = document.createElement("iframe"); f.setAttribute("allow", "microphone; autoplay"); f.title = "연습 천재";
    f.src = "../pitch/?embed=1" + (who === "student" ? "&from=student" : "&as=teacher");
    d.appendChild(f); document.body.appendChild(d);
    const shut = () => { try { f.src = "about:blank"; } catch (e) {} d.remove(); cur = null; };
    const ly = G.Brand && G.Brand.layer ? G.Brand.layer(shut) : null;
    cur = { d, f, close: () => (ly ? ly.close() : shut()) };
  }
  G.PitchEmbed = { open, isOpen: () => !!cur };
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest && e.target.closest("[data-pitch-open]");
    if (!a) return; e.preventDefault(); open(a.dataset.pitchOpen);
  });
  G.addEventListener("message", (e) => {
    if (e.origin !== location.origin || !cur || e.source !== cur.f.contentWindow) return;
    if (e.data && e.data.vnPitch === "close") cur.close();
  });
})(window);
