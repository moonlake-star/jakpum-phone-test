// (11/21 코덱스 검토) 수강생 앱 회차 = 선생님 앱이 노트에 실은 session 값만. 공개 노트 순번으로 세지 않음(앱 이전 레슨이 빠져 13회차가 '3회차'로 보였음)
const fs = require("fs"), assert = require("assert");
const s = fs.readFileSync(__dirname + "/../student/index.html", "utf8"), t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const m = s.match(/const sessLabel = [^\n]*\n/); assert.ok(m);
const sessLabel = new Function(m[0] + "return sessLabel;")();
assert.equal(sessLabel({ session: 13 }), "13회차");
assert.equal(sessLabel({ session: "13" }), "13회차");
assert.equal(sessLabel({}), "", "모르면 회차 없이 날짜만");
assert.equal(sessLabel({ session: 0 }), ""); assert.equal(sessLabel({ session: 2.5 }), ""); assert.equal(sessLabel({ session: "x" }), "");
assert.ok(!/ls\.length - i/.test(s), "공개 노트 순번 계산 없음");
assert.ok(!/\$\{i \+ 1\}회차/.test(s), "모아듣기도 순번 회차 없음");
assert.ok(/보컬노트 · \$\{sl \? sl \+ " · " : ""\}/.test(s), "노트 머리는 sessLabel");
assert.ok(/노트 \$\{ls\.length\}개/.test(s), "노트 개수는 '노트 N개'(레슨 횟수와 헷갈리지 않게)");
assert.ok(/const sess = \+cur\.summary\?\.lesson\?\.session_number;/.test(t) && /\{ session: sess \}/.test(t), "선생님 앱이 노트에 회차를 실음");
console.log("student-session OK");
