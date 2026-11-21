// (11/21) 홈 '오늘 할 일': 레슨 후 이틀 넘은 피드백 전 레슨에 '⏰ N일째'
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (re) => T.match(re)[0];
const RealNow = Date.now; Date.now = () => Date.parse("2026-11-21T03:00:00Z");
const F = new Function(g(/const fbLate = [^\n]*\n/) + g(/const daysAgo = [^\n]*\n/) + "return { fbLate };")();
assert.equal(F.fbLate({ l: { name: "2026-11-19_06회차" } }), " · ⏰ 2일째");
assert.equal(F.fbLate({ l: { name: "2026-11-20_레슨" } }), "", "하루는 아직");
assert.equal(F.fbLate({ l: { name: "이름없음" } }), "", "날짜 모르면 안 붙임");
Date.now = RealNow;
assert.ok(/c: "검토 대기" \+ fbLate\(r\)/.test(T) && /\(r\.pub \? "" : fbLate\(r\)\)/.test(T), "검토 대기·피드백 전 줄에 붙음(게시됨은 제외)");
console.log("fb-late OK");
