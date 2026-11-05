// (사용자 2026-11-04 17:27·17:36) 원장 모드 '멜로다인 프로젝트' 1단계 — 원장 계정에만. 강사 화면(tune.js 기본 고치기)은 그대로.
// 음 하나: 흐름(드리프트·앞/뒤 기울기) · 이어짐(길이·곡선 모양) · 비브라토(원래 떨림 %, 새 비브라토 주기·폭·시작·커지는 시간·사람처럼) · 볼륨(dB·끄기·페이드)
// 곡 전체: 자동 보정 강도 · 가까운 음 그대로 · 흐름 평평하게 · 볼륨 고르게 · 치찰음 · 목소리 결 · 되돌리기 여러 단계 · MIDI 내보내기
// 저장 = st.onAdv({notes, global}) (화면 시간 — 선생님 앱이 원래 녹음 시간으로 바꿔 메이크업요청.json note_edits에) · 진짜 소리는 '완성본 다시 만들기' 뒤(서버 note_edits.py)
// 음정선 미리보기 = 서버 shape_pitch와 같은 규칙(사람처럼 흔들기 제외)을 '보정 후' 선에 그려 줌. 볼륨·치찰음·목소리 결은 그림에 안 보임(완성본에서 확인).
(function (G) {
  "use strict";
  const N_DEF = { drift: 1, tilt_in: 0, tilt_out: 0, vib: 1, tr_ms: 0, gain_db: 0, fade_in: 0, fade_out: 0, formant: 0 };
  const DRIFT_WIN = 0.25;
  const D = (row, t) => { row._desc = t; return row; };   // 설명 한 줄을 붙인 칸
  const near = (a, b) => Math.abs(a - b) < 0.02;
  const clone = (x) => JSON.parse(JSON.stringify(x || {}));
  const r2 = (x) => Math.round(x * 100) / 100;

  // ── 상태(전체화면 하나당 하나) ──
  function state(st) {
    if (st._adv) return st._adv;
    const ne = clone(typeof st.advGet === "function" ? st.advGet() : {});
    ne.notes = Array.isArray(ne.notes) ? ne.notes : []; ne.global = ne.global && typeof ne.global === "object" ? ne.global : {};
    return (st._adv = { ne, hist: [], tm: null });
  }
  function noteOf(A, b, make) {
    let n = A.ne.notes.find(x => near(x.t0, b.t0) && near(x.t1, b.t1));
    if (!n && make) { n = { t0: r2(b.t0), t1: r2(b.t1) }; A.ne.notes.push(n); A.ne.notes.sort((x, y) => x.t0 - y.t0); }
    return n || null;
  }
  function clean(A) {   // 기본값과 같은 칸은 지움 → 고친 게 없는 음은 목록에서 뺌
    A.ne.notes = A.ne.notes.filter(n => {
      for (const k in N_DEF) if (k in n && Math.abs(n[k] - N_DEF[k]) < 1e-9) delete n[k];
      if (!n.tr_ms) delete n.tr_shape;
      if (n.mute === false) delete n.mute;
      if (n.vs && !(n.vs.depth > 0)) delete n.vs;
      return Object.keys(n).some(k => k !== "t0" && k !== "t1");
    });
    const g = A.ne.global;
    for (const [k, d] of [["ref_hz", 440], ["flat", 1], ["sib_db", 0], ["formant", 0], ["strength", 1], ["near", 8]]) if (k in g && Math.abs(g[k] - d) < 1e-9) delete g[k];
    if (g.level && !g.level.quiet && !g.level.loud) delete g.level;
    if (Array.isArray(g.uv_gain)) { g.uv_gain = g.uv_gain.filter(r => r && (r.s_db || r.b_db)); if (!g.uv_gain.length) delete g.uv_gain; }
    if (Array.isArray(g.uv_fix) && !g.uv_fix.length) delete g.uv_fix;
  }
  function change(A, st, cv, fn) {   // 고침 1번 = 되돌리기 1칸 · 그림 바로 · 저장은 0.4초 모아서
    A.hist.push(JSON.stringify(A.ne)); if (A.hist.length > 100) A.hist.shift();
    fn(); clean(A); preview(cv, A.ne);
    clearTimeout(A.tm); A.tm = setTimeout(() => save(A, st), 400);
  }
  function save(A, st) { clearTimeout(A.tm); A.tm = null; try { const p = st.onAdv && st.onAdv(clone(A.ne)); if (p && p.catch) p.catch(() => {}); } catch {} }
  function undo(A, st, cv) { const s = A.hist.pop(); if (!s) return false; A.ne = JSON.parse(s); preview(cv, A.ne); save(A, st); return true; }

  // ── 음정선 미리보기(서버 note_edits.shape_pitch와 같은 규칙) ──
  function corrCol(cv) { const L = cv.levels || []; return L.length ? 2 + L.length - 1 : 0; }
  function smooth(x, t, win) {
    const n = x.length, c = new Float64Array(n + 1); for (let i = 0; i < n; i++) c[i + 1] = c[i] + x[i];
    const out = new Array(n); let lo = 0, hi = 0;
    for (let i = 0; i < n; i++) { while (t[lo] < t[i] - win / 2) lo++; while (hi < n && t[hi] <= t[i] + win / 2) hi++; out[i] = (c[hi] - c[lo]) / Math.max(1, hi - lo); }
    return out;
  }
  function shapeNote(n, tt, pp) {   // tt·pp: 그 음 안 점들 → 새 음높이
    if (pp.length < 3) return pp;
    const srt = pp.slice().sort((a, b) => a - b), h = srt.length >> 1, T = srt.length % 2 ? srt[h] : (srt[h - 1] + srt[h]) / 2, d = pp.map(v => v - T), slow = smooth(d, tt, DRIFT_WIN);
    const vib = n.vib != null ? n.vib : (n.vs ? 0 : 1), dr = n.drift != null ? n.drift : 1, dur = tt[tt.length - 1] - tt[0];
    const L = n.tilt_len || Math.min(0.4, Math.max(0.03, 0.3 * dur));
    return pp.map((_, i) => {
      let v = dr * slow[i] + vib * (d[i] - slow[i]);
      if (n.tilt_in) { const x = Math.min(1, Math.max(0, (tt[i] - tt[0]) / L)); v += n.tilt_in * (1 - x) ** 2; }
      if (n.tilt_out) { const x = Math.min(1, Math.max(0, (tt[tt.length - 1] - tt[i]) / L)); v += n.tilt_out * (1 - x) ** 2; }
      if (n.vs) { const u = tt[i] - tt[0] - n.vs.delay; if (u >= 0) { const env = n.vs.fade > 0 ? Math.min(1, u / n.vs.fade) : 1; v += n.vs.depth * env * Math.sin(2 * Math.PI * n.vs.rate * u); } }
      return T + v;
    });
  }
  function preview(cv, ne) {
    const k = corrCol(cv); if (!k || !cv.pts) return;
    const base = cv._advBase || (cv._advBase = cv.pts.map(p => p[k]));
    cv.pts.forEach((p, i) => { p[k] = base[i]; });
    const g = (ne && ne.global) || {}, notes = ((ne && ne.notes) || []).slice();
    const idx = (a, b) => { const out = []; cv.pts.forEach((p, i) => { if (p[0] >= a && p[0] <= b && p[k] != null) out.push(i); }); return out; };
    for (const n of notes) {
      if (!["drift", "vib", "vs", "tilt_in", "tilt_out"].some(x => x in n) && g.flat == null) continue;
      const ii = idx(n.t0, n.t1); if (ii.length < 3) continue;
      const nn = g.flat != null && n.drift == null ? { ...n, drift: g.flat } : n;
      const res = shapeNote(nn, ii.map(i => cv.pts[i][0]), ii.map(i => base[i]));
      ii.forEach((i, j) => { cv.pts[i][k] = res[j]; });
    }
    for (const n of notes) {   // 이어짐
      if (!n.tr_ms) continue;
      const after = cv.pts.find(p => p[0] > n.t1 + 0.005 && p[k] != null); if (!after || after[0] - n.t1 > 0.12) continue;
      const tb = (n.t1 + after[0]) / 2, w = n.tr_ms / 2000, ii = idx(tb - w, tb + w); if (ii.length < 2) continue;
      const pa = cv.pts[Math.max(0, ii[0] - 1)][k], pb = cv.pts[Math.min(cv.pts.length - 1, ii[ii.length - 1] + 1)][k];
      if (pa == null || pb == null) continue;
      ii.forEach(i => { const x = Math.min(1, Math.max(0, (cv.pts[i][0] - (tb - w)) / (2 * w))), s = n.tr_shape || "s";
        const kk = s === "lin" ? x : s === "step" ? (x >= 0.5 ? 1 : 0) : x * x * (3 - 2 * x); cv.pts[i][k] = pa + (pb - pa) * kk; });
    }
    if (g.ref_hz && g.ref_hz !== 440) { const off = 1200 * Math.log2(g.ref_hz / 440), kt = cv.target ? 2 + (cv.levels || []).length : 0;
      cv.pts.forEach(p => { if (p[k] != null && (!kt || p[kt] != null)) p[k] += off; }); }
  }

  // ── 조절 줄(− 값 +) — 손가락으로 누르기 쉽게 44px · 꾹 누르면 계속 ──
  function stepper(label, get, set, o) {
    const row = document.createElement("div"); row.className = "advRow";
    row.innerHTML = `<span class="advL">${label}</span><button type="button" class="advB" data-s="-1" aria-label="${label} 줄이기">−</button><output class="advV"></output><button type="button" class="advB" data-s="1" aria-label="${label} 늘리기">+</button>`;
    const out = row.querySelector("output"), paint = () => { out.textContent = o.fmt(get()); row.classList.toggle("on", Math.abs(get() - o.def) > 1e-9); };
    const go = (s) => { if (o.inv) s = -s; const v = Math.round((get() + s * o.step) / o.step) * o.step;   // inv = 화면에 −로 보이는 값(큰 음 줄이기): −를 누르면 숫자가 더 마이너스로
      set(Math.min(o.max, Math.max(o.min, +v.toFixed(4)))); paint(); };
    row.querySelectorAll(".advB").forEach(b => {
      let hold = null, rep = null;
      const stop = () => { clearTimeout(hold); clearInterval(rep); hold = rep = null; };
      b.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); go(+b.dataset.s); hold = setTimeout(() => { rep = setInterval(() => go(+b.dataset.s), 90); }, 450); });
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev => b.addEventListener(ev, stop));
      b.addEventListener("click", (e) => { if (e.detail === 0) go(+b.dataset.s); });
    });
    out.addEventListener("dblclick", () => { set(o.def); paint(); });   // 값 두 번 톡 = 기본값
    paint(); row._paint = paint; return row;
  }
  function chips(label, opts, get, set) {
    const row = document.createElement("div"); row.className = "advRow";
    row.innerHTML = `<span class="advL">${label}</span><span class="advChips">${opts.map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("")}</span>`;
    const paint = () => row.querySelectorAll("[data-v]").forEach(b => b.classList.toggle("on", String(get()) === b.dataset.v));
    row.querySelectorAll("[data-v]").forEach(b => b.onclick = (e) => { e.stopPropagation(); set(b.dataset.v); paint(); });
    paint(); row._paint = paint; return row;
  }
  const pct = (v) => `${Math.round(v * 100)}%`, cents = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}센트`, sec = (v) => `${v.toFixed(2)}초`;

  // ── 음 하나 고급 조절 칸(고치기 창 안 '🎛 고급' 모드) ──
  function panel(box, b, st, cv) {
    const A = state(st);
    let el = box.querySelector(".advPanel"); if (el) el.remove();
    el = document.createElement("div"); el.className = "advPanel tfA";
    const tabs = [["f", "흐름"], ["c", "이어짐"], ["v", "비브라토"], ["g", "볼륨"], ["m", "음색"]];
    el.innerHTML = `<div class="advTabs" role="tablist">${tabs.map(([k, t]) => `<button type="button" data-at="${k}">${t}</button>`).join("")}<button type="button" class="advRst" aria-label="이 음 고급 고침 원래대로">↺ 이 음</button></div><div class="advBody"></div>`;
    const body = el.querySelector(".advBody");
    const N = () => noteOf(A, b, false) || {};
    const put = (k, v) => change(A, st, cv, () => { const n = noteOf(A, b, true); n[k] = v; });
    const putVs = (k, v) => change(A, st, cv, () => { const n = noteOf(A, b, true); n.vs = Object.assign({ rate: 5.5, depth: 0, delay: 0.3, fade: 0.4 }, n.vs || {}); n.vs[k] = v; });
    const get = (k) => (N()[k] != null ? N()[k] : N_DEF[k]);
    const getVs = (k, d) => (N().vs && N().vs[k] != null ? N().vs[k] : d);
    const show = (k) => {
      st._advTab = k; el.querySelectorAll("[data-at]").forEach(x => x.classList.toggle("on", x.dataset.at === k)); body.innerHTML = "";
      const rows = [];
      if (k === "f") rows.push(
        stepper("느린 흐름", () => get("drift"), (v) => put("drift", v), { step: 0.25, min: 0, max: 2, def: 1, fmt: pct }),
        stepper("앞 기울기", () => get("tilt_in"), (v) => put("tilt_in", v), { step: 10, min: -300, max: 300, def: 0, fmt: cents }),
        stepper("뒤 기울기", () => get("tilt_out"), (v) => put("tilt_out", v), { step: 10, min: -300, max: 300, def: 0, fmt: cents }));
      if (k === "c") rows.push(
        stepper("다음 음까지", () => get("tr_ms"), (v) => put("tr_ms", v), { step: 20, min: 0, max: 800, def: 0, fmt: (v) => v ? `${Math.round(v)}ms` : "그대로" }),
        chips("곡선", [["s", "부드럽게"], ["lin", "직선"], ["step", "계단"]], () => N().tr_shape || "s", (v) => put("tr_shape", v)));
      if (k === "v") rows.push(
        stepper("원래 떨림", () => (N().vib != null ? N().vib : (N().vs ? 0 : 1)), (v) => put("vib", v), { step: 0.25, min: 0, max: 2, def: 1, fmt: pct }),
        stepper("새 떨림 폭", () => getVs("depth", 0), (v) => putVs("depth", v), { step: 5, min: 0, max: 150, def: 0, fmt: (v) => v ? `±${Math.round(v)}센트` : "없음" }),
        stepper("주기", () => getVs("rate", 5.5), (v) => putVs("rate", v), { step: 0.25, min: 2, max: 10, def: 5.5, fmt: (v) => `${v.toFixed(2)}Hz` }),
        stepper("시작", () => getVs("delay", 0.3), (v) => putVs("delay", v), { step: 0.05, min: 0, max: 3, def: 0.3, fmt: sec }),
        stepper("커지는 시간", () => getVs("fade", 0.4), (v) => putVs("fade", v), { step: 0.05, min: 0, max: 3, def: 0.4, fmt: sec }),
        stepper("사람처럼", () => getVs("human", 0), (v) => putVs("human", v), { step: 0.25, min: 0, max: 1, def: 0, fmt: pct }));
      if (k === "m") rows.push(
        D(stepper("포먼트(목소리 결)", () => get("formant"), (v) => put("formant", v), { step: 0.25, min: -3, max: 3, def: 0, fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}반음` }), "이 음의 음색만 이동(음정은 그대로). + 는 얇고 밝게, − 는 굵고 어둡게. 일괄 보정의 포먼트 값 위에 더해져요."));
      if (k === "g") rows.push(
        stepper("볼륨", () => get("gain_db"), (v) => put("gain_db", v), { step: 1, min: -24, max: 12, def: 0, fmt: (v) => `${v > 0 ? "+" : ""}${Math.round(v)}dB` }),
        chips("소리", [["0", "켬"], ["1", "끄기"]], () => (N().mute ? "1" : "0"), (v) => put("mute", v === "1")),
        stepper("페이드 인", () => get("fade_in"), (v) => put("fade_in", v), { step: 0.05, min: 0, max: 2, def: 0, fmt: sec }),
        stepper("페이드 아웃", () => get("fade_out"), (v) => put("fade_out", v), { step: 0.05, min: 0, max: 2, def: 0, fmt: sec }));
      rows.forEach(r => { if (!r._desc) { body.appendChild(r); return; } const w = document.createElement("div"), p = document.createElement("p"); p.className = "advD"; p.textContent = r._desc; w.appendChild(r); w.appendChild(p); body.appendChild(w); });
      const tip = document.createElement("p"); tip.className = "advTip";
      tip.textContent = k === "g" || k === "m" ? "볼륨·페이드·음색은 음정선에 안 보여요 · 완성본 다시 만들기 뒤 들려요" : "보정 후 선(하늘색)에 바로 그려져요 · 진짜 소리는 완성본 다시 만들기 뒤";
      body.appendChild(tip);
    };
    el.querySelectorAll("[data-at]").forEach(x => x.onclick = (e) => { e.stopPropagation(); show(x.dataset.at); });
    el.querySelector(".advRst").onclick = (e) => { e.stopPropagation(); change(A, st, cv, () => { A.ne.notes = A.ne.notes.filter(x => !(near(x.t0, b.t0) && near(x.t1, b.t1))); }); show(st._advTab || "f"); };
    el.addEventListener("pointerdown", (e) => e.stopPropagation());
    box.appendChild(el); show(st._advTab || "f");
    return el;
  }


  // ── 치찰음·호흡(11/04 23:41 사용자: 멜로다인처럼 구분 · 구간 골라 위아래로 끌면 치찰음만 볼륨) ──
  // 서버(consonants.py)가 찾은 자리 = cv.uv [[t0,t1,"s"|"b"]] (화면 시간). 선생님 이름표 고침 = global.uv_fix, 구간 볼륨 = global.uv_gain
  const UV_NAME = { s: "치찰음", b: "호흡", n: "아님" };
  function uvList(cv, st) {
    let out = (cv && Array.isArray(cv.uv) ? cv.uv : []).filter(u => Array.isArray(u) && u[1] > u[0] && (u[2] === "s" || u[2] === "b")).map(u => [u[0], u[1], u[2], false]);
    const fx = st && st._adv ? (st._adv.ne.global.uv_fix || []) : (st && typeof st.advGet === "function" ? ((st.advGet() || {}).global || {}).uv_fix || [] : []);
    for (const f of fx) { if (!(f.t1 > f.t0)) continue; out = out.filter(u => u[1] <= f.t0 || u[0] >= f.t1); out.push([f.t0, f.t1, f.kind, true]); }
    return out.sort((a, b) => a[0] - b[0]);
  }
  function relabel(st, cv, u) {   // 빗금 톡: 치찰음 → 호흡 → 아님 → 치찰음
    const A = state(st), nx = { s: "b", b: "n", n: "s" }[u[2]] || "s";
    change(A, st, cv, () => { const g = A.ne.global, L = (g.uv_fix || []).filter(f => !(near(f.t0, u[0]) && near(f.t1, u[1]))); L.push({ t0: r2(u[0]), t1: r2(u[1]), kind: nx }); g.uv_fix = L; });
    return nx;
  }
  function uvSheet(host, st, cv, rg) {
    const A = state(st), a = Math.min(rg[0], rg[1]), b = Math.max(rg[0], rg[1]);
    document.getElementById("advUv")?.remove();
    const segs = uvList(cv, st).filter(u => u[2] !== "n" && u[1] > a && u[0] < b), ns = segs.filter(u => u[2] === "s").length, nb = segs.filter(u => u[2] === "b").length;
    const rule = () => (A.ne.global.uv_gain || []).find(r => near(r.t0, a) && near(r.t1, b));
    const val = (k) => (rule() || {})[k] || 0;
    const set = (k, v) => change(A, st, cv, () => { const g = A.ne.global; g.uv_gain = g.uv_gain || []; let r = rule(); if (!r) { r = { t0: r2(a), t1: r2(b), s_db: 0, b_db: 0 }; g.uv_gain.push(r); } r[k] = v; });
    let kind = ns || !nb ? "s_db" : "b_db";
    const fmt = (v) => `${v > 0 ? "+" : ""}${Math.round(v)}dB`, lim = { s_db: [-18, 9], b_db: [-24, 9] };
    const d = document.createElement("div"); d.id = "advUv"; d.className = "advG";
    const mm = (x) => `${Math.floor(x / 60)}:${String(Math.floor(x % 60)).padStart(2, "0")}.${Math.floor((x % 1) * 10)}`;
    d.innerHTML = `<div class="advGBox" role="dialog" aria-label="치찰음·호흡 볼륨"><div class="advGHd"><b>🌬 ${mm(a)}~${mm(b)}</b><span class="advGN">치찰음 ${ns}곳 · 호흡 ${nb}곳</span><button type="button" class="advX" aria-label="닫기">✕</button></div>
      <div class="advChips" style="margin:8px 0"><button type="button" data-k="s_db">ㅅ·ㅊ 치찰음</button><button type="button" data-k="b_db">숨소리</button></div>
      <div class="advPad" role="slider" aria-label="위아래로 끌어 크기 조절" tabindex="0"><b class="advPadV"></b><small>↕ 위아래로 끌기 · 두 번 톡 = 0dB</small></div>
      <div class="advBody"></div>
      <p class="advTip">고른 구간 안의 그 소리만 크게·작게(다른 소리는 그대로) · 빗금을 톡 하면 이름이 바뀌어요(치찰음 → 호흡 → 아님) · 진짜 소리는 완성본 다시 만들기 뒤</p></div>`;
    const pad = d.querySelector(".advPad"), pv = d.querySelector(".advPadV"), body = d.querySelector(".advBody");
    const row = stepper("크기", () => val(kind), (v) => set(kind, v), { step: 1, min: -24, max: 9, def: 0, fmt });
    body.appendChild(row);
    const paint = () => { pv.textContent = `${kind === "s_db" ? "치찰음" : "숨소리"} ${fmt(val(kind))}`; d.querySelectorAll("[data-k]").forEach(x => x.classList.toggle("on", x.dataset.k === kind)); row._paint(); };
    d.querySelectorAll("[data-k]").forEach(x => x.onclick = (e) => { e.stopPropagation(); kind = x.dataset.k; paint(); });
    let dr = null, lastTap = 0;
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); e.stopPropagation(); try { pad.setPointerCapture(e.pointerId); } catch {} dr = { y: e.clientY, v: val(kind), moved: false };
      const now = Date.now(); if (now - lastTap < 320) { set(kind, 0); paint(); dr = null; } lastTap = now; });
    pad.addEventListener("pointermove", (e) => { if (!dr) return; const dv = Math.round((dr.y - e.clientY) / 12), [lo, hi] = lim[kind], v = Math.max(lo, Math.min(hi, dr.v + dv));
      if (Math.abs(dr.y - e.clientY) > 4) dr.moved = true; if (v !== val(kind)) { set(kind, v); paint(); } });
    ["pointerup", "pointercancel"].forEach(ev => pad.addEventListener(ev, () => { dr = null; }));
    const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => { d.remove(); st.uvSel = null; }) : { close: () => { d.remove(); st.uvSel = null; } };
    d.querySelector(".advX").onclick = () => ly.close();
    d.addEventListener("click", (e) => { if (e.target === d) ly.close(); });
    d.addEventListener("pointerdown", (e) => e.stopPropagation());
    host.appendChild(d); paint();
    return d;
  }
  // ── 곡 전체(전체화면 위 '🎛 곡 전체') ──
  function globalSheet(host, st, cv) {
    const A = state(st), g = () => A.ne.global;
    document.getElementById("advG")?.remove();
    const d = document.createElement("div"); d.id = "advG"; d.className = "advG";
    d.innerHTML = `<div class="advGBox" role="dialog" aria-label="일괄 보정"><div class="advGHd"><b>🎛 일괄 보정</b><span class="advGN"></span><button type="button" class="advX" aria-label="닫기">✕</button></div><div class="advBody"></div>
      <div class="advGBtns"><button type="button" data-g="undo">↶ 한 단계 되돌리기</button><button type="button" data-g="midi">🎹 MIDI 내보내기</button><button type="button" data-g="reset">디테일 보정 전부 원래대로</button></div>
      <p class="advTip">보컬·MR 두 파일로 올린 곡은 완성본을 다시 만들면 보정된 보컬만 담긴 WAV(24bit)도 드라이브 작업 폴더에 생겨요(vocal_tuned.wav).</p></div>`;
    const body = d.querySelector(".advBody"), G_ = (k, dft) => (g()[k] != null ? g()[k] : dft);
    const put = (k, v) => change(A, st, cv, () => { g()[k] = v; });
    const putLv = (k, v) => change(A, st, cv, () => { g().level = Object.assign({ quiet: 0, loud: 0 }, g().level || {}); g().level[k] = v; });
    const rows = [
      stepper("자동 보정 강도", () => G_("strength", 1), (v) => put("strength", v), { step: 0.1, min: 0, max: 1.5, def: 1, fmt: pct }),
      D(stepper("가까운 음은 그대로", () => G_("near", 8), (v) => put("near", v), { step: 2, min: 0, max: 50, def: 8, fmt: (v) => `${Math.round(v)}센트 안` }), "자동 보정할 때, 목표 음에서 이 값(센트·100센트=반음 1개) 안쪽으로 이미 가까운 곳은 건드리지 않아요. 크게 하면 자연스럽지만 덜 맞고, 0이면 전부 딱 맞춰요."),
      D(stepper("느린 흐름(전체)", () => G_("flat", 1), (v) => put("flat", v), { step: 0.25, min: 0, max: 2, def: 1, fmt: pct }), "음 하나 안에서 천천히 오르내리는 음정의 흔들림(비브라토보다 느린 변화)을 얼마나 남길지. 100% 그대로 · 0% 평평하게(깔끔·기계적) · 200% 두 배."),
      stepper("작은 음 키우기", () => (g().level || {}).quiet || 0, (v) => putLv("quiet", v), { step: 0.1, min: 0, max: 1, def: 0, fmt: (v) => (v > 0 ? "+" : "") + pct(v) }),
      stepper("큰 음 줄이기", () => (g().level || {}).loud || 0, (v) => putLv("loud", v), { step: 0.1, min: 0, max: 1, def: 0, inv: true, fmt: (v) => (v > 0 ? "−" : "") + pct(v) }),
      stepper("치찰음(ㅅ·ㅊ)", () => G_("sib_db", 0), (v) => put("sib_db", v), { step: 1, min: -12, max: 6, def: 0, fmt: (v) => `${v > 0 ? "+" : ""}${Math.round(v)}dB` }),
      D(stepper("포먼트(목소리 결)", () => G_("formant", 0), (v) => put("formant", v), { step: 0.25, min: -3, max: 3, def: 0, fmt: (v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}반음` }), "포먼트 = 목소리의 울림 통로. 음정은 그대로 두고 음색만 이동. + 는 얇고 밝은 느낌, − 는 굵고 어두운 느낌. 그림에는 안 보이고 완성본에서 들어 보세요.")];
    rows.forEach(r => { if (!r._desc) { body.appendChild(r); return; } const w = document.createElement("div"), p = document.createElement("p"); p.className = "advD"; p.textContent = r._desc; w.appendChild(r); w.appendChild(p); body.appendChild(w); });
    const cnt = () => { d.querySelector(".advGN").textContent = `음 ${A.ne.notes.length}개 고침`; rows.forEach(r => r._paint && r._paint()); };
    cnt();
    const ly = G.Brand && G.Brand.layer ? G.Brand.layer(() => d.remove()) : { close: () => d.remove() };
    d.querySelector(".advX").onclick = () => ly.close();
    d.addEventListener("click", (e) => { if (e.target === d) ly.close(); });
    d.addEventListener("pointerdown", (e) => e.stopPropagation());
    d.querySelectorAll("[data-g]").forEach(x => x.onclick = (e) => { e.stopPropagation();
      if (x.dataset.g === "undo") { if (!undo(A, st, cv)) x.textContent = "↶ 되돌릴 게 없어요"; else x.textContent = "↶ 한 단계 되돌리기"; cnt(); }
      if (x.dataset.g === "reset") change(A, st, cv, () => { A.ne = { notes: [], global: {} }; }), cnt();
      if (x.dataset.g === "midi") midiDownload(cv, st.title || "보컬"); });
    host.appendChild(d);
  }

  // ── MIDI 내보내기: 정음(목표음) 덩어리 = 음 하나 · 120BPM 480틱(초 = 960틱) ──
  function notesFromCurve(cv) {
    const kt = cv.target ? 2 + (cv.levels || []).length : 0, P = cv.pts || [], out = [];
    if (!kt) return out;
    let cur = null;
    for (const p of P) {
      const v = p[kt]; const m = v == null ? null : Math.round(v / 100);
      if (cur && (m !== cur.m || p[0] - cur.t1 > 0.06)) { if (cur.t1 - cur.t0 >= 0.06) out.push(cur); cur = null; }
      if (m != null && m >= 0 && m <= 127) { if (!cur) cur = { m, t0: p[0], t1: p[0] + 0.01 }; else cur.t1 = p[0] + 0.01; }
    }
    if (cur && cur.t1 - cur.t0 >= 0.06) out.push(cur);
    return out;
  }
  function midiBytes(notes) {
    const ev = [], tk = (s) => Math.round(s * 960);
    notes.forEach(n => { ev.push([tk(n.t0), 0x90, n.m, 90]); ev.push([tk(n.t1), 0x80, n.m, 0]); });
    ev.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const vlq = (v) => { const b = [v & 0x7f]; while ((v >>= 7)) b.unshift((v & 0x7f) | 0x80); return b; };
    const trk = [0x00, 0xff, 0x51, 0x03, 0x07, 0xa1, 0x20];   // 120BPM
    let last = 0; ev.forEach(([t, s, m, v]) => { trk.push(...vlq(t - last), s, m, v); last = t; });
    trk.push(0x00, 0xff, 0x2f, 0x00);
    const u32 = (v) => [(v >>> 24) & 255, (v >>> 16) & 255, (v >>> 8) & 255, v & 255];
    return new Uint8Array([0x4d, 0x54, 0x68, 0x64, ...u32(6), 0, 0, 0, 1, 0x01, 0xe0, 0x4d, 0x54, 0x72, 0x6b, ...u32(trk.length), ...trk]);
  }
  function midiDownload(cv, title) {
    const notes = notesFromCurve(cv);
    if (!notes.length) { try { G.Tune && G.Tune.undo && G.Tune.undo("내보낼 음이 없어요"); } catch {} return; }
    const url = URL.createObjectURL(new Blob([midiBytes(notes)], { type: "audio/midi" })), a = document.createElement("a");
    a.href = url; a.download = `${String(title).replace(/[\\/:*?"<>|]/g, "_").slice(0, 60)}_음정.mid`; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  }

  // ── 스타일 ──
  const css = `.tfFix .tfA{display:none}.tfFix.amode .tfA{display:block}.tfFix.amode .tfP,.tfFix.amode .tfT{display:none!important}
#tuneFs .tfFixMd button[data-md="a"].on{background:#ffb86b!important;color:#2a1500!important}
.advPanel{margin-top:6px}.advTabs{display:flex;gap:6px;flex-wrap:wrap}.advTabs button{min-height:0!important;height:32px!important;padding:0 12px!important;margin:0!important;border-radius:17px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#cfd3da!important;font-size:13.5px!important;font-weight:800}
.advTabs button.on{background:#ffb86b!important;color:#2a1500!important;border-color:#ffb86b!important}.advTabs .advRst{margin-left:auto!important}
.advBody{margin-top:6px;display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:2px 10px}
.advPanel .advBody{max-height:min(30vh,210px);overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding-right:2px}
#tuneFs .tfFix.amode .tfFixBox{padding-top:6px!important;padding-bottom:6px!important}
.advD{margin:-2px 2px 6px;font-size:11px;line-height:1.4;color:#8a95a1}.advRow{display:flex;align-items:center;gap:6px;min-height:42px}.advL{flex:1;font-size:13.5px;color:#b6bdc7;white-space:nowrap}.advRow.on .advL{color:#ffb86b;font-weight:800}
.advB{min-height:0!important;width:44px;height:40px!important;padding:0!important;margin:0!important;border-radius:12px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#e8e8ea!important;font-size:20px!important;font-weight:900;touch-action:manipulation}
.advV{min-width:82px;text-align:center;font-weight:800;font-size:14px;color:#e8e8ea;font-variant-numeric:tabular-nums}
.advChips{display:flex;gap:6px}.advChips button{min-height:0!important;height:36px!important;padding:0 12px!important;margin:0!important;border-radius:12px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#cfd3da!important;font-size:13px!important;font-weight:800}.advChips button.on{background:#ffb86b!important;color:#2a1500!important;border-color:#ffb86b!important}
.advTip{grid-column:1/-1;margin:2px 0 0;font-size:11.5px;color:#7d8590;line-height:1.4}
.advG{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,.55);display:flex;align-items:flex-end;justify-content:center}.advGBox{width:min(760px,100%);max-height:86%;overflow:auto;box-sizing:border-box;background:#1a1e25;border:1.5px solid #3b4250;border-radius:18px 18px 0 0;padding:12px 14px calc(14px + env(safe-area-inset-bottom));color:#e8e8ea}
.advGHd{display:flex;align-items:center;gap:10px}.advGN{color:#9aa3ad;font-size:12.5px}.advX{margin-left:auto!important;min-height:0!important;height:34px!important;width:40px;padding:0!important;border-radius:12px!important;background:#11141a!important;border:1.5px solid #3b4250!important;color:#e8e8ea!important}
.advGBtns{display:flex;gap:8px;flex-wrap:wrap;margin-top:10px}.advGBtns button{flex:1;min-width:150px;min-height:0!important;height:44px!important;margin:0!important;border-radius:12px!important;border:1.5px solid #3b4250!important;background:#11141a!important;color:#e8e8ea!important;font-weight:800;font-size:14px!important}
.advPad{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;height:120px;border-radius:16px;border:1.5px dashed #ffb86b;background:#21170b;color:#ffcf99;touch-action:none;user-select:none;-webkit-user-select:none;cursor:ns-resize}.advPad b{font-size:22px}.advPad small{color:#b9a58a;font-size:12px}
#tuneFs .tfAdvG.on{background:#ffb86b!important;color:#2a1500!important}
#tuneFs .tfAdvG{margin:0 0 0 8px!important;min-height:0!important;height:28px!important;padding:0 11px!important;border-radius:14px!important;border:1.5px solid #ffb86b!important;background:#2a1a08!important;color:#ffcf99!important;font-size:12.5px!important;font-weight:800;white-space:nowrap}`;
  try { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s); } catch {}

  G.TuneAdv = { panel, globalSheet, preview, state, uvList, relabel, uvSheet, UV_NAME, undoLast: (st, cv) => undo(state(st), st, cv), _t: { shapeNote, notesFromCurve, midiBytes, clean, N_DEF } };
})(typeof window !== "undefined" ? window : globalThis);
