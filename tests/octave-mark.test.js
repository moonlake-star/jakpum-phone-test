// (11/09 10:47 사용자 고) 인식 옥타브 바로잡기: 음표 창 '8va' → 한 옥타브 위/아래로 '인식만'(소리 그대로) · 서버 요청 r.octave_marks
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.strictEqual((T.match(/data-oct aria-label="인식 옥타브 바로잡기\(소리는 그대로\)">8va<\/button>/g) || []).length, 3, "기본·고급·옛 창 모두");
assert.ok(T.includes("try { cv.onOctave(b.t0, b.t1, dd); }") && T.includes("<b>이 음 높이를 한 옥타브 틀리게 읽었나요?</b>"));
const blk = H.match(/const octHit = [\s\S]*?mkWrite\(\)\.catch\(\(\) => \{\}\); try \{ paintFixN\(\); \} catch \{\} \};/)[0];
const r = {}; let writes = 0; const cv = { pts: [[0, 4700, 4710, 4700, 4700], [0.04, 4705, 4710, 4700, 4700], [0.08, 6200, 6200, 6200, 6200]], _orig: { 1: 4700 } };
new Function("r", "cv", "r4", "toO", "mkWrite", "paintFixN", blk)(r, cv, (x) => Math.round(x * 1e4) / 1e4, (x) => x, () => { writes++; return Promise.resolve(); }, () => {});
cv.onOctave(0, 0.04, 1);
assert.deepStrictEqual(r.octave_marks, [{ t0: 0, t1: 0.04, d: 1 }]); assert.deepStrictEqual(cv.pts[0], [0, 5900, 5910, 5900, 5900]); assert.strictEqual(cv._orig[1], 5900); assert.strictEqual(cv.pts[2][1], 6200);
assert.strictEqual(cv.octOf(0, 0.04), 1);
cv.onOctave(0, 0.04, 0); assert.deepStrictEqual(r.octave_marks, []); assert.strictEqual(cv.pts[0][1], 4700); assert.strictEqual(writes, 2);
cv.onOctave(0, 0.04, 0); assert.strictEqual(writes, 2, "바뀐 게 없으면 저장 안 함");
console.log("octave-mark ok");
