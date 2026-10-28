// 작품 보컬노트(선생님) 서비스 워커
// 역할: 카톡 등에서 '공유'한 과제 녹음 파일을 받아 잠시 보관 → 화면이 드라이브에 올림.
// 화면 자체는 캐시하지 않는다(항상 최신 화면).
// 보관 규칙: 공유 한 번 = 묶음 하나(./shared/<묶음ID>/…). 새 공유가 와도 이전 묶음은 지우지 않는다.
// 지우는 것은 화면이 '드라이브 업로드 성공'을 확인한 뒤 묶음 단위로만 한다.
const SHARED = 'vn-shared-files';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/teacher/share')) e.respondWith(handleShare(e.request));
});
async function handleShare(request) {
  const batch = `b${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const meta = { batch, receivedAt: new Date().toISOString(), files: [], text: '' };
  let c = null;
  try {
    c = await caches.open(SHARED);
    const form = await request.formData();
    meta.text = String(form.get('text') || form.get('title') || '');
    const files = form.getAll('media').filter((f) => f && typeof f === 'object' && 'size' in f);
    for (let i = 0; i < files.length; i++) {
      await c.put(new Request(`./shared/${batch}/${i}`), new Response(files[i], { headers: { 'Content-Type': files[i].type || 'application/octet-stream' } }));
      meta.files.push({ i, name: files[i].name, type: files[i].type, size: files[i].size, lastModified: files[i].lastModified });
    }
  } catch (err) { meta.error = String(err && err.message || err); }   // 용량 부족 등: 저장된 만큼만 meta에 남기고 화면에 알린다
  try {
    if (c) await c.put(new Request(`./shared/${batch}/meta.json`), new Response(JSON.stringify(meta), { headers: { 'Content-Type': 'application/json' } }));
  } catch (err) { /* meta도 못 쓰면 화면에는 '받은 파일 없음'이 보인다 — 이전 묶음은 그대로 */ }
  return Response.redirect('./?shared=1', 303);
}
