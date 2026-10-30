// (10/30 사용자) 로고 + 문구: 첫 실행·불러오기·화면 전환
const fs = require("fs"), assert = require("assert");
const b = fs.readFileSync(__dirname + "/../brand.js", "utf8");
assert.ok(b.includes("가장 아름다운 당신의 오늘을") && b.includes("brand/logo.webp"));
assert.ok(/pointer-events:none/.test(b.match(/#brLoad\{[^}]*\}/)[0]), "불러오기 화면이 터치를 막지 않음");
assert.ok(/ls\.get\(k\) === today/.test(b), "첫 실행 화면은 하루 한 번");
for (const f of ["teacher", "student"]) { const h = fs.readFileSync(__dirname + `/../${f}/index.html`, "utf8"); assert.ok(h.includes('<script src="../brand.js?v=') && h.includes(`Brand.splash("${f}")`), f); }
assert.ok(fs.statSync(__dirname + "/../brand/logo.webp").size < 60000, "로고는 가볍게");
console.log("brand ok");
