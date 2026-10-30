// 일정 옮기기(사용자 승인 10/30): 길게 눌러 끌기·옮기기 버튼, 원래 일정 PATCH(새로 만들지 않음), 권한은 옮길 때만
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(t.includes("레슨을 길게 눌러 끌면 날짜 이동") && t.includes("function calDragWire(") && t.includes('data-mvb="${n}"'));
assert.ok(/method: "PATCH"[^\n]*start: \{ dateTime/.test(t) && !/calendar\/v3\/calendars\/primary\/events`?, \{ method: "POST"/.test(t), "원래 일정을 옮김(새로 만들지 않음)");
assert.ok(t.includes('const SCOPE = "https://www.googleapis.com/auth/drive";'), "평소 로그인 권한은 그대로");
assert.ok(t.includes("include_granted_scopes: true") && t.includes('CAL_SCOPE = "https://www.googleapis.com/auth/calendar.events"'));
assert.ok(/\["scheduled", "review"\]\.includes\(x\.s\) \? ` data-mv=/.test(t), "끝난 레슨은 옮기지 않음");
console.log("cal-move ok");
