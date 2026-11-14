// (11/14 18:03 사용자 '2안') 합주 베스트 화면: 첫 화면 버튼 · 별도 화면(뒤로 가기 목록) · 보컬/반주 전환 · 구절 띠 · 화면 떠나면 소리 멈춤
const fs = require("fs"), path = require("path"), assert = require("assert");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(T.includes('<section id="vJam" class="hidden"></section>') && T.includes('"vSongs","vJam"]'), "별도 화면 + 뒤로 가기 목록");
assert.ok(T.includes('id="jamBtn">🎸 합주 베스트') && T.includes('$("jamBtn").onclick = () => openJam()'), "첫 화면 버튼");
assert.ok(T.includes('name === "합주베스트"') && T.includes('name === "index.json"'), "서버 jam_run.py 저장 위치와 같음");
assert.ok(T.includes('["all", "같이"], ["v", "보컬만"], ["m", "반주만"]') && T.includes('gV.gain.value = p.mode === "m" ? 0 : 1; gM.gain.value = p.mode === "v" ? 0 : 1'), "보컬·반주 전환");
assert.ok(T.includes('p.pick === js.ref ? 0.45 : 1') && T.includes("data-take="), "구절 띠(가져온 구절 진하게) · 테이크 원본");
assert.ok(T.includes('if (view !== "vJam") { try { jamStop(); clearTimeout(jam.poll); } catch {} }'), "화면 떠나면 멈춤");
console.log("jam-page OK");
