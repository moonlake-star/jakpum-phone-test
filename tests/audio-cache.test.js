// (11/16) 속도: 선생님 앱 오디오 보관(readBlob) · 수강생 앱 지난 노트 먼저 보이기(portal 캐시) — 실제 코드 조각을 꺼내 가짜 저장소로 실행
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "../teacher/index.html"), "utf8"), S = fs.readFileSync(path.join(__dirname, "../student/index.html"), "utf8");
const cut = (src, a, b) => { const i = src.indexOf(a), j = src.indexOf(b, i); assert.ok(i >= 0 && j > i, "조각을 찾지 못함: " + a.slice(0, 40)); return src.slice(i, j); };

// ── 선생님: 오디오 보관 ──
class Hdr { constructor(h) { this.h = h || {}; } get(k) { return this.h[k] ?? null; } }
class Resp { constructor(blob, init) { this.blob_ = blob; this.headers = new Hdr(init && init.headers); } async blob() { return this.blob_; } }
class Req { constructor(u) { this.url = u; } }
const store = new Map();
const caches = { async open() { return { async match(r) { return store.get(r.url); }, async put(r, v) { store.delete(r.url); store.set(r.url, v); }, async delete(r) { return store.delete(r.url || r); }, async keys() { return [...store.keys()].map(u => new Req(u)); } }; }, async delete() { store.clear(); return true; } };
let metaNow = { md5Checksum: "A", size: "200000" }, downloads = 0, metaCalls = 0;
const api = async (url) => { if (/fields=md5Checksum/.test(url)) { metaCalls++; return { json: async () => metaNow }; } downloads++; return { blob: async () => ({ type: "audio/mpeg", size: 200000 }) }; };
const ctx = { Request: Req, Response: Resp, caches, api, DRIVE: "D", autoBusy: (p) => p, Date, encodeURIComponent, String, Promise, Number };
vm.createContext(ctx);
vm.runInContext(cut(T, "const ABC = ", "const readBlob = ").replace(/const /g, "var ") + cut(T, "const readBlob = ", "\n// ").replace(/const /g, "var "), ctx);
(async () => {
  const sleep = (ms) => new Promise(r => setTimeout(r, ms));
  await ctx.readBlob("f1"); await sleep(30); assert.strictEqual(downloads, 1, "처음엔 받음");
  await ctx.readBlob("f1"); assert.strictEqual(downloads, 1, "두 번째는 보관본(1분 안이라 확인 없이)"); 
  // 1분이 지난 것처럼: 같은 지문 → 보관본 사용(확인 1번), 다른 지문 → 새로 받음
  const k = [...store.keys()][0], v = store.get(k); v.headers.h["x-at"] = "1";
  const m0 = metaCalls; await ctx.readBlob("f1"); assert.strictEqual(downloads, 1, "지문 같으면 보관본"); assert.strictEqual(metaCalls, m0 + 1);
  v.headers.h["x-at"] = "1"; metaNow = { md5Checksum: "B", size: "200000" };
  await ctx.readBlob("f1"); await sleep(30); assert.strictEqual(downloads, 2, "바뀐 파일은 새로 받음");
  await ctx.readBlob("f1", true); assert.strictEqual(downloads, 3, "fresh는 항상 새로 받음");
  metaNow = { md5Checksum: "C", size: "999" }; store.clear(); downloads = 0;   // 받은 크기와 지문 크기가 다르면 보관 안 함
  await ctx.readBlob("f2"); await sleep(30); assert.strictEqual(store.size, 0, "크기 불일치는 보관 안 함");
  metaNow = { size: "200000" }; await ctx.readBlob("f3"); await sleep(30); assert.strictEqual(store.size, 0, "지문 없으면 보관 안 함");
  metaNow = { md5Checksum: "A", size: "200000" }; for (let i = 0; i < 45; i++) { await ctx.readBlob("g" + i); await sleep(5); } await sleep(50);
  assert.ok(store.size <= 40, "최대 40개 · 실제 " + store.size);
  await ctx.abcClear(); assert.strictEqual(store.size, 0, "로그아웃 때 모두 지움");
  assert.ok(T.includes("abcClear();   // (11/16) 보관해 둔 오디오도 함께 지움"), "로그아웃에서 지움 호출");

  // ── 수강생: 지난 노트 먼저 ──
  const ls = new Map(); const LS = { get: (k) => ls.has(k) ? JSON.parse(ls.get(k)) : null, set: (k, v) => v == null ? ls.delete(k) : ls.set(k, JSON.stringify(v)) };
  const jwt = (sub) => "h." + Buffer.from(JSON.stringify({ sub, exp: 9e9 })).toString("base64") + ".s";
  const sc = { LS, idToken: jwt("u1"), atob: (x) => Buffer.from(x, "base64").toString("binary"), Date, JSON, Array, Number };
  vm.createContext(sc);
  vm.runInContext(cut(S, 'const PCACHE = ', "let snOpened").replace(/const /g, "var ").replace(/let /g, "var "), sc);
  const j = { ok: true, state: "ok", name: "A", lessons: [{ id: "L1" }] };
  sc.portalCachePut(j); assert.ok(sc.portalCacheGet(), "저장 후 읽힘");
  sc.idToken = jwt("u2"); assert.strictEqual(sc.portalCacheGet(), null, "다른 구글 계정이면 안 씀");
  sc.idToken = jwt("u1"); sc.portalCachePut({ state: "closed", lessons: [] }); assert.ok(sc.portalCacheGet(), "접근 막힘 응답은 덮어쓰지 않음(그 자리에서 지움은 applyPortal)");
  sc.portalCacheClear(); assert.strictEqual(sc.portalCacheGet(), null, "지움");
  assert.ok(/portalCacheClear\(\);[^\n]*idToken = null; data = null/.test(S) || /try \{ portalCacheClear\(\); \} catch \{\} idToken = null; data = null/.test(S), "로그아웃 때 지움");
  assert.ok(S.includes('state === "closed") { portalCacheClear()'), "접근 막히면 지움");
  console.log("audio-cache OK");
})().catch((e) => { console.error(e); process.exit(1); });
