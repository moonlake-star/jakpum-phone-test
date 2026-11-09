// (11/09 12:59 사용자 '블루투스 이어폰이면 화면이 먼저 가고 소리가 늦음') 재생 중엔 그래프 시각 = 소리 시각 − 지연(Brand.outLat) · 멈춰 있으면 그대로
const assert = require("assert"), fs = require("fs"), path = require("path"), vm = require("vm");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), B = fs.readFileSync(path.join(__dirname, "..", "brand.js"), "utf8");
const src = T.match(/function latWrap\(getT\) \{[\s\S]*?return L > 0 \? Math\.max\(0, r - L\) : r; \}; \}/)[0];
let now = 1000; const G = { Brand: { outLat: () => 0.2 } }, D = { now: () => now };
const latWrap = new Function("G", "Date", src + "; return latWrap;")(G, D);
let raw = 5; const g = latWrap(() => raw);
assert.strictEqual(g(), 5, "처음(움직임 모름) = 그대로");
now += 16; raw = 5.016; assert.ok(Math.abs(g() - 4.816) < 1e-9, "재생 중 = 0.2초 늦춰 그림");
now += 1000; assert.strictEqual(g(), 5.016, "멈추면 그대로");
assert.ok(T.includes("if (!el || !cv) return; getT = latWrap(getT);"));
// brand.js: 수동 설정이 자동보다 우선 · 자동은 AudioContext.outputLatency + baseLatency
const store = {}; class AC { constructor() { this.state = "running"; this.outputLatency = 0.17; this.baseLatency = 0.01; } }
const ctx = { localStorage: { getItem: (k) => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } }, AudioContext: AC, addEventListener() {}, document: { addEventListener() {}, getElementById: () => null, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }), head: { appendChild() {} }, body: null, querySelector: () => null }, history: { state: null, pushState() {}, go() {} }, location: { href: "x" } };
ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx); vm.runInContext(B, ctx);
new ctx.AudioContext();
assert.ok(Math.abs(ctx.Brand.outLat() - 0.18) < 1e-9, "자동 = 0.17 + 0.01");
ctx.Brand.outLatSet(250); assert.strictEqual(ctx.Brand.outLat(), 0.25, "수동 0.25초"); ctx.Brand.outLatSet(0); assert.strictEqual(ctx.Brand.outLat(), 0, "끔");
ctx.Brand.outLatSet("auto"); assert.strictEqual(ctx.Brand.outLatMode(), "auto");
console.log("bt-latency ok");
