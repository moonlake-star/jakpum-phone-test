// (11/09 14:45 사용자) 서버가 정음을 안 줬던 음(o0 없음)에 선생님이 음을 정하면 파란 보정선도 그 음으로 옮겨 그림(부른 높이 중앙값 기준)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const src = T.match(/  function syncCorr\(cv\) \{[\s\S]*?if \(want\) ks\[si\] = want; else delete ks\[si\]; \} \}/)[0];
const syncCorr = new Function("tgCol", src + "; return syncCorr;")((cv) => 2 + cv.levels.length);
// [시각, 부른, 보정(1단계), 정음] — 서버가 정음 없음(부른 그대로 = 보정선도 부른 높이) → 선생님이 G4(6700)로
const cv = { levels: [3], pts: [[0, 6590, 6590, 6700], [0.04, 6610, 6610, 6700], [0.08, 6600, 6600, 6700], [0.12, 6300, 6300, 6300]], _orig: { 0: null, 1: null, 2: null } };
syncCorr(cv);
assert.deepStrictEqual(cv.pts.slice(0, 3).map(p => p[2]), [6690, 6710, 6700], "부른 모양 그대로 G4로");
assert.strictEqual(cv.pts[3][2], 6300);
cv.pts[0][3] = cv.pts[1][3] = cv.pts[2][3] = null; syncCorr(cv); assert.deepStrictEqual(cv.pts.slice(0, 3).map(p => p[2]), [6590, 6610, 6600], "음을 지우면 원래대로");
console.log("corr-null ok");
