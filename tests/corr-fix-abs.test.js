// (11/16 사용자 '두 음을 C에 가깝게 고쳤는데 두번째 음은 B로 소리 남') 고친 음 안의 파란 보정선 = 들리는 높이
//   소리(폰 미리듣기 pvFixCenter·서버)는 '정음 + (부른 높이 − 그 음 안 머문 점 평균)' → 그래프도 같은 식(예전: 서버가 처음 그린 선을 정음 차이만큼만 옮겨 소리와 반음 가까이 어긋날 수 있었음)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const src = T.match(/  function fixAbs\(cv\) \{[\s\S]*?if \(want\) ks\[si\] = want; else delete ks\[si\]; \} \}/)[0];
const syncCorr = new Function("tgCol", src + "; return syncCorr;")((cv) => 2 + cv.levels.length);
// 50fps · 부른 높이: 앞 0.1초 미끄러져 올라옴(5600→5940) 뒤 5950 근처에 머묾 · 서버 보정선은 C4(6000)에 그려져 있음 · 선생님이 59.5(=5950)로 고침
const pts = []; for (let i = 0; i < 30; i++) { const t = i * 0.02, raw = i < 5 ? 5600 + i * 85 : 5950 + (i % 2 ? 6 : -6); pts.push([t, raw, 6000, 5950]); }   // 정음 칸은 선생님 음(앱이 고칠 때 씀), _orig = 서버 정음
const o = {}; pts.forEach((_, i) => { o[i] = 6000; });
const cv = { levels: [3], pts, _orig: o, _fixes: [{ t0: 0, t1: 0.58, midi: 59.5 }] };
syncCorr(cv);
const stay = cv.pts.slice(6, 28).map(p => p[2]), mean = stay.reduce((a, b) => a + b, 0) / stay.length;
assert.ok(Math.abs(mean - 5950) < 3, "머문 곳 = 고친 음(59.5) 그대로: " + mean);   // 예전엔 6000(C4)에 그대로 → 소리(B쪽)와 반음 가까이 차이
assert.ok(cv.pts[0][2] < 5700, "미끄러져 올라오는 앞부분 모양은 그대로(정음 기준으로 같은 만큼 옮김)");
// 다시 그려도 두 번 옮기지 않음
syncCorr(cv); assert.ok(Math.abs(cv.pts.slice(6, 28).map(p => p[2]).reduce((a, b) => a + b, 0) / 22 - 5950) < 3);
// 고침을 지우면 서버 선으로
cv._fixes = []; cv.pts.forEach(p => { p[3] = 6000; }); syncCorr(cv); assert.ok(cv.pts.every(p => p[2] === 6000), "고침 지우면 원래 선");
console.log("corr-fix-abs ok");
