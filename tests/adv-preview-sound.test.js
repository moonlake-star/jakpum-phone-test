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
function build() {
  const pts = []; for (let k = 0; k < DUR * 25; k++) pts.push([k / 25, cents(220), cents(220)]);   // [시각, 부른 높이, 보정본 높이]
  const cv = { fps: 25, levels: [1], pts, target: null };
  const out = { cv, p0: voice(), p1: voice() };
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
console.log("adv-preview-sound ok");
// 연결: 저장(onAdv)·↶↷(histSet)할 때마다 소리를 다시 만들고, 전체화면에 '미리듣기(근사)' 표시
const tu = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(html.includes("const onAdv = async (ne) => { pvAdvSync(ne); try { pvApplyAll(); }") && html.includes("pvAdvSync(advGet()); await applyAll"), "고침·되돌리기 연결");
assert.ok(tu.includes("st.advBadge = () =>") && tu.includes("미리듣기 (근사)") && tu.includes('document.addEventListener("advpv"'), "근사 표시");
console.log("adv-preview-wiring ok");
