// Praat 워커: 워커로 돌린 결과가 화면(메인)에서 돌린 결과와 똑같고, 워커를 못 쓰면 예전처럼 동작하는지 (워커는 vm으로 흉내)
const fs = require("fs"), vm = require("vm"), assert = require("assert"), path = require("path"), P = path.join(__dirname, "../praat/");
const gz = fs.readFileSync(P + "praat_web.wasm.gz"), gzAB = gz.buffer.slice(gz.byteOffset, gz.byteOffset + gz.byteLength);
const src = (f) => fs.readFileSync(P + f, "utf8");
class FakeWorker { // 워커 안(별도 전역)에서 praat-worker.js를 실행하고 메시지를 주고받음
  constructor() {
    const self = { postMessage: (m) => setImmediate(() => this.onmessage && this.onmessage({ data: m })), WorkerGlobalScope: function () {}, location: { href: "http://x/praat/" } };
    const ctx = vm.createContext(Object.assign(self, { self, console, setTimeout, clearTimeout, setImmediate, WebAssembly, TextDecoder, TextEncoder, Float32Array, Float64Array, Uint8Array, Int32Array, DataView, ArrayBuffer, Math, Promise, Error, String, Object, JSON, Array, DecompressionStream, Response, Blob, performance }));
    ctx.importScripts = (...fs2) => { for (const f of fs2) vm.runInContext(src(f), ctx, { filename: f }); };
    this.ctx = ctx; vm.runInContext(src("praat-worker.js"), ctx, { filename: "praat-worker.js" });
  }
  postMessage(m) { setImmediate(() => this.ctx.onmessage({ data: m })); }
  terminate() {}
}
(async () => {
  const sr = 16000, n = sr, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * (220 + 20 * Math.sin(i / 4000)) * i / sr);
  // 화면 스레드 직접 실행(기준)
  const L = require("../praat/praat-core.js"); await L.init(gz, require("../praat/praat_web.js"));
  assert.strictEqual(L.mode(), "main");
  const A0 = await L.analyze(x, sr), sh = Float64Array.from(A0.t, () => 100), y0 = await L.apply(x, sr, A0.t, A0.f, sh);
  // 워커 실행
  global.Worker = FakeWorker; delete require.cache[require.resolve("../praat/praat-core.js")];
  const W = require("../praat/praat-core.js"); assert.strictEqual(W.mode(), "none");
  assert.strictEqual(await W.useWorker("praat-worker.js", gzAB), true, "워커 준비"); assert.strictEqual(W.mode(), "worker"); assert.ok(W.ready());
  const A1 = await W.analyze(x, sr); assert.strictEqual(A1.t.length, A0.t.length, "분석 점 개수");
  for (let i = 0; i < A0.t.length; i++) assert.ok(A1.t[i] === A0.t[i] && A1.f[i] === A0.f[i], "분석 같음 " + i);
  const y1 = await W.apply(x, sr, A1.t, A1.f, sh); assert.strictEqual(y1.length, y0.length);
  for (let i = 0; i < y0.length; i++) if (y1[i] !== y0[i]) assert.fail("합성 소리 다름 " + i);
  // 순수 계산 함수는 그대로
  assert.strictEqual(typeof W.shiftFromCurve, "function"); assert.strictEqual(typeof W.mask, "function");
  // 워커를 못 만들면 false → 앱이 화면 스레드로
  global.Worker = function () { throw new Error("no"); }; delete require.cache[require.resolve("../praat/praat-core.js")];
  const N = require("../praat/praat-core.js"); assert.strictEqual(await N.useWorker("x", gzAB), false);
  delete global.Worker; delete require.cache[require.resolve("../praat/praat-core.js")];
  assert.strictEqual(await require("../praat/praat-core.js").useWorker("x", gzAB), false, "Worker 없는 환경");
  // 앱 연결: 워커 시도 → 실패 시 화면 스레드, 분석 캐시
  const t = fs.readFileSync(path.join(__dirname, "../teacher/index.html"), "utf8");
  assert.ok(t.includes("PraatCore.useWorker(") && t.includes("if (!wk)") && t.includes("PVP.an.get(ak)"), "앱 연결");
  console.log("praat-worker ok");
})().catch((e) => { console.error(e); process.exit(1); });
