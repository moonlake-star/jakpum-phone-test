// 회귀 방지(10/30 15:10): BUILD 숫자를 바꾸다 아래 '새 버전 확인' 정규식까지 바뀌어 앱 전체가 멈춘 적이 있음
const fs = require("fs"), path = require("path"), assert = require("assert");
const html = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(html.includes('t.match(/const BUILD = "([^"]+)"/)'), "새 버전 확인 정규식이 그대로여야 함");
for (const f of ["teacher/index.html", "student/index.html"]) { const h = fs.readFileSync(path.join(__dirname, "..", f), "utf8");
const scripts = [...h.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
for (const s of scripts) { try { new Function(s); } catch (e) { throw new Error(f + " 문법 오류: " + e.message); } } }
console.log("build-check-regex OK");
