// (11/12 13:29 사용자 고) 여러 음 함께 옮기기·길이(시작점 고정, 같은 비율) · 붙은 음 경계점 중복 합치기
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes('data-mtab="t">⏱ 타이밍</button>') && T.includes('data-mt="r" data-v="0.05">늘이기 +</button>'), "타이밍 탭·두 줄");
assert.ok(T.includes("let n0 = S + (b_.t0 - S) * nR + nD, n1 = S + (b_.t1 - S) * nR + nD"), "시작점 고정 비율");
assert.ok(T.includes("if (nR < 0.5 || nR > 2 || Math.abs(nD) > 1)"), "범위");
// tmapOf: 붙은 두 음을 같이 늘여도 둘 다 남음
global.window = global; const vm = require("vm"); const sb = { window: {}, document: undefined, console };
const src = T.slice(T.indexOf("  function tmapOf(edits, dur) {"), T.indexOf("  function mapT(t, tm, inv) {"));
const TW = 0.4, TMIN = 0.03, TMAX = 4; const f = eval("(" + src.trim() + ")");
const m = f([{ t0: 1, t1: 2, nt0: 1, nt1: 2.1 }, { t0: 2, t1: 3, nt0: 2.1, nt1: 3.2 }], 10);
assert.ok(m.some(p => p[0] === 2 && p[1] === 2.1) && m.some(p => p[0] === 3 && p[1] === 3.2), "붙은 음 둘 다: " + JSON.stringify(m));
console.log("multi-timing ok");
