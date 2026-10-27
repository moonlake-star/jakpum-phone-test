// 클립 보내기: 파일 받는 사이 '누른 직후'가 지나 공유가 막히면(NotAllowedError) '카톡으로 보내기' 버튼을 띄워 다시 누르게 한다
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const fn = src.match(/async function shareClips[\s\S]*?\n}\n/)[0];
const els = {};
const mk = (tag) => { const e = { tag, style: {}, children: [], set innerHTML(h) { this._h = h; this.go = { onclick: null }; this.no = { onclick: null }; },
  querySelector(q) { return q === "#shareGo" ? this.go : this.no; }, remove() { delete els[this.id]; } }; return e; };
const document = { createElement: mk, getElementById: id => els[id] || null, body: { appendChild: e => { els[e.id] = e; } } };
let calls = 0;
const navigator = { canShare: () => true, userActivation: { isActive: false },
  share: async () => { calls++; if (calls === 1) { const e = new Error("gesture"); e.name = "NotAllowedError"; throw e; } } };
const cur = { st: { name: "홍길동" }, folder: { name: "2026-10-25" } };
global.File = class { constructor(b, n) { this.n = n; } };
const shareClips = new Function('document', 'navigator', 'busy', 'toast', 'readBlob', 'cur', fn.replace(/\bcur\b(?= !== me)/, 'cur') + 'return shareClips;')(
  document, navigator, () => {}, () => {}, async () => "blob", cur);
(async () => {
  const p = shareClips([{ id: "a", name: "C001.mp3" }]);
  await new Promise(r => setTimeout(r, 10));
  assert(els.shareReady, '준비 버튼이 떠야 함'); assert.strictEqual(calls, 0, '활성 아님 → 바로 공유 시도 안 함');
  await els.shareReady.go.onclick();
  assert.strictEqual(await p, false, '첫 시도 막힘 → 보냄 표시 안 함');
  // 두 번째: 버튼 누르면 성공
  const p2 = shareClips([{ id: "a", name: "C001.mp3" }]);
  await new Promise(r => setTimeout(r, 10));
  await els.shareReady.go.onclick();
  assert.strictEqual(await p2, true); assert(!els.shareReady, '성공하면 버튼 닫힘');
  console.log('share-ready ok');
})().catch(e => { console.error(e); process.exit(1); });
