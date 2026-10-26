// 최근 4회 돌아보기: 기록된 사실만, 점수·단정 없음, 2회 미만이면 없음
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const growth4 = new Function(src.match(/function growth4[\s\S]*?\n}\n/)[0] + "return growth4;")();
const L = (d, extra) => ({ id: d, date: d, ...extra });
assert.strictEqual(growth4({ lessons: [L("2026-10-25")] }, "가"), null);
const rec = { lessons: [L("2026-09-20", { strengths: [{ text: "고음 끝까지 호흡 유지" }] }), L("2026-10-01"), L("2026-10-11", { coaching: [{ issue: "'오' 발음 까짐", instruction: "딱 잡기", change: "improved" }, { issue: "x", change: "unknown" }] }),
  L("2026-10-18", { strengths: [{ text: "마디 끝 숨을 표현적으로" }] }), L("2026-10-25", { next_goal: "후렴 첫 음 단단하게" })],
  songs: { "언젠가는": { mentions: [{ lesson: "2026-10-11", date: "2026-10-11" }, { lesson: "2026-10-25", date: "2026-10-25" }] }, "한 번": { mentions: [{ lesson: "x" }] } } };
const g = growth4(rec, "가");
assert.strictEqual(g.ls.length, 4) ; assert.strictEqual(g.days, 24);
assert(g.text.includes("최근 4번의 레슨(10/01~10/25)") && g.text.includes("마디 끝 숨") && !g.text.includes("고음 끝까지"));   // 5회 전 기록은 안 씀
assert(g.text.includes("'오' 발음 까짐 → 딱 잡기") && !g.text.includes("x →") && g.text.includes("다음 목표: 후렴 첫 음"));
assert(!/\d+\s*(%|점)/.test(g.text));
assert.deepStrictEqual(g.songs.map(s => s.t), ["언젠가는"]);
console.log("growth4 ok");
