// 들을 거리 먼저(2026-10-29 사용자): 베스트 맨 위·좋았던 순간 클립 첫 화면·글 속 시각 ▶·지도 전→후, 베스트 기본 포함
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const grab = (s, re) => { const m = s.match(re); assert.ok(m, "없음 " + re); return m[0]; };
const body = [grab(stu, /const esc = [^\n]*\n/), grab(stu, /const md = [^\n]*\n/), grab(stu, /function player\([\s\S]*?\n}\n/), grab(stu, /function waveSvg\([\s\S]*?\n}\n/), grab(stu, /function pill\([\s\S]*?\n}\n/), grab(stu, /const MAX_CLIPS[^\n]*\n/),
  grab(stu, /const listHtml[^\n]*\n/), grab(stu, /const sidOk = [^\n]*\n/), grab(stu, /const makeupOk = [^\n]*\n/), grab(stu, /function lessonHtml\([\s\S]*?\n}\n/)].join("\n");
const lessonHtml = new Function(body + "; return lessonHtml;")();
const L = { id: "L", date: "2026-10-25", feedback: "오늘 좋았던 부분\n· 8:24 '오' 발음\n· 9:11~12:01 구간\n비율 10:30:20 은 아님", points: ["호흡"], practice: ["숨 5번"], clips: [{ file_id: "K1", label: "1:00 구간", note: "좋았던 브릿지" }], extra_best: [],
  best: { file_id: "B", len: 30, edited: true, joined: true }, highlight: "후렴 호흡", full: { file_id: "LISTEN", segs: [[1, "t", "안녕"]] }, pairs: [{ file_id: "P1", label: "첫 소절 톤" }] };
let h = lessonHtml(L, null, "normal");
// (10/29 10:33 시안 C) 순서: 한마디(+베스트) → 핵심 포인트(글에 제목 줄이 없을 때 따로) → 더 들어 보기 → 다음 미션(응원 다음). 순간은 클립 메모와 같으면 따로 안 보임
const i = (k) => h.indexOf(k);
assert.ok(i("선생님 한마디") < i('data-lp="B"') && i('data-lp="B"') < i("오늘의 핵심 포인트") && i("오늘의 핵심 포인트") < i("더 들어 보기") && i("더 들어 보기") < i("다음 미션"));
assert.ok(h.includes("선생님이 발견한 오늘의 순간"), "클립 메모와 다른 순간 문장은 카드로(내용 빠짐 없음)");
assert.ok(!lessonHtml({ ...L, highlight: "좋았던 브릿지" }, null, "normal").includes("선생님이 발견한 오늘의 순간"), "같은 문장은 한 번만");
assert.ok(h.includes("좋았던 브릿지") && h.includes('data-lp="K1"') && i('data-lp="K1"') > i("더 들어 보기"), "안 붙은 클립은 더 들어 보기");
// 글 속 시각 → ▶ 버튼(초), 범위 양끝 모두, 시:분:초 같은 3단은 건드리지 않음
assert.ok(h.includes('data-lps="LISTEN" data-t0="504"') && h.includes("좋았던 순간 · 8:24") && !h.includes('data-ftc="504"') && h.includes('data-ftc="551"') && h.includes('data-ftc="721"'), "(10/29 12:42) '· 8:24' 줄은 같은 둥근 버튼(레슨 녹음 구간), 범위 표기는 ▶ 그대로");
assert.ok(!h.includes('data-ftc="630"') && h.includes("10:30:20"), "3단 숫자는 시각 아님");
assert.ok(!lessonHtml({ ...L, full: null }, null, "normal").includes("data-ftc"), "레슨 녹음 없으면 버튼 없음");
// 지도 전→후: 안 붙었으면 더 들어 보기, 심플에선 숨김, 재생 ID 접미사 #p
assert.ok(h.includes("지도 전 → 후") && h.includes('data-lp="P1#p"') && h.includes("첫 소절 톤"));
assert.ok(!lessonHtml(L, null, "simple").includes("P1#p") && !lessonHtml(L, null, "simple").includes("더 들어 보기"));
// 포인트에 붙인 소리: 그 포인트 바로 아래(미션 앞), 더 들어 보기에서는 빠짐, 잘못된 번호는 무시
{ const h2 = lessonHtml({ ...L, point_snd: [{ p: 0, kind: "pair", file_id: "P1" }, { p: 0, kind: "clip", file_id: "K1" }, { p: 5, kind: "clip", file_id: "ZZ" }, { p: "0", kind: "clip", file_id: "YY" }] }, null, "normal");
  const j = (k) => h2.indexOf(k);
  assert.ok(j("오늘의 핵심 포인트") < j('data-lp="P1#p"') && j('data-lp="P1#p"') < j("다음 미션") && j('data-lp="K1"') < j("다음 미션"));
  assert.ok(!h2.includes("더 들어 보기") && !h2.includes("ZZ") && !h2.includes("YY"), "다 붙으면 더 들어 보기 없음");
  assert.ok(!lessonHtml({ ...L, point_snd: [{ p: 0, kind: "pair", file_id: "P1" }] }, null, "simple").includes("P1#p")); }
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
