// (11/23 사용자 '메이크업도 곡 서랍처럼 볼륨 비슷하게, 맥시마이저 겹치지 않게') 메이크업 재생: 반주+보컬을 BS.1770으로 재서 −14 LUFS로(올림 최대 +12, 큰 건 줄임) → 안전 제한기(−1 dBFS) 하나
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const Loud = require(path.join(__dirname, "..", "loudnorm.js"));
const blk = T.slice(T.indexOf("let mkMaster = null;"), T.indexOf("async function mkLoad(name, fileId) {"));
class P { constructor() { this.value = 1; } cancelScheduledValues() {} setTargetAtTime(v) { this.value = v; } }
const mkCtx = { currentTime: 0, destination: {}, createGain() { const g = { gain: new P(), connect(t) { this.to = t; } }; g.context = mkCtx; return g; }, createDynamicsCompressor() { const c = { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect(t) { this.to = t; } }; mkCtx.lim = c; return c; } };
const buf = (amp) => { const n = 48000 * 3, a = new Float32Array(n); for (let i = 0; i < n; i++) a[i] = amp * Math.sin(2 * Math.PI * 997 * i / 48000); return { sampleRate: 48000, length: n, numberOfChannels: 2, getChannelData: () => a }; };
const run = async (mr, voc) => { const mkPv = {}, mkTracks = { mr: { buf: buf(mr) }, p0: { buf: buf(voc) } }; const api = new Function("mkCtx", "mkTracks", "mkPv", "Loud", blk + "; return { go: mkAutoGain, m: () => mkBus(), mkPv };")(mkCtx, mkTracks, mkPv, Loud); await api.go(); return api; };
(async () => {
  const mk = Loud.MAKEUP_DB;
  { const r = await run(0.01, 0.0); assert.ok(Math.abs(r.mkPv.autoDb + mk - 12) < 0.2, "아주 작은 완성본 → 최대 +12 dB " + r.mkPv.autoDb); }
  { const r = await run(0.05, 0.05); const L = Loud.lufs(await Loud.analyze(buf(0.05)), await Loud.analyze(buf(0.05)), 1); assert.ok(Math.abs(r.mkPv.autoDb + mk - (-14 - L)) < 0.2, "−14 LUFS로 올림 " + r.mkPv.autoDb + " / " + L); assert.strictEqual(mkCtx.lim.threshold.value, -1); }
  { const r = await run(0.6, 0.6); assert.ok(r.mkPv.autoDb < 0, "이미 크면 줄임 " + r.mkPv.autoDb); }
  assert.ok(T.includes("g.connect(mkBus());") && T.includes("mkDurS = Math.max(mkDurS, t.buf.duration); mkAutoGain();") && T.includes("if (my !== mkAutoGain.seq) return;"));
  console.log("mk-autogain ok");
})().catch((e) => { console.error(e); process.exit(1); });
