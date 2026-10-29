// (10/29 10:33 사용자 확정 시안 C) 한마디 = 편지: 글 속 포인트 줄 → 번호 포인트(+소리), 연습 줄은 글에서 빼서 응원 다음 '다음 미션'. 제목 줄 없으면 따로 카드
const fs = require("fs"), assert = require("assert");
const s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const esc = (x) => String(x ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const g = (n) => s.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n"))[0], c = (re) => s.match(re)[0];
const lessonHtml = new Function("esc", c(/const md = [^\n]*\n/) + g("waveSvg") + g("pill") + g("player") + c(/const MAX_CLIPS[^\n]*\n/) + c(/const listHtml = [^\n]*\n/) + c(/const sidOk = [^\n]*\n/) + c(/const makeupOk = [^\n]*\n/) + g("lessonHtml") + ";return lessonHtml;")(esc);
const fb = "홍길동님, 오늘 수고 많으셨어요!\n\n오늘 중요한 포인트\n· 낮은 소리 단단하게\n· 오 는 매끄럽게\n\n이번 주 연습\n· 두 마디만 천천히\n\n다음에 봬요";
const L = { date: "2026-10-25", feedback: fb, points: ["낮은 소리 단단하게", "오 는 매끄럽게"], practice: ["두 마디만 천천히"], clips: [{ file_id: "K1", note: "숨을 잘 씀" }],
  point_snd: [{ p: 1, kind: "clip", file_id: "K1" }], best: { file_id: "B", len: 30, edited: true }, cheer: "힘내요", highlight: "숨을 잘 씀" };
const h = lessonHtml(L, null, "normal"), i = (k) => h.indexOf(k);
assert.ok(!h.includes("⭐ 오늘의 핵심 포인트"), "포인트는 글 안에(따로 카드 없음)");
assert.ok(i("다음에 봬요") > i('data-lp="K1"') && i('data-lp="K1"') > i("오 는 매끄럽게") && i("🔎 숨을 잘 씀") < i('data-lp="K1"'), "포인트 바로 아래 소리, 위에 메모");
assert.strictEqual(h.split("두 마디만 천천히").length - 1, 1, "연습은 한 번만(글에서 빠짐)");
assert.ok(!h.includes("이번 주 연습") && i("응원 메시지") < i("다음 미션") && i("다음 미션") < i("두 마디만 천천히"), "연습 = 응원 다음 미션 카드");
assert.ok(!h.includes("선생님이 발견한 오늘의 순간"), "순간 문장은 소리 위 메모로");
assert.ok(i("다음에 봬요") < i('data-lp="B"'), "베스트는 한마디 끝");
// 제목 줄이 없는 글: 예전처럼 핵심 포인트 카드
const h2 = lessonHtml({ ...L, feedback: "오늘 수고하셨어요" }, null, "normal");
assert.ok(h2.includes("⭐ 오늘의 핵심 포인트") && h2.includes('data-lp="K1"') && h2.includes("두 마디만 천천히"));
// 미션 배열이 비어 있으면 글의 연습 줄로
assert.ok(lessonHtml({ ...L, practice: [] }, null, "normal").includes("📋 다음 미션"));
// 심플: 소리는 없고 글·베스트·미션
const h3 = lessonHtml(L, null, "simple"); assert.ok(!h3.includes('data-lp="K1"') && h3.includes('data-lp="B"') && h3.includes("다음 미션") && h3.includes("오 는 매끄럽게"));
// 주입 방지
assert.ok(!lessonHtml({ ...L, feedback: "오늘 중요한 포인트\n· <img src=x>" }, null).includes("<img"));
console.log("letter ok");
// (10/29 11:05) '좋았던 부분' 줄과 같은 시각의 좋았던 순간 소리 → 그 줄 아래(▶시각 대신), 더 들어 보기에서 빠짐. 짝 없는 시각은 ▶ 그대로
{ const fb2 = "홍길동님!\n\n오늘 특히 좋았던 부분\n· 8:24 '오' 발음 좋았어요\n· 11:16 숨을 표현적으로\n· 20:00 마무리\n\n오늘 중요한 포인트\n· 낮은 소리";
  const L2 = { date: "2026-10-25", feedback: fb2, points: ["낮은 소리"], practice: [], clips: [{ file_id: "G1", label: "8:24 구간", note: "오 발음" }, { file_id: "G2", label: "11:15 구간", note: "숨" }, { file_id: "G3", label: "30:00 구간", note: "다른 것" }],
    full: { file_id: "F", segs: [[1, "t", "x"]] } };
  const h4 = lessonHtml(L2, null, "normal"), j = (k) => h4.indexOf(k);
  assert.ok(j("'오' 발음 좋았어요") < j('data-lp="G1"') && j('data-lp="G1"') < j("숨을 표현적으로") && j('data-lp="G2"') < j("20:00 마무리") === false || j('data-lp="G2"') < j("마무리"));
  assert.ok(!h4.includes('data-ftc="504"') && !h4.includes('data-ftc="676"') && h4.includes('data-ftc="1200"'), "짝 있는 시각은 버튼으로 바뀌고, 없는 건 ▶ 그대로");
  assert.ok(j("더 들어 보기") > 0 && j('data-lp="G3"') > j("더 들어 보기") && h4.split('data-lp="G1"').length === 2, "남은 소리만 더 들어 보기");
  const h5 = lessonHtml({ ...L2, clips: L2.clips.slice(0, 2) }, null, "normal"); assert.ok(!h5.includes("더 들어 보기"), "다 들어가면 카드 없음");
  assert.ok(!lessonHtml(L2, null, "simple").includes('data-lp="G1"'), "심플은 소리 없음");
  console.log("letter inline ok"); }
// (10/29 11:06) 응원 + 다음 미션 = 한 카드(응원 먼저), 응원 비면 그날 레슨으로 기본 문장
{ const hh = lessonHtml(L, null, "normal"); const card = hh.match(/<div class="card cheer mission">[\s\S]*?두 마디만 천천히/);
  assert.ok(card && card[0].indexOf("응원 메시지") < card[0].indexOf("다음 미션"), "한 카드 안에 응원 → 미션");
  assert.ok(lessonHtml({ ...L, cheer: "" }, null, "normal").includes('<div class="card cheer mission"><h2>📋 다음 미션</h2>'), "응원 없으면 미션만");
  const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(t.includes('if (cur.review && cur.review.cheer == null && typeof lessonCheer === "function")'), "비어 있으면 레슨 기반 기본 응원");
  console.log("letter cheer ok"); }
