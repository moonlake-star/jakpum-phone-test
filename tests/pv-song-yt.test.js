// (11/14 사용자) 추천 곡 칸: 유튜브 주소 → 제목·가수 채움 + 이유 초안. 직접 쓴 칸은 안 건드림
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = name => src.match(new RegExp('(?:async )?function ' + name + '\\([^]*?\\n}\\n'))[0];
const line = re => src.match(re)[0];
const code = line(/const svYt = [^\n]*\n/) + line(/const pvNorm = [^\n]*\n/) + ['ytTitle', 'pvSongWhy', 'pvSongFromYt'].map(grab).join('\n');
function env(vals, oembed) {
  const els = {}; for (const id of ['pvSongU', 'pvSongT', 'pvSongA', 'pvSongW', 'pvSongH']) els[id] = { value: vals[id] || '', textContent: '' };
  const fetch = async () => ({ ok: true, json: async () => oembed });
  const ytInfo = async () => { const j = await (await fetch()).json(); return f.ytTitle(j.title, j.author_name); };
  const f = new Function('$', 'fetch', 'ytInfoX', code + ';async function ytInfo(u){return ytInfoX(u)};return {ytTitle,pvSongWhy,pvSongFromYt};')(id => els[id], fetch, u => ytInfo(u));
  return { els, f };
}
(async () => {
  // 1) 빈 칸 → 제목·가수·이유 모두 채움(분석 곡 아이디어의 이유 사용)
  let e = env({ pvSongU: 'https://youtu.be/abcdefghijk' }, { title: '초승 - 호수 (Official Audio)', author_name: '초승' });
  const me = { review: { points: ['호흡이 안정됐어요'] }, ana: { song_ideas: [{ title: '호수', artist: '초승', why: '로우톤 공기음 연습에 좋아요' }] } };
  await e.f.pvSongFromYt(me);
  assert.equal(e.els.pvSongT.value, '호수'); assert.equal(e.els.pvSongA.value, '초승');
  assert.equal(e.els.pvSongW.value, '로우톤 공기음 연습에 좋아요');
  // 2) 분석에 없는 곡 → 오늘 포인트로 초안
  e = env({ pvSongU: 'https://www.youtube.com/watch?v=abcdefghijk' }, { title: '다른 곡', author_name: '가수A - Topic' });
  await e.f.pvSongFromYt({ review: { points: ['호흡이 안정됐어요'] } });
  assert.equal(e.els.pvSongA.value, '가수A'); assert.match(e.els.pvSongW.value, /호흡이 안정됐어요/);
  // 3) 선생님이 직접 쓴 칸은 그대로
  e = env({ pvSongU: 'https://youtu.be/abcdefghijk', pvSongT: '내가 쓴 제목', pvSongW: '내 이유' }, { title: '초승 - 호수', author_name: '초승' });
  await e.f.pvSongFromYt({ review: {} });
  assert.equal(e.els.pvSongT.value, '내가 쓴 제목'); assert.equal(e.els.pvSongW.value, '내 이유'); assert.equal(e.els.pvSongA.value, '초승');
  // 4) 링크를 바꾸면 앞서 저절로 채운 값은 새 곡으로 바뀜
  const me2 = { review: {} }; e = env({ pvSongU: 'https://youtu.be/abcdefghijk' }, { title: '가수1 - 곡1', author_name: 'x' });
  await e.f.pvSongFromYt(me2); assert.equal(e.els.pvSongT.value, '곡1');
  e.els.pvSongU.value = 'https://youtu.be/bbbbbbbbbbb';
  const f2 = new Function('$', 'fetch', code + ';async function ytInfo(u){return ytTitle("가수2 - 곡2","")};return {pvSongFromYt};')(id => e.els[id], null);
  await f2.pvSongFromYt(me2); assert.equal(e.els.pvSongT.value, '곡2'); assert.equal(e.els.pvSongA.value, '가수2');
  // 5) 유튜브가 아니면 손대지 않음
  e = env({ pvSongU: 'https://example.com/x' }, {}); await e.f.pvSongFromYt({ review: {} });
  assert.equal(e.els.pvSongT.value, ''); assert.match(e.els.pvSongH.textContent, /아니에요/);
  // 화면 연결: 주소 칸·안내 칸·입력 연결이 있어야 함
  assert(src.includes('id="pvSongH"') && src.includes('pvSongFromYt(me)'));
  console.log('pv-song-yt ok');
})().catch(e => { console.error(e); process.exit(1); });
