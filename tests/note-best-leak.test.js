// P0 (#143/#63): 선생님이 직접 고르지 않은 베스트(후보 0·1·여럿, 편집본 포함)는 학생 노트·링크 권한·카톡 보내기에 실리지 않음
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "못 찾음 " + re); return m[0]; };
const body = [grab(/function bestOptions\(\) \{[\s\S]*?\n\}\n/), grab(/function bestPicked\(\)[^\n]*\n/),
  grab(/function bestForNote\(\)[^\n]*\n/), grab(/function buildNote\(\) \{[\s\S]*?\n\}\n/), grab(/const noteFileIds = [^\n]*\n/)].join("\n");
const comp = { status: "ok", file_id: "C1", len: 32, lines: [1] };
const run = (review, best) => new Function("cur", "$", "fmt", "sendList",
  `${body}; const n = buildNote(); return { n, ids: noteFileIds(n) };`)(
  { review, folder: { id: "L1", name: "2026-10-28 레슨" }, clips: [], best },
  () => ({ value: "fb" }), (x) => String(x), () => []);
const B = (c = comp) => ({ status: "ok", best: { file_id: "B1", len: 30 }, alternatives: [{ file_id: "B2", len: 20 }], composite: c });
const lite = (r) => ({ best: r.n.best?.file_id ?? null, extra: r.n.extra_best.length, ids: r.ids });
const none = { best: null, extra: 0, ids: [] };
// 다수 후보, 안 고름 → 아무것도 공개 안 함 (후보1·편집본 모두)
assert.deepStrictEqual(lite(run({ sendBest: true }, B())), none);
// 후보 1개뿐이어도 자동 선택 금지
assert.deepStrictEqual(lite(run({ sendBest: true }, { status: "ok", best: { file_id: "B1", len: 30 } })), none);
// 후보 0 / 분석 없음
assert.deepStrictEqual(lite(run({ sendBest: true }, { status: "none" })), none);
assert.deepStrictEqual(lite(run({ sendBest: true }, undefined)), none);
// 직접 고른 것만
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 0, bestPickId: "B1" }, B())), { best: "B1", extra: 0, ids: ["B1"] });
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C1" }, B())), { best: "C1", extra: 0, ids: ["C1"] });
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 0, bestPickId: "B1" }, { status: "ok", best: { file_id: "B1", len: 30 } })), { best: "B1", extra: 0, ids: ["B1"] });
// 보내기 끔
assert.deepStrictEqual(lite(run({ sendBest: false, bestPick: 2, bestPickId: "C1" }, B())), none);
// 기존 저장 상태 마이그레이션: 번호만 있고 파일 ID 없음 / 파일이 바뀜 / 편집본 사라짐 → 공개 안 함
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 0 }, B())), none);
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C0" }, B())), none);
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C1" }, B({ status: "none" }))), none);
// 카톡 보내기 경로도 같은 함수를 씀 (후보 1개 자동 선택 제거)
assert.ok(/const bp = bestForNote\(\);/.test(src), "btnShare 는 bestForNote 사용");
assert.ok(!/opts\.length === 1 \? "끄면/.test(src), "후보 1개 자동선택 안내 제거");
console.log("note-best-leak OK");
