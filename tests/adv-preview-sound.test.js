// (11/06 사용자 '수정한 사운드를 재생하면 바로 들어볼 수 있게') 디테일 보정 미리듣기: 폰 안 PSOLA로 높이·볼륨이 실제로 바뀌는지 합성 목소리로 잼
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = html.indexOf("let mkPv = {"), b = html.indexOf("// (11/03 11:13 사용자) 멜로다인처럼");
assert.ok(a > 0 && b > a, "미리듣기 코드 위치");
const code = html.slice(a, b);
globalThis.window = globalThis; require("../adv.js");   // 하늘색 선 미리보기(adv.js)를 그대로 씀
const SR = 24000, DUR = 3, N = SR * DUR;
const mkBuf = (ch) => ({ sampleRate: SR, length: ch.length, numberOfChannels: 1, getChannelData: () => ch });
const voice = () => { const y = new Float32Array(N); let ph = 0; for (let i = 0; i < N; i++) { ph += 2 * Math.PI * 220 / SR; let v = 0; for (let k = 1; k <= 8; k++) v += Math.sin(k * ph) / k; y[i] = 0.2 * v; } return y; };
const cents = (hz) => 6900 + 1200 * Math.log2(hz / 440);
function build(vf = voice) {
  const pts = []; for (let k = 0; k < DUR * 25; k++) pts.push([k / 25, cents(220), cents(220)]);   // [시각, 부른 높이, 보정본 높이]
  const cv = { fps: 25, levels: [1], pts, target: null };
  const out = { cv, p0: vf(), p1: vf() };
  const env = { mkTracks: { p0: { buf: mkBuf(out.p0) }, p1: { buf: mkBuf(out.p1) } }, mkPv: null, mkDurS: DUR, Tune: { col: () => 2, tmapOf: () => null, mapT: (x) => x }, mkPlaying: false };
  const f = new Function("env", `with (env) { ${code}\n env.mkPv = mkPv; env.pvApply = pvApply; env.pvAdvPlan = pvAdvPlan; env.setPv = (o) => { mkPv = o; env.mkPv = o; }; }`); f(env);
  env.setPv({ fixes: [], rendered: () => null, orig: {}, cv, tedits: [], tplan: { sig: "", regs: [] }, adv: null });
  return { env, ...out };
}
function f0Of(y, t0, t1) {   // 자기상관으로 높이(Hz)
  const i0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR); let best = 0, bl = 0;
  for (let L = Math.round(SR / 500); L <= Math.round(SR / 100); L++) { let s = 0, e1 = 0, e2 = 0; for (let i = 0; i < n - L; i++) { s += y[i0 + i] * y[i0 + i + L]; e1 += y[i0 + i] ** 2; e2 += y[i0 + i + L] ** 2; } const r = s / Math.sqrt(e1 * e2 + 1e-12); if (r > best) { best = r; bl = L; } }
  return SR / bl;
}
const rms = (y, t0, t1) => { let s = 0, c = 0; for (let i = Math.round(t0 * SR); i < Math.round(t1 * SR); i++) { s += y[i] ** 2; c++; } return Math.sqrt(s / c); };
const sameAdv = (env, notes) => { const ne = { notes, global: {} }; env.mkPv.adv = notes; G_preview(env.mkPv.cv, ne); };
const G_preview = (cv, ne) => globalThis.TuneAdv.preview(cv, ne);

// ① 안 고쳤으면 소리 그대로
{ const { env, p1 } = build(), before = Float32Array.from(p1); env.pvApply("p1"); assert.deepStrictEqual(Array.from(p1.slice(0, 1000)), Array.from(before.slice(0, 1000))); }
// ② 무음: 그 음만 조용해지고 앞뒤는 그대로
{ const { env, p1 } = build(), before = Float32Array.from(p1); sameAdv(env, [{ t0: 1.0, t1: 1.8, mute: true }]); env.pvApply("p1");
  assert.ok(rms(p1, 1.1, 1.7) < 0.01 * rms(before, 1.1, 1.7), "무음"); assert.ok(Math.abs(rms(p1, 0.2, 0.8) - rms(before, 0.2, 0.8)) < 1e-4, "앞은 그대로"); assert.ok(Math.abs(rms(p1, 2.1, 2.8) - rms(before, 2.1, 2.8)) < 1e-4, "뒤는 그대로"); }
// ③ 볼륨 −6dB ≈ 절반
{ const { env, p1 } = build(), before = Float32Array.from(p1); sameAdv(env, [{ t0: 1.0, t1: 1.8, gain_db: -6 }]); env.pvApply("p1");
  const r = rms(p1, 1.2, 1.6) / rms(before, 1.2, 1.6); assert.ok(r > 0.47 && r < 0.53, "−6dB " + r); }
// ④ 앞 기울기 +100센트는 소리 높이가 시작에서 올라감(시작 쪽이 끝 쪽보다 높음), 흐름 0이면 그대로
{ const { env, p1 } = build(), before = Float32Array.from(p1); sameAdv(env, [{ t0: 1.0, t1: 1.8, tilt_in: 200 }]); env.pvApply("p1");
  const f1 = f0Of(p1, 1.02, 1.12), f2 = f0Of(p1, 1.6, 1.7), fo = f0Of(before, 1.02, 1.12);
  assert.ok(1200 * Math.log2(f1 / fo) > 80, "앞이 올라감 " + (1200 * Math.log2(f1 / fo)).toFixed(0)); assert.ok(Math.abs(1200 * Math.log2(f2 / fo)) < 25, "뒤는 그대로"); }
// ⑤ 같은 고침을 또 적용해도(저장 때마다 불림) 소리가 쌓이지 않음 · 되돌리면 원래 소리
{ const { env, p1 } = build(), before = Float32Array.from(p1); sameAdv(env, [{ t0: 1.0, t1: 1.8, gain_db: -6 }]); env.pvApply("p1"); const once = Float32Array.from(p1);
  env.pvApply("p1"); assert.deepStrictEqual(Array.from(p1.slice(30000, 30100)), Array.from(once.slice(30000, 30100)), "한 번만 적용");
  sameAdv(env, []); env.pvApply("p1"); assert.ok(Math.abs(rms(p1, 1.2, 1.6) - rms(before, 1.2, 1.6)) < 1e-6, "원래 소리로"); }
// ⑥ 음별 음색: 목소리 결(공명 봉우리)만 옮기고 높이·길이는 그대로, 그 음 밖은 그대로
{ const P = 120, y0 = () => { const y = new Float32Array(N), F = 1000, bw = 150, r0 = Math.exp(-Math.PI * bw / SR), a1 = -2 * r0 * Math.cos(2 * Math.PI * F / SR), a2 = r0 * r0; let p1 = 0, p2 = 0;
    for (let i = 0; i < N; i++) { const v = (i % P === 0 ? 1 : 0) - a1 * p1 - a2 * p2; y[i] = v; p2 = p1; p1 = v; } let m = 0; for (const v of y) m = Math.max(m, Math.abs(v)); for (let i = 0; i < N; i++) y[i] *= 0.5 / m; return y; };   // 200Hz 펄스 → 1000Hz 공명
  const hk = (y, t0, t1) => { const i0 = Math.round(t0 * SR), n = Math.round((t1 - t0) * SR); let bk = 0, bv = 0;   // 200Hz 배음 중 가장 센 번호
    for (let k = 1; k <= 14; k++) { let re = 0, im = 0; for (let i = 0; i < n; i++) { const ph = 2 * Math.PI * 200 * k * i / SR; re += y[i0 + i] * Math.cos(ph); im += y[i0 + i] * Math.sin(ph); } const m = Math.hypot(re, im); if (m > bv) { bv = m; bk = k; } } return bk; };
  const base = hk(y0(), 1.2, 1.6); assert.strictEqual(base, 5, "처음 봉우리 5번째 배음(1000Hz) " + base);
  for (const [semi, lo, hi] of [[3, 6, 7], [-3, 4, 4]]) { const { env, p1 } = build(y0), before = Float32Array.from(p1); sameAdv(env, [{ t0: 1.0, t1: 1.8, formant: semi }]); env.pvApply("p1");
    const k = hk(p1, 1.2, 1.6); if (process.env.DBG) console.log("semi", semi, "peak", k, "f0", f0Of(p1,1.2,1.6).toFixed(1)); assert.ok(k >= lo && k <= hi, "음색 " + semi + " → 봉우리 " + k);
    const f = f0Of(p1, 1.2, 1.6); assert.ok(Math.abs(1200 * Math.log2(f / 200)) < 25, "높이 그대로 " + f.toFixed(1));
    assert.ok(rms(p1, 1.2, 1.6) / rms(before, 1.2, 1.6) > 0.5 && rms(p1, 1.2, 1.6) / rms(before, 1.2, 1.6) < 2, "크기 비슷");
    assert.strictEqual(hk(p1, 0.2, 0.7), 5, "앞은 그대로"); assert.strictEqual(hk(p1, 2.1, 2.6), 5, "뒤는 그대로"); assert.ok(Math.abs(rms(p1, 0.2, 0.8) - rms(before, 0.2, 0.8)) < 1e-4, "앞 크기 그대로");
    env.pvApply("p1"); sameAdv(env, []); env.pvApply("p1"); assert.ok(Math.abs(rms(p1, 1.2, 1.6) - rms(before, 1.2, 1.6)) < 1e-6, "되돌리면 원래"); } }
console.log("adv-preview-sound ok");
// 연결: 저장(onAdv)·↶↷(histSet)할 때마다 소리를 다시 만들고, 전체화면에 '미리듣기(근사)' 표시
const tu = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(html.includes("const onAdv = async (ne) => { pvAdvSync(ne); try { pvApplyAll(); }") && html.includes("pvAdvSync(advGet()); await applyAll"), "고침·되돌리기 연결");
assert.ok(tu.includes("st.advBadge = () =>") && tu.includes("미리듣기 (근사)") && tu.includes('document.addEventListener("advpv"'), "근사 표시");
console.log("adv-preview-wiring ok");
// 안내: 탭 설명 줄 + 배지를 누르면 팝업 / 속도 재기 화면은 앱과 같은 합성 코드를 씀
const ad = fs.readFileSync(__dirname + "/../adv.js", "utf8"), bn = fs.readFileSync(__dirname + "/../bench/index.html", "utf8");
assert.ok(ad.includes("음색은 ▶로 서버와 같은 소리가 들려요") && ad.includes("칸을 누르면 여기에 그 칸 설명이 나와요") && ad.includes("일괄 보정은 폰에서 못 들려줘요"), "탭 안 안내");
assert.ok(tu.includes("st.advPvInfo = () =>") && tu.includes("미리듣기는 대략의 소리예요") && tu.includes("서버와 같은 엔진") && tu.includes("el.onclick = () => st.advPvInfo()"), "배지 팝업");
const fnSrc = (t, n) => t.slice(t.indexOf("function " + n + "("), t.indexOf("\n}\n", t.indexOf("function " + n + "(")));
assert.strictEqual(fnSrc(bn, "pvPsola"), fnSrc(html, "pvPsola"), "속도 재기 = 앱 합성 코드");
assert.strictEqual(fnSrc(bn, "pvMarks"), fnSrc(html, "pvMarks"), "속도 재기 = 앱 분석 코드");
console.log("adv-preview-notice ok");
// ⑨ (11/06 22:13 사용자) 펜으로 그린 구간도 소리가 바뀜(예전엔 선만 바뀌고 소리는 그대로)
{ const { env, p1 } = build(), before = Float32Array.from(p1);
  const ne = { notes: [], global: { draw: [{ t0: 1.0, t1: 1.8, pts: [[1.0, cents(220) + 300], [1.8, cents(220) + 300]] }] } };
  env.mkPv.adv = []; env.mkPv.advG = ne.global; G_preview(env.mkPv.cv, ne); env.pvApply("p1");
  const d = 1200 * Math.log2(f0Of(p1, 1.3, 1.5) / f0Of(before, 1.3, 1.5));
  assert.ok(d > 200, "펜 구간 소리 높이 " + d.toFixed(0)); assert.ok(Math.abs(rms(p1, 0.2, 0.8) - rms(before, 0.2, 0.8)) < 1e-4, "앞은 그대로");
  console.log("pen draw sound ok", d.toFixed(0)); }
