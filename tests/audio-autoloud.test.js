// (11/24 사용자 '레슨 녹음·메이크업·수강생 앱 등 전체를 곡 서랍처럼, 맥시마이저 겹치지 않게') 앱의 모든 <audio> 재생 = −16 LUFS 자동 맞춤 + 제한기 하나
const fs = require("fs"), assert = require("assert");
const L = fs.readFileSync(__dirname + "/../loudnorm.js", "utf8"), T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8"), B = fs.readFileSync(__dirname + "/../brand.js", "utf8");
assert.ok(L.includes("G.HTMLMediaElement.prototype.play = function ()") && L.includes('G.document.addEventListener("play"'), "play()·재생 버튼 모두");
assert.ok(L.includes("const okSrc = (a) => /^(blob|data):/.test("), "같은 출처만(다른 도메인 소리 사라짐 방지)");
assert.ok(L.includes("gainTo(st, null, 0, { maxUp: 12, over: 0 })") && L.includes("MAXB = 12 << 20"), "작은 파일은 정확히 재고, 큰 파일은 재생하며");
assert.ok(L.includes("if (!a || a._noLoud ||"), "제외 표시");
for (const src of [T, S]) assert.ok(src.includes("au.mr._noLoud = au.voc._noLoud = true;") && src.includes('<script src="../loudnorm.js'), "곡 서랍 태그는 자체 맞춤 → 제외");
assert.ok(T.includes("const player = new Audio(); player._noLoud = true;") && T.includes("const full = new Audio(); full._noLoud = true;"), "선생님 레슨 재생기는 loudRoute가 맞춤 → 제외(겹침 없음)");
assert.ok(B.includes("a._noLoud = true; FH.el = a;") && B.includes("const keepFns = new Set();"), "무음 잠금 해제 제외 · 화면 꺼도 재생 중이면 유지(여러 곳)");
assert.ok(T.includes("loudLv == null ? 0 : LOUD_TARGET - loudLv"), "레슨 재생: 처음 0 dB(예전 +6)");
assert.ok(T.includes("gV.connect(jG); gM.connect(jG);") && T.includes("jG.connect(jLim)"), "합주: 크기 맞춤 + 제한기 하나");
console.log("audio-autoloud OK");
