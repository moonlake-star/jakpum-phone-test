// (11/05) 💳 수강권 돌아보기: 남은 1회 이하 알림 + 이번 수강권에서 달라진 것
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const g = (src, re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const P = new Function([/const normTitle = [^\n]*\n/, /const moDate = [^\n]*\n/, /const packLeft = [^\n]*\n/, /function packFacts\([\s\S]*?\n\}\n/].map(r => g(t, r)).join("") + "return { packFacts, packLeft };")();
const pk = { plan: "count", need: 8, done: 7, start: "2026-09-20" };
const f = P.packFacts({ lessons: ["2026-09-13", "2026-09-20", "2026-09-27", "2026-10-04"], songs: [{ date: "2026-09-01", title: "사랑으로", acc: .4 }, { date: "2026-09-27", title: "사랑으로", acc: .45 }, { date: "2026-10-04", title: "봄날", acc: .6 }], subs: ["2026-09-25", "2026-09-10"], full: [{ date: "2026-10-04", title: "봄날" }] }, pk);
const T = f.items.map(x => x.text).join("\n");
assert.strictEqual(f.left, 1); assert.strictEqual(f.title, "8회 수강권 돌아보기");
assert.ok(/8회 중 7회 레슨 · 1회 남음 \(9\/20·9\/27·10\/4\)/.test(T), "수강권 시작 이후 레슨만");
assert.ok(/끝까지 부른 곡: ‘봄날’/.test(T) && /처음 45% → 최근 60%/.test(T) && /새 곡 1곡/.test(T) && /연습 녹음 1번/.test(T));
assert.ok(!/결제|재등록|연장/.test(T), "결제 권유 문구 없음");
assert.strictEqual(P.packFacts({}, null), null); assert.strictEqual(P.packLeft({ need: 4, done: 6 }), 0);
assert.strictEqual(P.packFacts({ lessons: [] }, { plan: "month", month: "2026-11", need: 4, done: 2, start: "2026-11-01" }).title, "11월 수강 돌아보기");
// 챙기기에 남은 1회 알림
const careTodos = new Function(g(t, /const MO_MILES = [^\n]*\n/) + g(t, /const packLeft = [^\n]*\n/) + g(t, /const annLabel = [^\n]*\n/) + g(t, /function annivDate\([^\n]*\n[^\n]*\n/) + g(t, /function annivNext\([\s\S]*?\n\}\n/) + g(t, /function careTodos\([\s\S]*?\n\}\n/) + "return careTodos;")();
const row = (d) => ({ l: { name: d + "_x" } }), now = Date.parse("2026-11-05T10:00:00+09:00");
const ctx = { now, students: { a: { name: "가" } }, ym: "2026-11", att: { a: { package: pk, next_lesson: "2026-11-08T19:00:00+09:00" } } };
assert.ok(careTodos([{ sid: "a", rows: [row("2026-11-01")] }], ctx).some(x => /💳 가 · 수강권 7\/8회 · 1회 남음/.test(x.t)));
assert.ok(!careTodos([{ sid: "a", rows: [row("2026-11-01")] }], { ...ctx, sent: { "a:pack:2026-09-20": "x" } }).some(x => /💳/.test(x.t)), "보낸 뒤엔 안 뜸");
assert.ok(!careTodos([{ sid: "a", rows: [row("2026-11-01")] }], { ...ctx, att: { a: { package: { ...pk, done: 5 } } } }).some(x => /💳/.test(x.t)), "3회 남으면 안 뜸");
assert.ok(t.includes('lesson_id: "_pack_" + f.key') && s.includes('startsWith("_pack_") && l.kind === "pack"') && s.includes('!String(l.id).startsWith("_pack_")'));
console.log("pack-review ok");
