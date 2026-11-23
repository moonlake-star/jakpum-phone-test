// (11/23 사용자 '피드백 않고 넘어갈 회차 처리 방법') 레슨 '⏭ 건너뜀' — 피드백 전·할 일·다음 검토에서 빠짐 · 되돌리기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(/fb: !!rv\.sent\?\.feedback, skip: !!rv\.skipped_at,/.test(T), "검수.json skipped_at → 목록 표시");
assert.ok(/if \(!r\.err && !r\.fb && !r\.skip && daysAgo/.test(T), "오늘 할 일에서 빠짐");
assert.ok(/d\.rows\.filter\(r => !r\.fb && !r\.skip && !r\.err\)/.test(T), "수강생 카드 '피드백 전 N'에서 빠짐");
assert.ok(/r\.fb \? "피드백 ✓" : r\.skip \? "⏭ 건너뜀" : "피드백 전"/.test(T), "레슨 줄에 ⏭ 건너뜀");
assert.ok(/if \(!r \|\| r\.err \|\| r\.fb \|\| r\.skip \|\| r\.pub/.test(T), "새 검수 화면 '다음 검토'에서도 빠짐");
const fn = T.match(/async function setLessonSkip\(sid, i, on\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/if \(on\) rv\.skipped_at = new Date\(\)\.toISOString\(\); else delete rv\.skipped_at;/.test(fn) && /await writeJSON\(r\.l\.id, REVIEW, rv, rf\?\.id\)/.test(fn), "검수.json에 표시만(되돌리기 가능)");
assert.ok(!/feedback\s*=|sent\./.test(fn.replace(/feedback: ""/, "")), "글·보냄 기록은 안 건드림");
assert.ok(/longPress\(el, \(\) => \{ el\._long = true; lessonMenu\(sid, \+el\.dataset\.i\); \}\)/.test(T), "레슨 줄 길게 누르기");
assert.ok(/id="btnSkip" type="button">\$\{review\.skipped_at \? "↩ 건너뛰기 취소" : "⏭ 피드백 건너뛰기"\}/.test(T), "레슨 머리 버튼");
console.log("lesson-skip OK");
