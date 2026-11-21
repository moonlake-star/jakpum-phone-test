// (11/21 사용자 '테스트 수강생 삭제') 연습용 수강생만 삭제 — 실제 수강생은 버튼 없음 · 폴더는 휴지통
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const can = new Function(T.match(/const stuCanDelete = [^\n]*\n/)[0] + "return stuCanDelete;")();
assert.equal(can({ status: "test" }), true); assert.equal(can({ status: "active" }), false); assert.equal(can({ status: "teacher" }), false); assert.equal(can({}), false);
const fn = T.match(/async function deleteTestStudent\(sid\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/if \(l\.students\?\.\[sid\]\?\.status === "test"\) delete l\.students\[sid\];/.test(fn), "최신 설정에서도 연습용일 때만 지움");
assert.ok(/JSON\.stringify\(\{ trashed: true \}\)/.test(fn) && !/method: "DELETE"/.test(fn), "폴더는 휴지통(30일 복구)");
assert.ok(/if \(!confirm\(/.test(fn), "한 번 확인");
assert.ok(/\$\{stuCanDelete\(st\) && payCanEdit\(\) \? `<button type="button" class="small ghost" id="stuDelBtn"/.test(T), "연습용 + 원장만 버튼");
console.log("student-delete OK");
