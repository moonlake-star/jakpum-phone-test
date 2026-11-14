// (11/14 18:43 사용자 '자르고 음정 보정하면 그래프 위치와 소리 피치가 안 맞음') 서버 자동 정음이 없던 곳(base=null)에 선생님 음이 이미 완성본에 들어간 경우
//  서버 보정선은 이미 그 음 → 앱이 한 번 더 옮기면 안 됨(예전: ▲138처럼 두 배)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const src = T.match(/  function syncCorr\(cv\) \{[\s\S]*?if \(want\) ks\[si\] = want; else delete ks\[si\]; \} \}/)[0];
const syncCorr = new Function("tgCol", src + "; return syncCorr;")((cv) => 2 + cv.levels.length);
// [시각, 부른, 보정, 정음] — 부른 ≈ 6630(G4−70), 완성본은 이미 G4(6700)로 옮김(보정 ≈ 6700), 서버 자동 정음은 없었음(_orig null) · _rend = 완성본 당시 정음
const mk = () => ({ levels: [3], pts: [[0, 6620, 6690, 6700], [0.04, 6640, 6710, 6700], [0.08, 6630, 6700, 6700]], _orig: { 0: null, 1: null, 2: null }, _rend: { 0: 6700, 1: 6700, 2: 6700 } });
let cv = mk(); syncCorr(cv);
assert.deepStrictEqual(cv.pts.map(p => p[2]), [6690, 6710, 6700], "이미 옮겨진 보정선은 그대로(두 번 옮기지 않음)");
syncCorr(cv); assert.deepStrictEqual(cv.pts.map(p => p[2]), [6690, 6710, 6700], "여러 번 불러도 같음");
cv.pts.forEach(p => (p[3] = 6800)); syncCorr(cv); assert.deepStrictEqual(cv.pts.map(p => p[2]), [6790, 6810, 6800], "한 반음 올리면 그만큼만");
cv.pts.forEach(p => (p[3] = null)); syncCorr(cv); assert.deepStrictEqual(cv.pts.map(p => p[2]), [6620, 6640, 6630], "음을 지우면 부른 높이로");
console.log("corr-rendered-null ok");
