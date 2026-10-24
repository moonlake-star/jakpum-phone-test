// 작품 보컬노트(선생님) 서비스 워커
// 역할: 카톡 등에서 '공유'한 과제 녹음 파일을 받아 잠시 보관 → 화면이 드라이브에 올림.
// 화면 자체는 캐시하지 않는다(항상 최신 화면).
const SHARED = 'vn-shared-files';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/teacher/share')) e.respondWith(handleShare(e.request));
});
async function handleShare(request) {
  const c = await caches.open(SHARED);
  const meta = { receivedAt: new Date().toISOString(), files: [], text: '' };
  try {
    const form = await request.formData();
    meta.text = String(form.get('text') || form.get('title') || '');
    const files = form.getAll('media').filter((f) => f && typeof f === 'object' && 'size' in f);
    for (const k of await c.keys()) await c.delete(k);
    for (let i = 0; i < files.length; i++) {
      await c.put(new Request(`./shared/${i}`), new Response(files[i], { headers: { 'Content-Type': files[i].type || 'application/octet-stream' } }));
      meta.files.push({ i, name: files[i].name, type: files[i].type, size: files[i].size, lastModified: files[i].lastModified });
    }
  } catch (err) { meta.error = String(err && err.message || err); }
  await c.put(new Request('./shared/meta.json'), new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
  return Response.redirect('./?shared=1', 303);
}
