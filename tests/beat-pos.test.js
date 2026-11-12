// (11/12 14:14) 박자 격자: 서버가 찾은 마디 안 위치(pos)로 마디 첫 박·번호 — 없으면 예전 down 기준
const assert = require("assert"); const fs = require("fs");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes("cv.beats.pos.length === B.length ? cv.beats.pos : null"), "pos 길이 맞을 때만 사용");
assert.ok(T.includes("bar = PS ? PS[i] === 0 : (i - dn) % 4 === 0"), "pos 없으면 down·4박");
// 번호 매기기 논리(3박자, 2번째 박부터 시작)
const PS = [2, 0, 1, 2, 0, 1, 2, 0]; let n = 0; const no = PS.map(p => (p === 0 ? ++n : 0));
assert.deepStrictEqual(no, [0, 1, 0, 0, 2, 0, 0, 3]);
console.log("beat-pos ok");
