// (11/12 사용자) A/B 비교 구간 직접 지정 UI
const assert = require("assert"), fs = require("fs"), path = require("path");
const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8"), H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(H.includes("range: Array.isArray(r.engine_ab_range)"), "engGet에 range");
assert.ok(H.includes("delete r.engine_ab_range"), "engSet 정리");
assert.ok(A.includes("engine_ab_range: [") && A.includes("data-rgs") && A.includes("data-rgc"), "구간 입력 UI");
console.log("ab-range-ui ok");
