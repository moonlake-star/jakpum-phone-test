// 작품 보컬노트 폰 실험 — 서비스 워커
// 역할: (1) 다른 앱(삼성 녹음 앱 등)이 공유한 파일을 받아 저장 (2) 페이지 오프라인 캐시
const SHELL_CACHE = 'p0a-shell-v4';
const SHARED_CACHE = 'p0a-shared-files';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png',
  './sample.mp3', './sample.m4a'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) {
      if (k !== SHELL_CACHE && k !== SHARED_CACHE) await caches.delete(k);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith(handleShare(e.request));
    return;
  }
  if (e.request.method === 'GET' && url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request))
    );
  }
});

async function handleShare(request) {
  const started = Date.now();
  const meta = { receivedAt: new Date().toISOString(), files: [], fieldNames: [], error: null };
  const shared = await caches.open(SHARED_CACHE);
  try {
    const form = await request.formData();
    meta.fieldNames = [...new Set([...form.keys()])];
    meta.title = String(form.get('title') || '');
    meta.text = String(form.get('text') || '');
    meta.url = String(form.get('url') || '');
    const files = form.getAll('audio').filter((f) => f && typeof f === 'object' && 'size' in f);
    for (const req of await shared.keys()) await shared.delete(req);
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      await shared.put(new Request(`./shared/${i}`),
        new Response(f, { headers: { 'Content-Type': f.type || 'application/octet-stream' } }));
      meta.files.push({ index: i, name: f.name, type: f.type, size: f.size, lastModified: f.lastModified });
    }
  } catch (err) {
    meta.error = String((err && err.message) || err);
  }
  meta.processingMs = Date.now() - started;
  await shared.put(new Request('./shared/meta.json'),
    new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
  return Response.redirect('./?shared=1', 303);
}
