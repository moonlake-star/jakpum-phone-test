// 보내기 최대 5개 FIFO 시험 — index.html 안의 setDecision을 그대로 꺼내 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const body = src.match(/function setDecision[\s\S]*?\n}\n/)[0];
const setDecision = new Function("MAX_GOOD", body + "return setDecision;")(5);
const ids = ["C1","C2","C3","C4","C5","C6","C7"];
const rv = { decisions: {} };
for (const i of ids.slice(0, 5)) assert.strictEqual(setDecision(rv, i, "send", ids), null);
assert.strictEqual(setDecision(rv, "C6", "send", ids), "C1");          // 6번째 → 가장 먼저 고른 C1이 밀려남
assert.strictEqual(rv.decisions.C1, "keep");                           // 지워지지 않고 '기록만 저장'
assert.deepStrictEqual(rv.sendOrder, ["C2","C3","C4","C5","C6"]);
setDecision(rv, "C3", "drop", ids);                                    // 빼면 자리 생김
assert.strictEqual(setDecision(rv, "C7", "send", ids), null);
assert.deepStrictEqual(rv.sendOrder, ["C2","C4","C5","C6","C7"]);
setDecision(rv, "C2", "send", ids);                                    // 다시 고르면 순서 맨 뒤로
assert.deepStrictEqual(rv.sendOrder, ["C4","C5","C6","C7","C2"]);
// 새로고침 뒤(sendOrder 저장 없음, 예전 기록): decisions에서 순서 복원
const old = { decisions: { C1: "send", C2: "send", C3: "keep" } };
setDecision(old, "C4", "send", ids);
assert.deepStrictEqual(old.sendOrder, ["C1","C2","C4"]);
console.log("fifo ok (7 checks)");
