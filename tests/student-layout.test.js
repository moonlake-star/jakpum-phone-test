// (11/20 사용자 '수강생 페이지가 로딩되면서 엉뚱한 걸 누르게 됨') 레슨 목록 위에는 늦게 채워져 높이가 바뀌는 칸이 없어야 함 + 화면이 방금 움직였으면 톡 무시.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const lay = src.match(/\/\/#stulayout-begin\n([\s\S]*?)\/\/#stulayout-end/)[1];
const esc = (x) => String(x ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const M = new Function("esc", "cfg", "intakeCard", lay + "return {lessonRowsHTML, lessonsTabHTML};")(esc, { practice_check: false }, () => "<details id=intake></details>");
const rows = [{ l: { name: "2026-11-18_레슨" }, fb: false }, { l: { name: "2026-11-16_레슨" }, fb: true }];
const html = M.lessonsTabHTML({}, rows);
const ids = [...html.matchAll(/id="?([\w]+)"?/g)].map((m) => m[1]);
const iList = ids.indexOf("stuLessons");
assert.ok(iList >= 0, "레슨 목록 칸");
assert.deepEqual(ids.slice(0, iList), ["stuBriefD", "stuBriefN", "stuBrief"], "목록 위에는 높이 고정 브리핑 한 줄(접힘)만");
assert.equal(ids.at(-1), "stuSaid", "한 말 확인은 맨 아래(#858)");
for (const late of ["stuSaid", "stuReport", "grLine", "intake", "stuKakao", "stuKakaoCand"]) assert.ok(ids.indexOf(late) > iList, late + "는 목록 아래");
assert.ok(!/<details[^>]*id="stuBriefD"[^>]*open/.test(html), "브리핑은 처음엔 접힘");
assert.ok(/\.briefLine > summary \{ flex-wrap:nowrap; overflow:hidden; white-space:nowrap; \}/.test(src), "브리핑 한 줄은 줄바꿈 없이(글자가 바뀌어도 높이 그대로)");
assert.ok(!/insertAdjacentHTML\("beforebegin", `<div id="stuReport">/.test(src), "리포트를 목록 위에 끼워 넣지 않음");
assert.ok(/if \(!refreshLessonRows\(sid\)\) paintLessonsTab\(sid\);/.test(src), "뒤에서 새로 받으면 목록 칸만 고침");
assert.equal((M.lessonRowsHTML(rows).match(/class="lesson"/g) || []).length, 2);
// 톡 보호
const tg = src.match(/\/\/#tapguard-begin\n([\s\S]*?)\/\/#tapguard-end/)[1];
const T = new Function(tg + "return {noteShift, tapBlocked, TAP_GUARD_MS};")();
assert.equal(T.tapBlocked(10_000), false);
T.noteShift(10_000);
assert.equal(T.tapBlocked(10_000 + T.TAP_GUARD_MS - 1), true, "움직인 직후 톡은 무시");
assert.equal(T.tapBlocked(10_000 + T.TAP_GUARD_MS + 1), false, "잠깐 뒤엔 정상");
assert.ok(/e\.target\?\.closest\?\.\("#vStu, #vList"\)/.test(src), "수강생 화면·목록에서만");
console.log("student-layout OK");
