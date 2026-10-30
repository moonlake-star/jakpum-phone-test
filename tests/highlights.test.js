// 오늘의 하이라이트(최대 3개): 실제 10/25 김미영 레슨 전사·후보 구조를 줄인 자료로 검증
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/const HL_MAX[\s\S]*?\nfunction computeHighlights[\s\S]*?\n\}\n/)[0];
const computeHighlights = new Function(code + "; return computeHighlights;")();
const S = (start, end, speaker, text) => ({ start, end, speaker, text });
const segs = [S(356.4, 437.3, "A", "일단. 젊은 날은 … 한번 해보세요."), S(439.2, 465.5, "B", "우린 좀 벗어나 사랑을 했구나 젊은 날의 젊음을 모르고"),
  S(465.9, 476.9, "A", "그만해? 좋았어요. 여기 4를 너무.."), S(551.6, 591.3, "A", "여기 집중해서 해보시라고요."), S(592.2, 595.2, "B", "그렇죠!"),
  S(596.9, 615.9, "A", "한 번 더 다시. 오늘 컨디션 치고 매우 잘했어요."), S(663.3, 703.0, "B", "하지만 이제 뒤돌아보니 우리는 젊고"),
  S(706.4, 720.8, "A", "는 할 때 까져버리잖아요. 잡아야겠다."), S(721.0, 721.1, "B", "거기가?"), S(721.4, 767.7, "A", "언젠가는? 그렇죠! 좋았어요."),
  S(775.9, 803.2, "B", "우리 다시 만나리 어디로 가는지 아무도 모르지만"), S(805.3, 819.6, "A", "시 하기 직전에 숨 쉰 거는 매우 잘했어요."),
  S(875.9, 880.8, "A", "날의 젊음 잡고 안 세게."), S(882.2, 885.2, "B", "더"), S(888.0, 888.5, "A", "잡으세요."), S(889.5, 892.5, "B", "좋아요."),
  S(894.6, 895.0, "A", "잘했어요."), S(910.5, 928.5, "B", "떠내려가는 건 안다 말해주고 오 좋아요!"), S(928.5, 940.1, "A", "숨이 떨려가지고 하나 둘 셋 넷"),
  S(940.1, 964.5, "B", "우리 다시 만나리 어디로 가는지"), S(968.5, 1005.7, "A", "오, 잘했어요. 전체적으로 매우 잘했어요.")];
const role = (sp) => sp === "A" ? "teacher" : "student";
const cue = (start, text) => ({ kind: "praise", start, text });
const cands = [{ id: "C001", score: 1.5, cues: [cue(465.857, "좋았어요")] }, { id: "C002", score: 3.1, cues: [cue(592.158, "그렇죠"), cue(596.918, "잘했")] },
  { id: "C004", score: 3.6, cues: [cue(721.388, "좋았어요"), cue(775.878, "잘했"), cue(805.282, "잘했")] },
  { id: "C005", score: 3.0, cues: [cue(889.494, "좋아요"), cue(894.594, "잘했"), cue(910.488, "좋아요")] }, { id: "C006", score: 2.8, cues: [cue(968.504, "잘했")] }];
const best = [{ cand: "C004", start: 767.34, end: 805.68, praise: { t: 805.282, text: "잘했" } }, { cand: "C006", start: 939.67, end: 968.9, praise: { t: 968.504, text: "잘했" } }];
const h = computeHighlights(cands, segs, role, best);
assert.strictEqual(h.length, 4, "10/28: 최대 5개까지(겹치는 후보는 하나로)");
assert.deepStrictEqual(h.slice(0, 1).map(x => [x.n, x.cand, x.isBest]), [[1, "C004", true]]);
assert.deepStrictEqual(h.map(x => x.cand).filter(c => ["C001", "C006"].includes(c)), ["C001", "C006"], "기존 3개는 그대로 포함");
assert(/const HL_MAX = 5/.test(src) && /k > 0 && !cur\.hlOpen \? " hidden"/.test(src), "처음엔 1개만, 펼치면 최대 5개");
assert.ok(h[0].end >= 815 && h[0].end <= 815.4, "베스트는 칭찬 말까지(최대 10초)");
assert.ok(h[0].praise.startsWith("잘했"));
assert.ok(h[1].start === 439.2 && h[1].end > 465.9, "노래 + 칭찬 말까지");
// 수강생이 한 '좋아요'(910.5 B)·노래가 6초 안 되는 칭찬(596.9)은 하이라이트가 아님
assert.ok(!h.some(x => Math.abs(x.start - 592.2) < 1 || Math.abs(x.praiseAt - 910.5) < 1));
// 다른 후보를 고르면 그게 ①
const h2 = computeHighlights(cands, segs, role, [best[1], best[0]]);
assert.strictEqual(h2[0].cand, "C006"); assert.ok(h2[0].isBest);
// 칭찬이 없는 레슨 → 0개(억지로 채우지 않음)
assert.deepStrictEqual(computeHighlights([], segs, role, []), []);
// (10/30 사용자) 수강생이 빠르게 말한 구간(대화) 뒤 '맞아요'는 하이라이트가 아님
const talkSegs = [S(1470, 1486, "A", "자 그럼 한번 맞춰 볼게요 이번엔 끝까지"),
  S(1488.5, 1510.1, "B", "여기 있나에서 체크해 드릴게요 세모에서 세모로 선생님 이거 톤 어떤 것 같아요 원래 본 그거는 사각폰 썼거든요"),
  S(1511.2, 1519.7, "A", "사카포도 될 것 같아요 맞아요")];
assert.deepStrictEqual(computeHighlights([{ id: "C9", score: 1, cues: [cue(1511.3, "맞아요")] }], talkSegs, role, []), []);
const sungSegs = [talkSegs[0], S(1488.5, 1510.1, "B", "먼 곳에 있지 않아요 내 곁에 가까이 있어요"), talkSegs[2]];
assert.strictEqual(computeHighlights([{ id: "C9", score: 1, cues: [cue(1511.3, "맞아요")] }], sungSegs, role, []).length, 1, "같은 자리라도 노래면 하이라이트");
console.log("highlights ok");
