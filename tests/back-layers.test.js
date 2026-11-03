// (11/03 22:22 사용자) 뒤로 가기(뒤로 밀기)는 어느 화면에서나 '맨 위에 떠 있는 것 하나만' 닫는다 — 같은 규칙(Brand.layer)
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const br = fs.readFileSync(__dirname + "/../brand.js", "utf8"), tu = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
// 작은 창들은 모두 같은 장치로 엶
assert.ok(br.includes("const ly = layer(() => d.remove()), shut = () => ly.close();"), "팁 목록");
assert.ok(tu.includes("G.Brand.layer(() => cf.remove())"), "원본 되돌리기 확인 창");
assert.ok(T.includes("Brand.layer(() => d.remove())"), "선생님 확인 창");
assert.ok(S.includes("fzLy = typeof Brand !== \"undefined\" && Brand.layer"), "수강생 글씨 크기 창");
// 작은 창이 닫힌 뒤로 가기는 전체화면·화면 이동이 건너뜀
assert.ok(tu.includes("if (e && e.layerClosed) return;"));
assert.ok(T.includes("if (e && (e.tuneClosed || e.layerClosed)) return;"));
// 전체화면을 버튼으로 닫을 때 위 작은 창 기록까지 정리
assert.ok(tu.includes("history.go(-1 - nl - (sh && history.state.tuneSheet ? 1 : 0))"));
// 동작: 가짜 history 위에서 brand.js 실행
const hist = [{ base: 1 }], ls = [];
const H = { get state() { return hist[hist.length - 1]; }, pushState(s) { hist.push(s); }, back() { hist.pop(); const e = {}; ls.forEach(f => f(e)); H.last = e; } };
const G = { history: H, addEventListener: (k, f) => { if (k === "popstate") ls.push(f); }, document: { getElementById: () => null, addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }), head: { appendChild() {} }, body: { appendChild() {} } }, setTimeout, clearTimeout };
G.window = G; G.self = G;
vm.createContext(G); vm.runInContext(br, G);
const B = G.Brand; assert.ok(B && B.layer && B.dropLayers);
let closed = [];
const a = B.layer((p) => closed.push(["a", p])); const b = B.layer((p) => closed.push(["b", p]));
assert.strictEqual(hist.length, 3);
H.back(); assert.deepStrictEqual(closed, [["b", true]]); assert.ok(H.last.layerClosed, "뒤로 = 맨 위(b)만");
a.close(); assert.deepStrictEqual(closed[1], ["a", false]); assert.strictEqual(hist.length, 1, "✕로 닫아도 기록 정리"); assert.ok(H.last.layerClosed, "정리용 뒤로는 화면 이동 아님");
H.back(); assert.ok(!H.last.layerClosed, "작은 창이 없으면 원래 뒤로 가기");
hist.push({ base: 1 }); B.layer(() => {}); B.layer(() => {}); assert.strictEqual(B.dropLayers(), 2); assert.strictEqual(B.dropLayers(), 0);
console.log("back-layers ok");
