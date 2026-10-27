// P0 #63: 고르지 않은/검수 안 한 편집본이 학생 노트(extra_best)·링크 권한 목록에 실리지 않음
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "못 찾음 " + re); return m[0]; };
const body = [grab(/function bestOptions\(\) \{[\s\S]*?\n\}\n/), grab(/function bestPicked\(\)[^\n]*\n/),
  grab(/function bestForNote\(\) \{[\s\S]*?\n\}\n/), grab(/function buildNote\(\) \{[\s\S]*?\n\}\n/), grab(/const noteFileIds = [^\n]*\n/)].join("\n");
const comp = { status: "ok", file_id: "C1", len: 32, lines: [1] };
const run = (review, best) => new Function("cur", "$", "fmt", "sendList",
  `${body}; const n = buildNote(); return { n, ids: noteFileIds(n) };`)(
  { review, folder: { id: "L1", name: "2026-10-28 레슨" }, clips: [], best },
  () => ({ value: "fb" }), (x) => String(x), () => []);
const B = (c = comp) => ({ status: "ok", best: { file_id: "B1", len: 30 }, alternatives: [{ file_id: "B2", len: 20 }], composite: c });
const lite = (r) => ({ best: r.n.best?.file_id ?? null, extra: r.n.extra_best.length, ids: r.ids });
// 1) 안 고름 → 후보1 몰래 공개 금지, 편집본도 없음
assert.deepStrictEqual(lite(run({ sendBest: true }, B())), { best: null, extra: 0, ids: [] });
// 2) 후보1 직접 선택 → 후보1만
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 0, bestPickId: "B1" }, B())), { best: "B1", extra: 0, ids: ["B1"] });
// 3) 편집본 직접 선택 → best=편집본, 중복 없음
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C1" }, B())), { best: "C1", extra: 0, ids: ["C1"] });
// 4) 보내기 끔 → best·extra 모두 비고 권한 목록에도 없음
assert.deepStrictEqual(lite(run({ sendBest: false, bestPick: 2, bestPickId: "C1" }, B())), { best: null, extra: 0, ids: [] });
assert.deepStrictEqual(lite(run({ sendBest: false }, B())), { best: null, extra: 0, ids: [] });
// 5) 편집본 파일 ID가 바뀜(오래된 선택) → 공개하지 않음
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C0" }, B())), { best: null, extra: 0, ids: [] });
// 6) 구형 메타(편집본 없음)
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C1" }, B({ status: "none" }))), { best: null, extra: 0, ids: [] });
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 1, bestPickId: "B2" }, B({ status: "none" }))), { best: "B2", extra: 0, ids: ["B2"] });
// 7) 후보 하나뿐이면 그대로 / 베스트 분석 없음이면 없음
assert.deepStrictEqual(lite(run({ sendBest: true }, { status: "ok", best: { file_id: "B1", len: 30 } })), { best: "B1", extra: 0, ids: ["B1"] });
assert.deepStrictEqual(lite(run({ sendBest: true }, { status: "none" })), { best: null, extra: 0, ids: [] });
console.log("note-best-leak OK");
