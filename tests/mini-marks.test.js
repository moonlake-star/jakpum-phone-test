// 이어 듣기 때 아래 재생바에 하이라이트 자리를 노랗게(지금 것만 진하게)
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const fn = src.match(/function miniMarks[\s\S]*?\n}\n/)[0];
const el = { innerHTML: "" };
const miniMarks = new Function('$', 'lessonEnd', fn + 'return miniMarks;')(() => el, () => 1000);
miniMarks([{ start: 100, end: 148 }, { start: 400, end: 437 }, { start: 900, end: 950 }], 1);
const spans = el.innerHTML.match(/<span[^>]*>/g);
assert.strictEqual(spans.length, 3);
assert(spans[0].includes('dim') && !spans[1].includes('dim') && spans[2].includes('dim'));
assert(spans[0].includes('left:10.00%') && spans[0].includes('width:4.80%'));
miniMarks([]); assert.strictEqual(el.innerHTML, "");
assert(src.includes('id="miniMarks"'));
assert(/function hlGo[\s\S]*?miniMarks\(/.test(src) && /function hlQueueNext[\s\S]*?miniMarks\(/.test(src));
console.log('mini-marks ok');
// 레슨을 열기 전(cur 없음): lessonEnd가 오류를 내도 miniMarks는 조용히 지나가야 함(10/28 레슨이 안 열리던 원인)
const el2 = { innerHTML: "x" };
const mm2 = new Function('$', 'lessonEnd', fn + 'return miniMarks;')(() => el2, () => { throw new TypeError("cur is null"); });
mm2([]); assert.strictEqual(el2.innerHTML, "");
mm2([{ start: 1, end: 2 }]); assert.strictEqual(el2.innerHTML, "");
assert(/async function openLesson\(\.\.\.a\) \{ try \{ miniMarks\(\[\]\); \} catch \{\}/.test(src));
console.log('mini-marks no-lesson ok');
