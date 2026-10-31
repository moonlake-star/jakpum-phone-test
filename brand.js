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
#brLoad{position:fixed;inset:0;z-index:9990;display:none;pointer-events:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,11,13,.72)}#brLoad.on{display:flex}
#brLoad .lg{width:84px;height:84px;border-radius:50%;background:url(${SMALL}) center/cover;box-shadow:0 0 30px rgba(255,190,90,.3);animation:brPulse 1.6s ease-in-out infinite}
#brLoad .tx{margin-top:12px;font-size:13px;color:#e9d7ae}#brLoad .br{height:4px;width:140px;border-radius:2px;background:#3a3325;margin-top:10px;overflow:hidden}#brLoad .br i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c8912e,#ffd27a);border-radius:2px;position:relative;overflow:hidden}#brLoad .br i:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:brSh 1.2s linear infinite}@keyframes brSh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
#brBar{position:fixed;left:0;top:0;height:3px;width:0;z-index:9995;background:linear-gradient(90deg,#ffd27a,#c8912e);pointer-events:none}#brBar.go{animation:brBar .35s ease-out}
.brMark{display:inline-block;width:1.5em;height:1.5em;border-radius:50%;background:url(${SMALL}) center/cover;vertical-align:-.35em;margin-right:.3em}
.brSign{text-align:center;font-family:"Nanum Myeongjo","Noto Serif KR",serif;color:#c9b98f;font-size:.9rem;margin:18px 0 8px;line-height:1.6}
@keyframes brIn{from{transform:scale(.86);opacity:0}to{transform:none;opacity:1}}@keyframes brSpin{to{transform:rotate(360deg)}}@keyframes brFade{to{opacity:1}}
@keyframes brPulse{50%{box-shadow:0 0 44px rgba(255,190,90,.55)}}@keyframes brRun{from{transform:translateX(-100%)}to{transform:translateX(300%)}}@keyframes brBar{0%{width:0;opacity:1}80%{width:100%;opacity:1}100%{width:100%;opacity:0}}
@media (prefers-reduced-motion: reduce){#brSplash .lg,#brSplash .lg::after,#brSplash .cp,#brSplash .sb,#brLoad .lg,#brLoad .br i,#brBar.go{animation:none}#brSplash .cp,#brSplash .sb{opacity:1}}`;
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
  function prog(el, run) { const i = el.querySelector(".br i"); cancelAnimationFrame(praf);
    if (run) { pt0 = performance.now(); i.style.transition = "none"; i.style.width = "0";
      const f = (n) => { i.style.width = (90 * (1 - Math.exp(-(n - pt0) / 1800))).toFixed(1) + "%"; praf = requestAnimationFrame(f); }; praf = requestAnimationFrame(f); }
    else { i.style.transition = "width .2s ease-out"; i.style.width = "100%"; } }
  function loading(on, text, delay) {   // 불러오기 표시는 이것 하나(10/30 15:24 사용자: 일관되게). 기본 0.6초 넘게 걸릴 때만
    let el = document.getElementById("brLoad");
    if (!el) { el = document.createElement("div"); el.id = "brLoad"; el.setAttribute("role", "status"); el.innerHTML = `<div class="lg"></div><div class="tx"></div><div class="br"><i></i></div>`; document.body.appendChild(el); }
    ln = Math.max(0, ln + (on ? 1 : -1));
    if (on) { el.querySelector(".tx").textContent = text || "불러오는 중..."; clearTimeout(lt); lt = setTimeout(() => { if (ln > 0 && !el.classList.contains("on")) { clearTimeout(loading.hide); el.classList.add("on"); prog(el, true); } }, delay == null ? 600 : delay);
      clearTimeout(loading.cap); loading.cap = setTimeout(() => { ln = 0; cancelAnimationFrame(praf); el.classList.remove("on"); }, 20000); }
    if (ln === 0) { clearTimeout(lt);
      if (el.classList.contains("on")) { prog(el, false); clearTimeout(loading.hide); loading.hide = setTimeout(() => { if (ln === 0) el.classList.remove("on"); }, 260); }   // 다 불러오면 꽉 채우고 사라짐
      else el.classList.remove("on"); }
  }
  function bar() { let b = document.getElementById("brBar"); if (!b) { b = document.createElement("div"); b.id = "brBar"; document.body.appendChild(b); } b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); }
  const mark = () => `<span class="brMark" aria-hidden="true"></span>`;
  const sign = () => `<div class="brSign">가장 아름다운 당신의 오늘을 ‘작품’으로..</div>`;
  G.Brand = { splash, loading, bar, mark, sign, LOGO };
})(window);
