// (11/05 사용자) 전체화면 ↶ ↷ 되돌리기·다시하기 + 길게 누르면 작업 기록 창
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
// mkHist 동작(고침 함수를 감싸 기록 · 되돌리기/다시하기 · 0.5초 안 이어지면 한 칸)
const a = T.indexOf("  function mkHist("), b = T.indexOf("  function openFull(");
assert.ok(a > 0 && b > a, "mkHist 위치");
let state = { v: 0 }; const applied = [];
const o = { histGet: () => JSON.stringify(state), histSet: async (js) => { state = JSON.parse(js); applied.push(js); }, onFix: (f) => { state = { v: f.midi }; }, onFixMany: (l) => { state = { v: l.length }; }, onTime: () => { state = { v: "t" }; }, onAdv: () => { state = { v: "adv" }; }, onResetRange: async () => { state = { v: 0 }; return 1; } };
let changed = 0; let now = 1000; const perf = { now: () => now };
const mkHist = new Function("noteName", "performance", T.slice(a, b) + "; return mkHist;")((m) => "N" + m, perf);
const h = mkHist(o, () => changed++);
assert.deepStrictEqual([h.canU(), h.canR(), h.L.length], [false, false, 1]);
h.o.onFix({ t0: 12, t1: 13, midi: 60 }); now += 2000; h.o.onFix({ t0: 12, t1: 13, midi: 62 }); now += 2000; h.o.onFixMany([{ t0: 1, t1: 2 }, { t0: 3, t1: 4 }]);
assert.strictEqual(h.S.length, 4, "세 번 고침 = 세 칸"); assert.ok(h.L[1].includes("0:12") && h.L[1].includes("N60") && h.L[3].includes("2음"), "이름표: 시각·음·개수");
// 0.5초 안에 이어진 호출(나누기가 두 번 저장하는 경우 등)은 한 칸
now += 100; h.o.onTime({ t0: 5 }); now += 100; h.o.onAdv(); assert.strictEqual(h.S.length, 4, "0.5초 안에 이어진 건 앞 칸에 합침"); assert.ok(h.L[3].includes("디테일"), "합친 칸 이름표는 마지막 고침");
// 되돌리기 → 다시하기 → 기록 창으로 점프
(async () => { assert.ok(await h.go(h.ptr - 1)); assert.deepStrictEqual(state, { v: 62 }, "한 단계 되돌림"); assert.ok(h.canR());
  assert.ok(await h.go(h.ptr + 1)); assert.deepStrictEqual(state, { v: "adv" }); assert.ok(await h.go(0)); assert.deepStrictEqual(state, { v: 0 }, "맨 처음으로 점프");
  // 되돌린 뒤 새로 고치면 뒤쪽(다시하기) 기록은 버림
  now += 5000; h.o.onFix({ t0: 1, t1: 2, midi: 70 }); assert.deepStrictEqual([h.S.length, h.canR()], [2, false], "새 고침 = 다시하기 기록 버림");
  // 같은 상태면 기록 안 함
  now += 5000; h.o.onFix({ t0: 1, t1: 2, midi: 70 }); assert.strictEqual(h.S.length, 2);
  // 코드 연결
  assert.ok(T.includes('data-ur="-1"') && T.includes('data-ur="1"') && T.includes("openHist();") && T.includes("}, 500); });"), "↶ ↷ + 길게 = 기록 창");
  assert.ok(T.includes('if (hist) o = hist.o;') && T.includes("typeof o.histGet === \"function\" && typeof o.histSet === \"function\""), "앱이 histGet/histSet을 줄 때만 켜짐");
  assert.ok(H.includes("const histGet = () => JSON.stringify({ fx: r.target_fixes") && H.includes("await applyAll(h.fx || [], h.te || [])") && H.includes("onFixMany, histGet, histSet, onTime"), "선생님 앱 연결");
  console.log("undo-redo ok"); })().catch((e) => { console.error(e); process.exit(1); });
