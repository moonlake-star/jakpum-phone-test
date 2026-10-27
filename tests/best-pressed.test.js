// 베스트 후보 버튼 '눌림(✓)' 표시: 편집본을 골라도 표시되는지 (2026-10-27 사용자 지적)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "못 찾음 " + re); return m[0]; };
const body = [grab(/function bestOptions\(\) \{[\s\S]*?\n\}\n/), grab(/function bestPicked\(\)[^\n]*\n/),
  grab(/function renderBest\(\) \{[\s\S]*?\n\}\n/)].join("\n");
const mk = (pick) => new Function("cur", "esc", "fmt", "tpHTML", "bestMakeupLabel",
  `${body}; return renderBest();`)({ review: { bestPick: pick },
  best: { status: "ok", best: { file_id: "B1", len: 30, kind_ko: "연속" }, alternatives: [{ file_id: "B2", len: 20 }],
    composite: { status: "ok", file_id: "C1", len: 32, lines: [1, 2] } } }, (x) => String(x ?? ""), () => "0:00", () => "", () => "메이크업");
for (const [pick, label] of [[0, "후보 1"], [1, "후보 2"], [2, "베스트 편집본"]]) {
  const html = mk(pick);
  const on = [...html.matchAll(/<button class="small ghost bestAlt on" aria-pressed="true"[^>]*>([^<]*)<\/button>/g)].map(m => m[1]);
  assert.deepStrictEqual(on, ["✓ " + label], `pick=${pick}: ${on}`);
}
// 고른 편집본이 사라진 경우: 후보 2로 몰래 바뀌지 않고 후보 1 + 경고
{
  const html = new Function("cur", "esc", "fmt", "tpHTML", "bestMakeupLabel", `${body}; return renderBest();`)({ review: { bestPick: 2 },
    best: { status: "ok", best: { file_id: "B1", len: 30 }, alternatives: [{ file_id: "B2", len: 20 }], composite: { status: "none", fallback: "best_take" } } },
    (x) => String(x ?? ""), () => "0:00", () => "", () => "메이크업");
  const on = [...html.matchAll(/bestAlt on" aria-pressed="true"[^>]*>([^<]*)</g)].map(m => m[1]);
  assert.deepStrictEqual(on, ["✓ 후보 1"]);
  assert.ok(html.includes("전에 고르신 베스트 편집본이 지금 없어"));
}
console.log("best-pressed ok (4 cases)");
