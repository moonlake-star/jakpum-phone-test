// 출석·수강권 현황(#182): 수강생 맨 위 카드 · 선생님 확인 필요 목록 — 금액·미납 문구가 수강생 화면에 없어야 함
const fs = require("fs"), assert = require("assert");
const s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fn = s.match(/const TITLES = [^\n]*\n/)[0] + s.match(/function statusHtml\(s, flat\) \{[^]*?\n\}\n/)[0];
const statusHtml = new Function("esc", fn + "return statusHtml;")(esc);
assert.strictEqual(statusHtml(null), "");
const h = statusHtml({ kind: "status", line: "11월 레슨 ●●●◌ 3/4 · 보강 12/2 예정", next_lesson: "2026-11-03T18:30:00+09:00", lessons_confirmed: 5 });
assert.ok(h.includes("🌿 연습하는 가수") && h.includes("레슨 5회") && h.includes("다음 칭호까지 7회") && h.includes("●●●◌"), h);
assert.ok(!/원|미납|소멸|결제/.test(h.replace(/<[^>]+>/g, "")), "금액·미납·소멸 문구 없음");
assert.ok(statusHtml({ kind: "status", lessons_confirmed: 48 }).includes("👑 작품 가수"));
assert.ok(s.includes('data.lessons = (j.lessons || []).filter(l => l && l.id !== "_status")'), "_status 칸은 레슨 목록에서 뺌");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(/same_day_cancel: \{ t: "오늘 레슨 취소됨", btn: \[\["makeup", "📅 보강일 잡기", 1\], \["forfeit", "소멸로 처리", 0\]\]/.test(t), "당일 취소: 보강 기본");
assert.ok(t.includes('lesson_id: "_status"') && !/note = \{[^}]*amount/.test(t), "수강생에게 보내는 상태에 금액 없음");
// 달력: 아이콘+글자, 여러 개면 개수, 오늘 표시
const cal = new Function(s.match(/const CAL_S = [^\n]*\n/)[0] + s.match(/const calYm = [^\n]*\n/)[0] + s.match(/function calGrid\([^]*?\n\}\n/)[0] + "return calGrid;")();
const g = cal("2026-11", { "2026-11-03": [{ s: "done" }], "2026-11-10": [{ s: "scheduled" }, { s: "scheduled" }] }, null, true);
assert.ok(g.includes('data-cd="2026-11-03"') && g.includes("✅</span>") && g.includes("📅2</span>") && g.includes("✅ 완료") && g.includes("✖️ 휴강"));
assert.strictEqual((g.match(/class="dy( |")/g) || []).length, 30, "11월 30칸");
assert.ok(!cal("2026-11", {}, null, false).includes("<button"), "수강생 달력은 읽기만");
assert.ok(s.includes("function myLessons(") && t.includes("function openCal(") && t.includes('id="vCal"'));
assert.ok(/days: \(s\.days \|\| \[\]\)\.map\(d => \(\{ date: d\.date, time: d\.time, s: d\.s, lesson_id/.test(t), "수강생에게는 날짜·시각·상태·노트 ID만");
console.log("attendance-ui ok");
