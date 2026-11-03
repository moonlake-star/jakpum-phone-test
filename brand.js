// (10/30 사용자) 브랜드: 로고 + "가장 아름다운 당신의 오늘을 '작품'으로.." — 선생님 앱·수강생 노트 공용
// ① 첫 실행(하루 한 번, 1.2초, 누르면 바로 닫힘) ② 1초 넘게 기다릴 때 작은 로고 ③ 화면 바뀔 때 금색 가는 줄(0.3초)
(function (G) {
  const COPY = "가장 아름다운 당신의 오늘을<br>‘<b>작품</b>’으로..", BASE = (document.currentScript?.src || "").replace(/brand\.js.*$/, "");
  const LOGO = BASE + "brand/logo.webp?v=20261031b", SMALL = BASE + "brand/logo-96.webp?v=20261031b";
  const css = `#brSplash{position:fixed;inset:0;z-index:10000;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 42%,#2a1f0c 0,#0b0b0c 62%);transition:opacity .45s ease}
#brSplash.out{opacity:0;pointer-events:none}#brSplash .lg{position:relative;width:min(62vw,260px);aspect-ratio:1;border-radius:50%;background:url(${LOGO}) center/cover;box-shadow:0 0 60px rgba(255,190,90,.25);animation:brIn .7s cubic-bezier(.3,.7,.2,1)}
#brSplash .lg::after{content:"";position:absolute;inset:-8px;border-radius:50%;border:2px solid transparent;border-top-color:#ffd27a;animation:brSpin 1.2s linear infinite}
#brSplash .cp{margin-top:26px;font-family:"Nanum Myeongjo","Noto Serif KR",serif;font-size:19px;color:#f3dfb4;text-align:center;line-height:1.6;opacity:0;animation:brFade .8s .35s forwards}#brSplash .cp b{color:#ffd27a}
#brSplash .sb{margin-top:10px;font-size:12px;color:#8d8575;letter-spacing:.2em;opacity:0;animation:brFade .8s .6s forwards}
/* (11/03 14:04 사용자) 불러오기 = 로고 없이 반투명 박스 하나(전체화면 팁 창과 같은 모양) · 박스를 톡 = 계속 띄움 · 다시 톡 = 닫기 · 0.7초 넘게 꾹 = 누르는 동안만 · 붙잡아도 4초 뒤 닫힘 · 닫힐 땐 1.8초 페이드 */
#brLoad{position:fixed;inset:0;z-index:9990;display:block;pointer-events:none;opacity:0;visibility:hidden;transition:opacity 2.8s ease,visibility 0s linear 2.8s}#brLoad.on{opacity:1;visibility:visible;transition:opacity .2s ease}#brLoad.now{transition:none!important}#brLoad .pn{display:inline-block;font-size:11.5px;font-weight:700;color:#5fd4ff;background:rgba(95,212,255,.12);border-radius:8px;padding:1px 7px}#brLoad.pin .pn{display:inline-block}
#brLoad .bx{position:absolute;left:50%;top:53%;transform:translate(calc(-50% + var(--dx,0px)),calc(-100% + var(--dy,0px)));pointer-events:none;width:min(300px,80vw);box-sizing:border-box;background:rgba(17,20,26,.9);border:1px solid #3b4250;border-radius:16px;padding:12px 16px;box-shadow:0 8px 28px rgba(0,0,0,.45);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}#brLoad.on .bx,#brLoad.fd .bx{pointer-events:auto}
#brLoad .hd{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#c9b58a;font-weight:800}#brLoad .hg{font-size:13px;display:inline-block;animation:brHg 1.6s ease-in-out infinite}@keyframes brHg{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(180deg)}}#brLoad .tx{margin-left:auto;font-weight:600;color:#9aa3ad;font-size:12px}
#brTipBar{position:fixed;left:0;right:0;bottom:0;z-index:38;display:flex;align-items:center;gap:8px;width:100%;max-width:760px;margin:0 auto;box-sizing:border-box;min-height:40px;padding:6px 14px calc(6px + env(safe-area-inset-bottom));border:0;border-top:1px solid #2e333c;border-radius:0;background:rgba(17,20,26,.97);color:#ffd27a;font:600 13px system-ui,sans-serif;text-align:left;cursor:pointer}#brTipBar[hidden]{display:none}#brTipBar b{color:#c9b58a;flex:none;font-size:12px}#brTipBar span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#brTipBar i{font-style:normal;color:#7d8590;flex:none}body.brTipOn{padding-bottom:calc(44px + env(safe-area-inset-bottom))}body.miniOn #brTipBar{bottom:calc(128px + env(safe-area-inset-bottom))}body:has(#v2Dock:not(.hidden)) #brTipBar,body:has(#fullBar:not(.hidden)) #brTipBar{display:none}
#brTipSheet{position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}#brTipSheet.in{position:absolute}#brTipSheet .sh{width:min(520px,100%);max-height:70%;overflow:auto;box-sizing:border-box;background:#1a1e25;border:1.5px solid #3b4250;border-radius:16px 16px 0 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom));color:#e8e8ea}#brTipSheet .hd{display:flex;align-items:center;margin-bottom:8px}#brTipSheet .hd b{font-size:15px;color:#ffd27a}#brTipSheet .x{margin:0 0 0 auto;min-height:0;height:32px;width:32px;border:0;border-radius:16px;background:#2a2f38;color:#e8e8ea;font-size:15px;padding:0}#brTipSheet ol{margin:0;padding:0 0 0 20px}#brTipSheet li{font-size:14px;line-height:1.55;padding:7px 0;border-bottom:1px solid #262b33;color:#cfd5de;word-break:keep-all}#brTipSheet li.first{color:#ffd27a;font-weight:700}
#brLoad .tp{margin-top:6px;font-size:14px;line-height:1.55;color:#ffd27a;word-break:keep-all;min-height:22px}
#brLoad .br{height:3px;border-radius:2px;background:#2a2f38;margin-top:10px;overflow:hidden}#brLoad .br i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c8912e,#ffd27a);border-radius:2px;position:relative;overflow:hidden}#brLoad .br i:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:brSh 1.2s linear infinite}@keyframes brSh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
#brBar{position:fixed;left:0;top:0;height:3px;width:0;z-index:9995;background:linear-gradient(90deg,#ffd27a,#c8912e);pointer-events:none}#brBar.go{animation:brBar .35s ease-out}
.brMark{display:inline-block;width:1.5em;height:1.5em;border-radius:50%;background:url(${SMALL}) center/cover;vertical-align:-.35em;margin-right:.3em}
.brSign{text-align:center;font-family:"Nanum Myeongjo","Noto Serif KR",serif;color:#c9b98f;font-size:.9rem;margin:18px 0 8px;line-height:1.6}
@keyframes brIn{from{transform:scale(.86);opacity:0}to{transform:none;opacity:1}}@keyframes brSpin{to{transform:rotate(360deg)}}@keyframes brFade{to{opacity:1}}
@keyframes brPulse{50%{box-shadow:0 0 44px rgba(255,190,90,.55)}}@keyframes brRun{from{transform:translateX(-100%)}to{transform:translateX(300%)}}@keyframes brBar{0%{width:0;opacity:1}80%{width:100%;opacity:1}100%{width:100%;opacity:0}}
@media (prefers-reduced-motion: reduce){#brSplash .lg,#brSplash .lg::after,#brSplash .cp,#brSplash .sb,#brLoad .hg,#brLoad .br i,#brBar.go{animation:none}#brSplash .cp,#brSplash .sb{opacity:1}}`;
  const st = document.createElement("style"); st.textContent = css; (document.head || document.documentElement).appendChild(st);
  const ls = { get(k) { try { return localStorage.getItem(k); } catch { return null; } }, set(k, v) { try { localStorage.setItem(k, v); } catch {} } };
  function splash(app) {   // 하루 첫 실행에만
    const k = "br_splash_" + (app || "x"), today = new Date().toISOString().slice(0, 10);
    if (ls.get(k) === today || document.getElementById("brSplash")) return;
    ls.set(k, today);
    const d = document.createElement("div"); d.id = "brSplash"; d.setAttribute("role", "img"); d.setAttribute("aria-label", "뮤직스튜디오 작품 — 가장 아름다운 당신의 오늘을 작품으로");
    d.innerHTML = `<div class="lg"></div><div class="cp">${COPY}</div><div class="sb">MUSIC STUDIO 작품</div>`;
    const done = () => { if (!d.isConnected) return; d.classList.add("out"); setTimeout(() => d.remove(), 480); };
    d.onclick = done; (document.body || document.documentElement).appendChild(d); setTimeout(done, 1400);
  }
  let lt = null, ln = 0;
  // (10/30 16:50 사용자 시안 승인) 진행 바: 처음엔 빠르게, 갈수록 천천히 90%까지 차오름 → 다 불러오면 100% 채우고 사라짐
  let praf = 0, pt0 = 0;
  function prog(el, run, keep) { const i = el.querySelector(".br i"); cancelAnimationFrame(praf);
    if (run) { if (!keep) { pt0 = performance.now(); i.style.width = "0"; } i.style.transition = "none";
      const f = (n) => { i.style.width = (90 * (1 - Math.exp(-(n - pt0) / 1800))).toFixed(1) + "%"; praf = requestAnimationFrame(f); }; praf = requestAnimationFrame(f); }
    else { i.style.transition = "width .2s ease-out"; i.style.width = "100%"; } }
  // (11/03 13:39 사용자) 화면 하나 여는 데 드라이브 읽기가 여러 번 차례로 이어지면 '바 다 참 → 사라짐 → 또 뜸'이 3~4번 반복됐음
  // → 끝나도 0.5초 기다려 보고, 그 사이 다음 읽기가 시작되면 같은 창·같은 바로 이어서(한 번만 차고 한 번만 사라짐)
  const GRACE = 500;
  let tipFn = null, tipI = -1;
  function setTips(fn) { tipFn = typeof fn === "function" ? fn : null; }   // (11/03 13:39 사용자) 불러오는 동안 지금 화면에서 쓸 수 있는 기능 팁
  // (11/03 14:47 사용자) 팁은 한 번 뜰 때 하나만, 아무거나(바로 전 것과는 다르게)
  function tips(el, on) { const t = el.querySelector(".tp"); let L = [];
    if (on && tipFn) { try { L = (tipFn() || []).filter(Boolean); } catch {} }
    if (!L.length) { t.style.display = "none"; t.textContent = ""; el.querySelector(".hd b").style.display = "none"; return; }
    let k = Math.floor(Math.random() * L.length); if (L.length > 1 && k === tipI) k = (k + 1 + Math.floor(Math.random() * (L.length - 1))) % L.length; tipI = k;
    t.textContent = String(L[k]); t.style.display = ""; el.querySelector(".hd b").style.display = ""; }
  // (11/03 14:17·14:37·14:47 사용자) 박스가 떠 있는 동안(사라지는 중 포함) 아래 화면은 눌리지 않음 · 박스든 바깥이든 톡 = 바로 닫힘(페이드 없이)
  //   누른 채 끌기(박스가 따라 움직임)·0.6초 넘게 꾹 = 붙잡음(저절로 안 사라짐) · 안 건드리면 다 불러온 순간부터 2초 보이고 1.8초 페이드
  const LONG = 600, LINGER = Math.max(0, 1000 - GRACE - 260), FADE = 2800;   /* (11/03 15:02 사용자) 대기 1초 · 페이드 2.8초 */
  let fadeT = null, pin = false, hold = false, down = 0, lingerT = null, lingering = false, busyOn = false, grab = null, dismissed = false;
  function vis(el) { const v = (busyOn && !dismissed) || pin || hold || lingering, was = el.classList.contains("on"); el.classList.toggle("on", v); el.classList.toggle("pin", pin);
    clearTimeout(fadeT); if (v || el.classList.contains("now")) el.classList.remove("fd"); else if (was) { el.classList.add("fd"); fadeT = setTimeout(() => el.classList.remove("fd"), FADE); }   // (11/03 14:56·14:57 사용자) 사라지는 1.8초 동안은 아래 화면 눌림 · 그때 팁 박스를 누르면 다시 또렷해지며 고정
    if (v) clearTimeout(vis.clr);
    if (!v) { cancelAnimationFrame(praf); clearTimeout(vis.clr); vis.clr = setTimeout(() => { if (!el.classList.contains("on")) tips(el, false); }, FADE + 100); }   // 글은 페이드가 끝난 뒤에 비움
    else if (!busyOn) el.querySelector(".tx").textContent = "✓ 다 불러왔어요"; }
  function linger(el) { clearTimeout(lingerT); lingering = true; vis(el); lingerT = setTimeout(() => { lingering = false; vis(el); }, LINGER); }
  function shutNow(el) { pin = false; hold = false; lingering = false; clearTimeout(lingerT); if (busyOn) dismissed = true; el.classList.add("now"); el.classList.remove("fd"); vis(el); setTimeout(() => el.classList.remove("now"), 80);
 }
  function wireBox(el) { const bx = el.querySelector(".bx");
    // (11/03 15:10 사용자) 박스가 떠 있어도 아래 화면 스크롤은 그대로 됨 · 톡(누르고 바로 뗌)만 붙잡음:
    //   불러오는 중 톡 = 기억했다가 다 불러오는 순간 박스를 닫고 그 자리를 대신 눌러 줌 · 다 불러온 뒤 톡 = 박스만 닫힘
    document.addEventListener("click", (e) => { if (replaying || !el.classList.contains("on") || el.contains(e.target)) return; e.preventDefault(); e.stopPropagation(); if (e.stopImmediatePropagation) e.stopImmediatePropagation();
      if (busyOn) { queued = { t: e.target, x: e.clientX, y: e.clientY }; el.querySelector(".tx").textContent = "⏩ 다 불러오면 바로 실행"; return; }
      shutNow(el); }, true);
    bx.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); const fading = !el.classList.contains("on"); down = performance.now(); hold = true;
      grab = { x: e.clientX, y: e.clientY, dx: +bx.dataset.dx || 0, dy: +bx.dataset.dy || 0, moved: false, fading }; if (fading) pin = true; lingering = false; clearTimeout(lingerT); vis(el); try { bx.setPointerCapture(e.pointerId); } catch {} });
    bx.addEventListener("pointermove", (e) => { if (!down || !grab) return; const ax = e.clientX - grab.x, ay = e.clientY - grab.y; if (!grab.moved && Math.hypot(ax, ay) < 6) return; grab.moved = true;
      bx.dataset.dx = grab.dx + ax; bx.dataset.dy = grab.dy + ay; bx.style.setProperty("--dx", grab.dx + ax + "px"); bx.style.setProperty("--dy", grab.dy + ay + "px"); });
    bx.addEventListener("pointerup", (e) => { e.stopPropagation(); if (!down) return; const long = performance.now() - down >= LONG, moved = !!(grab && grab.moved); down = 0; hold = false; const fromFade = !!(grab && grab.fading); grab = null;
      if (moved || long || fromFade) { pin = true; vis(el); return; } shutNow(el); });   // 사라지는 중에 누른 것 = 고정   // 톡 = 바로 닫기
    bx.addEventListener("pointercancel", () => { down = 0; hold = false; grab = null; pin = true; vis(el); });
    bx.addEventListener("contextmenu", (e) => e.preventDefault()); }
  let queued = null, replaying = false;
  function replay(q) { const t = q && q.t; if (!t || !t.isConnected) return; replaying = true; try { t.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, clientX: q.x, clientY: q.y })); } catch {} replaying = false; }
  function hideNow(el) { const q = queued; queued = null; if (q) { busyOn = false; dismissed = false; pin = false; lingering = false; clearTimeout(lingerT); el.classList.add("now"); el.classList.remove("fd"); vis(el); setTimeout(() => el.classList.remove("now"), 80); setTimeout(() => replay(q), 0); return; }   // 눌러 둔 것 실행
    const was = busyOn; busyOn = false; const dis = dismissed; dismissed = false; if (was && !dis && !pin && el.classList.contains("on")) linger(el); else vis(el); }   // 다 불러오면 2초 더 보여 주고 서서히
  function loading(on, text, delay) {   // 불러오기 표시는 이것 하나(10/30 15:24 사용자: 일관되게). 기본 0.6초 넘게 걸릴 때만
    let el = document.getElementById("brLoad");
    if (!el) { el = document.createElement("div"); el.id = "brLoad"; el.setAttribute("role", "status"); el.innerHTML = `<div class="bx"><div class="hd"><span class="hg" aria-hidden="true">⏳</span><b style="display:none">[Tip]</b><span class="pn">톡 하면 닫혀요</span><span class="tx"></span></div><div class="tp" style="display:none"></div><div class="br"><i></i></div></div>`; document.body.appendChild(el); wireBox(el); }
    ln = Math.max(0, ln + (on ? 1 : -1));
    if (on) { el.querySelector(".tx").textContent = text || "불러오는 중...";
      if (busyOn && dismissed) { clearTimeout(loading.hide); loading.hide = null; }   // 닫아 둔 채 이어 읽기: 계속 닫힌 채로
      if (el.classList.contains("on")) {   // 이미 떠 있음(사라지기 직전이거나 붙잡아 둔 상태) → 그대로 이어서
        clearTimeout(lingerT); lingering = false;
        if (!busyOn && !loading.hide && !loading.hide2) { busyOn = true; prog(el, true); }
        busyOn = true;
        if (loading.hide || loading.hide2) { const done = !!loading.hide2; clearTimeout(loading.hide); clearTimeout(loading.hide2); loading.hide = loading.hide2 = null; if (done) { pt0 = performance.now() - 4000; prog(el, true, true); } } }
      else { clearTimeout(lt); lt = setTimeout(() => { if (ln > 0 && !el.classList.contains("on") && !(busyOn && dismissed)) { busyOn = true; dismissed = false; const bx = el.querySelector(".bx"); bx.dataset.dx = bx.dataset.dy = 0; bx.style.removeProperty("--dx"); bx.style.removeProperty("--dy"); el.classList.add("on"); prog(el, true); tips(el, true); } }, delay == null ? 600 : delay); }
      clearTimeout(loading.cap); loading.cap = setTimeout(() => { ln = 0; hideNow(el); }, 20000); }
    if (ln === 0) { clearTimeout(lt);
      if (el.classList.contains("on")) { clearTimeout(loading.hide); clearTimeout(loading.hide2);
        loading.hide = setTimeout(() => { loading.hide = null; if (ln !== 0) return; prog(el, false);   // 다 불러오면 꽉 채우고 사라짐
          loading.hide2 = setTimeout(() => { loading.hide2 = null; if (ln === 0) hideNow(el); }, 260); }, GRACE); }
      else if (busyOn) { clearTimeout(loading.hide); loading.hide = setTimeout(() => { loading.hide = null; if (ln === 0) hideNow(el); }, GRACE); }   // 닫아 둔 채 끝남 → 정리(다음엔 다시 뜸)
      else el.classList.remove("on"); }
  }
  // (11/03 17:28 사용자) 화면 맨 아래 늘 붙어 있는 팁 칸(스크롤해도 그대로) · 누르면 그 팁이 맨 위, 나머지 팁이 이어지는 목록 창
  let tbEl = null, tbI = -1, tbOn = false;
  function tipList() { let L = []; if (tipFn) { try { L = (tipFn() || []).filter(Boolean).map(String); } catch {} } return L; }
  function tipBarRefresh() { if (!tbOn) return; const L = tipList();
    if (!tbEl) { tbEl = document.createElement("button"); tbEl.type = "button"; tbEl.id = "brTipBar"; tbEl.innerHTML = `<b>💡 Tip</b><span></span><i aria-hidden="true">›</i>`; tbEl.onclick = () => { const L2 = tipList(); if (L2.length) tipSheet(L2, Math.max(0, L2.indexOf(tbEl.dataset.t))); }; document.body.appendChild(tbEl); }
    if (!L.length) { tbEl.hidden = true; document.body.classList.remove("brTipOn"); return; }
    let k = Math.floor(Math.random() * L.length); if (L.length > 1 && L[k] === tbEl.dataset.t) k = (k + 1) % L.length;
    tbEl.dataset.t = L[k]; tbEl.querySelector("span").textContent = L[k]; tbEl.hidden = false; document.body.classList.add("brTipOn"); }
  function tipBar(on) { tbOn = on !== false; if (!tbOn) { if (tbEl) tbEl.remove(); tbEl = null; document.body.classList.remove("brTipOn"); return; } tipBarRefresh(); }
  function tipSheet(list, first, host) {   // 팁 목록 창: 고른 팁이 맨 위(강조), 나머지가 아래로 · 바깥 톡·✕ = 닫기
    document.getElementById("brTipSheet")?.remove(); const L = (list || []).map(String); if (!L.length) return;
    const f = Math.min(Math.max(0, first | 0), L.length - 1), order = [L[f], ...L.filter((_, i) => i !== f)];
    const d = document.createElement("div"); d.id = "brTipSheet"; d.setAttribute("role", "dialog"); if (host) d.classList.add("in");
    d.innerHTML = `<div class="sh"><div class="hd"><b>💡 이 화면에서 쓸 수 있는 팁</b><button type="button" class="x" aria-label="닫기">✕</button></div><ol></ol></div>`;
    const ol = d.querySelector("ol"); order.forEach((t, i) => { const li = document.createElement("li"); li.textContent = t; if (i === 0) li.className = "first"; ol.appendChild(li); });
    const shut = () => d.remove(); d.addEventListener("pointerdown", (e) => e.stopPropagation()); d.addEventListener("click", (e) => { e.stopPropagation(); if (e.target === d) shut(); });
    d.querySelector(".x").onclick = shut; (host || document.body).appendChild(d); }
  function bar() { setTimeout(tipBarRefresh, 30);   // 화면이 바뀌면 그 화면 팁으로
    let b = document.getElementById("brBar"); if (!b) { b = document.createElement("div"); b.id = "brBar"; document.body.appendChild(b); } b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); }
  const mark = () => `<span class="brMark" aria-hidden="true"></span>`;
  const sign = () => `<div class="brSign">가장 아름다운 당신의 오늘을 ‘작품’으로..</div>`;
  G.Brand = { splash, loading, setTips, tipBar, tipSheet, bar, mark, sign, LOGO };
})(window);
