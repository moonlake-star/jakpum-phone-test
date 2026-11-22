// (11/21~22 사용자) 수강생 삭제: 연습용은 확인 한 번, 실제 수강생은 이름 입력까지 · 폴더는 휴지통(🗑에서 되살리기) · 길게 누르면 메뉴(수강 상태·삭제)
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const can = new Function(T.match(/const stuCanDelete = [^\n]*\n/)[0] + "return stuCanDelete;")();
assert.equal(can({ status: "test" }), true); assert.equal(can({ status: "active" }), false, "수강생 화면 머리 버튼은 연습용만");
const fn = T.match(/async function deleteStudent\(sid\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/if \(!st \|\| isTeacher\(st\)\) return toast/.test(fn), "선생님 본인은 못 지움");
assert.ok(/if \(typed\.trim\(\) !== st\.name\) return toast\("이름이 달라서 지우지 않았어요"\)/.test(fn), "실제 수강생은 이름을 그대로 입력해야");
assert.ok(/\(test && x\.status !== "test"\)\) return;/.test(fn), "최신 설정 기준으로 다시 확인");
assert.ok(/snap: JSON\.parse\(JSON\.stringify\(x\)\)/.test(fn) && /JSON\.stringify\(\{ trashed: true \}\)/.test(fn) && !/method: "DELETE"/.test(fn), "설정 기록 + 폴더 휴지통(되살리기 가능)");
assert.ok(/if \(payCanEdit\(\)\) longPress\(el, \(\) => \{ el\._long = true; stuMenu\(el\.dataset\.s\); \}\);/.test(T), "수강생 카드 길게 누르기(원장만)");
const menu = T.match(/function stuMenu\(sid\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/enrollSheet\(sid, \(\) => renderList\(\)\)/.test(menu) && /deleteStudent\(sid\)/.test(menu), "메뉴: 수강 상태 바꾸기 · 삭제");
const lp = T.match(/function longPress\(el, fn, ms = 500\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/Math\.hypot\(p\.clientX - x0, p\.clientY - y0\) > 8\) stop\(\)/.test(lp), "움직이면(스크롤) 길게 누르기 취소");
console.log("student-delete OK");
