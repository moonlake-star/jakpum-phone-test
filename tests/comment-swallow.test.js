// (11/26 사용자 '리버브가 작동 안 해') 한 줄 주석(//) 뒤에 코드가 붙으면 그 코드는 조용히 꺼짐 — 리버브(울림 장치에 파일 넣기)·불러오는 중 창·기타/피아노 버튼 색·악보 구역 이름이 이렇게 꺼져 있었음.
// 주석 뒤에 '이름 = 값;' / 'if (' / 'await ' 같은 코드 모양이 이어지면 실패.
const fs = require("fs"), path = require("path"), assert = require("assert");
const bad = [];
for (const f of ["teacher/index.html", "student/index.html", "tune.js", "adv.js"]) {
  fs.readFileSync(path.join(__dirname, "..", f), "utf8").split("\n").forEach((l, i) => {
    const m = /\s\/\/\s/.exec(l); if (!m) return; const c = l.slice(m.index + m[0].length).trimEnd();
    if (/[;{}]$/.test(c) && /(\b(const|let|await|return|if|for)\b[ (]|\w\.\w+\s*=\s*[^=>]|\w\(\)\s*;)/.test(c) && c.includes(";")) bad.push(`${f}:${i + 1}: ${c.slice(0, 120)}`);
  });
}
assert.deepStrictEqual(bad, [], "주석 뒤에 코드가 붙어 꺼져 있음 — 줄을 나눠 주세요:\n" + bad.join("\n"));
console.log("comment-swallow ok");
