// (11/24 노트북 세션 지적) BUILD를 안 올려도 새 버전 알림: 모든 스크립트 ?v= 버전 + 처음 받은 페이지 지문 비교
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const fn = T.slice(T.indexOf("async function checkBuild() {"), T.indexOf("let cbAt = 0;"));
assert.ok(/const vers = \(x\) => \[\.\.\.x\.matchAll\(/.test(fn) && fn.includes("checkBuild.vers = vers(document.documentElement.outerHTML)"), "스크립트 버전 전체 비교");
assert.ok(fn.includes("nf !== checkBuild.fp"), "페이지 지문 비교");
// 버전 추출이 loudnorm·brand를 잡는지
const vers = (x) => [...x.matchAll(/src="(\.\.\/[\w.-]+\.js)\?v=([\w-]+)"/g)].map((m) => m[1] + "=" + m[2]).sort().join("|");
const v = vers(T); assert.ok(v.includes("../loudnorm.js=") && v.includes("../brand.js=") && v.includes("../tune.js="), v);
console.log("build-check OK");
