// 작품 보컬노트(수강생) 서비스 워커 — (11/16 속도) 주소에 ?v=가 붙은 같은 사이트 스크립트(.js)만 캐시. 화면(HTML)·데이터는 캐시하지 않음.
const ASSETS = 'vn-student-assets-v1';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
const isVersionedAsset = (u) => u.origin === self.location.origin && /\.js$/.test(u.pathname) && u.searchParams.has('v');
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && isVersionedAsset(url)) e.respondWith(assetFirst(e.request));
});
async function assetFirst(req) {
  try {
    const c = await caches.open(ASSETS), hit = await c.match(req);
    if (hit) return hit;
    const r = await fetch(req);
    if (r && r.ok && r.type === 'basic') { c.put(req, r.clone()).catch(() => {}); const ks = await c.keys(); for (let i = 0; i < ks.length - 30; i++) c.delete(ks[i]); }
    return r;
  } catch (err) { return fetch(req); }
}
