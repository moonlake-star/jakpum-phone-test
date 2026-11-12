// (11/12 14:40 사용자 고) 여러 음 = 길이·타이밍만: 손잡이 끌면 반대쪽 끝 고정, 비율로(로직 Flex·멜로다인) · ▼▲·탭·두 줄 없음 · 붙은 음 경계점 중복 합치기
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(!T.includes('data-mtab=') && !T.includes('data-mt="r"') && !T.includes('data-gd="1"'), "탭·두 줄·▼▲ 없음");
assert.ok(T.includes("if (st.mStr.start(side)) { d0.stretch") && T.includes("if (d.stretch) { if (st.mStr) st.mStr.end(); return; }"), "손잡이 = 비율 늘이기");
// flexPlan 계산
const src = T.slice(T.indexOf("  function flexPlan(base, F, E, nE) {"), T.indexOf("  // groupShift = 구간 안"));
const flexPlan = eval("(" + src.trim() + ")");
const bs = [{ t0: 1, t1: 2 }, { t0: 2.2, t1: 3 }, { t0: 3.2, t1: 4 }], base = bs.map(b => [b, b.t0, b.t1]);
// 왼쪽 끝(1)을 0.7로 → 오른쪽 끝(4) 고정, 첫 음 앞이 가장 많이(−0.3), 안쪽은 비례해 덜, 끝은 그대로
const P = flexPlan(base, 4, 1, 0.7);
assert.ok(P, "계획");
assert.strictEqual(P[0][1], 0.7); assert.strictEqual(P[2][2], 4);
const sh = P.map(([b, n0]) => b.t0 - n0); assert.ok(sh[0] > sh[1] && sh[1] > sh[2] && sh[2] > 0, "앞쪽일수록 많이: " + sh);
assert.ok(Math.abs((P[1][2] - P[1][1]) / 0.8 - 1.1) < 0.02, "길이 같은 비율(110%)");
// 오른쪽 끝을 늘이기 → 시작 고정
const Q = flexPlan(base, 1, 4, 4.6); assert.strictEqual(Q[0][1], 1); assert.strictEqual(Q[2][2], 4.6);
// 범위 밖 → null
assert.strictEqual(flexPlan(base, 4, 1, -2.5), null, "2배 넘음");
assert.strictEqual(flexPlan(base, 4, 1, 4.5), null, "뒤집힘");
// tmapOf: 붙은 두 음을 같이 늘여도 둘 다 남음
const s2 = T.slice(T.indexOf("  function tmapOf(edits, dur) {"), T.indexOf("  function mapT(t, tm, inv) {"));
const TW = 0.4, TMIN = 0.03, TMAX = 4; const f = eval("(" + s2.trim() + ")");
const m = f([{ t0: 1, t1: 2, nt0: 1, nt1: 2.1 }, { t0: 2, t1: 3, nt0: 2.1, nt1: 3.2 }], 10);
assert.ok(m.some(p => p[0] === 2 && p[1] === 2.1) && m.some(p => p[0] === 3 && p[1] === 3.2), "붙은 음 둘 다: " + JSON.stringify(m));
console.log("multi-timing ok");
// (11/12 15:55~57) 화살표 한 줄 · 끌기 1/4 · 고른 범위 = 음 양 끝 · 빈 곳 톡 해제 · 음 하나 창이 여러 음 창을 덮으면 범위도 끝
assert.ok(T.includes('data-mf="0" data-v="-1"') && T.includes('data-mf="1" data-v="1"'), "앞 끝·뒤 끝 ◀▶ 한 줄");
assert.ok(T.includes("const STR_K = 0.25;") && T.includes("mp.W8 * STR_K"), "끌기 1/4");
assert.ok(T.includes("if (bs_.length) st.msel = [bs_[0].t0, bs_[bs_.length - 1].t1];"), "범위를 음 양 끝에");
assert.ok(T.includes('if (st.msel && !wrap.querySelector(".tfMulti") && !d.mode && e.type === "pointerup") { st.msel = null;'), "빈 곳 톡 해제");
assert.ok(T.includes("if (st && st.mMode) { st.mMode = false; st.msel = null; st.onMSel = null; st.mStr = null; }"), "남은 분홍 범위 정리");
console.log("multi-timing+ ok");
assert.ok(T.includes("sheetClose(); lastTap = 0; if (hb) { st.msel = null; st.mMode = false; pauseNow(); fixSheet(wrap, cv, hb, o.onFix, getT, st); } return; }"), "범위 중 음 톡 = 해제 + 그 음");
console.log("tap-note ok");
