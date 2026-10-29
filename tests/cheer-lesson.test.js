// (10/29 사용자: 응원이 너무 일반적) 응원 = 그날 레슨 사실(좋았던 구절·나아진 지도·포인트·미션)로. AI 초안 응원이 있으면 기본값. 포인트 소리 칸 옆 ▶ 듣기
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (n) => { const m = src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n")); assert.ok(m, n); return m[0]; };
const F = new Function("sendList", grab("cheerFacts") + grab("lessonCheer") + "return { cheerFacts, lessonCheer };")(() => [{ id: "C1", start: 100, end: 112 }]);
const me = { st: { name: "홍길동" }, review: { speakers: { A: "teacher", B: "student" }, points: ["잘 까지는 '오', '는'을 매끄럽게 잡기"], practice: ["두 마디만 천천히 매끄럽게"] },
  segs: [{ start: 98, end: 104, speaker: "A", text: "자 다시" }, { start: 101, end: 110, speaker: "B", text: "언젠가는 우리 다시 만나리" }],
  ana: { coaching: [{ issue: "낮은 음에서 공기가 샘", change: "improved", after: { lyric: "어디로 가는지 아무도 모르지만" } }] } };
const f = F.cheerFacts(me);
assert.strictEqual(f.lyric, "언젠가는 우리 다시 만나리", "선생님 말은 빼고 부른 가사");
assert.strictEqual(f.upIssue, "낮은 음에서 공기가 샘"); assert.ok(f.point && f.mission);
for (const k of [0, 1, 2]) for (let r = 0; r < 20; r++) { const t = F.lessonCheer(k, "", f); assert.ok(t && /‘.+’/.test(t), "레슨 사실이 들어간 문장: " + t); }
// 같은 문장 연속 안 나옴, 사실이 없으면 빈 문자열(→ 기존 문구로)
const one = F.lessonCheer(2, "", { mission: "숨 채우기" }); assert.strictEqual(F.lessonCheer(2, one, { mission: "숨 채우기" }), "");
assert.strictEqual(F.lessonCheer(0, "", {}), "");
// 너무 긴 조각은 중간에서 자르지 않고 단어 경계에서, 안 되면 빼기
assert.ok(F.cheerFacts({ ...me, review: { ...me.review, points: ["가".repeat(60)] } }).point === "");
// 연결: AI 초안 응원은 아직 안 정했을 때만 기본값, 버튼, 포인트 소리 ▶
assert.ok(src.includes('if (review.cheer == null && typeof ai.cheer === "string" && ai.cheer.trim()) review.cheer = ai.cheer.trim();'));
assert.ok(src.includes('data-pvcheer="ai"') && src.includes("lessonCheer(+b.dataset.pvcheer, el.value, cheerFacts(me))"));
assert.ok(src.includes('data-pvsndplay="${i}"') && /data-pvsndplay[\s\S]{0,400}playShared\(b, c\.file_id\)/.test(src));
console.log("cheer-lesson ok");
