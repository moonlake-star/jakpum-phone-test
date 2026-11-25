// (11/25 사용자 '여전히 안 열려') 메이크업 화면 열기: mkJob = j · show("vMkJob")가 주석 뒤로 밀려 꺼지면 메이크업 화면·음표 고치기가 안 열림(11/24 #985 사고) — 실제 코드로 확인
const fs = require("fs"), assert = require("assert");
const H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const line = H.split("\n").find(l => l.includes("mkAutoGain.seq = (mkAutoGain.seq || 0) + 1;") && l.includes("stopProg();"));
assert.ok(line, "openMkJob 첫 줄");
const code = line.split("//")[0];
assert.ok(code.includes("mkJob = j;") && code.includes('show("vMkJob");') && code.includes("mkPv = {"), "주석 앞(실행되는 코드)에 mkJob·show가 있어야 함: " + code.slice(0, 200));
// 오늘의 베스트 금색 버튼 = 진짜 버튼(바로 editFromBest)
assert.ok(H.includes('hb.onclick = (e) => { e.stopPropagation(); try { player.pause(); } catch {} Promise.resolve(editFromBest(job, 0))'), "크게 보기 버튼");
console.log("mk-open ok");
