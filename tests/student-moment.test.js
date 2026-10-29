// 학생 페이지 '오늘의 순간' 첫 화면 + 접이식 상세 시험 — student/index.html의 순수 그리기 함수를 가짜 환경에서 실행(합성 데이터)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const pick = (re) => { const m = src.match(re); assert.ok(m, "코드 조각 못 찾음: " + re); return m[0]; };
const body = [pick(/const esc = [^\n]*\n/), pick(/const md = [^\n]*\n/), pick(/function player\([\s\S]*?\n}\n/), pick(/function waveSvg\([\s\S]*?\n}\n/), pick(/function pill\([\s\S]*?\n}\n/),
  pick(/const MAX_CLIPS[^\n]*\n/), pick(/const listHtml[^\n]*\n/), pick(/const sidOk = [^\n]*\n/), pick(/const makeupOk = [^\n]*\n/), pick(/function lessonHtml\([\s\S]*?\n}\n/)].join("\n");
const lessonHtml = new Function(body + "; return lessonHtml;")();
const split = (h) => { const i = h.indexOf("<details"); return i < 0 ? [h, ""] : [h.slice(0, i), h.slice(i)]; };
const audios = (h) => (h.match(/data-(?:au|lp)="/g) || []).length;
const base = { id: "L2", date: "2026-10-26", feedback: "오늘 숨 쉬는 자리가 안정됐어요.", highlight: "두 번째 줄 끝음을 끝까지 붙잡고 있었어요.",
  practice: ["하루 한 번 허밍", "둘째 줄만 천천히"], points: ["숨", "끝음"], best: { file_id: "B2", len: 40 }, clips: [], extra_best: [] };
const prev = { id: "L1", date: "2026-10-19", best: { file_id: "B1", len: 35 } };
const INTERNAL = ["lesson_tone", "weekly_mission", "evidence", "confidence", "condition_guard", "needs_teacher_check", "낙심", "challenging"];
(() => {
  // 1. 좋았던 날(10/29 10:33 시안 C): 한마디(+베스트) → (다른 데 안 나온 순간) → 핵심 포인트 → … → 응원 → 다음 미션, 비교는 접힘
  const [top, more] = split(lessonHtml(base, null));
  const iM = top.indexOf("선생님이 발견한 오늘의 순간"), iA = top.indexOf('data-lp="B2"'), iF = top.indexOf("선생님 한마디"), iK = top.indexOf("오늘의 핵심 포인트"), iP = top.indexOf("다음 미션");
  assert.ok(iF >= 0 && iF < iA && iA < iM && iM < iK && iK < iP, "순서: 한마디(+베스트) → 순간(다른 곳에 없을 때) → 핵심 포인트 → 미션");
  assert.strictEqual(audios(top), 1);
  assert.ok(top.includes("하루 한 번 허밍") && top.includes("둘째 줄만 천천히"), "미션은 첫 화면에 모두");
  assert.ok(top.includes("숨") && top.includes("끝음"), "핵심 포인트는 첫 화면");
  assert.ok(!/<details[^>]*\bopen\b/.test(more), "상세는 학생이 눌러야 열림");
  assert.ok(!/성장|점수|%|향상/.test(top), "만든 칭찬·수치 없음");
  // 2. 첫 레슨·데이터 희소: 빈 카드/빈 상세 없음
  const sparse = lessonHtml({ id: "L0", date: "2026-10-12" }, null);
  assert.ok(!/<details|moment|class="card"/.test(sparse) && !sparse.includes("undefined") && !sparse.includes("null"));
  assert.strictEqual(audios(sparse), 0);
  // 3. 어려웠던 날: 베스트 없음 → 오디오 없이 선생님 격려 문장 우선, 라벨·내부값 노출 없음
  const hard = { id: "L3", date: "2026-10-27", highlight: "오늘은 쉽지 않았는데 끝까지 불러 주셨어요.", feedback: "다음 주엔 한 줄만 같이 해봐요.",
    lesson_tone: "challenging", weekly_mission: "내부미션", evidence: ["x"], confidence: 0.2, condition_guard: "g", needs_teacher_check: true, tone_label: "낙심" };
  const h = lessonHtml(hard, prev);
  assert.strictEqual(audios(h), 0); assert.ok(h.includes("끝까지 불러 주셨어요") && h.includes("다음 주엔"));
  INTERNAL.concat(["내부미션", "tone_label"]).forEach(k => assert.ok(!h.includes(k), "노출 금지: " + k));
  assert.ok(!h.includes("지난번과 비교"), "오늘 베스트가 없으면 비교 없음");
  // 4. 오디오 없음이어도 순간/한마디는 정상
  assert.ok(lessonHtml({ ...base, best: null }, prev).includes("두 번째 줄 끝음"));
  // 5. 클립 0 / 3 / 5개 → 최대 3개, 첫 화면 '오늘 좋았던 순간'(10/29: 접힌 곳에서 꺼냄)
  [[0, 0], [3, 3], [5, 3]].forEach(([n, want]) => {
    const clips = Array.from({ length: n }, (_, i) => ({ file_id: "K" + i, label: "구간" + i }));
    const [t, m] = split(lessonHtml({ ...base, clips }, null));
    assert.strictEqual(audios(t), 1 + want); assert.strictEqual(t.includes("더 들어 보기"), want > 0); assert.ok(!m.includes("오늘의 클립"));
  });
  // 6. 비교: 둘 다 있을 때만, 상세 안에서만
  const [t6, m6] = split(lessonHtml(base, prev));
  assert.ok(m6.includes("지난번과 비교") && audios(m6) === 2 && !t6.includes("지난번과 비교"));
  [null, undefined, { date: "2026-10-01" }, { best: null }].forEach(p => assert.ok(!lessonHtml(base, p).includes("지난번과 비교")));
  // 7. 깨진 항목과 HTML 주입
  const odd = lessonHtml({ ...base, clips: [null, {}, { file_id: "K9" }], extra_best: [null, {}], points: [null, "", "숨"], highlight: "<img src=x onerror=1>" }, null);
  assert.ok(!odd.includes("<img") && odd.includes("&lt;img"));
  assert.strictEqual(audios(split(odd)[0]), 2, "베스트 + 파일 있는 클립 1개");
  // 8. 접근성·재생·모바일·3단계 막대 제거
  assert.ok(/details\.more > summary \{ min-height:56px/.test(src), "큰 터치 영역");
  assert.ok(/addEventListener\("play"[\s\S]*?pause\(\)/.test(src), "단일 재생");
  assert.ok(/au\.onerror/.test(src), "파일 권한 오류 폴백");
  assert.ok(!/data-lev|levelBar|sn_level/.test(src));
  assert.ok(/max-width:360px/.test(src) && /name="viewport"/.test(src) && /aria-label="선생님이 발견한/.test(src));
  // 9. 회귀: 로그인·읽음·타임라인·포털 호출 코드 유지
  ["loginView", 'call("seen"', "function timeline", 'call("portal")', "playSeries", "KAKAOTALK"].forEach(k => assert.ok(src.includes(k), "유지: " + k));
  // 10. 보기 방식: 심플 = 순간·메이크업·응원·추천곡·상세 없음 / 자세히 = 상세를 펼친 채(details 없음)
  const rich = { ...base, cheer: "꾸준히 하시면 더 좋아져요", song: { title: "가짜 노래", artist: "홍길동", why: "톤과 어울려요" }, clips: [{ file_id: "K1", label: "구간" }] };
  const sim = lessonHtml(rich, prev, "simple");
  assert.ok(!sim.includes("오늘의 순간") && !sim.includes("응원 메시지") && !sim.includes("추천 곡") && !sim.includes("<details") && !sim.includes("오늘의 클립"));
  assert.ok(sim.includes("선생님 한마디") && sim.includes("다음 미션") && sim.includes('aria-pressed="true"'));
  const nor = lessonHtml(rich, prev, "normal");
  assert.ok(nor.includes("응원 메시지") && nor.includes("가짜 노래") && nor.includes("(홍길동)") && nor.includes("<details"));
  const det = lessonHtml(rich, prev, "detail");
  assert.ok(!det.includes("<details") && det.includes("더 들어 보기") && det.includes("지난번과 비교"));
  assert.strictEqual(lessonHtml(rich, prev, "이상한값"), nor, "모르는 값은 보통");
  assert.ok(src.includes('LS.set("sn_mode"'), "고른 보기 방식 기억");
  console.log("student-moment ok (10 scenarios)");
})();
