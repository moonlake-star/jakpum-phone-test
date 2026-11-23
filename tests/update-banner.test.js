// (11/02 19:54 사용자) 새 버전 알림: tune.js만 바뀌어도 뜨게(BUILD 또는 tune.js 버전이 다르면)
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const m = te.match(/tv = \(t\.match\((\/.*?\/)\) \|\| \[\]\)\[1\]/); assert.ok(m, "tune.js 버전 비교 있음");
const re = eval(m[1]); const v = (te.match(re) || [])[1]; assert.ok(/^[0-9a-f]{10}$/.test(v), "페이지에서 tune.js 버전(내용 지문, 11/24~)을 읽음: " + v);
assert.ok(te.includes("(tv && TUNE_V && tv !== TUNE_V)"));
console.log("update-banner ok");
