// (11/02 유료화 검토 H1) 피드백 작업 시간: 레슨 화면·화면 켜짐·최근 90초 안 조작일 때만 5초씩, 보낸 뒤는 따로
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/const WORK_STEP = [^\n]*\n/)[0] + src.match(/function workTick\([\s\S]*?\n\}\n/)[0];
const state = { vis: "visible", hidden: false };
const document = { get visibilityState() { return state.vis; } };
const $ = () => ({ classList: { contains: () => state.hidden } });
let cur = { review: {} }, lastTouch = 1000;
const f = new Function("document", "$", "getCur", "getTouch", code.replace(/\bcur\b/g, "getCur()").replace(/\blastTouch\b/g, "getTouch()") + "return workTick;")(document, $, () => cur, () => lastTouch);
assert.strictEqual(f(1000 + 10e3), true); assert.strictEqual(cur.review.work_sec, 5);
assert.strictEqual(f(1000 + 100e3), false, "90초 넘게 안 만지면 안 셈");
state.vis = "hidden"; assert.strictEqual(f(1000 + 1e3), false, "화면 꺼짐"); state.vis = "visible";
state.hidden = true; assert.strictEqual(f(1000 + 1e3), false, "레슨 화면 아님"); state.hidden = false;
cur.review.kakao_sent_at = "x"; f(1000 + 2e3); assert.strictEqual(cur.review.work_after_sec, 5); assert.strictEqual(cur.review.work_sec, 5);
assert.ok(src.includes("rv.work_sec_at_sent ??= +rv.work_sec || 0;") && src.includes("작업 약 ${Math.round("));
console.log("work-timer ok");
