// (11/24 · 멜로다인 Quantize Time) 여러 음 고르기 ♩ 박자: 음 시작을 박(1박·½박) 쪽으로 N%, 길이 그대로, 겹침은 끝을 줄이거나 건너뜀
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const s = T.indexOf("  function quantPlan("), e = T.indexOf("  const wrap_ = (h) =>");
const quantPlan = new Function(T.slice(s, e) + "; return quantPlan;")();
const beats = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4];
// 1) 0.08초 늦은 음 → 100%: 박에 딱(길이 그대로) · 50%: 절반만
let notes = [[1.08, 1.4]], P = quantPlan(beats, notes, 1, 1, notes);
assert.deepStrictEqual(P[0], [1, 1.32]);
P = quantPlan(beats, notes, 1, 0.5, notes); assert.deepStrictEqual(P[0], [1.04, 1.36]);
// 2) ½박 격자: 1.27 → 1.25
notes = [[1.27, 1.45]]; P = quantPlan(beats, notes, 2, 1, notes); assert.deepStrictEqual(P[0], [1.25, 1.43]);
// 4) 이미 맞은 음 = null · 다음 음과 겹치면 끝을 줄임
assert.strictEqual(quantPlan(beats, [[2, 2.3]], 1, 1, [[2, 2.3]])[0], null);
const all = [[0.94, 1.48], [1.5, 1.9]]; P = quantPlan(beats, [[0.94, 1.48]], 1, 1, all); assert.ok(P[0] && P[0][0] === 1 && P[0][1] <= 1.48, JSON.stringify(P));
assert.ok(T.includes('data-mq disabled aria-label="고른 음 박자에 맞추기(세기·격자)">♩ 박자</button>') && T.includes("const plan = quantPlan(cv.beats.t, bs.map(b => [b.t0, b.t1]), div, k / 100,"), "버튼·연결");
console.log("quantize ok");
