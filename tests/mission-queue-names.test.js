// 큐 파일 이름 계약(백엔드 mission_queue 와 동일) — 실 Drive 없음.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#mq-begin\n([\s\S]*?)\/\/#mq-end/)[1];
const M = new Function(code + "return {mqReqName,mqStatusName};")();
// 레거시(밑줄 없는 sid)는 기존 이름 그대로, 파일 ID 의 밑줄도 보존
assert.equal(M.mqReqName("S1", "FILE1"), "요청_S1_FILE1.json");
assert.equal(M.mqStatusName("S1", "FILE1"), "상태_S1_FILE1.json");
assert.equal(M.mqReqName("a", "b_c"), "요청_a_b_c.json");
// 실제 앱 생성 ID(joinNewSid) + Drive 파일 ID 밑줄 → V2
const sid = "STU_1730000000000_ab12cd", fid = "1AbC_dEf-9";
assert.equal(M.mqReqName(sid, fid), `요청2_${sid.length}_${sid}_${fid}.json`);
assert.equal(M.mqStatusName(sid, fid), `상태2_${sid.length}_${sid}_${fid}.json`);
// (a_b,c) / (a,b_c) 충돌 없음
assert.notEqual(M.mqReqName("a_b", "c"), M.mqReqName("a", "b_c"));
assert.notEqual(M.mqStatusName("a_b", "c"), M.mqStatusName("a", "b_c"));
assert.equal(M.mqReqName("a_b", "c"), "요청2_3_a_b_c.json");
// 레거시/V2 이름 공간 분리
for (const s of ["a_b", sid, "_a"]) for (const f of ["c", "b_c", "2_3"]) assert.ok(M.mqReqName(s, f).startsWith("요청2_") && M.mqStatusName(s, f).startsWith("상태2_"));
for (const s of ["a", "S1", "x-y"]) for (const f of ["c", "b_c", "2_3_a_b_c"]) assert.ok(M.mqReqName(s, f).startsWith("요청_") && !M.mqReqName(s, f).startsWith("요청2_"));
console.log("mission-queue-names ok");
