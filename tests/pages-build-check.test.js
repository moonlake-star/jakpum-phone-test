// scripts/check-pages-build.js 의 판정 로직 시험(가짜 fetch, 네트워크 없음)
const assert = require('assert');
const { check, pick } = require('../scripts/check-pages-build.js');
const page = (b) => `<script>const BUILD = "${b}";</script>`;
const mk = (map) => async (u) => {
  const k = Object.keys(map).find((x) => u.startsWith(x));
  if (!k || map[k] instanceof Error) throw map[k] || new Error('net');
  const v = map[k];
  return { ok: v.ok !== false, status: v.status || 200, text: async () => v.body };
};
const RAW = 'https://raw.githubusercontent.com', PG = 'https://moonlake-star.github.io';
(async () => {
  assert.equal(pick(page('x1')), 'x1');
  assert.equal(pick('없음'), null);
  assert.equal((await check(mk({ [RAW]: { body: page('A') }, [PG]: { body: page('A') } }))).code, 0);
  const mm = await check(mk({ [RAW]: { body: page('B') }, [PG]: { body: page('A') } }));
  assert.equal(mm.code, 1); assert.equal(mm.status, 'mismatch');
  // 네트워크 실패·HTTP 오류·BUILD 없음은 '확인 못 함'(2) — 성공(0)으로 보이면 안 됨
  assert.equal((await check(mk({ [RAW]: { body: page('A') }, [PG]: new Error('offline') }))).code, 2);
  assert.equal((await check(mk({ [RAW]: { body: page('A') }, [PG]: { ok: false, status: 404, body: '' } }))).code, 2);
  assert.equal((await check(mk({ [RAW]: { body: page('A') }, [PG]: { body: '<html></html>' } }))).code, 2);
  console.log('pages-build-check ok (match/mismatch/unverified)');
})();
