// (10/31 08:42 사용자) 오늘의 베스트와 같은 부분인 '좋았던 순간' 소리는 위 글에서 빼기 — 앞으로도 자동
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (n) => { const m = src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n|function " + n + "\\([^\\n]*\\n(?:[^\\n]*\\n)*?[^\\n]*} *(?://[^\\n]*)?\\n")); assert.ok(m, n); return m[0]; };
const f = new Function(grab("bestSpans") + grab("dupOfBest") + "return { bestSpans, dupOfBest };")();
const single = f.bestSpans({ start: 2998, end: 3043 }), comp = f.bestSpans({ segments: [{ start: 3000, end: 3020 }, { start: 3100, end: 3125 }] });
assert.deepStrictEqual(single, [[2998, 3043]]);
assert.ok(f.dupOfBest(2998, 3131, single), "49:58부터 2분짜리 클립 ⊃ 45초 베스트 → 같은 소리");
assert.ok(f.dupOfBest(3005, 3015, single), "짧은 클립이 베스트 안에 → 같은 소리");
assert.ok(f.dupOfBest(3010, 3030, comp), "이어붙인 베스트의 한 조각과 겹침");
assert.ok(!f.dupOfBest(3040, 3070, single), "3초만 겹치면 다른 소리");
assert.ok(!f.dupOfBest(500, 520, single) && !f.dupOfBest(3000, 3030, []), "다른 시각·베스트 없음 → 그대로");
assert.ok(/sendList\(\)\.filter\(c => !dupB\(/.test(src), "노트 클립에서 뺌");
assert.ok(/if \(dupOfBest\(c\.start, c\.end \?\? \(\+c\.start \+ 15\), bsp\)\) continue;/.test(src), "포인트에 붙이는 소리에서도 뺌");
assert.ok(src.includes("have.has(f.id) || dupOfBest("), "추천 클립에서도 뺌");
assert.ok(src.includes("오늘의 베스트와 같은 부분 · 베스트로만 들려줘요"), "선생님 화면 표시");
console.log("best-dup-clip ok");
