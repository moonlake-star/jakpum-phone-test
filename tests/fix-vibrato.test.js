// (11/26 사용자 '여기는 왜 보정 후가 음이 더 내려가') 선생님이 고친 큰 떨림 음: 기준 = 앞뒤 0.2초 모든 점 평균(서버와 같음)
const fs = require("fs"), assert = require("assert"), T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const s = T.indexOf("  function fixAbs(cv) {"), e = T.indexOf("  function syncCorr(cv) {"), fixAbs = new Function(T.slice(s, e) + "; return fixAbs;")();
const pts = []; for (let t = 0; t < 2; t += 0.01) { const ph = (t * 4.5) % 1, v = ph < 0.65 ? 6250 + 20 * Math.sin(Math.PI * ph / 0.65) : 6250 - 230 * Math.sin(Math.PI * (ph - 0.65) / 0.35); pts.push([+t.toFixed(2), v, null, 6200]); }
const m = fixAbs({ pts, _fixes: [{ t0: 0.2, t1: 1.8, midi: 62 }] }), v = [...m.entries()].filter(([i]) => pts[i][0] > 0.4 && pts[i][0] < 1.6).map(([, c]) => c);
const mean = v.reduce((a, b) => a + b, 0) / v.length; assert.ok(Math.abs(mean - 6200) < 15, "보정 후 평균 " + mean);
console.log("fix-vibrato ok");
