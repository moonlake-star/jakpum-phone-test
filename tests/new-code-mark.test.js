// (11/12 11:54) 완성본 요청 = 최신 코드만 처리(예전 코드 일꾼은 _demo로 보고 건너뜀)
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes("const MK_NEWQ = { _demo: true, _new_code: 7 };"));
assert.ok(H.includes('const q = { ...r, status: "queued", ...MK_NEWQ, preset: "표준" };'), "완성본 새로 만들기에 표시");
console.log("new-code-mark ok");
