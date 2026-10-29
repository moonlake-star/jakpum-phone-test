// '누가 누구인지': 샘플 파일이 없어도 화자마다 ▶ 듣기(레슨 녹음 그 위치) + 처리 중에 열었으면 다시 확인
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const f = t.match(/function renderSpeakers\(\) \{[^]*?\n\}\n/)[0];
assert.ok(f.includes('data-spkt="${+sg.start}"') && f.includes("playAt(Math.max(0, s - 0.3), true, true)"), "샘플 없을 때 녹음 위치 재생 버튼");
assert.ok(f.includes('fs.find(f => f.name === "화자샘플.json")') && f.includes("cur._spkRetry = true"), "한 번 다시 불러옴");
console.log("speaker-listen ok");
// 10/30: 짧은 안내 + '✓ 화자 확인' 버튼(누르면 저장·확인 필요 해제, 다시 바꾸면 확인 풀림)
assert.ok(t.includes("AI가 화자를 정확히 인식하기 힘든 부분입니다.<br>화자를 선택해 주시면 자동분석의 정확도가 올라갑니다.") && t.includes('id="spkOk"'));
assert.ok(/if \(cur\.review\.speakers_confirmed_at\) return \[\];/.test(t) && t.includes("cur.review.speakers_confirmed_at = null;"));
console.log("speaker-confirm ok");
