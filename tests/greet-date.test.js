// (11/01 00:00 사용자) 인사 첫 줄 '오늘 레슨' → 레슨 날짜
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const m = src.match(/function datedGreet\([\s\S]*?return L\.join\("\\n"\); }\n/); assert.ok(m);
const f = new Function(m[0] + "return datedGreet;")();
assert.strictEqual(f("김미영님, 오늘 레슨 수고 많으셨어요!\n\n오늘은 덜했어요", "2026-10-29_회차확인필요"), "김미영님, 10월 29일 레슨 수고 많으셨어요!\n\n오늘은 덜했어요");
assert.strictEqual(f("오늘 레슨 즐거우셨죠, 윤지선님?", "2026-11-05"), "11월 5일 레슨 즐거우셨죠, 윤지선님?");
assert.strictEqual(f("윤지선님, 10월29일 레슨 수고 많으셨어요!", "2026-10-29"), "윤지선님, 10월29일 레슨 수고 많으셨어요!", "이미 날짜면 그대로");
assert.strictEqual(f("김미영님, 오늘 레슨 수고", ""), "김미영님, 오늘 레슨 수고", "날짜 모르면 그대로");
assert.ok(src.includes('feedback: typeof datedGreet === "function" ? datedGreet($("fb").value, cur.folder.name)'), "보내는 노트에도");
console.log("greet-date ok");
