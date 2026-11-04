// (11/05) 🎯 목표곡 · 🌱 첫 4회 · 📊 수강 유지
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const g = (src, re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const G = new Function([/const normTitle = [^\n]*\n/, /const moDate = [^\n]*\n/, /const goalMatch = [^\n]*\n/, /function goalFacts\([\s\S]*?\n\}\n/].map(r => g(t, r)).join("") + "return goalFacts;")();
const inp = { songs: [{ date: "2026-10-01", title: "사랑으로(해바라기)", acc: .4 }, { date: "2026-10-08", title: "사랑으로", acc: .5 }, { date: "2026-10-15", title: "봄날", acc: .7 }, { date: "2026-10-22", title: "사랑으로 1022", acc: .62 }],
  full: [{ date: "2026-10-22", title: "사랑으로" }], made: [] };
const f = G({ title: "사랑으로", why: "결혼식", set_at: "2026-09-30" }, inp);
assert.strictEqual(f.n, 3, "비슷한 제목도 같은 곡"); assert.deepStrictEqual(f.steps.map(x => x.done), [true, true, true, false]);
assert.deepStrictEqual(f.acc, { first: 40, last: 62 }); assert.strictEqual(f.steps[2].date, "2026-10-22");
assert.strictEqual(G(null, inp), null); assert.strictEqual(G({ title: " " }, inp), null);
assert.ok(t.includes('lesson_id: "_goal"') && t.includes('<div id="grGoal"></div>'));
const H = new Function("esc", g(s, /function goalHtml\([\s\S]*?\n\}\n/) + "return goalHtml;")((x) => String(x));
const h = H({ ...f, kind: "goal" });
assert.ok(h.includes("나의 목표곡") && h.includes("‘사랑으로’") && h.includes("결혼식") && h.includes("다음: <b>내 목소리 완성본</b>") && h.includes("40% → 62%") && (h.match(/glStep on/g) || []).length === 3);
assert.ok(H({ title: "x", steps: [{ text: "a", done: true }] }).includes("목표를 이뤘어요")); assert.strictEqual(H(null), "");
assert.ok(s.includes('l.id !== "_goal"') && s.includes("goalHtml(data.goal)"));
// 첫 4회
assert.ok(t.includes('ds.indexOf(date) === 3 && before <= 0') && t.includes('out.push({ kind: "first4"'));
const C = new Function("esc", "md", "pill", g(s, /function segPill\([\s\S]*?\n\}\n/) + g(s, /function celebHtml\([\s\S]*?\n\}\n/) + "return celebHtml;")((x) => String(x), (d) => String(d).slice(5), (id, l) => `<P ${id}|${l}>`);
const c4 = C({ date: "2026-11-01", best: { file_id: "B4" }, celebrate: [{ kind: "first4", first: "2026-10-10" }] }, [{ date: "2026-10-10", best: { file_id: "B1" } }]);
assert.ok(c4.includes("첫 4회 완주") && c4.includes("<P B1#c|") && c4.includes("<P B4#c|"));
// 챙기기: 첫 달 목표곡
const careTodos = new Function(g(t, /const MO_MILES = [^\n]*\n/) + g(t, /const packLeft = [^\n]*\n/) + g(t, /const annLabel = [^\n]*\n/) + g(t, /function annivDate\([^\n]*\n[^\n]*\n/) + g(t, /function annivNext\([\s\S]*?\n\}\n/) + g(t, /function careTodos\([\s\S]*?\n\}\n/) + "return careTodos;")();
const row = (d) => ({ l: { name: d + "_x" } }), now = Date.parse("2026-11-05T10:00:00+09:00");
const base = { now, ym: "2026-11", students: { a: { name: "가" } }, att: { a: { next_lesson: "2026-11-08T10:00:00+09:00" } } };
assert.ok(careTodos([{ sid: "a", rows: [row("2026-10-20"), row("2026-10-27"), row("2026-11-03")] }], base).some(x => x.ck === "goal"), "새 수강생·목표 없음");
assert.ok(!careTodos([{ sid: "a", rows: [row("2026-10-20")] }], { ...base, students: { a: { name: "가", goal: { title: "x" } } } }).some(x => x.ck === "goal"));
assert.ok(!careTodos([{ sid: "a", rows: [row("2026-10-27")] }], { ...base, att: { a: { lessons_confirmed: 12, next_lesson: "2026-11-08T10:00:00+09:00" } } }).some(x => x.ck === "goal"), "앱 전부터 다닌 사람은 첫 달 아님");
// 유지 지표
const R = new Function(g(t, /const ENROLL = [^\n]*\n/) + g(t, /function retentionStats\([\s\S]*?\n\}\n/) + "return retentionStats;")();
const r = R([{ name: "가", dates: ["2026-08-01", "2026-10-01"], packages: [{ start: "2026-08-01", state: "complete" }, { start: "2026-09-01", state: "complete" }, { start: "2026-10-01", state: "running" }] },
  { name: "나", enroll: { state: "left", at: "2026-09-15", why_tag: "비용", why: "부담" }, dates: ["2026-08-01"], packages: [{ start: "2026-08-01", state: "complete" }] },
  { name: "다", dates: ["2026-10-01"], packages: [{ start: "2026-10-01", state: "complete" }] }], Date.parse("2026-11-01T00:00:00Z"));
assert.strictEqual(r.active, 2); assert.strictEqual(r.left, 1); assert.deepStrictEqual(r.renew, { yes: 2, no: 1, wait: 1 }); assert.strictEqual(r.renewRate, 67);
assert.strictEqual(r.early, 1, "45일 만에 그만둠"); assert.deepStrictEqual(r.why, { "비용": 1 }); assert.strictEqual(r.memos.length, 1);
assert.ok(t.includes('<div id="retBox"></div>') && t.includes("paintRetention(allData)"));
console.log("long-term-2 ok");
