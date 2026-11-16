// 사용자가 한 번 지적한 문제는 다시 생기지 않게 묶어 두는 시험(11/16 16:15 '이거 고치면 저거가 고장')
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const src = T.match(/  function fixAbs\(cv\) \{[\s\S]*?if \(want\) ks\[si\] = want; else delete ks\[si\]; \} \}/)[0];
const fixAbs = new Function("tgCol", src + "; return fixAbs;")((cv) => 2 + cv.levels.length);
// ① 11/16 16:04 '오토보정이 원래 비브라토 진폭을 줄임' — 고친 음 안 떨림 폭(±150센트)은 그대로
{ const P = []; for (let i = 0; i < 50; i++) { const t = i * 0.04; P.push([t, 5600 + 150 * Math.sin(2 * Math.PI * 5.5 * t), 5600, 5600]); }
  const m = fixAbs({ levels: [3], pts: P, _fixes: [{ t0: 0, t1: 1.96, midi: 57 }] }), v = [...m.values()];
  const amp = (Math.max(...v) - Math.min(...v)) / 2, raw = (Math.max(...P.map(p => p[1])) - Math.min(...P.map(p => p[1]))) / 2;
  assert.ok(Math.abs(amp - raw) < 3, `떨림 폭 그대로: ${amp} vs ${raw}`); }
// ② 11/16 16:04 '미세음 조금 낮췄는데 끝이 뿔처럼 튐' — 음 끝 처짐은 원래 모양 그대로(위로 꺾이지 않음)
{ const P = []; for (let i = 0; i < 30; i++) { const t = i * 0.04; P.push([t, i < 22 ? 6100 : 6100 - (i - 21) * 120, 6100, 6100]); }
  const m = fixAbs({ levels: [3], pts: P, _fixes: [{ t0: 0, t1: 1.16, midi: 60.96 }] });
  for (let i = 23; i < 30; i++) assert.ok(m.get(i) < m.get(i - 1), "끝 처짐은 계속 내려감(뿔 없음)"); }
// ③ 11/16 16:12 '쪼개기만 했는데 보정 라인이 바뀜' — 나누기만 한 조각(cut, 회색 조각 gcut 포함)은 그래프 계산에서 무시
{ const P = []; for (let i = 0; i < 30; i++) P.push([i * 0.04, 5700 + i * 10, 5700, null]);
  assert.strictEqual(fixAbs({ levels: [3], pts: P, _fixes: [{ t0: 0, t1: 0.6, midi: 57, cut: true }, { t0: 0.6, t1: 1.16, midi: 57, cut: true, gcut: true }] }).size, 0); }
// ④ 11/16 14:50 '자른 뒤 뒤 음이 튀어 올라감' — 꺾이는 꼭짓점 한 점을 기준으로 삼지 않음 (corr-fix-abs.test.js에도 있음)
{ const P = []; for (let i = 0; i < 20; i++) { const t = i * 0.04, r = i <= 4 ? 4800 + (4 - i) * 120 : 4800 + (i - 4) * 70; P.push([t, r, 5400, 5400]); }
  const v = [...fixAbs({ levels: [3], pts: P, _fixes: [{ t0: 0, t1: 0.76, midi: 54 }] }).values()].sort((a, b) => a - b);
  assert.ok(v[v.length >> 1] < 5600, "조각 가운데가 정음 근처: " + v[v.length >> 1]); }
// ⑤ 11/16 16:00 '되돌리기 한 번에 전전 음으로 이동' — 되돌리기 비교에서 계산용 값(_로 시작)은 뺌, 미리듣기는 고친 음 객체에 값을 붙이지 않음
assert.ok(/histSnap = \(\) => \(\{ fx: \(cv\._fixes \|\| \[\]\)\.map\(x => JSON\.stringify\(x, \(k, v\) => \(k && k\[0\] === "_"/.test(T));
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(!/f\._cen\s*=/.test(H), "f._cen 붙이지 않음");
assert.ok(/const pvF = \(\) => dF\(\)\.filter\(f => !f\.cut\)/.test(H), "미리듣기도 cut 조각 무시");
console.log("user-regress ok");
