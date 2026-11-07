// 갤럭시 뒤로 가기: 화면 → 뒤로 = 이전 화면 · (11/07 17:24 사용자) 첫 화면도 한 번에 앱이 닫히지 않게(2초 안 두 번), 새 화면(곡 서랍 등)도 빠짐없이
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const block = src.match(/let backSkip = false;[\s\S]*?\n}\);\n/)[0];
const stack = [null]; let idx = 0, pop = null, visible = "vList", calls = [], toasts = [];
const history = { get state() { return stack[idx]; }, pushState(s) { stack.length = idx + 1; stack.push(s); idx++; }, back() { if (idx > 0) { idx--; pop({}); } else calls.push("exit"); } };
const window = { addEventListener: (e, f) => { pop = f; } };
const $ = id => ({ classList: { contains: c => id !== visible } });
const goBack = () => { calls.push("back"); visible = "vList"; sync("vList"); };
const run = new Function('history', 'window', '$', 'goBack', 'renderList', 'toast', block + '; return syncBackHistory;');
const sync = run(history, window, $, () => goBack(), () => {}, (m) => toasts.push(m));
sync("vList"); assert.strictEqual(idx, 1, '첫 화면에도 한 칸(앱 종료 막이)');
visible = "vLesson"; sync("vLesson"); assert.strictEqual(idx, 2, '레슨 화면에서 한 칸 더');
sync("vLesson"); assert.strictEqual(idx, 2, '중복으로 쌓지 않음');
history.back(); assert.deepStrictEqual(calls, ["back"]); assert.strictEqual(idx, 1, '스와이프 → 목록, 첫 화면 칸은 남음');
visible = "vLesson"; sync("vLesson"); visible = "vList"; sync("vList");   // 화면의 ← 뒤로
assert.strictEqual(idx, 1, '남은 칸 정리'); assert.deepStrictEqual(calls, ["back"], '정리할 땐 goBack 다시 안 부름');
for (const v of ["vCal", "vSongs", "vMkJob", "vStu"]) { visible = v; sync(v); history.back(); }
assert.deepStrictEqual(calls, ["back", "back", "back", "back", "back"], "캘린더·곡 서랍·메이크업·수강생에서 뒤로 = 직전 화면");
history.back(); assert.strictEqual(idx, 1, '첫 화면 한 번 밀기 = 안 닫힘'); assert.ok(/한 번 더 뒤로/.test(toasts[0]));
history.back(); assert.strictEqual(idx, 0, '2초 안 한 번 더 = 닫힘(기록 맨 앞)');
assert(/function show\(view\) \{ syncBackHistory\(view\);/.test(src) && src.includes("for (const v of VIEWS) $(v)"));
console.log('back-gesture ok');
