// (11/04 19:02 사용자 '응 고고') 월간 성장 리포트 + 달성: 사실로만, 선생님이 고른 줄만, 수강생 페이지 맨 위
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const g = (src, re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const src = [/const normTitle = [^\n]*\n/, /const MO_MILES = [^\n]*\n/, /const moDate = [^\n]*\n/, /function moDefault\([\s\S]*?\n\}\n/, /const moPrev = [^\n]*\n/, /function monthFacts\([\s\S]*?\n\}\n/, /function monthNote\([\s\S]*?\n\}\n/].map(r => g(t, r)).join("");
const { monthFacts, monthNote, moDefault } = new Function(src + "return { monthFacts, monthNote, moDefault };")();
// 날짜 기본값: 7일까지 지난달
assert.strictEqual(moDefault(new Date("2026-11-04T10:00:00+09:00")), "2026-10");
assert.strictEqual(moDefault(new Date("2026-11-20T10:00:00+09:00")), "2026-11");
assert.strictEqual(moDefault(new Date("2026-01-03T10:00:00+09:00")), "2025-12");
const lessons = ["2026-08-01", "2026-08-08", "2026-08-15", "2026-08-22", "2026-09-05", "2026-09-12", "2026-09-19", "2026-10-03", "2026-10-10", "2026-10-17", "2026-10-24"];
const songs = [{ date: "2026-09-05", title: "사랑으로", acc: .5 }, { date: "2026-10-10", title: "사랑으로", acc: .62 }, { date: "2026-10-24", title: "봄날", acc: .58 }];
const f = monthFacts({ lessons, subs: ["2026-10-12", "2026-09-01"], songs }, "2026-10");
const tx = f.items.map(x => x.text).join("\n");
assert.strictEqual(f.lessons, 4); assert.strictEqual(f.total, 11);
assert.ok(/10회차 레슨 달성/.test(tx), "10회차 넘은 달"); assert.ok(!/5회차/.test(tx), "지난달에 넘은 건 안 씀");
assert.ok(/3·10·17·24일/.test(tx)); assert.ok(/‘사랑으로’, ‘봄날’/.test(tx)); assert.ok(/새 곡 1곡/.test(tx), "봄날만 새 곡");
assert.ok(/평균 60% \(지난달 50%, ▲10%p\)/.test(tx)); assert.ok(/최고 기록 62%/.test(tx)); assert.ok(/연습 녹음 1번/.test(tx));
assert.ok(f.items.findIndex(x => /달성/.test(x.text)) < f.items.findIndex(x => x.k === "lessons"), "달성이 먼저");
// 낮아진 달은 정확도 줄 기본 꺼짐
const low = monthFacts({ lessons, songs: [{ date: "2026-09-05", title: "a", acc: .7 }, { date: "2026-10-10", title: "a", acc: .5 }] }, "2026-10");
assert.strictEqual(low.items.find(x => x.k === "acc").on, false);
// 3개월 기념(8월 시작 → 11월)
assert.ok(monthFacts({ lessons: [...lessons, "2026-11-01"] }, "2026-11").items.some(x => /3개월/.test(x.text)));
assert.strictEqual(monthFacts({ lessons }, "2026-12"), null, "기록 없는 달");
// 선생님이 고른 줄만
const n = monthNote(f, { songs: false }, " 수고했어요 ");
assert.ok(!n.items.some(x => /부른 곡/.test(x.text)) && n.items.some(x => x.mile) && n.say === "수고했어요" && n.kind === "month" && n.ym === "2026-10");
assert.ok(t.includes('lesson_id: "_month_" + ym') && t.includes('<div id="grMonth"></div>'));
// 수강생 화면
const h = new Function("esc", g(s, /function monthCard\([\s\S]*?\n\}\n/) + g(s, /function monthHtml\([\s\S]*?\n\}\n/) + "return monthHtml;")((x) => String(x));
const out = h([{ ...n, title: "10월 성장 리포트" }, { kind: "month", ym: "2026-09", title: "9월 성장 리포트", items: [{ ic: "📅", text: "레슨 3번" }] }]);
assert.ok(out.includes("10월 성장 리포트") && out.includes("cele") && out.includes("10회차 레슨 달성") && out.includes("수고했어요") && out.includes("지난 성장 리포트 1개"));
assert.strictEqual(h([]), ""); assert.ok(!/AI/.test(out));
assert.ok(s.includes('!String(l.id).startsWith("_month_")'), "레슨 목록에서 빠짐");
console.log("month-report ok");
