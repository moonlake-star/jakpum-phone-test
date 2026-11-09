// (11/09 12:39 사용자) '🎤 원음' = 이 음 보정 안 함(부른 그대로): 정음 막대 없음·보정선 = 부른 음 · 지우면 원래대로 · 서버엔 {off:true}
const assert = require("assert"), fs = require("fs"), path = require("path");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8"), T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const blk = H.match(/const offApply = \(\) => \{[\s\S]*?p\[kt\] = null; \}\); \};/)[0];
let fixes = []; const cv = { levels: [3], pts: [[0, 6230, 6200, 6200], [0.04, 6235, 6200, 6200], [0.08, 6400, 6400, 6400]], _kShift: { 1: 50 } };
const run = new Function("cv", "Tune", "dF", blk + "; return offApply;")(cv, { tgCol: (c) => 2 + c.levels.length }, () => fixes);
fixes = [{ t0: 0, t1: 0.04, off: true, midi: null }]; run();
assert.deepStrictEqual(cv.pts[0], [0, 6230, 6230, null]); assert.deepStrictEqual(cv.pts[1], [0.04, 6235, 6235, null]); assert.ok(!(1 in cv._kShift)); assert.deepStrictEqual(cv.pts[2], [0.08, 6400, 6400, 6400]);
run(); assert.deepStrictEqual(cv.pts[0], [0, 6230, 6230, null], "두 번 해도 같음");
fixes = []; run(); assert.deepStrictEqual(cv.pts[0], [0, 6230, 6200, 6200]); assert.strictEqual(cv._kShift[1], 50, "지우면 원래대로");
assert.ok(T.includes('data-raw aria-label="이 음은 보정 안 함(부른 그대로)">🎤 원음</button>') && T.includes("{ t0: T0, t1: T1, midi: null, off: true }"));
assert.ok(H.includes("if (f && f.off) cor = 0;") && H.includes("if (f && f.off) cor = dry ? 0 :"), "미리듣기도 보정 안 함");
console.log("note-raw ok");
