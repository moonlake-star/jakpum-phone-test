// (11/14 사용자) 수강생 리포트(선생님 고침 우선) + 미리보기 추천 곡 AI 초안
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = name => src.match(new RegExp('(?:async )?function ' + name + '\\([^]*?\\n}\\n'))[0];
const line = re => src.match(re)[0];
const code = line(/const REPORT_KEYS = [^\n]*\n/) + line(/const REPORT_BASIS = [^\n]*\n/) + line(/const ytSearchUrl = [^\n]*\n/) + ['reportView', 'reportHTML', 'songPick'].map(grab).join('\n');
const esc = x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const f = new Function('esc', code + ';return {reportView,reportHTML,songPick,ytSearchUrl};')(esc);
// 선생님 고침이 우선, 빈칸이면 숨김, 모르는 basis는 추정
const rec = { lessons: [{}, {}, {}], report: { likes: { text: '7080 발라드', basis: 'said', since: '2026-11-01' }, voice: { text: '로우톤', basis: 'x' }, worries: { text: '고음 조임', basis: 'teacher' } },
  report_teacher: { worries: '', age_life: '50대 직장인' } };
const v = f.reportView(rec);
assert.deepEqual(Object.keys(v), ['age_life', 'likes', 'voice']);
assert.equal(v.age_life.by, 'teacher'); assert.equal(v.voice.basis, 'guess');
const h = f.reportHTML(rec, '홍길동');
assert(h.includes('레슨 3회 기준') && h.includes('추정 1개') && h.includes('data-rpok="voice"') && !h.includes('고음 조임'));
assert(h.includes('본인 말 · 11/1'));
assert(f.reportHTML({}, 'x').includes('아직 정리된 항목이 없어요'));
assert(!f.reportHTML({ report: { likes: { text: '<b>', basis: 'said' } } }, 'x').includes('<b>'), '이스케이프');
// 추천 곡: 첫 곡이 1순위, 제목 없는 건 빼고, 후보는 최대 2개
const sp = f.songPick({ song_ideas: [{ title: '호수', artist: '초승', why: '낮은 음 살리기 좋아요' }, { title: '' }, { title: 'B' }, { title: 'C' }, { title: 'D' }] });
assert.equal(sp.pick.title, '호수'); assert.deepEqual(sp.alts.map(x => x.title), ['B', 'C']);
assert.equal(f.songPick({}), null);
assert(f.ytSearchUrl('호수', '초승').endsWith(encodeURIComponent('호수 초승')));
// 검수 열 때: 손대지 않은(song 키 없음)·검수 전 레슨만 AI 초안
assert(src.includes('if (!("song" in review) && !review.reviewed_at) { const sp = songPick(d.ana); if (sp) review.song = { ...sp.pick, ai_draft: true }; }'));
// 저장하면 ai_draft 표시가 빠짐(새 객체), 수강생 노트에는 title/artist/why/url만
assert(/me\.review\.song = v\("pvSongT"\) \? \{ title: v\("pvSongT"\), artist: v\("pvSongA"\), why: v\("pvSongW"\)/.test(src));
assert(/song: rv\.song\?\.title \? \{ title: rv\.song\.title, artist: rv\.song\.artist \|\| "", why: rv\.song\.why \|\| ""/.test(src));
console.log('student-report ok');
