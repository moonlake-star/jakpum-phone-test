// 레슨 일정 점검 카드(#197): 제안만, 버튼 종류, 별칭 기억
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const f = new Function(t.match(/function anoButtons\(c\) \{[^]*?\n\}\n/)[0] + "return anoButtons;")();
const typo = f({ kind: "name_typo", suggested_name: "이하나", typed: "이하니" });
assert.deepStrictEqual(typo.map(x => x[0]), ["alias", "wrong", "later"]);
assert.ok(typo[0][1].includes("이하나 님 맞아요"));
const am = f({ kind: "ampm_flip", at: "2026-11-03T06:30:00+09:00", suggested: "2026-11-03T18:30:00+09:00" });
assert.ok(am[0][1].includes("오후 6:30") && am[1][1].includes("오전 6:30"));
assert.strictEqual(f({ kind: "double_week" })[0][0], "fix");
assert.ok(t.includes('o.aliases = [...new Set([...(o.aliases || []), c.typed])]'), "오타 이름을 별칭으로 기억");
assert.ok(!/api\([^)]*calendar\/v3[^)]*PATCH/.test(t), "구글 캘린더를 직접 고치지 않음");
console.log("schedule-anomaly-ui ok");
