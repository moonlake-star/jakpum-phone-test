// (11/05 사용자 '다 고고') 여러 음 고르기: 얇은 도구줄 + ▼▲ 일괄 이동(저장은 묶어서 한 번) + 가장자리 자동 스크롤
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = T.indexOf("  function barsIn("), b = T.indexOf("  function multiSheet(");
assert.ok(a > 0 && b > a, "barsIn·groupShift 위치");
const tgCol = (cv) => (cv.target ? 2 + (cv.levels || []).length : 0);
const { barsIn, groupShift } = new Function("tgCol", "BAR_GAP", T.slice(a, b) + "; return { barsIn, groupShift };")(tgCol, 0.5);
const mk = () => { const pts = [];
  for (let t = 0; t < 10; t += 0.02) { t = +t.toFixed(2); let c = null; if (t >= 1 && t < 2) c = 6000; else if (t >= 2.2 && t < 3.2) c = 6200; else if (t >= 5 && t < 5.05) c = 6400; pts.push([t, 6000, c]); }
  return { pts, target: true, levels: [], _fixes: [] }; };
const cv = mk(), kt = 2;
// 막대 모으기: 짧은 조각(0.05초)은 빼고 두 음만
let r = barsIn(cv, 0, 10); assert.strictEqual(r.length, 2, "0.1초 미만 안 고친 조각 제외");
assert.deepStrictEqual(r.map(x => x.c), [6000, 6200]);
assert.strictEqual(barsIn(cv, 2.5, 2.6).length, 1, "겹치는 음만");
assert.strictEqual(barsIn(cv, 3.3, 4.9).length, 0, "빈 구간");
// 일괄 ▼: 두 음이 반음 내려가고 고침 기록 2개
let out = groupShift(cv, 0, 4, -1);
assert.strictEqual(out.length, 2);
assert.deepStrictEqual(out.map(f => f.midi), [59, 61]);
assert.deepStrictEqual(cv._fixes.map(f => f.midi), [59, 61]);
assert.strictEqual(cv.pts.find(p => p[0] === 1.5)[kt], 5900); assert.strictEqual(cv.pts.find(p => p[0] === 2.5)[kt], 6100);
assert.strictEqual(cv.pts.find(p => p[0] === 5)[kt], 6400, "구간 밖은 그대로");
// 두 번 ▼ = 2반음, 이어서 ▲▲ = 서버가 처음 고른 음으로 돌아오면 고침 기록은 지움(midi:null)
groupShift(cv, 0, 4, -1); out = groupShift(cv, 0, 4, 1); out = groupShift(cv, 0, 4, 1);
assert.deepStrictEqual(out.map(f => f.midi), [null, null], "원래 음으로 돌아오면 기록 삭제");
assert.deepStrictEqual(cv._fixes, []);
assert.strictEqual(cv.pts.find(p => p[0] === 1.5)[kt], 6000);
// 나누기만 한 조각(cut)은 옮겨도·되돌아와도 나눔 표시가 남음
const c2 = mk(); c2._fixes = [{ t0: 1, t1: 2.02, midi: 60, cut: true }]; groupShift(c2, 1, 2, 1); const o2 = groupShift(c2, 1, 2, -1);
assert.deepStrictEqual(o2.map(f => [f.midi, !!f.cut]), [[60, true]], "나눔 표시 유지");
// 도구줄·묶어 저장·자동 스크롤이 코드에 있음
assert.ok(!T.includes('data-gd="1"'), "▼▲ 버튼 없음(11/12 14:40)");
assert.ok(T.includes("typeof o.onFixMany === \"function\"") && T.includes("setTimeout(flush, 450)"), "묶어 저장");
assert.ok(T.includes("const edgeAuto = (d)") && T.includes("drag.lx = l0.x; edgeAuto(drag);") && T.includes("clearInterval(d.auto)"), "가장자리 자동 스크롤");
// 선생님 앱: 한 번에 받아 드라이브에는 한 번만 쓰고 wire에 넘김
const f = H.indexOf("const onFixMany = async (list)"); assert.ok(f > 0, "onFixMany");
const body = H.slice(f, H.indexOf("// (11/03 13:08 사용자 승인) 타이밍·길이", f));
assert.strictEqual((body.match(/await (writeJSON\(|mkWrite\(\))/g) || []).length, 1, "저장은 한 번");
assert.ok(H.includes("onFix, onFixMany, histGet, histSet, onTime"), "wire에 넘김");
console.log("msel-bar ok");
// (11/05 사용자) 분홍 세로선: 꾹 누르지 않아도 바로 잡아 끌면 범위 조절(반대쪽 끝 고정), 떼도 선택 유지 · 🌬 치찰음·호흡은 고른 구간의 도구(따로 버튼 없음)
assert.ok(T.includes("d0.armed = { x: l0.x, t: st.msel[1 - side], keep: true }") && T.includes("if (d.armed.keep) return; st.msel = null;") && T.includes("!drag.edgeLp"), "분홍선 바로 잡기");
assert.ok(T.includes("uvBtn.onclick") && T.includes("G.TuneAdv.uvSheet(host.querySelector") && !T.includes("st.uvTool"), "🌬 = 고른 구간에서");
