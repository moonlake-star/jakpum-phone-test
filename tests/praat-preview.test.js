// 앱 미리듣기(pvApply)가 Praat(서버와 같은 엔진)으로 고친 음을 다시 만드는지: 서버 기준 자료(합성 목소리)로
const fs = require("fs"), assert = require("assert"), path = require("path");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), a = html.indexOf("let mkPv = {"), b = html.indexOf("// (11/03 11:13 사용자) 멜로다인처럼");
globalThis.window = globalThis; require("../adv.js");
const Core = require("../praat/praat-core.js"), factory = require("../praat/praat_web.js"), F = path.join(__dirname, "fixtures/praat/");
const rd = (f) => { const u = fs.readFileSync(F + f), v = new DataView(u.buffer, u.byteOffset, u.byteLength); let p = 12; while (String.fromCharCode(u[p], u[p + 1], u[p + 2], u[p + 3]) !== "data") p += 8 + v.getUint32(p + 4, true); const n = v.getUint32(p + 4, true) >> 1, y = new Float32Array(n); for (let i = 0; i < n; i++) y[i] = v.getInt16(p + 8 + i * 2, true) / 32768; return y; };
const ref = JSON.parse(fs.readFileSync(F + "ref.json", "utf8")), SR = ref.sr, buf = (ch) => ({ sampleRate: SR, length: ch.length, numberOfChannels: 1, getChannelData: () => ch });
(async () => {
  await Core.init(fs.readFileSync(path.join(__dirname, "../praat/praat_web.wasm.gz")), factory);
  const p0 = rd("in.wav"), p1 = rd("server_out.wav"), before = Float32Array.from(p1), cv = JSON.parse(JSON.stringify(ref.curve));
  const env = { mkTracks: { p0: { buf: buf(p0) }, p1: { buf: buf(p1) } }, mkPv: null, mkDurS: 4, Tune: { col: () => 2, tmapOf: () => null, mapT: (x) => x }, mkPlaying: false, PraatCore: Core, PraatModule: factory, document: { dispatchEvent() {} }, Event: function () {} };
  new Function("env", `with (env) { ${html.slice(a, b)}\n env.pvApply = pvApply; env.PVP = PVP; env.setPv = (o) => { mkPv = o; env.mkPv = o; }; }`)(env);
  env.setPv({ fixes: [{ t0: 1.05, t1: 1.85, midi: 65 }], rendered: () => null, orig: {}, cv, tedits: [], tplan: { sig: "", regs: [] }, adv: null });   // 선생님이 둘째 음(E4)을 F4(65)로 고침
  // ① 간이 소리를 먼저 들려주지 않음: 서버와 같은 소리가 준비될 때까지 소리 그대로(바뀐 게 없음) → 준비되면 바꿔 끼움
  assert.strictEqual(env.pvApply("p1"), false, "준비 전엔 그대로"); let same = true; for (let i = 0; i < p1.length; i++) if (p1[i] !== before[i]) { same = false; break; } assert.ok(same, "준비 전엔 간이 소리를 끼우지 않음");
  assert.ok(env.PVP.busy() || env.PVP.state === "ready", "준비 중 표시"); await env.PVP.p; env.pvApply("p1"); assert.ok(env.PVP.busy(), "구간 만드는 중"); await Promise.all(env.PVP.jobs); await new Promise((r) => setTimeout(r, 20));
  assert.strictEqual(env.PVP.state, "ready", "Praat 준비"); assert.ok(!env.PVP.busy(), "다 만들었음"); for (const o of Object.values(env.mkPv.orig)) o.sig = "?"; assert.ok(env.pvApply("p1"), "Praat 소리로 바꿔 끼움");
  const med = async (y, t0, t1) => { const A = await Core.analyze(y.slice(Math.round(t0 * SR), Math.round(t1 * SR)), SR), c = Array.from(A.f, (f) => 1200 * Math.log2(f / 440) + 6900).sort((x, y2) => x - y2); return c[c.length >> 1]; };
  const m0 = await med(before, 1.2, 1.7), m1 = await med(p1, 1.2, 1.7);   // 고친 음: E4(64)+30센트 → 정음 F4(65) 쪽으로
  console.log("고친 음 중앙 높이(센트): 전", m0.toFixed(0), "→ 후", m1.toFixed(0), "(정음 6500)"); assert.ok(Math.abs(m1 - 6500) < 20 && Math.abs(m0 - 6500) > 50, "정음으로 옮겨짐");
  let far = 0; for (let i = 0; i < Math.round(0.8 * SR); i++) far = Math.max(far, Math.abs(p1[i] - before[i])); for (let i = Math.round(2.2 * SR); i < p1.length; i++) far = Math.max(far, Math.abs(p1[i] - before[i]));
  assert.ok(far < 1e-6, "고친 곳 밖은 그대로 " + far);
  // ② 같은 고침을 또 적용해도 소리가 쌓이지 않음 · 고침을 지우면 원래 소리
  const once = Float32Array.from(p1); env.pvApply("p1"); assert.deepStrictEqual(Array.from(p1.slice(30000, 30050)), Array.from(once.slice(30000, 30050)), "한 번만 적용");
  env.mkPv.fixes = []; env.pvApply("p1"); let d = 0; for (let i = 0; i < p1.length; i++) d = Math.max(d, Math.abs(p1[i] - before[i])); assert.ok(d < 1e-6, "지우면 원래 소리 " + d);
  // ③ 음별 음색·볼륨: 트랙(서버가 이미 고침을 구워 둔 소리)에 또 얹지 않고, 원래 소리(p0)에서 서버와 같은 차례로 다시 만들어 끼움
  const post = rd("server_post.wav"), t3 = Float32Array.from(post), pre3 = Float32Array.from(post), cv3 = JSON.parse(JSON.stringify(ref.curve));
  env.mkTracks.p1 = { buf: buf(t3) };
  env.setPv({ fixes: [], rendered: () => null, orig: {}, cv: cv3, tedits: [], tplan: { sig: "", regs: [] }, adv: ref.ne.notes.map((n) => ({ ...n })), advG: {} });
  env.pvApply("p1"); await Promise.all(env.PVP.jobs); await new Promise((r) => setTimeout(r, 20)); for (const o of Object.values(env.mkPv.orig)) o.sig = "?"; assert.ok(env.pvApply("p1"), "음색·볼륨 소리로 끼움");
  const rms = (y, t0, t1) => { let q = 0; const i0 = Math.round(t0 * SR), i1 = Math.round(t1 * SR); for (let i = i0; i < i1; i++) q += y[i] * y[i]; return Math.sqrt(q / (i1 - i0)); }, dB = (a, b) => 20 * Math.log10((a + 1e-9) / (b + 1e-9));
  const e1 = dB(rms(t3, 1.2, 1.7), rms(pre3, 1.2, 1.7)), e2 = dB(rms(t3, 2.2, 2.3), rms(pre3, 2.2, 2.3)); console.log("음별 볼륨(서버 대비 dB):", e1.toFixed(2), e2.toFixed(2), "끈 음 소리 크기", rms(t3, 3.05, 3.25).toExponential(1));
  assert.ok(Math.abs(e1) < 1, "−4 dB가 두 번 걸리지 않음 " + e1); assert.ok(Math.abs(e2) < 1, "페이드 가운데 소리 크기 " + e2); assert.ok(rms(t3, 3.05, 3.25) < 1e-4, "끈 음은 조용");
  const cen = (y, t0, t1) => { const A = Array.from(y.slice(Math.round(t0 * SR), Math.round(t1 * SR))), N = 4096; let sw = 0, s = 0; for (let k = 1; k < 200; k++) { let re = 0, im = 0; for (let i = 0; i < N && i < A.length; i++) { const w = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N), a = 2 * Math.PI * k * 20 * i / SR; re += A[i] * w * Math.cos(a); im -= A[i] * w * Math.sin(a); } const m = Math.hypot(re, im); sw += m * k * 20; s += m; } return sw / s; };
  const c1 = cen(t3, 1.2, 1.7), c2 = cen(pre3, 1.2, 1.7); console.log("음색 무게중심(Hz) 폰/서버:", c1.toFixed(0), c2.toFixed(0)); assert.ok(Math.abs(c1 / c2 - 1) < 0.06, "음색이 서버와 비슷 " + c1 / c2);
  let far3 = 0; for (let i = 0; i < Math.round(0.9 * SR); i++) far3 = Math.max(far3, Math.abs(t3[i] - pre3[i])); assert.ok(far3 < 1e-6, "고친 곳 밖은 그대로");
  console.log("praat-preview ok");
})().catch((e) => { console.error(e); process.exit(1); });
