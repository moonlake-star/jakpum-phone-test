// 들을 거리 먼저(2026-10-29 사용자): 베스트 맨 위·좋았던 순간 클립 첫 화면·글 속 시각 ▶·지도 전→후, 베스트 기본 포함
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const grab = (s, re) => { const m = s.match(re); assert.ok(m, "없음 " + re); return m[0]; };
const body = [grab(stu, /const esc = [^\n]*\n/), grab(stu, /const md = [^\n]*\n/), grab(stu, /function player\([\s\S]*?\n}\n/), grab(stu, /const MAX_CLIPS[^\n]*\n/),
  grab(stu, /const listHtml[^\n]*\n/), grab(stu, /const sidOk = [^\n]*\n/), grab(stu, /const makeupOk = [^\n]*\n/), grab(stu, /function lessonHtml\([\s\S]*?\n}\n/)].join("\n");
const lessonHtml = new Function(body + "; return lessonHtml;")();
const L = { id: "L", date: "2026-10-25", feedback: "오늘 좋았던 부분\n· 8:24 '오' 발음\n· 9:11~12:01 구간\n비율 10:30:20 은 아님", points: ["호흡"], practice: ["숨 5번"], clips: [{ file_id: "K1", label: "1:00 구간", note: "좋았던 브릿지" }], extra_best: [],
  best: { file_id: "B", len: 30, edited: true, joined: true }, highlight: "후렴 호흡", full: { file_id: "LISTEN", segs: [[1, "t", "안녕"]] }, pairs: [{ file_id: "P1", label: "첫 소절 톤" }] };
let h = lessonHtml(L, null, "normal");
// 순서: 베스트 → 좋았던 순간(클립) → 오늘의 순간 → 한마디 → 핵심 포인트(전→후)
const i = (k) => h.indexOf(k);
assert.ok(i('class="card bestTop"') < i("오늘 좋았던 순간") && i("오늘 좋았던 순간") < i("선생님이 발견한 오늘의 순간") && i("선생님이 발견한 오늘의 순간") < i("선생님 한마디") && i("선생님 한마디") < i("오늘의 핵심 포인트"));
assert.ok(h.includes("좋았던 브릿지") && h.includes('data-au="K1"'), "클립이 첫 화면");
// 글 속 시각 → ▶ 버튼(초), 범위 양끝 모두, 시:분:초 같은 3단은 건드리지 않음
assert.ok(h.includes('data-ftc="504"') && h.includes("▶ 8:24") && h.includes('data-ftc="551"') && h.includes('data-ftc="721"'));
assert.ok(!h.includes('data-ftc="630"') && h.includes("10:30:20"), "3단 숫자는 시각 아님");
assert.ok(!lessonHtml({ ...L, full: null }, null, "normal").includes("data-ftc"), "레슨 녹음 없으면 버튼 없음");
// 지도 전→후: 핵심 포인트 카드 안, 심플에선 숨김, 재생 ID 접미사 #p
assert.ok(h.includes("지도 전 → 후") && h.includes('data-au="P1#p"') && h.includes("첫 소절 톤"));
assert.ok(!lessonHtml(L, null, "simple").includes("P1#p") && !lessonHtml(L, null, "simple").includes("오늘 좋았던 순간"));
assert.ok(stu.includes('replace(/#[bsmp]$/, "")'));
assert.ok(stu.includes('chips.forEach(c => c.onclick = () => go(+c.dataset.ftc'), "▶ 시각은 아래 재생바");
// 선생님 쪽: 지도 전→후는 '카톡에 같이 보내기'(pairSend) 고른 것만, 공개 때 링크 열고 지문에 포함
const pf = new Function("cur", grab(src, /function pairsForNote\(\) \{[\s\S]*?\n}\n/) + "; return pairsForNote();");
assert.deepStrictEqual(pf({ review: { pairSend: ["K1"] }, pairs: [{ id: "K1", file_id: "F1" }, { id: "K2", file_id: "F2" }], ana: { coaching: [{ id: "K1", issue: "톤" }] } }), [{ file_id: "F1", label: "톤" }]);
assert.deepStrictEqual(pf({ review: {}, pairs: [{ id: "K1", file_id: "F1" }] }), []);
assert.ok(grab(src, /const noteFileIds = [^\n]*/).includes("n.pairs") && grab(src, /function contentSig[\s\S]*?\n}\n/).includes("n.pairs"));
// 베스트 기본 포함 / 메이크업 기본 미포함
const inclOk = new Function(grab(src, /const inclOk = [^\n]*\n/) + "; return inclOk;")();
assert.strictEqual(inclOk({}, "best", "C1"), true); assert.strictEqual(inclOk({ bestInclude: false, bestIncludeId: "C1" }, "best", "C1"), false);
assert.strictEqual(inclOk({}, "makeup", "M1"), false); assert.strictEqual(inclOk({}, "best", null), false);
console.log("audio-first ok");
