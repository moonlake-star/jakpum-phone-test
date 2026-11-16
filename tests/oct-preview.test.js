// (11/16 사용자 '그래프와 실제 음정 출력이 다름 — 치명적') 폰 미리듣기: 옥타브만 잘못 읽힌 곳은 원음 그대로가 아니라 진짜 높이로 보정
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const grab = (name) => { const i = T.indexOf("function " + name + "("); assert.ok(i > 0, name); let d = 0, j = T.indexOf("{", i); for (; j < T.length; j++) { if (T[j] === "{") d++; else if (T[j] === "}" && --d === 0) break; } return T.slice(i, j + 1); };
const env = new Function(grab("pvBins") + grab("pvBadSpans") + grab("pvFtrue") + "; return { pvBadSpans, pvFtrue };")();
// 25칸/초 · 1~2초는 옥타브를 바로잡아 부른 높이 선이 있음(6700) · 3~3.5초는 믿을 수 없는 높이라 선이 없음
const pts = []; for (let i = 0; i < 125; i++) { const t = i / 25; pts.push([t, t >= 3 && t <= 3.5 ? null : 6700, 6700, 6700]); }
const cv = { fps: 25, levels: [3], pts, bad: [[1.0, 2.0], [3.0, 3.5]] };
assert.deepStrictEqual(env.pvBadSpans(cv).map(x => [x.t0, x.t1]), [[3.0, 3.5]], "옥타브 바로잡은 곳(선 있음)은 원음 그대로 목록에서 뺌");
assert.deepStrictEqual(env.pvBadSpans({ ...cv, bad_raw: [[1.2, 1.3]] }).map(x => [x.t0, x.t1]), [[1.2, 1.3]], "서버 bad_raw가 있으면 그대로");
// Praat이 1~2초를 한 옥타브 위(784Hz)로 읽음 → 진짜 높이(392Hz)로
const A = { t: Float64Array.from([0.5, 1.5, 2.5]), f: Float64Array.from([392, 784, 392]) };
const ft = env.pvFtrue(cv, A, 0);
assert.ok(ft && Math.abs(ft[1] - 392) < 1 && ft[0] === 392 && ft[2] === 392);
assert.strictEqual(env.pvFtrue(cv, { t: Float64Array.from([0.5]), f: Float64Array.from([392]) }, 0), null, "옥타브 틀린 곳 없으면 null(예전과 같은 계산)");
// Praat 엔진: 옥타브 조각 나누기
global.self = {}; const Core = require(path.join(__dirname, "..", "praat", "praat-core.js"));
const t = Float64Array.from({ length: 100 }, (_, i) => i * 0.01), f = Float64Array.from(t, (x) => x >= 0.3 && x < 0.8 ? 784 : 392), ftr = Float64Array.from(t, () => 392);
const oc = Core.octChunks(t, f, ftr);
assert.ok(oc.chunks.length >= 1 && Math.abs(oc.chunks[0].a - 0.295) < 0.01 && oc.chunks[oc.chunks.length - 1].b > 0.78 && oc.chunks.every(c => c.lo < 392 && c.hi > 392 && c.hi < 784));
assert.strictEqual(Core.octChunks(t, ftr, ftr).chunks.length, 0);
console.log("oct-preview ok");
