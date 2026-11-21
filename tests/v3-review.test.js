// (11/21 화면 개편 4단계) 새 검수 화면 — 상태 문구·버튼, 노란 문장 표시(안전한 글), 미션 후보, 다음 검토 고르기, 연결
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const V = new Function(T.match(/\/\/#v3-begin\n([\s\S]*?)\/\/#v3-end/)[1] + "return { v3Status, v3Mark, v3MissionChoices, v3NextTarget };")();
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const M = (o) => ({ off: false, warn: [], other: [], st: "", ...o });
// 상태
assert.deepEqual([V.v3Status(M({ warn: [{}, {}] })).can, V.v3Status(M({ warn: [{}, {}] })).btn], [false, "공개하기 (확인 2개 남음)"], "노란 문장이 남으면 공개 못 함");
assert.equal(V.v3Status(M({ other: [{ msg: "이번 주 미션이 ‘미설정’이에요" }] })).can, false);
assert.ok(V.v3Status(M({ other: [{ msg: "이번 주 미션이 ‘미설정’이에요" }] })).msg.includes("미설정"), "막는 이유를 그대로 보여 줌");
assert.equal(V.v3Status(M({})).can, true); assert.equal(V.v3Status(M({})).btn, "공개하기");
assert.equal(V.v3Status(M({ st: "published" })).can, false, "고친 게 없으면 다시 공개 버튼 안 켜짐");
assert.equal(V.v3Status(M({ st: "published_stale" })).can, true);
assert.equal(V.v3Status(M({ off: true, warn: [{}] })).can, false, "동의 철회·선생님 본인은 공개 안 함");
// 노란 문장: 글은 안전하게(태그 무력화), 확인할 문장만 표시
const h = V.v3Mark("안녕 <b>x</b>\n후렴 끝음이 낮아요.", [{ text: "후렴 끝음이 낮아요." }], esc);
assert.ok(h.includes("&lt;b&gt;x&lt;/b&gt;") && h.includes('<mark class="v3w">후렴 끝음이 낮아요.</mark>') && h.includes("<br>"));
assert.ok(!V.v3Mark("<script>", [], esc).includes("<script>"));
// 미션 후보
assert.deepEqual(V.v3MissionChoices(["립트릴 3분"], ["립트릴 3분", "허밍 5분"], "후렴만 천천히"), ["립트릴 3분", "허밍 5분", "후렴만 천천히"]);
assert.equal(V.v3MissionChoices(["a"], ["b", "c", "d", "e"], "f").length, 4);
// 다음 검토: 같은 수강생 먼저, 오래된 날짜 먼저, 14일 넘은 것·이미 공개·지금 레슨 빼고
const rows = (xs) => xs.map(([d, o]) => ({ l: { name: d + "_레슨" }, ai: true, fb: false, pub: false, ...o }));
const S = { A: { name: "가", _rows: rows([["2026-11-20"], ["2026-11-18"], ["2026-11-10", { pub: true }]]) }, B: { name: "나", _rows: rows([["2026-11-15"], ["2026-10-01"]]) } };
const days = (n) => (Date.parse("2026-11-21") - Date.parse(n.slice(0, 10))) / 864e5;
assert.deepEqual(V.v3NextTarget(S, { sid: "A", i: 0 }, days), { sid: "A", i: 1, name: "가", date: "2026-11-18", same: true });
assert.deepEqual(V.v3NextTarget({ B: S.B }, { sid: "A", i: 0 }, days).i, 0, "다른 수강생 · 14일 넘은 것 뺌");
assert.equal(V.v3NextTarget({ B: { name: "나", _rows: rows([["2026-11-15", { ai: false }]]) } }, null, days), null, "AI 초안 없으면 대상 아님");
// 연결: 옛 화면 함수 재사용, 켜기 설정, 카톡 보냄 즉시 표시·되돌리기
assert.ok(/async function v3Publish\(me\) \{[\s\S]*?await saveReview\(false\)/.test(T), "공개는 옛 화면과 같은 saveReview(false) → publishOnSave");
assert.ok(/sentQuickAct\(me, b\.dataset\.v3a/.test(T), "노란 문장 맞아요·빼기는 같은 함수");
assert.ok(/id="v3Btn">✨ 새 검수 화면\(시험\)/.test(T) && /LS\.set\(V3_KEY, e\.target\.checked \? 1 : 0\)/.test(T), "옛 화면에서 켜고 끔");
assert.ok(/await mark\(true\); location\.href = /.test(T) && /id="v3KkUndo">되돌리기/.test(T), "복사·카톡 열기 순간 보냄 표시, 되돌리기");
assert.ok(/if \(k === "fb"\) \{ updateFeedbackDraft\(v\); if \(rv\.fb_v === 2 && fbMoveBlocks\(rv\)\)/.test(T), "한마디 고치기도 목록은 칸으로(3단계 규칙)");
console.log("v3-review OK");
