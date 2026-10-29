// (10/29 11:00 사용자) 글 속 ▶시각·말풍선 → 재생바에 어디부터 어디까지(노란 칸), 불러오는 중 표시. 선생님 미리보기·수강생 같은 계산
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const g = (src, n) => src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n"))[0];
assert.strictEqual(g(t, "rangeAt"), g(s, "rangeAt"), "두 화면 같은 계산");
const rangeAt = new Function(g(s, "rangeAt") + "return rangeAt;")();
const rng = [[502, 518], [670, 690]], starts = [500, 505, 510, 530, 676];
assert.deepStrictEqual(rangeAt(504, rng, starts), [502, 518], "좋았던 순간 구간");
assert.deepStrictEqual(rangeAt(501, rng, starts), [501, 518], "조금 앞 시각도 그 구간");
assert.deepStrictEqual(rangeAt(600, rng, starts), [600, 630], "구간이 없으면 다음 말까지(최대 30초)"); assert.deepStrictEqual(rangeAt(520, rng, starts), [520, 530], "다음 말까지");
assert.deepStrictEqual(rangeAt(505, rng, starts, true), [505, 510], "말풍선은 그 말만");
assert.deepStrictEqual(rangeAt(800, [], []), [800, 815]);
assert.ok(s.includes('lab.textContent = "⏳ 불러오는 중… · " + base') && s.includes('id="fbMarks"'));
assert.ok(t.includes("body.pvOpen #busy, body.pvOpen #pop { z-index:99; }"), "미리보기 위에도 불러오는 중");
assert.ok(/miniMarks\(\[\{ start: r\[0\], end: r\[1\] \}\], 0\)/.test(t) && t.includes("rng: chipRanges()"));
assert.ok(s.includes("const r = segOnly ? null : rangeAt(t, full.rng, starts)") && t.includes("if (tt.dataset.ftc == null) { miniMarks([]);"), "말풍선은 노란 칸 없음");
console.log("chip-range ok");
// (10/29 12:58) 긴 후보 구간은 45초까지, 구간 버튼 막대 누르면 그 자리부터
assert.deepStrictEqual(rangeAt(504, [[500, 640]], []), [500, 549]);
assert.ok(s.includes("seekTo = t0 + Math.min(1, Math.max(0, (e.clientX - r.left)") && t.includes("const r = wvx.getBoundingClientRect(), to = t0 +"));

console.log("chip-range seg ok");
