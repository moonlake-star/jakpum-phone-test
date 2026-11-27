// (11/14 18:03 사용자 '2안') 합주 베스트 화면: 첫 화면 버튼 · 별도 화면(뒤로 가기 목록) · 보컬/반주 전환 · 구절 띠 · 화면 떠나면 소리 멈춤
const fs = require("fs"), path = require("path"), assert = require("assert");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(T.includes('<section id="vJam" class="hidden"></section>') && T.includes('"vSongs","vJam"]'), "별도 화면 + 뒤로 가기 목록");
assert.ok(T.includes('id="jamBtn" role="button"><div><b>🎸 연습/합주') && T.includes('$("jamBtn").onclick = () => openJam()'), "첫 화면 버튼(11/27 '연습/합주')");
assert.ok(T.includes('name === "합주베스트"') && T.includes('name === "index.json"'), "서버 jam_run.py 저장 위치와 같음");
// (11/27 사용자 '짜깁기 기능은 폐기') 보컬·반주 전환·구절 띠 시험은 뺌(jam-takes.test.js가 테이크 화면을 봄)
assert.ok(T.includes('if (view !== "vJam") { try { jamStop(); clearTimeout(jam.poll); } catch {} }'), "화면 떠나면 멈춤");
console.log("jam-page OK");
