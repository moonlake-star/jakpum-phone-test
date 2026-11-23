// (11/23 사용자 '레슨 녹음도 곡 서랍처럼') 레슨 녹음 크게 듣기 = K 가중 LUFS 근사로 약 8초 평균 → −14 LUFS(−10~+15 dB) · 조용한 틈은 안 잼 · 안전 제한기 하나
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = T.slice(T.indexOf("const LOUD_TARGET"), T.indexOf('player.addEventListener("play", () => loudRoute(player));'));
const ctx = { window: {}, localStorage: { getItem: () => null, setItem() {} }, document: { querySelectorAll: () => [] }, player: { paused: true }, full: { paused: true }, WeakSet, Math, Float32Array };
vm.createContext(ctx);
const mk = vm.runInContext("(function(){" + code + "; return { gain: (lv) => { loudLv = lv; return loudGain(true); }, tick: (rms, M, A) => { loudMaster = M; loudAn = A; loudCtx = { currentTime: 0 }; loudTick(); return loudLv; } }; })()", ctx);
const dB = (g) => 20 * Math.log10(g);
assert.ok(Math.abs(dB(mk.gain(null)) - 6) < 1e-9, "재기 전 +6");
assert.ok(Math.abs(dB(mk.gain(-35)) - 15) < 1e-9, "아주 작은 녹음 → 최대 +15");
assert.ok(Math.abs(dB(mk.gain(-23)) - 7) < 1e-9, "−23 LUFS → +7(기준 −16)");
assert.ok(Math.abs(dB(mk.gain(-8)) + 8) < 1e-9, "큰 녹음은 −16으로 줄임");
assert.ok(Math.abs(dB(mk.gain(10)) + 10) < 1e-9, "줄이는 건 최대 −10");
const M = { gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime(v) { this.value = v; } } };
const A = (amp) => ({ fftSize: 1024, getFloatTimeDomainData(x) { for (let i = 0; i < x.length; i++) x[i] = amp * Math.sin(i * 0.3); } });
mk.gain(null); assert.strictEqual(mk.tick(0, M, A(0.001)), null, "조용한 틈은 안 잼");
const lv = mk.tick(0, M, A(0.1)); assert.ok(lv > -21 && lv < -20, "소리 나면 LUFS 근사로 잼 " + lv); assert.ok(M.gain.value > 1);
assert.ok(T.includes("Loud.kNodes(loudCtx)") && T.includes("lim.threshold.value = -1;"), "K 가중 분석 · 안전 제한기 하나");
console.log("lesson-agc ok");
