// (11/09 19:52 사용자 '음 길이를 늘리면 왜 눈금도 같이 이동') 박자 눈금·재생 세로줄은 고정 좌표(xs0), 음정선·음표만 옮겨 그림(xs)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
assert.ok(T.includes("const X = Math.round(xs0(B[i])) + 0.5"), "박자 눈금 고정");
assert.ok(T.includes('g.fillRect(Math.round(xs0(t)) - 1, 2, 2.5, h - 4)'), "재생 세로줄 고정");
assert.ok(!T.includes("Math.round(xs(B[i]))") && !T.includes("Math.round(xs(t))"), "옮겨 그리는 좌표로 그리지 않음");
console.log("grid-fixed ok");
