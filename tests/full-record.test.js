// 레슨 전체 기록(2026-10-29 사용자 '항상 같이 보내기'): 노트 크기 제한, 녹음 링크 열기 대상, 수강생 화면(접힘·심플 숨김·이스케이프)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const grab = (s, re) => { const m = s.match(re); assert.ok(m, "없음 " + re); return m[0]; };
const fnFull = grab(src, /const FULL_MAX[^\n]*\nfunction fullForNote\(\)[\s\S]*?\n}\n/);
const mk = (cur) => new Function("cur", fnFull + "; return fullForNote();")(cur);
const base = { files: [{ name: "듣기용.mp3", id: "LISTEN" }], summary: { duration_sec: 1800 }, review: { speakers: { A: "teacher", B: "student" } } };
let f = mk({ ...base, segs: [{ start: 1, speaker: "A", text: "안녕하세요" }, { start: 5, speaker: "A", text: "오늘은 호흡" }, { start: 9, speaker: "B", text: "네" }, { start: 200, speaker: "C", text: "라라라" }] });
assert.strictEqual(f.file_id, "LISTEN"); assert.strictEqual(f.len, 1800); assert.strictEqual(f.cut, false);
assert.deepStrictEqual(f.segs, [[1, "t", "안녕하세요 오늘은 호흡"], [9, "s", "네"], [200, "x", "라라라"]], "같은 사람 이어지는 말 합침");
assert.strictEqual(mk({ ...base, files: [], segs: [{ start: 1, text: "x" }] }), null, "듣기용 녹음 없으면 없음");
f = mk({ ...base, segs: Array.from({ length: 3000 }, (_, i) => ({ start: i * 70, speaker: i % 2 ? "A" : "B", text: "가".repeat(40) })) });
assert.ok(f.cut && JSON.stringify(f).length < 48000, "시트 한 칸(5만 자) 안: " + JSON.stringify(f).length);
assert.ok(grab(src, /const noteFileIds = [^\n]*/).includes("n.full?.file_id"), "공개 때 녹음 링크 열고, 보류 때 닫음");
assert.ok(grab(src, /function contentSig[\s\S]*?\n}\n/).includes("n.full"), "전사본이 새로 붙으면 다시 공개 필요로 표시");
// 수강생 화면
const body = [grab(stu, /const esc = [^\n]*\n/), grab(stu, /const md = [^\n]*\n/), grab(stu, /function player\([\s\S]*?\n}\n/), grab(stu, /const MAX_CLIPS[^\n]*\n/),
  grab(stu, /const listHtml[^\n]*\n/), grab(stu, /const sidOk = [^\n]*\n/), grab(stu, /const makeupOk = [^\n]*\n/), grab(stu, /function lessonHtml\([\s\S]*?\n}\n/)].join("\n");
const lessonHtml = new Function(body + "; return lessonHtml;")();
const L = { id: "L", date: "2026-10-25", feedback: "한마디", clips: [], extra_best: [], full: { file_id: "LISTEN", len: 60, segs: [[3, "t", "호흡 <b>먼저</b>"], [70, "s", "네"]], cut: true } };
let h = lessonHtml(L, null, "normal");
assert.ok(h.includes('class="card more fullrec"') && h.includes("<details") && !h.includes("<details open"), "접힌 채");
assert.ok(h.includes('data-ft="3"') && h.includes('data-ft="70"') && h.includes("선생님 0:03") && h.includes("나 1:10"));
assert.ok(!h.includes("<b>먼저") && h.includes("&lt;b&gt;"), "이스케이프");
assert.ok(h.includes("앞부분만"), "잘렸으면 표시");
assert.ok(!lessonHtml(L, null, "simple").includes("fullrec"), "심플에선 숨김");
assert.ok(!lessonHtml({ ...L, full: { file_id: 5, segs: [] } }, null, "normal").includes("fullrec"), "잘못된 값이면 안 그림");
assert.ok(stu.includes('getElementById("fullAu")') && stu.includes("audioUrl(au.dataset.fid)"));
console.log("full-record ok");
