// (11/24 사용자 'ㅅ·ㅊ 치찰음은 모음 음표의 왼쪽 앞에 붙이기') 음을 옮기면 바로 앞 치찰음도 같이(서버 timing.parse와 같은 규칙) + 화면에서 치찰음 덩어리 = 뒤 음표 왼쪽 끝에 맞닿게
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const w = { localStorage: { getItem: () => null, setItem() {} }, document: { createElement: () => ({ style: {}, getContext: () => null }), getElementById: () => null, head: { appendChild() {} }, addEventListener() {} }, addEventListener() {}, navigator: {}, performance: { now: () => 0 }, requestAnimationFrame() {}, matchMedia: () => ({ matches: false, addEventListener() {} }) };
w.window = w; vm.createContext(w); try { vm.runInContext(T, w); } catch (e) {}
const Tn = w.Tune || (w.window && w.window.Tune);
if (Tn && Tn.tmapOf) {
  const M = Tn.tmapOf([{ t0: 2.0, t1: 2.5, nt0: 2.1, nt1: 2.6, sib: 1.9 }], 10);
  const at = (t) => Tn.mapT(t, M);
  assert.ok(Math.abs(at(1.9) - 2.0) < 1e-6 && Math.abs(at(1.95) - 2.05) < 1e-6, "치찰음 구간도 0.1초 이동 " + JSON.stringify(M));
  const M0 = Tn.tmapOf([{ t0: 2.0, t1: 2.5, nt0: 2.1, nt1: 2.6 }], 10); assert.ok(Math.abs(Tn.mapT(1.9, M0) - 1.9) > 1e-4, "sib 없으면 예전처럼 늘어남");
} else assert.fail("Tune.tmapOf 실행 못 함");
assert.ok(T.includes("const sb_ = sibBefore(cv, st, b.t0); fxSave(st.onTime, { t0: b.t0, t1: b.t1, nt0: n0, nt1: n1, ...(sb_ != null ? { sib: sb_ } : {}) })"), "옮길 때 sib 같이 저장");
assert.ok(T.includes('const nxt = u[2] === "s" ? bars.filter(x => !x.ghost && x.t0 >= u[1] - 0.02 && x.t0 - u[1] <= SIB_GAP)') && T.includes("x1 = nxt ? nxt.x0"), "화면: 뒤 음표 왼쪽 앞에 붙임");
console.log("sib-attach ok");
