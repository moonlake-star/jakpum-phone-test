// (11/16 속도) 서비스 워커: ?v= 붙은 .js만 캐시, HTML·데이터·버전 없는 파일은 건드리지 않음 — 선생님·수강생 sw 둘 다
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const ORIGIN = "https://x.github.io";
function load(file) {
  const store = new Map(), handlers = {}; let fetches = 0;
  const cache = { match: async (r) => store.get(r.url), put: async (r, res) => { store.set(r.url, res); }, keys: async () => [...store.keys()].map((u) => ({ url: u })), delete: async (r) => store.delete(r.url) };
  const mkRes = (u) => ({ ok: true, type: "basic", url: u, clone() { return this; } });
  const sb = { self: { addEventListener: (t, f) => (handlers[t] = f), skipWaiting() {}, clients: { claim() {} }, location: { origin: ORIGIN } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true }, URL, Date, Math, JSON, String, Promise, Set, Error, Request: class { constructor(u) { this.url = u; } }, Response: class {},
    fetch: async (r) => { fetches++; return mkRes(r.url); } };
  vm.runInNewContext(fs.readFileSync(__dirname + "/../" + file, "utf8"), sb);
  const run = async (url, method = "GET") => { let out; handlers.fetch({ request: { url, method }, respondWith: (p) => (out = p) }); return out; };
  return { run, store, fetches: () => fetches };
}
(async () => {
  for (const f of ["teacher/sw.js", "student/sw.js"]) {
    const e = load(f), js = ORIGIN + "/jakpum-phone-test/tune.js?v=20261116-1205";
    assert.ok(await e.run(js), f + ": 버전 붙은 js는 처리"); assert.strictEqual(e.fetches(), 1);
    await e.run(js); assert.strictEqual(e.fetches(), 1, f + ": 두 번째는 캐시(네트워크 안 감)");
    assert.strictEqual(await e.run(ORIGIN + "/jakpum-phone-test/tune.js?v=NEW") !== undefined, true); assert.strictEqual(e.fetches(), 2, f + ": 버전 바뀌면 새로 받음");
    assert.strictEqual(await e.run(ORIGIN + "/jakpum-phone-test/student/index.html?v=1"), undefined, f + ": HTML은 캐시 안 함");
    assert.strictEqual(await e.run(ORIGIN + "/jakpum-phone-test/lesson-replies.js"), undefined, f + ": 버전 없는 js는 안 건드림");
    assert.strictEqual(await e.run("https://www.googleapis.com/drive/v3/files/x.js?v=1"), undefined, f + ": 다른 사이트는 안 건드림");
    assert.strictEqual(await e.run(js, "POST"), undefined);
  }
  assert.ok(fs.readFileSync(__dirname + "/../student/index.html", "utf8").includes('serviceWorker.register("./sw.js")'), "수강생 앱이 sw 등록");
  console.log("sw-assets OK");
})().catch((e) => { console.error(e); process.exit(1); });
