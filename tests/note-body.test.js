// (11/24 사용자 '멜로다인처럼 음악적으로 중요한 지점(몸통)' · 코덱스·안티그라비티 검토) 음표 몸통 = 실제로 부른 대표 높이
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const a = T.indexOf("  function envCv(cv)"), b = T.indexOf("\n", a), s = T.indexOf("  function bodyOf("), e = T.indexOf("  function selHit(");
const bodyOf = new Function(T.slice(a, b) + "\n" + T.slice(s, e) + "; return bodyOf;")();
const mk = (f, t0 = 0, t1 = 1, dt = 0.01) => { const P = []; for (let t = t0; t <= t1 + 1e-9; t += dt) { const v = f(t); P.push([+t.toFixed(3), v == null ? null : v]); } return P; };
// 1) 아래에서 올라오는 스쿱(0.15초) + 몸통 G3(5500) −10센트 + 끝 처짐 → 몸통 ≈ 5490 (전체 중앙값·평균보다 정확)
let cv = { pts: mk(t => t < 0.15 ? 5300 + (t / 0.15) * 190 : t > 0.85 ? 5490 - (t - 0.85) / 0.15 * 250 : 5490) };
let r = bodyOf(cv, 0, 1); assert.strictEqual(r.kind, "body"); assert.ok(Math.abs(r.c - 5490) <= 3, "스쿱·처짐 뺀 몸통 " + r.c); assert.ok(r.a >= 0.12 && r.b <= 0.9, "몸통 구간 " + r.a + "~" + r.b);
const mean = cv.pts.reduce((x, p) => x + p[1], 0) / cv.pts.length; assert.ok(Math.abs(mean - 5490) > 15, "평균은 끌려감(비교용) " + mean);
// 2) 비브라토 ±50센트 5.5Hz, 가운데 5520 → 떨림 가운데
cv = { pts: mk(t => 5520 + 50 * Math.sin(2 * Math.PI * 5.5 * t)) }; r = bodyOf(cv, 0, 1); assert.strictEqual(r.kind, "body"); assert.ok(Math.abs(r.c - 5520) <= 8, "비브라토 가운데 " + r.c);
// 3) 앞 치찰음(cv.uv)·순간 옥타브 튐은 뺌
cv = { pts: mk(t => (t > 0.5 && t < 0.53) ? 6700 : t < 0.1 ? 7000 : 5500), uv: [[0, 0.1, "s"]] }; r = bodyOf(cv, 0, 1); assert.ok(Math.abs(r.c - 5500) <= 2, "치찰음·옥타브 튐 제외 " + r.c);
// 4) 계속 미끄러지는 음 = none(보정 기준 아님) · 짧은 음 = short
cv = { pts: mk(t => 5000 + t * 800) }; r = bodyOf(cv, 0, 1); assert.strictEqual(r.kind, "none");
cv = { pts: mk(t => 5600, 0, 0.12) }; r = bodyOf(cv, 0, 0.12); assert.strictEqual(r.kind, "short"); assert.strictEqual(r.c, 5600);
assert.strictEqual(bodyOf({ pts: [] }, 0, 1), null);
// 5) 화면: 고급 모드에서 고른 음에 흰 선 + '부른 높이' 꼬리표
assert.ok(T.includes("cv._body = bodyOf(cv, sb.t0, sb.t1)") && T.includes("`부른 높이 ${dv === 0"), "고른 음 몸통 표시");
console.log("note-body ok");
