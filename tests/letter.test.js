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
