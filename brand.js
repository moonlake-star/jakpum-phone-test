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
#brLoad{position:fixed;inset:0;z-index:9990;display:flex;pointer-events:none;align-items:center;justify-content:center;opacity:0;visibility:hidden;transition:opacity 1.8s ease,visibility 0s linear 1.8s}#brLoad.on{opacity:1;visibility:visible;transition:opacity .2s ease}
#brLoad .bx{pointer-events:none;width:min(300px,80vw);box-sizing:border-box;background:rgba(17,20,26,.9);border:1px solid #3b4250;border-radius:16px;padding:12px 16px;box-shadow:0 8px 28px rgba(0,0,0,.45);-webkit-user-select:none;user-select:none;-webkit-touch-callout:none;touch-action:none}#brLoad.on .bx{pointer-events:auto}
#brLoad .hd{display:flex;align-items:center;gap:6px;font-size:12.5px;color:#c9b58a;font-weight:800}#brLoad .hg{font-size:13px;display:inline-block;animation:brHg 1.6s ease-in-out infinite}@keyframes brHg{0%,40%{transform:rotate(0)}50%,90%{transform:rotate(180deg)}100%{transform:rotate(180deg)}}#brLoad .tx{margin-left:auto;font-weight:600;color:#9aa3ad;font-size:12px}
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
  let tipFn = null, tipTm = null, tipI = -1;
  function setTips(fn) { tipFn = typeof fn === "function" ? fn : null; }   // (11/03 13:39 사용자) 불러오는 동안 지금 화면에서 쓸 수 있는 기능 팁
  function tips(el, on) { const t = el.querySelector(".tp"); clearInterval(tipTm); tipTm = null; let L = [];
    if (on && tipFn) { try { L = (tipFn() || []).filter(Boolean); } catch {} }
    if (!L.length) { t.style.display = "none"; t.textContent = ""; el.querySelector(".hd b").style.display = "none"; return; }
    const pick = () => { if (pin || hold) return; tipI = (tipI + 1 + Math.floor(Math.random() * Math.max(1, L.length - 1))) % L.length; t.textContent = String(L[tipI]); };   // 붙잡아 둔 동안엔 같은 팁
    pick(); t.style.display = ""; el.querySelector(".hd b").style.display = ""; tipTm = setInterval(pick, 4500); }
  // 박스 붙잡기: 톡 = 계속 띄움(다시 톡 = 닫기) · 0.7초 넘게 꾹 = 누르는 동안만 · 어느 쪽이든 4초 뒤엔 닫힘
  const KEEP = 4000; let pin = false, hold = false, down = 0, keepT = null, busyOn = false;
  function vis(el) { const v = busyOn || pin || hold; el.classList.toggle("on", v);
    if (!v) { cancelAnimationFrame(praf); clearInterval(tipTm); tipTm = null; clearTimeout(vis.clr); vis.clr = setTimeout(() => { if (!el.classList.contains("on")) tips(el, false); }, 1900); }   // 글은 페이드가 끝난 뒤에 비움(사라지는 동안 박스가 줄지 않게)
    else if (!busyOn) el.querySelector(".tx").textContent = "✓ 다 불러왔어요"; }
  function keep(el) { clearTimeout(keepT); if (pin || hold) keepT = setTimeout(() => { pin = false; hold = false; vis(el); }, KEEP); }
  function wireBox(el) { const bx = el.querySelector(".bx");
    bx.addEventListener("pointerdown", (e) => { e.stopPropagation(); e.preventDefault(); down = performance.now(); hold = true; keep(el); try { bx.setPointerCapture(e.pointerId); } catch {} });
    bx.addEventListener("pointerup", (e) => { e.stopPropagation(); if (!down) return; const long = performance.now() - down >= 700; down = 0; hold = false; if (long) pin = false; else pin = !pin; keep(el); vis(el); });
    bx.addEventListener("pointercancel", () => { down = 0; hold = false; vis(el); });
    bx.addEventListener("click", (e) => e.stopPropagation()); bx.addEventListener("contextmenu", (e) => e.preventDefault()); }
  function hideNow(el) { busyOn = false; vis(el); }
  function loading(on, text, delay) {   // 불러오기 표시는 이것 하나(10/30 15:24 사용자: 일관되게). 기본 0.6초 넘게 걸릴 때만
    let el = document.getElementById("brLoad");
    if (!el) { el = document.createElement("div"); el.id = "brLoad"; el.setAttribute("role", "status"); el.innerHTML = `<div class="bx"><div class="hd"><span class="hg" aria-hidden="true">⏳</span><b style="display:none">[Tip]</b><span class="tx"></span></div><div class="tp" style="display:none"></div><div class="br"><i></i></div></div>`; document.body.appendChild(el); wireBox(el); }
    ln = Math.max(0, ln + (on ? 1 : -1));
    if (on) { el.querySelector(".tx").textContent = text || "불러오는 중...";
      if (el.classList.contains("on")) {   // 이미 떠 있음(사라지기 직전이거나 붙잡아 둔 상태) → 그대로 이어서
        if (!busyOn && !loading.hide && !loading.hide2) { busyOn = true; prog(el, true); if (!tipTm) tips(el, true); }
        busyOn = true;
        if (loading.hide || loading.hide2) { const done = !!loading.hide2; clearTimeout(loading.hide); clearTimeout(loading.hide2); loading.hide = loading.hide2 = null; if (done) { pt0 = performance.now() - 4000; prog(el, true, true); } } }
      else { clearTimeout(lt); lt = setTimeout(() => { if (ln > 0 && !el.classList.contains("on")) { busyOn = true; el.classList.add("on"); prog(el, true); tips(el, true); } }, delay == null ? 600 : delay); }
      clearTimeout(loading.cap); loading.cap = setTimeout(() => { ln = 0; hideNow(el); }, 20000); }
    if (ln === 0) { clearTimeout(lt);
      if (el.classList.contains("on")) { clearTimeout(loading.hide); clearTimeout(loading.hide2);
        loading.hide = setTimeout(() => { loading.hide = null; if (ln !== 0) return; prog(el, false);   // 다 불러오면 꽉 채우고 사라짐
          loading.hide2 = setTimeout(() => { loading.hide2 = null; if (ln === 0) hideNow(el); }, 260); }, GRACE); }
      else el.classList.remove("on"); }
  }
  function bar() { let b = document.getElementById("brBar"); if (!b) { b = document.createElement("div"); b.id = "brBar"; document.body.appendChild(b); } b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); }
  const mark = () => `<span class="brMark" aria-hidden="true"></span>`;
  const sign = () => `<div class="brSign">가장 아름다운 당신의 오늘을 ‘작품’으로..</div>`;
  G.Brand = { splash, loading, setTips, bar, mark, sign, LOGO };
})(window);
