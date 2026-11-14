// (11/12 23:15) 검수.json 여러 개 → 최신 기준 합치기 · 열 때마다 새로 확인
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = H.slice(H.indexOf("function revMerge(a, b) {"), H.indexOf("async function openLesson(...a) {"));
const revMerge = new Function(src + "; return revMerge;")();
const newer = { speakers: { A: "teacher" }, speakers_confirmed_at: "t2", feedback: "", decisions: {} };
const older = { speakers: { A: "student", B: "student" }, feedback: "선생님 글", decisions: { x: 1 }, practice: ["립트릴"] };
const m = revMerge(newer, older);
assert.deepStrictEqual(m.speakers, { A: "teacher", B: "student" }, "최신이 이김, 빈 것은 채움");
assert.strictEqual(m.feedback, "선생님 글"); assert.strictEqual(m.speakers_confirmed_at, "t2"); assert.deepStrictEqual(m.decisions, { x: 1 }); assert.deepStrictEqual(m.practice, ["립트릴"]);
assert.ok(H.includes("const revListP = list(l.id)") && H.includes("lst.filter(f => f.name === REVIEW)"), "열 때 새로 확인(11/14: 레슨 자료 읽기와 동시에 요청)");
console.log("review-dedupe ok");
