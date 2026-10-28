// 교사 재생 바(처음/-5/+5/끝) 계산 + 화면 구성 시험
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const tpNext = new Function(src.match(/function tpNext[\s\S]*?\n}\n/)[0] + "return tpNext;")();
assert.strictEqual(tpNext(30, 100, "start"), 0);
assert.strictEqual(tpNext(30, 100, "back"), 25);
assert.strictEqual(tpNext(3, 100, "back"), 0);            // 0 밑으로 안 내려감
assert.strictEqual(tpNext(30, 100, "fwd"), 35);
assert.ok(tpNext(98, 100, "fwd") <= 100 - 0.05);          // 끝을 넘지 않음
assert.ok(Math.abs(tpNext(1, 100, "end") - 99.95) < 1e-9);
assert.strictEqual(tpNext(5, 0, "fwd"), 0);               // 길이 모를 때도 안전
// 베스트: 화면 선택지는 이어 붙인 편집본 '하나'. 단일 테이크 후보는 내부 재료(bestSourceTakes)로만 남음 (2026-10-28)
const bo = src.match(/function bestOptions\(\) \{[\s\S]*?\n}\n/)[0] + src.match(/function bestSourceTakes\(\) \{[\s\S]*?\n}\n/)[0];
const mk = (alts, comp = { status: "ok", file_id: "c" }) => new Function("cur", bo + "return [bestOptions(), bestSourceTakes()];")({ best: { status: "ok", best: { file_id: "a" }, alternatives: alts, composite: comp } });
assert.strictEqual(mk([{ file_id: "b" }, { file_id: "x" }])[0].length, 1);
assert.strictEqual(mk([{ file_id: "b" }, { file_id: "x" }])[0][0].file_id, "c");
assert.strictEqual(mk([{ file_id: "b" }, { file_id: "x" }])[1].length, 2);
assert.strictEqual(mk([{ file_id: "b" }], { status: "error" })[0].length, 0);
assert.strictEqual(mk([], null)[0].length, 0);
// 화면 구성: 베스트 편집에도 추천 클립 카드에도 같은 재생 바, 추천 클립은 선택 사항 0~3
assert.ok(/function renderBest[\s\S]*tpHTML\(true\)/.test(src));
assert.ok(src.includes("data-tpopen") && src.includes("오늘의 하이라이트"));
assert.ok(!src.includes('id="bestPlay"'));
console.log("player-ui ok");
