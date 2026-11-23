// (11/23 사용자 '유튜브 뮤직 원본보다 크고 찌그러짐 — 동일하게, 에이') 곡 재생 크기 = 유튜브 기준(BS.1770 · −14 LUFS · 원곡보다 크게 안 함)
const assert = require("assert"), fs = require("fs"), path = require("path");
const L = require(path.join(__dirname, "..", "loudnorm.js"));
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8"), S = fs.readFileSync(path.join(__dirname, "..", "student", "index.html"), "utf8");
(async () => {
  // K 가중 계수 = BS.1770 표(48 kHz)
  const c = L.kCoefs(48000), near = (a, b) => a.every((x, i) => Math.abs(x - b[i]) < 1e-7);
  assert.ok(near(c.s1, [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585]) && near(c.s2, [1, -2, 1, -1.99004745483398, 0.99007225036621]), "K 가중 계수");
  const fs_ = 48000, n = fs_ * 5, sine = (f, A, ch) => { const d = []; for (let k = 0; k < ch; k++) { const a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = A * Math.sin(2 * Math.PI * f * i / fs_); d.push(a); } return { sampleRate: fs_, numberOfChannels: ch, length: n, getChannelData: (k) => d[k] }; };
  const zero = { sampleRate: fs_, numberOfChannels: 1, length: n, getChannelData: () => new Float32Array(n) };
  const z = await L.analyze(zero);
  const m0 = await L.analyze(sine(997, 1, 1)); assert.ok(Math.abs(L.lufs(m0, z, 1) - 0) < 0.02, "0 dBFS 997 Hz 모노 = 표준 −3.01 LUFS + 3.01(양쪽 스피커로 나감) = 0");
  const st0 = await L.analyze(sine(997, 1, 2)); assert.ok(Math.abs(L.lufs(st0, z, 1) - 0) < 0.02, "0 dBFS 997 Hz 스테레오 = 0 LUFS(표준)");
  const loud = await L.analyze(sine(997, 0.5, 2)); const gl = 20 * Math.log10(L.gain(loud, z, 1));
  assert.ok(Math.abs(gl + 9.98 + L.MAKEUP_DB) < 0.05 && L.TARGET === -16 && Math.abs(L.MAKEUP_DB - 0.57) < 0.01, "−6 LUFS 곡 → −14로 줄임(압축기 메이크업 +0.57 dB 미리 뺌): " + gl);
  const quiet = await L.analyze(sine(997, 0.05, 2)); assert.ok(Math.abs(20 * Math.log10(L.gain(quiet, z, 1)) + L.MAKEUP_DB) < 1e-9, "작은 곡은 원곡 그대로(유튜브처럼 키우지 않음)");
  const voc = await L.analyze(sine(440, 0.05, 2));   // 원곡(반주+보컬)이 −14보다 작은 곡
  const gq = L.gain(quiet, voc, 0.3); assert.ok(gq > 1 && Math.abs(L.lufs(quiet, voc, 0.3) + 20 * Math.log10(gq) + L.MAKEUP_DB - L.lufs(quiet, voc, 1)) < 0.05, "보컬 30%: 원곡 크기로 되돌림");
  const big = await L.analyze(sine(997, 0.8, 2)), vb = await L.analyze(sine(440, 0.7, 2));
  for (const g of [0, 0.3, 0.6, 1]) assert.ok(L.peak(big, vb, g) * L.gain(big, vb, g) * 10 ** (L.MAKEUP_DB / 20) <= L.CEIL + 1e-9, "어떤 보컬 크기에서도 −1 dBFS를 넘기지 않음 g=" + g);
  // 교차항: 같은 소리를 반주·보컬로 반씩 나눈 경우(완전 상관) — 합친 크기 = 원곡(0.5+0.5=1) 그대로 재야 함
  const half = await L.analyze(sine(997, 0.25, 2)), whole = await L.analyze(sine(997, 0.5, 2));
  assert.ok(Math.abs(L.lufs(half, half, 1) - L.lufs(whole, z, 1)) < 0.05, "상관 있는 두 트랙 합 = 원곡 크기(교차항 반영)");
  // 모노 트랙은 양쪽으로 나가므로 스테레오 같은 소리와 같은 크기
  assert.ok(Math.abs(L.lufs(await L.analyze(sine(997, 0.5, 1)), z, 1) - L.lufs(whole, z, 1)) < 0.05, "모노 = 같은 스테레오");
  // 연결: 두 앱 모두 loudnorm.js 사용, 예전 lift×comp(최대 +16.5 dB) 없음
  for (const src of [T, S]) {
    assert.ok(src.includes('<script src="../loudnorm.js?v=') && src.includes("G.Loud.gain(EN.m, EN.v, vol / 100)") && !/const lift = \(\) =>/.test(src) && !/const comp = \(\) =>/.test(src));
    assert.ok(src.includes("try { EN = await energy(m, v); }") && src.includes("lim.threshold.value = -1;") && !src.includes("setMaster(0.05)"), "분석은 디코드 뒤 · 안전 리미터 유지 · 슬라이더 시정수 통일");
  }
  assert.ok(T.includes("let st = null; try { st = G.Loud ? await G.Loud.analyze(buf, { dead: () => dead }) : null; }") && T.includes("EN = m.st && v.st ? { m: m.st, v: v.st } : null;"), "키·속도 엔진도 같은 기준");
  console.log("stem-loud ok");
})().catch((e) => { console.error(e); process.exit(1); });
// (11/23 사용자 '저음이 적고 날카로움') 음악 재생 장치는 일반 재생 경로(latencyHint: playback)로 엶 — 곡 서랍·레슨 재생·메이크업
{ const fs2 = require("fs"), T2 = fs2.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S2 = fs2.readFileSync(__dirname + "/../student/index.html", "utf8");
  for (const src of [T2, S2]) require("assert").ok(src.includes('function musicCtx(AC) {') && src.includes('latencyHint: "playback"') && src.includes("ctx ||= musicCtx(AC);"));
  require("assert").ok(T2.includes("mkCtx ??= musicCtx()") && T2.includes('loudCtx = new AC({ latencyHint: "playback" })') && !/mkCtx \?\?= new AudioContext\(\)/.test(T2)); }
