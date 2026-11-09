// (11/09 11:42 사용자 '앱 출력 볼륨 맥시마이징') 메이크업 재생: 반주+보컬 실효값을 재서 약 −11 dBFS까지(11/09 12:10) 올림(최대 +12 dB, 이미 크면 그대로) → 리미터(−1 dBFS)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const blk = T.slice(T.indexOf("let mkMaster = null;"), T.indexOf("async function mkLoad(name, fileId) {"));
class P { constructor() { this.value = 1; } cancelScheduledValues() {} setTargetAtTime(v) { this.value = v; } }
const mkCtx = { currentTime: 0, destination: {}, createGain() { const g = { gain: new P(), connect(t) { this.to = t; } }; g.context = mkCtx; return g; }, createDynamicsCompressor() { const c = { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect(t) { this.to = t; } }; mkCtx.lim = c; return c; } };
const buf = (rmsDb) => { const a = new Float32Array(48000), A = 10 ** (rmsDb / 20) * Math.SQRT2; for (let i = 0; i < a.length; i++) a[i] = A * Math.sin(i * 0.05); return { numberOfChannels: 1, getChannelData: () => a }; };
const run = (mr, voc) => { const mkPv = {}, mkTracks = { mr: { buf: buf(mr) }, p0: { buf: buf(voc) } }; const api = new Function("mkCtx", "mkTracks", "mkPv", blk + "; mkAutoGain(); return { m: mkBus(), mkPv };")(mkCtx, mkTracks, mkPv); return api; };
{ const r = run(-30, -30); assert.ok(Math.abs(r.mkPv.autoDb - 12) < 0.2, "조용한 예전 완성본(−27 dBFS) → +12 dB(최대)"); }
{ const r = run(-20, -20); assert.ok(Math.abs(r.mkPv.autoDb - 6) < 0.3, "−17 dBFS → +6 dB " + r.mkPv.autoDb); assert.strictEqual(mkCtx.lim.threshold.value, -1); }
{ const r = run(-12, -12); assert.strictEqual(r.mkPv.autoDb, 0, "이미 크면 그대로"); }
assert.ok(T.includes("g.connect(mkBus());") && T.includes("mkDurS = Math.max(mkDurS, t.buf.duration); mkAutoGain();"));
console.log("mk-autogain ok");
