// (11/09 10:47 사용자 '되돌리기를 했으면 그래프에도') 서버가 '고침 없이 고른 정음'(마지막 열)을 주면 되돌릴 때 막대·하늘색 선·미리듣기가 원래 자리로
const assert = require("assert"), fs = require("fs"), path = require("path");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const seed = H.match(/\{ const kt = Tune\.tgCol\(cv\); if \(cv\.base && kt && !cv\._rend\) \{[\s\S]*?(?=\n    \/\/ 완성본에 들어간 고침)/)[0];
const bk = H.match(/const bakedFx = \(\) => \{[\s\S]*?virt: true \}\)\); \};/)[0];
assert.ok(H.includes("const pvF = () => dF().filter(f => !f.cut).concat(bakedFx());") && !H.includes("mkPv.fixes = dF();"), "미리듣기 = 고침 + 지운 옛 고침");
assert.ok(H.includes("const v = cv._rend && i in cv._rend ? cv._rend[i] :"), "미리듣기 기준 = 완성본 당시 정음");
// 열: [시각, 원음, 보정(1단계), 정음, 서버 정음]  — 0.0~0.08초는 선생님이 D4(6200)→E4(6400)로 고쳐 완성본에 들어감
const mk = () => ({ base: true, levels: [3], target: true, pts: [[0, 6390, 6400, 6400, 6200], [0.04, 6395, 6400, 6400, 6200], [0.08, 6380, 6400, 6400, 6200], [0.12, 6600, 6600, 6600, 6600]] });
const Tune = { tgCol: (cv) => 2 + cv.levels.length };
{ const cv = mk(); new Function("cv", "Tune", seed)(cv, Tune);
  assert.deepStrictEqual(cv._orig, { 0: 6200, 1: 6200, 2: 6200 }); assert.deepStrictEqual(cv._kShift, { 0: 200, 1: 200, 2: 200 }); assert.strictEqual(cv._rend[3], 6600); }
{ const cv = mk(); const r4 = (x) => Math.round(x * 1e4) / 1e4; let fixes = [];
  const run = new Function("cv", "Tune", "dF", "r4", bk + "; return bakedFx();");
  assert.deepStrictEqual(run(cv, Tune, () => fixes, r4), []);   // 아직 _rend 없음
  new Function("cv", "Tune", seed)(cv, Tune);
  fixes = [{ t0: 0, t1: 0.08, midi: 64 }]; assert.deepStrictEqual(run(cv, Tune, () => fixes, r4), [], "고침이 남아 있으면 그대로");
  fixes = []; assert.deepStrictEqual(run(cv, Tune, () => fixes, r4), [{ t0: 0, t1: 0.1, midi: 62, virt: true }], "지우면 서버 정음(D4)으로 미리듣기"); }
console.log("curve-base ok");
