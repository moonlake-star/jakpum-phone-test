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
/* (11/03 22:33 사용자) 불러오는 중 = 팁 박스 이전의 원래 모양(작은 로고 + 글 + 진행 바)으로 되돌림 · 터치를 막지 않음 */
#brLoad{position:fixed;inset:0;z-index:9990;display:none;pointer-events:none;flex-direction:column;align-items:center;justify-content:center;background:rgba(10,11,13,.72)}#brLoad.on{display:flex}
#brLoad .lg{width:84px;height:84px;border-radius:50%;background:url(${SMALL}) center/cover;box-shadow:0 0 30px rgba(255,190,90,.3);animation:brPulse 1.6s ease-in-out infinite}
#brLoad .tx{margin-top:12px;font-size:13px;color:#e9d7ae}#brLoad .br{height:4px;width:140px;border-radius:2px;background:#3a3325;margin-top:10px;overflow:hidden}#brLoad .br i{display:block;height:100%;width:0;background:linear-gradient(90deg,#c8912e,#ffd27a);border-radius:2px;position:relative;overflow:hidden}#brLoad .br i:after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);animation:brSh 1.2s linear infinite}@keyframes brSh{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
#brTipBar{position:fixed;left:0;right:0;bottom:0;z-index:38;display:flex;align-items:center;gap:8px;width:100%;max-width:760px;margin:0 auto;box-sizing:border-box;min-height:40px;padding:6px 14px calc(6px + env(safe-area-inset-bottom));border:0;border-top:1px solid #2e333c;border-radius:0;background:rgba(17,20,26,.97);color:#ffd27a;font:600 13px system-ui,sans-serif;text-align:left;cursor:pointer}#brTipBar[hidden]{display:none}#brTipBar b{color:#c9b58a;flex:none;font-size:12px}#brTipBar span{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}#brTipBar i{font-style:normal;color:#7d8590;flex:none}body.brTipOn{padding-bottom:calc(44px + env(safe-area-inset-bottom))}body.miniOn #brTipBar{bottom:calc(128px + env(safe-area-inset-bottom))}body:has(#v2Dock:not(.hidden)) #brTipBar,body:has(#fullBar:not(.hidden)) #brTipBar{display:none}
#brTipBar.nudge{animation:brTipNudge 1.3s cubic-bezier(.25,.9,.3,1) .2s both}@keyframes brTipNudge{0%{transform:translateY(0)}22%{transform:translateY(-30px);box-shadow:0 -8px 24px rgba(255,210,122,.45);background:rgba(40,34,20,.98)}55%{transform:translateY(-30px);box-shadow:0 -8px 24px rgba(255,210,122,.45);background:rgba(40,34,20,.98)}80%{transform:translateY(3px)}90%{transform:translateY(-2px)}100%{transform:translateY(0)}}#brTipBar.two span{white-space:normal;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-height:1.35}   /* (11/07 09:02 사용자) 올라와 있는 동안은 두 줄 → 내려오면 한 줄 · (09:06) 시간은 늘리지 않음(표시만) */   /* (11/07 01:16) 10px → 30px 올라가 0.4초 머문 뒤 통통 제자리 · (01:37 사용자 폰이 '애니메이션 제거' 설정이라 반짝임만 보였음) 움직임 줄이기 기기에서도 똑같이 움직임 — 사용자가 원한 동작 */
#brTipSheet{position:fixed;inset:0;z-index:10020;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}#brTipSheet.in{position:absolute}#brTipSheet .sh{width:min(520px,100%);max-height:70%;overflow:auto;box-sizing:border-box;background:#1a1e25;border:1.5px solid #3b4250;border-radius:16px 16px 0 0;padding:14px 16px calc(14px + env(safe-area-inset-bottom));color:#e8e8ea}#brTipSheet .hd{display:flex;align-items:center;margin-bottom:8px}#brTipSheet .hd b{font-size:15px;color:#ffd27a}#brTipSheet .x{margin:0 0 0 auto;min-height:0;height:32px;width:32px;border:0;border-radius:16px;background:#2a2f38;color:#e8e8ea;font-size:15px;padding:0}#brTipSheet ol{margin:0;padding:0 0 0 20px}#brTipSheet li{font-size:14px;line-height:1.55;padding:7px 0;border-bottom:1px solid #262b33;color:#cfd5de;word-break:keep-all}#brTipSheet li.first{color:#ffd27a;font-weight:700}
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
  // (11/03 22:33 사용자) 불러오는 중 팁 박스는 없애고 원래 팝업으로 — 팁은 화면 맨 아래 '💡 Tip' 칸·목록에서만
  function loading(on, text, delay) {   // 불러오기 표시는 이것 하나(10/30 15:24 사용자: 일관되게). 기본 0.6초 넘게 걸릴 때만
    let el = document.getElementById("brLoad");
    if (!el) { el = document.createElement("div"); el.id = "brLoad"; el.setAttribute("role", "status"); el.innerHTML = `<div class="lg"></div><div class="tx"></div><div class="br"><i></i></div>`; document.body.appendChild(el); }
    ln = Math.max(0, ln + (on ? 1 : -1));
    if (on) { el.querySelector(".tx").textContent = text || "불러오는 중...";
      if (el.classList.contains("on")) {   // 사라지기 직전에 다음 읽기 → 같은 창·같은 바로 이어서(한 번만 뜨고 한 번만 사라짐)
        if (loading.hide || loading.hide2) { const done = !!loading.hide2; clearTimeout(loading.hide); clearTimeout(loading.hide2); loading.hide = loading.hide2 = null; if (done) { pt0 = performance.now() - 4000; prog(el, true, true); } } }
      else { clearTimeout(lt); lt = setTimeout(() => { if (ln > 0 && !el.classList.contains("on")) { el.classList.add("on"); prog(el, true); } }, delay == null ? 600 : delay); }
      clearTimeout(loading.cap); loading.cap = setTimeout(() => { ln = 0; cancelAnimationFrame(praf); el.classList.remove("on"); }, 20000); }
    if (ln === 0) { clearTimeout(lt);
      if (el.classList.contains("on")) { clearTimeout(loading.hide); clearTimeout(loading.hide2);
        loading.hide = setTimeout(() => { loading.hide = null; if (ln !== 0) return; prog(el, false);   // 다 불러오면 꽉 채우고 사라짐
          loading.hide2 = setTimeout(() => { loading.hide2 = null; if (ln === 0) { cancelAnimationFrame(praf); el.classList.remove("on"); } }, 260); }, GRACE); }
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
  // (11/03 22:22 사용자) 뒤로 가기(갤럭시 뒤로 밀기)는 어느 화면에서나 같은 규칙: '맨 위에 떠 있는 것 하나만' 닫힘
  //   (팁 목록·확인 창 같은 작은 창 → 고치기 창 → 전체화면 → 화면). 새 창·시트·팝업은 꼭 Brand.layer(닫는 함수)로 열 것 — AGENTS.md 규칙
  const layers = []; let lSkip = 0;
  function layer(closeFn) { const L = { id: Math.random().toString(36).slice(2), closeFn }; layers.push(L);
    try { history.pushState(Object.assign({}, history.state || {}, { brLayer: L.id }), ""); } catch {}
    return { close() { const i = layers.indexOf(L); if (i < 0) return; layers.splice(i, 1); try { L.closeFn(false); } catch {}   // 화면 버튼(✕·바깥 톡)으로 닫음 → 기록 한 칸도 정리
      try { if (history.state && history.state.brLayer === L.id) { lSkip++; history.back(); } } catch {} } }; }
  function dropLayers() { const n = layers.length; while (layers.length) { const L = layers.pop(); try { L.closeFn(false); } catch {} } return n; }   // 아래 창(전체화면 등)이 버튼으로 닫힐 때: 위 작은 창들을 기록 없이 닫고 개수 알려줌 → 그만큼 더 뒤로
  const lMark = (e) => { try { e.layerClosed = true; e.tuneClosed = true; } catch {} };   // 다른 뒤로 가기 처리(전체화면·화면 이동)는 건너뛰게
  // (11/09 01:38 사용자 '뒤로 가기에 앱이 꺼지는 경우가 있음') 크롬 규칙: 화면을 만지지 않은 채(뒤로 가기 직후 등) 만든 기록 칸은 '건너뛸 칸'이 되어,
  //   다음 뒤로 가기가 이 앱의 칸을 통째로 건너뛰고 앱을 닫음. 예전엔 뒤로 가기를 처리하면서 칸을 다시 만들었음(= 건너뛸 칸) → 두 번째 뒤로에 종료.
  //   → 칸은 '화면을 만질 때'(pointerdown·keydown)만 미리 BACK_BUF칸 쌓아 둠. 뒤로 가기 처리 중엔 절대 새 칸을 만들지 않음.
  const BACK_BUF = 5; let bSkip = 0;
  const bN = () => +((history.state || {}).jkG) || 0, bLayered = () => { const s = history.state || {}; return !!(s.tuneFs || s.tuneSheet || s.brLayer || s.v2sheet); };
  function backArm() { try { if (bLayered() || bN() >= BACK_BUF) return; for (let k = bN() + 1; k <= BACK_BUF; k++) history.pushState(Object.assign({}, history.state || {}, { jkG: k }), "", location.href); } catch {} }
  function backToBase() { try { const k = bN(); if (k > 0) { bSkip++; history.go(-k); } } catch {} }   // 첫 화면에서 뒤로: 쌓아 둔 칸을 한 번에 비움 → 다음 뒤로 가기 = 앱 닫기(그 사이 화면을 만지면 다시 쌓임)
  if (typeof G.addEventListener === "function") { G.addEventListener("pointerdown", backArm, true); G.addEventListener("keydown", backArm, true);
    G.addEventListener("popstate", (e) => { if (bSkip > 0) { bSkip--; try { e.jkSkip = true; e.layerClosed = true; e.tuneClosed = true; } catch {} } }); }
  if (typeof G.addEventListener === "function") G.addEventListener("popstate", (e) => { if (e && e.jkSkip) return; if (lSkip > 0) { lSkip--; lMark(e); return; } if (layers.length) { const L = layers.pop(); try { L.closeFn(true); } catch {} lMark(e); } });
  function tipSheet(list, first, host) {   // 팁 목록 창: 고른 팁이 맨 위(강조), 나머지가 아래로 · 바깥 톡·✕ = 닫기
    document.getElementById("brTipSheet")?.remove(); const L = (list || []).map(String); if (!L.length) return;
    const f = Math.min(Math.max(0, first | 0), L.length - 1), order = [L[f], ...L.filter((_, i) => i !== f)];
    const d = document.createElement("div"); d.id = "brTipSheet"; d.setAttribute("role", "dialog"); if (host) d.classList.add("in");
    d.innerHTML = `<div class="sh"><div class="hd"><b>💡 이 화면에서 쓸 수 있는 팁</b><button type="button" class="x" aria-label="닫기">✕</button></div><ol></ol></div>`;
    const ol = d.querySelector("ol"); order.forEach((t, i) => { const li = document.createElement("li"); li.textContent = t; if (i === 0) li.className = "first"; ol.appendChild(li); });
    const ly = layer(() => d.remove()), shut = () => ly.close(); d.addEventListener("pointerdown", (e) => e.stopPropagation()); d.addEventListener("click", (e) => { e.stopPropagation(); if (e.target === d) shut(); });
    d.querySelector(".x").onclick = shut; (host || document.body).appendChild(d); }
  function tipNudge() { if (!tbEl || tbEl.hidden) return; tbEl.classList.remove("nudge", "two"); void tbEl.offsetWidth; tbEl.classList.add("nudge"); clearTimeout(tipNudge.t1); clearTimeout(tipNudge.t2); tipNudge.t1 = setTimeout(() => tbEl.classList.add("two"), 300); tipNudge.t2 = setTimeout(() => tbEl.classList.remove("two"), 950); }   // (11/06 23:35 사용자) 화면이 바뀔 때마다 팁 칸이 살짝 올라왔다 제자리로(여기 팁이 있다는 걸 알게)
  function bar() { setTimeout(() => { tipBarRefresh(); tipNudge(); }, 30);   // 화면이 바뀌면 그 화면 팁으로
    let b = document.getElementById("brBar"); if (!b) { b = document.createElement("div"); b.id = "brBar"; document.body.appendChild(b); } b.classList.remove("go"); void b.offsetWidth; b.classList.add("go"); }
  const mark = () => `<span class="brMark" aria-hidden="true"></span>`;
  const sign = () => `<div class="brSign">가장 아름다운 당신의 오늘을 ‘작품’으로..</div>`;
  // (11/05 사용자 '앱이건 웹브라우저건 백그라운드로 가면 장치를 놔줘야') 소리 장치 일괄 놓기 — 화면(탭)이 가려지면 쓰고 있지 않은 AudioContext를 모두 쉬게 함.
  // 블루투스 이어폰은 소리 장치가 열려 있는 동안 다른 앱과 볼륨·연결이 꼬임. 쓸 때는 각 화면이 resume()으로 다시 깨움(돌아왔다고 자동으로 깨우지 않음).
  // 예외: 화면이 "지금 재생 중"이라고 알려 준 것(예: 레슨 소리를 틀어 둔 채 화면 끄기)은 쉬지 않음 → Brand.audioKeep(c => 재생중?)
  const ACX = new Set(); let keepFn = null;
  (function wrap() {
    for (const k of ["AudioContext", "webkitAudioContext"]) {
      const O = G[k]; if (!O || O.__brWrapped) continue;
      try { const W = class extends O { constructor(...a) { super(...a); ACX.add(this); } }; W.__brWrapped = true; G[k] = W; } catch {}
    }
  })();
  function audioRelease() {
    for (const c of ACX) {
      try { if (c.state === "closed") { ACX.delete(c); continue; } if (c.state === "running" && !(keepFn && keepFn(c))) c.suspend(); } catch {}
    }
  }
  // (11/09 사용자 '다른 앱 재생 중에 보컬노트를 틀면 다른 앱 소리가 잠깐 멈췄다 작게 다시 나오고 겹침') 안드로이드는 WebAudio만 쓰는 소리를
  // '잠깐 나는 소리'로 보고 다른 앱 음악을 줄이기만 함(겹침). 재생 중에는 소리 없는 오디오 태그를 같이 돌려 '음악 재생 앱'으로 인식시킴 → 다른 앱은 멈추고,
  // 다른 앱이 소리를 시작하면(이 태그가 멈추면) 이 앱 재생도 멈춤. 쓰는 쪽은 토큰별로 켜고 끔(focusHold(토큰, 켬/끔, 뺏겼을 때 할 일)).
  const FH = { el: null, users: new Map(), ownAt: 0 };
  function silentWav() {
    const n = 8000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    w(0, "RIFF"); v.setUint32(4, 36 + n, true); w(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
    w(36, "data"); v.setUint32(40, n, true); b.fill(128, 44); return URL.createObjectURL(new Blob([b], { type: "audio/wav" }));
  }
  function focusHold(token, on, onLost) {
    try {
      if (on) {
        FH.users.set(token, typeof onLost === "function" ? onLost : null);
        if (!FH.el) {
          const a = new Audio(); a.loop = true; a.src = silentWav(); a.setAttribute("aria-hidden", "true"); FH.el = a;
          a.addEventListener("pause", () => { if (!FH.users.size || !a.paused || Date.now() - FH.ownAt < 800) return;   // 우리가 멈춘 게 아니라 다른 앱이 소리를 시작함
            const cbs = [...FH.users.values()]; FH.users.clear(); for (const cb of cbs) { try { cb && cb(); } catch {} } });
        }
        if (FH.el.paused) { const p = FH.el.play(); if (p && p.catch) p.catch(() => {}); }
      } else {
        FH.users.delete(token);
        if (!FH.users.size && FH.el && !FH.el.paused) { FH.ownAt = Date.now(); FH.el.pause(); }
      }
    } catch {}
  }
  const audioKeep = (fn) => { keepFn = typeof fn === "function" ? fn : null; };
  // (11/09 12:59 사용자 '블루투스 이어폰이면 화면이 먼저 가고 소리가 늦음') 소리가 귀에 닿기까지의 지연(초): 수동 설정(jk_outLat = ms) > 브라우저가 알려 주는 값
  //   (AudioContext.outputLatency + baseLatency, 블루투스면 보통 0.15~0.3초) > 마지막으로 잰 값. 그래프·막대는 이만큼 늦춰 그림(Tune.wire)
  let olAuto = (() => { try { return +localStorage.getItem("jk_outLatAuto") || 0; } catch { return 0; } })(), olSaveAt = 0;
  function outLatMode() { try { const v = localStorage.getItem("jk_outLat"); return v == null || v === "auto" ? "auto" : Math.max(0, Math.min(600, +v || 0)); } catch { return "auto"; } }
  function outLatSet(v) { try { localStorage.setItem("jk_outLat", v === "auto" ? "auto" : String(Math.round(+v || 0))); } catch {} }
  function outLatAuto() { for (const c of ACX) { try { if (c.state !== "running") continue; const v = (+c.outputLatency || 0) + (+c.baseLatency || 0); if (v > 0 && v < 1) { olAuto = v; if (Date.now() - olSaveAt > 5000) { olSaveAt = Date.now(); try { localStorage.setItem("jk_outLatAuto", v.toFixed(3)); } catch {} } return v; } } catch {} } return 0; }   // (11/13) 지금 도는 오디오가 없으면 0 — 예전(블루투스 때) 잰 값을 스피커에서 또 쓰면 화면이 늦었음
  function outLat() { const m = outLatMode(); return m === "auto" ? outLatAuto() : m / 1000; }
  G.addEventListener("pagehide", audioRelease);
  document.addEventListener("visibilitychange", () => { if (document.hidden) audioRelease(); });
  G.Brand = { outLat, outLatMode, outLatSet, outLatAuto, backArm, backToBase, audioRelease, audioKeep, focusHold, splash, loading, setTips, tipBar, tipSheet, layer, dropLayers, bar, mark, sign, LOGO };
})(window);
