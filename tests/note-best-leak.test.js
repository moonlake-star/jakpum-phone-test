// P0 (#143/#63) + 단일 베스트 편집본(#83): 선생님이 '그 파일'을 직접 [포함]하지 않은 베스트 편집본·메이크업본은
// 학생 노트·링크 권한(file IDs)·카톡 보내기에 실리지 않음. 두 항목은 서로 독립.
// (2026-10-29 사용자 결정 변경) 베스트 편집본 = 기본 포함(그 파일 체크를 끈 경우만 뺌), 메이크업본 = 기본 미선택 그대로.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "못 찾음 " + re); return m[0]; };
const body = [grab(/function bestOptions\(\) \{[\s\S]*?\n\}\n/), grab(/function bestPicked\(\)[^\n]*\n/), grab(/function bestMakeupAudio\(o\) \{[\s\S]*?\n\}\n/),
  grab(/const inclOk = [^\n]*\n/), grab(/function bestForNote\(\)[^\n]*\n/), grab(/function makeupForNote\(\)[^\n]*\n/),
  grab(/function buildNote\(\) \{[\s\S]*?\n\}\n/), grab(/const noteFileIds = [^\n]*\n/), grab(/function contentSig\(note\) \{[\s\S]*?\n\}\n/),
  grab(/function fnv\(s\)[^\n]*\n/), grab(/function bestMakeupJob\(o\) \{[\s\S]*?\n\}\n/)].join("\n");
const COMP = { status: "ok", file_id: "C1", len: 32, lines: [1] };
const B = (c = COMP) => ({ status: "ok", best: { file_id: "B1", len: 30 }, alternatives: [{ file_id: "B2", len: 20 }], composite: c });
// 메이크업 작업: lesson L1, 소스=C1, 결과 mix.mp3 = M1
const JOB = (over = {}, files = [{ id: "M1", name: "mix.mp3" }]) => ({ req: { lesson_folder: "L1", source_id: "C1", best_file_id: "C1", status: "done", result: { measure: { duration_sec: 31.6 } }, ...over }, files });
const run = (review, best, jobs = []) => new Function("cur", "$", "fmt", "sendList",
  `${body}; const n = buildNote(); return { n, ids: noteFileIds(n), sig: contentSig(n) };`)(
  { review, folder: { id: "L1", name: "2026-10-28 레슨" }, clips: [], best, st: { _jobs: jobs } },
  () => ({ value: "fb" }), (x) => String(x), () => []);
const lite = (r) => ({ best: r.n.best?.file_id ?? null, makeup: r.n.makeup?.file_id ?? null, extra: r.n.extra_best.length, ids: r.ids });
const none = { best: null, makeup: null, extra: 0, ids: [] };
const inc = (b, m) => ({ ...(b === undefined ? {} : { bestInclude: b, bestIncludeId: "C1" }), ...(m === undefined ? {} : { makeupInclude: m, makeupIncludeId: "M1" }) });

// (10/30 사용자) 첫 진입(미선택) → 베스트·메이크업본 모두 기본 포함(한 곡 [원음 | 보정본])
const bestOnly = { best: "C1", makeup: null, extra: 0, ids: ["C1"] }, both = { best: "C1", makeup: "M1", extra: 0, ids: ["C1", "M1"] };
assert.deepStrictEqual(lite(run({}, B(), [JOB()])), both);
// 단일 테이크만 있고 편집본이 없으면(후보 0/1/여럿, 실패, 대기, 분석 없음) 자동 선택·대체 금지
for (const best of [{ status: "ok", best: { file_id: "B1", len: 30 } }, B({ status: "error" }), B({ status: "none", fallback: "best_take" }), B(null), { status: "none" }, undefined])
  assert.deepStrictEqual(lite(run(inc(true, true), best, [JOB()])), none);
// 편집본만 포함 / 메이크업본만 포함 / 둘 다 — 서로 독립
assert.deepStrictEqual(lite(run(inc(true), B(), [JOB()])), both);
assert.deepStrictEqual(lite(run(inc(undefined, true), B(), [JOB()])), { best: "C1", makeup: "M1", extra: 0, ids: ["C1", "M1"] });
assert.deepStrictEqual(lite(run(inc(true, true), B(), [JOB()])), { best: "C1", makeup: "M1", extra: 0, ids: ["C1", "M1"] });
assert.deepStrictEqual(lite(run(inc(false, true), B(), [JOB()])), { best: null, makeup: "M1", extra: 0, ids: ["M1"] });   // 제외 = 숨김일 뿐
assert.deepStrictEqual(lite(run(inc(true, false), B(), [JOB()])), { best: "C1", makeup: null, extra: 0, ids: ["C1"] });
// 메이크업 음원이 없는 모든 경우: 포함이라 기록돼 있어도 실리지 않음(없는 음원 공유 금지)
for (const jobs of [[], [JOB({ status: "queued" })], [JOB({ status: "error" })], [JOB({}, [])], [JOB({}, [{ id: "X", name: "vocal_dry.mp3" }])],
  [JOB({ best_file_id: "OLD" })], [JOB({ source_id: "OLD", best_file_id: "OLD" })], [JOB({ lesson_folder: "OTHER" })]])
  assert.deepStrictEqual(lite(run(inc(undefined, true), B(), jobs)), bestOnly, JSON.stringify(jobs));
// 파일 ID 검증: 메이크업은 고른 뒤 파일이 바뀌면 다시 골라야 함. 베스트는 '뺀' 파일이 바뀌면 다시 기본 포함
assert.deepStrictEqual(lite(run({ bestInclude: true, bestIncludeId: "C0" }, B(), [])), bestOnly);
assert.deepStrictEqual(lite(run({ bestInclude: true }, B(), [])), bestOnly);
assert.deepStrictEqual(lite(run({ bestInclude: false, bestIncludeId: "C0" }, B(), [])), bestOnly, "예전 파일을 뺀 기록은 새 편집본에 안 옮겨감");
assert.deepStrictEqual(lite(run({ bestInclude: false, bestIncludeId: "C1" }, B(), [])), none, "지금 파일을 끄면 뺌");
assert.deepStrictEqual(lite(run({ makeupInclude: false, makeupIncludeId: "M0" }, B(), [JOB()])), both, "예전 파일을 뺀 기록은 새 메이크업본에 안 옮겨감");
// 옛 저장 상태(sendBest/bestPick) 는 무시 — 무단 공개 없음
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 2, bestPickId: "C1" }, B(), [JOB()])), both);
assert.deepStrictEqual(lite(run({ sendBest: true, bestPick: 0, bestPickId: "B1" }, B(), [])), bestOnly);
// extra_best 재유출 금지: 어떤 경우에도 빈 배열
assert.strictEqual(run(inc(true, true), B(), [JOB()]).n.extra_best.length, 0);
// 저장/재로드: review 를 JSON 으로 왕복해도 선택 유지, 포함 상태가 바뀌면 승인 지문(contentSig)도 달라져 재승인 필요
const rv = inc(true, true), re = JSON.parse(JSON.stringify(rv));
assert.deepStrictEqual(lite(run(re, B(), [JOB()])), { best: "C1", makeup: "M1", extra: 0, ids: ["C1", "M1"] });
assert.notStrictEqual(run(inc(true, true), B(), [JOB()]).sig, run(inc(true, false), B(), [JOB()]).sig);
assert.notStrictEqual(run(inc(false), B(), [JOB()]).sig, run({}, B(), [JOB()]).sig);
// 직렬화: 메이크업 항목은 원본 편집본과 별개 파일 ID 로 기록
assert.deepStrictEqual(run(inc(true, true), B(), [JOB()]).n.makeup, { file_id: "M1", len: 32, source_file_id: "C1", msg: "" });
// 카톡 보내기 경로도 같은 함수를 씀
assert.ok(/const bp = bestForNote\(\);/.test(src) && /const mkp = makeupForNote\(\);/.test(src), "btnShare 는 bestForNote/makeupForNote 사용");
console.log("note-best-leak OK");
