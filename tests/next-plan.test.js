// (11/02 사용자 시안 승인) 📌 다음 레슨에 할 것: 초안 순서·캘린더 설명 블록·다음 일정 찾기·레슨 시작 팝업
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const code = g(/const NP_MAX = [^\n]*\n/) + g(/function npDraft\(me\) \{[\s\S]*?\n\}\n/) + g(/function npDescMerge\([\s\S]*?\n\}\n/) + g(/function npNextEvent\([\s\S]*?\n\}\n/);
const f = new Function("attOf", code + "return { npDraft, npDescMerge, npNextEvent };")((sid) => ({ days: [
  { date: "2026-10-29", time: "19:00", s: "done", event_id: "E0" }, { date: "2026-11-05", time: "19:00", s: "scheduled", event_id: "E2" },
  { date: "2026-11-03", time: "19:00", s: "cancelled", event_id: "E1" }, { date: "2026-11-12", time: "19:00", s: "scheduled", event_id: "E3" }] }));
// 초안: 검수 저장 > AI next_plan > brief_next
assert.deepStrictEqual(f.npDraft({ review: { next_plan: [{ text: "내 것" }] }, ana: { next_plan: [{ text: "AI" }] } }).map(x => x.text), ["내 것"]);
assert.deepStrictEqual(f.npDraft({ review: {}, ana: { next_plan: [{ text: "5카포", t: 3995, src: "teacher_said" }, { text: "" }], brief_next: ["b"] } }).map(x => [x.text, x.t]), [["5카포", 3995]]);
assert.deepStrictEqual(f.npDraft({ review: {}, ana: { brief_next: ["a", "b", "c", "d"] } }).map(x => x.text), ["a", "b", "c"], "예전 레슨은 brief_next 3줄");
// 캘린더 설명: 맨 위에 넣고, 다시 넣으면 바꿔 끼움(선생님이 쓴 글은 그대로)
const d1 = f.npDescMerge("주차 B2", ["후렴 5카포", "미션 듣기"], "2026-10-29");
assert.ok(d1.startsWith("── 📌 다음 레슨에 할 것 ──\n(2026-10-29 레슨에서 정함)\n1. 후렴 5카포\n2. 미션 듣기\n──────────") && d1.endsWith("\n\n주차 B2"));
const d2 = f.npDescMerge(d1, ["새 곡"], "2026-10-29");
assert.strictEqual((d2.match(/📌/g) || []).length, 1); assert.ok(d2.includes("1. 새 곡") && !d2.includes("후렴") && d2.endsWith("주차 B2"));
assert.strictEqual(f.npDescMerge(d1, [], ""), "주차 B2", "줄이 없으면 블록만 지움");
// 다음 일정: 이 레슨 날짜 이후 '예정' 중 가장 빠른 것(취소 제외)
assert.strictEqual(f.npNextEvent("S", "2026-10-29").event_id, "E2");
assert.strictEqual(f.npNextEvent("S", "2026-11-20"), null);
assert.ok(src.includes('reminders: { useDefault: false, overrides: [{ method: "popup", minutes: 0 }'), "시작 시각 알림");
assert.ok(src.includes('id="npCard"') && src.includes("now >= st - 15 * 60e3 && now <= st + 60 * 60e3"), "카드·15분 전~1시간 팝업");
console.log("next-plan ok");
