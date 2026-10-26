// 서비스 워커 공유 보관 시험 — 가짜 caches/self로 teacher/sw.js, sw.js 실행
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const BASE = "https://x.github.io/jakpum-phone-test/teacher/";

function env(file, { failPutAfter = Infinity } = {}) {
  const store = new Map(); let puts = 0;
  class Req extends Request { constructor(u, o) { super(new URL(u, BASE).href, o); } }
  const cache = {
    put: async (r, res) => { if (++puts > failPutAfter) throw new Error("QuotaExceededError"); store.set(r.url, new Response(await res.clone().blob(), { headers: res.headers })); },
    match: async (r) => { const v = store.get(typeof r === "string" ? new URL(r, BASE).href : r.url); return v && v.clone(); },
    keys: async () => [...store.keys()].map((u) => ({ url: u })),
    delete: async (r) => store.delete(r.url),
  };
  const handlers = {};
  const sandbox = { self: { addEventListener: (t, f) => (handlers[t] = f), skipWaiting() {}, clients: { claim() {} }, location: { origin: new URL(BASE).origin } },
    caches: { open: async () => cache, keys: async () => [], delete: async () => true },
    Request: Req, URL,
    Response: class extends Response { static redirect(u, s) { return Response.redirect(new URL(u, BASE).href, s); } }, Date, Math, JSON, String, Promise, Set, Error };
  vm.runInNewContext(fs.readFileSync(__dirname + "/../" + file, "utf8"), sandbox);
  return { store, async share(path, field, files, extra = {}) {
    const fd = new FormData(); for (const [n, c, t] of files) fd.append(field, new File([c], n, { type: t }));
    for (const [k, v] of Object.entries(extra)) fd.append(k, v);
    const request = new Request(new URL(path, BASE).href, { method: "POST", body: fd });
    let out; await handlers.fetch({ request, respondWith: (p) => (out = p) });
    return out;
  } };
}
const text = async (e, u) => (await e.store.get(new URL(u, BASE).href).text());
(async () => {
  // ── 선생님 앱 sw ──
  {
    const e = env("teacher/sw.js");
    const r1 = await e.share("share", "media", [["a.m4a", "AAA", "audio/mp4"]], { text: "첫번째" });
    assert.strictEqual(r1.status, 303);
    const r2 = await e.share("share", "media", [["a.m4a", "BBB", "audio/mp4"], ["b.mp3", "CCC", "audio/mpeg"]]);   // 같은 이름도 충돌 없음
    assert.strictEqual(r2.status, 303);
    const metas = [...e.store.keys()].filter((u) => u.endsWith("/meta.json"));
    assert.strictEqual(metas.length, 2);
    const parsed = await Promise.all(metas.map((u) => e.store.get(u).json()));
    assert.notStrictEqual(parsed[0].batch, parsed[1].batch);
    const first = parsed.find((m) => m.text === "첫번째");
    assert.strictEqual(await text(e, `./shared/${first.batch}/0`), "AAA");     // 1번째 파일 살아 있음
    const second = parsed.find((m) => m !== first);
    assert.strictEqual(await text(e, `./shared/${second.batch}/0`), "BBB");
    assert.strictEqual(await text(e, `./shared/${second.batch}/1`), "CCC");
    // 공유 아닌 요청은 건드리지 않음
    assert.strictEqual(e.store.size, 2 + 3);
  }
  // 용량 오류: 이전 묶음 보존, 저장 못한 파일은 meta.error로 알림
  {
    const e = env("teacher/sw.js", { failPutAfter: 3 });
    await e.share("share", "media", [["a.m4a", "AAA", "audio/mp4"]]);          // put 1(file) 2(meta)
    await e.share("share", "media", [["b.m4a", "BBB", "audio/mp4"]]);          // put 3(file) → ok, meta 4 → 실패
    const metas = [...e.store.keys()].filter((u) => u.endsWith("/meta.json"));
    assert.strictEqual(metas.length, 1);
    const m = await e.store.get(metas[0]).json();
    assert.strictEqual(await text(e, `./shared/${m.batch}/0`), "AAA");
  }
  {
    const e = env("teacher/sw.js", { failPutAfter: 2 });
    await e.share("share", "media", [["a.m4a", "AAA", "audio/mp4"]]);
    const r = await e.share("share", "media", [["b.m4a", "BBB", "audio/mp4"]]);   // 파일 put 실패
    assert.strictEqual(r.status, 303);                                           // 그래도 화면으로 안내
    const metas = [...e.store.keys()].filter((u) => u.endsWith("/meta.json"));
    assert.strictEqual(metas.length, 1);                                         // 이전 묶음 그대로
  }
  // ── 루트(P0a) sw: 이전 공유분을 지우지 않고 보관 ──
  {
    const e = env("sw.js");
    await e.share("share-target", "audio", [["a.m4a", "AAA", "audio/mp4"]]);
    await e.share("share-target", "audio", [["b.m4a", "BBB", "audio/mp4"]]);
    assert.strictEqual(await text(e, "./shared/0"), "BBB");                      // 기존 화면 경로는 최신분
    const old = [...e.store.keys()].find((u) => /shared\/old-[^/]+\/0$/.test(u));
    assert.ok(old, "이전 파일이 보관 폴더에 남아 있어야 함");
    assert.strictEqual(await e.store.get(old).text(), "AAA");
  }
  console.log("sw ok");
})().catch((e) => { console.error(e); process.exit(1); });
