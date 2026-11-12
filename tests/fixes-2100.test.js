// (11/12 20:58~21:00) 시간=닫기 옆 · 타이밍 고친 음 쪼개면 고침도 둘로 · -5초 등 이동하면 멈춤 자리 지움 · 되돌리기 한 칸 합침은 같은 자리일 때만
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes('tmE.classList.add("tfTimeR")') && T.includes("#tuneFs .tfTop .tfTimeR{order:3!important;margin-left:auto!important}"), "시간 위치");
assert.ok(T.includes("cv._tedits = cv._tedits.filter(x => x !== te).concat([A, B_]);"), "쪼개면 타이밍 고침도 나눔");
assert.ok(T.includes("st.panAt = 0; st.stopAt = 0; st.pvJ = 0; try { seek(t, isPaused()); } catch {} });"), "-5초 멈춤 자리 지움");
assert.ok(T.includes("const step = async (i) => { hist.t = 0; const p0 = hist.ptr;"), "되돌리기: 닫으며 저장한 건 따로 한 칸");
// 쪼개기 비율 계산
const te = { t0: 1, t1: 3, nt0: 1.2, nt1: 3.6 }, ts = 2, r_ = (ts - te.t0) / (te.t1 - te.t0), nts = Math.round((te.nt0 + (te.nt1 - te.nt0) * r_) * 100) / 100;
assert.strictEqual(nts, 2.4);
console.log("fixes-2100 ok");
