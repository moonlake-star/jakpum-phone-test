// (11/09 12:10 사용자 '레슨 녹음 등은 잘 파악해서 기준 −11') 레슨 녹음 크게 듣기 = 자동 크기(소리 나는 동안 약 8초 평균 → −11 dBFS, 0~+15 dB, 조용한 틈은 안 잼)
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = T.slice(T.indexOf("const LOUD_TARGET"), T.indexOf('player.addEventListener("play", () => loudRoute(player));'));
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [] }, player: { paused: true }, full: { paused: true }, WeakSet, Math, Float32Array };
vm.createContext(ctx);
const mk = vm.runInContext("(function(){" + code + "; return { gain: (lv) => { loudLv = lv; return loudGain(true); }, tick: (rms, M, A) => { loudMaster = M; loudAn = A; loudCtx = { currentTime: 0 }; loudTick(); return loudLv; } }; })()", ctx);
const dB = (g) => 20 * Math.log10(g);
assert.ok(Math.abs(dB(mk.gain(null)) - 6) < 1e-9, "재기 전 +6");
assert.ok(Math.abs(dB(mk.gain(-26)) - 15) < 1e-9, "아주 작은 녹음 → 최대 +15");
assert.ok(Math.abs(dB(mk.gain(-20)) - 9) < 1e-9, "−20 → +9");
assert.strictEqual(mk.gain(-8), 1, "이미 큰 소리는 그대로");
const M = { gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } } };
const A = (amp) => ({ fftSize: 1024, getFloatTimeDomainData(x) { for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(i * 0.3); } });
mk.gain(null); assert.strictEqual(mk.tick(0, M, A(0.001)), null, "조용한 틈(−60 dB)은 안 잼");
const lv = mk.tick(0, M, A(0.1)); assert.ok(lv > -24 && lv < -22, "소리 나면 잼 " + lv); assert.ok(M.gain.value > 1);
console.log("lesson-agc ok");
