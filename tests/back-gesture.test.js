// 갤럭시 뒤로 가기: 레슨 화면 → 뒤로 = 앱 종료가 아니라 이전 화면
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const block = src.match(/let backSkip = false;[\s\S]*?\n}\);\n/)[0];
const stack = [null]; let idx = 0, pop = null, visible = "vList", calls = [];
const history = { get state() { return stack[idx]; }, pushState(s) { stack.length = idx + 1; stack.push(s); idx++; }, back() { if (idx > 0) { idx--; pop(); } } };
const window = { addEventListener: (e, f) => { pop = f; } };
const $ = id => ({ classList: { contains: c => id !== visible } });
const env = new Function('history', 'window', '$', 'ctx', block + '; return { syncBackHistory, set goBack(f) { ctx.goBack = f; } };');
const ctx = {}; const api = env(history, window, $, ctx);
globalThis.goBack = () => { calls.push("back"); visible = "vList"; api.syncBackHistory("vList"); };
// goBack은 페이지 전역 — 시험에선 전역으로 둠
const run = new Function('history', 'window', '$', 'goBack', 'renderList', block + '; return syncBackHistory;');
const sync = run(history, window, $, () => globalThis.goBack(), () => {});
visible = "vLesson"; sync("vLesson");
assert.strictEqual(idx, 1, '레슨 화면에서 기록 한 칸');
sync("vLesson"); assert.strictEqual(idx, 1, '중복으로 쌓지 않음');
history.back();                     // 스와이프
assert.deepStrictEqual(calls, ["back"]); assert.strictEqual(idx, 0);
visible = "vLesson"; sync("vLesson"); assert.strictEqual(idx, 1);
visible = "vList"; sync("vList");   // 화면의 ← 뒤로로 목록에 옴
assert.strictEqual(idx, 0, '남은 칸 정리'); assert.deepStrictEqual(calls, ["back"], '정리할 땐 goBack 다시 안 부름');
assert(/function show\(view\) \{ syncBackHistory\(view\);/.test(src));
console.log('back-gesture ok');
