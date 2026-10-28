// 학생 페이지 메이크업 카드 시험 — student/index.html의 그리기 함수를 가짜 환경에서 실행(합성 데이터, 실음원 없음)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const pick = (re) => { const m = src.match(re); assert.ok(m, "코드 조각 못 찾음: " + re); return m[0]; };
const body = [pick(/const esc = [^\n]*\n/), pick(/const md = [^\n]*\n/), pick(/function player\([\s\S]*?\n}\n/), pick(/const MAX_CLIPS[^\n]*\n/),
  pick(/const listHtml[^\n]*\n/), pick(/const sidOk = [^\n]*\n/), pick(/const makeupOk = [^\n]*\n/), pick(/function lessonHtml\([\s\S]*?\n}\n/)].join("\n");
const lessonHtml = new Function(body + "; return lessonHtml;")();
const base = { id: "L2", date: "2026-10-26", feedback: "한마디", best: { file_id: "B2", len: 40 }, clips: [], extra_best: [] };
const MK = { file_id: "M2", len: 38, source_file_id: "B2" };
const au = (h) => (h.match(/data-au="([^"]*)"/g) || []).map(x => x.slice(9, -1));
const cardCount = (h) => (h.match(/class="card makeup"/g) || []).length;

// 정상: best 카드와 구분된 메이크업 카드 1개, 플레이어 id 서로 다름
let h = lessonHtml({ ...base, makeup: MK }, null);
assert.strictEqual(cardCount(h), 1); assert.deepStrictEqual(au(h), ["B2", "M2#m"]);
assert.ok(h.indexOf('data-au="B2"') < h.indexOf('data-au="M2#m"') && h.includes("메이크업"));
// 비노출: 없음/null/빈 ID/ID 누락/원본 불일치/원본 누락/베스트와 같은 파일
[undefined, null, {}, { ...MK, file_id: "" }, { ...MK, file_id: "  " }, { ...MK, file_id: 5 }, { ...MK, source_file_id: "OLD" }, { ...MK, source_file_id: undefined },
  { file_id: "B2", source_file_id: "B2" }, "M2", []].forEach((m, i) => {
  const o = lessonHtml({ ...base, makeup: m }, null);
  assert.strictEqual(cardCount(o), 0, "비노출 #" + i); assert.deepStrictEqual(au(o), ["B2"], "빈 플레이어 금지 #" + i);
  assert.ok(!o.includes("undefined") && !o.includes("null"));
});
// 베스트 없이 메이크업만: 원본 ID가 있으면 표시, 없으면 비표시
h = lessonHtml({ ...base, best: null, makeup: MK }, null); assert.deepStrictEqual(au(h), ["M2#m"]);
assert.strictEqual(cardCount(lessonHtml({ ...base, best: null, makeup: { file_id: "M2" } }, null)), 0);
// 베스트만 있으면 기존 그대로, 구버전 노트(makeup 키 없음)도 비노출
assert.deepStrictEqual(au(lessonHtml(base, null)), ["B2"]);
// 보안: ID에 HTML 주입해도 이스케이프, 내부 필드 비노출
h = lessonHtml({ ...base, makeup: { ...MK, file_id: 'M"><img src=x>', job_id: "SECRET", status: "done" } }, null);
assert.ok(!h.includes("<img") && !h.includes("SECRET") && !h.includes("done"));
// 재생 연결: '#m' 접미사를 벗겨 원래 파일 ID로 요청
assert.ok(src.includes('replace(/#[bsmp]$/, "")'), "#m 접미사 제거");
// A/B 동기 전환은 미구현 — 학생 화면이 약속하지 않음
assert.ok(!/동기|A\/B 전환/.test(h));
console.log("student-makeup test ok");
