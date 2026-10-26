// 학생 페이지 3층 '나의 음악 이야기' 시험 — storyHtml을 가짜 환경에서 실행(합성 데이터)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const pick = (re) => { const m = src.match(re); assert.ok(m, "코드 조각 못 찾음: " + re); return m[0]; };
const body = [pick(/const esc = [^\n]*\n/), pick(/const md = [^\n]*\n/), pick(/function player\([\s\S]*?\n}\n/),
  pick(/const MAX_STORY[^\n]*\n/), pick(/function storyHtml\([\s\S]*?\n}\n/)].join("\n");
const storyHtml = new Function(body + "; return storyHtml;")();
const L = (n, o = {}) => ({ id: "L" + n, date: `2026-10-${String(n).padStart(2, "0")}`, highlight: "한마디" + n, best: { file_id: "B" + n }, ...o });
const audios = (h) => (h.match(/data-au="/g) || []).length;
// 신규 1회 / 빈 데이터 / 잘못된 값 → 아무것도 그리지 않음
[[L(1)], [], null, undefined, [null, {}, { date: "2026-10-01" }]].forEach(x => assert.strictEqual(storyHtml(x), ""));
// 2회: 접힌 details, 날짜 오름차순, 오디오 2개
const h2 = storyHtml([L(9), L(2)]);
assert.ok(/<details[^>]*>/.test(h2) && !/<details[^>]*\bopen\b/.test(h2) && h2.includes("나의 음악 이야기"));
assert.ok(h2.indexOf("한마디2") < h2.indexOf("한마디9")); assert.strictEqual(audios(h2), 2);
assert.ok(h2.includes('aria-label="10월 2일 레슨"'));
// 많은 기록: 가장 최근 6개만
const many = storyHtml(Array.from({ length: 9 }, (_, i) => L(20 - i)));
assert.strictEqual((many.match(/class="story-item"/g) || []).length, 6);
assert.ok(many.includes("한마디20") && !many.includes("한마디14"));
// 정렬 안 된 입력(역순·뒤섞임)에서도 날짜 기준 최근 6개, 오름차순 표시
const asc = Array.from({ length: 9 }, (_, i) => L(10 + i)); // 10..18 오름차순 입력
const shuffled = [asc[3], asc[8], asc[0], asc[5], asc[1], asc[7], asc[2], asc[6], asc[4]];
[asc, shuffled].forEach(inp => {
  const h = storyHtml(inp);
  assert.strictEqual((h.match(/class="story-item"/g) || []).length, 6);
  [13, 14, 15, 16, 17, 18].forEach(n => assert.ok(h.includes("한마디" + n), "포함 " + n));
  [10, 11, 12].forEach(n => assert.ok(!h.includes("한마디" + n + "<"), "제외 " + n));
  const pos = [13, 14, 15, 16, 17, 18].map(n => h.indexOf("한마디" + n));
  assert.deepStrictEqual(pos, [...pos].sort((x, y) => x - y));
});
// 입력 배열을 바꾸지 않음
const keep = [L(5), L(9), L(7)]; storyHtml(keep); assert.deepStrictEqual(keep.map(x => x.id), ["L5", "L9", "L7"]);
// 오디오 없음 / 한마디 없음
const noAu = storyHtml([L(3, { best: null }), L(4, { best: null })]); assert.strictEqual(audios(noAu), 0); assert.ok(noAu.includes("한마디3"));
const noHl = storyHtml([L(3, { highlight: "" }), L(4, { highlight: "  " })]); assert.strictEqual(audios(noHl), 2); assert.ok(!noHl.includes("<p></p>"));
// 내부값·가짜 수치 없음, 주입 방지
const bad = storyHtml([L(5, { highlight: "<img src=x onerror=1>", lesson_tone: "challenging", weekly_mission: "내부", evidence: ["x"], confidence: 0.3 }), L(6)]);
assert.ok(!bad.includes("<img") && bad.includes("&lt;img"));
["challenging", "내부", "confidence", "evidence"].forEach(k => assert.ok(!bad.includes(k), k));
assert.ok(!/%|향상|점수|늘었/.test(h2));
// 수강생 격리: 넘겨받은 목록의 내용만 사용
const a = storyHtml([L(7, { highlight: "A만" }), L(8, { highlight: "A둘" })]);
assert.ok(a.includes("A만") && !a.includes("B학생"));
console.log("student-story ok");
