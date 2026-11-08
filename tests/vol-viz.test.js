// (11/09 01:21 사용자 A안) 음별 볼륨이 그래프에 보이게: 막대 두께 + dB 꼬리표 · 끈 음 빗금 · 볼륨은 흐름 탭 셋째 칸
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
assert.ok(T.includes("Math.pow(10, r.gd / 40)") && T.includes("Math.max(0.4, Math.min(1.8,"), "두께는 dB에 따라(0.4~1.8배)");
assert.ok(T.includes('b.gd === "m" ? "무음"') && T.includes('dB`'), "꼬리표");
assert.ok(T.includes('if (r.gd === "m") g.globalAlpha = 0.28'), "끈 음 흐리게");
assert.ok(A.includes("rows.push(cells(tl, trC, vlC))") && !A.includes('["g", "볼륨"]'), "볼륨 = 흐름 탭 칸");
const k = Math.pow(10, 6 / 40), k2 = Math.pow(10, -24 / 40); assert.ok(k > 1.3 && k < 1.5 && Math.max(0.4, k2) === 0.4);
console.log("vol-viz ok");
