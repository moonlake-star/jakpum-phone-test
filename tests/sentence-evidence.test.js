// #207 시안①: 문장별 근거 확인 — 분리 규칙·분류·전송 차단·교사 수정 시 재확인
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const code = src.match(/\/\/ <sent-pure>([^]*?)\/\/ <\/sent-pure>/)[1];
const f = new Function(code + ';return {splitSentences,sentClassify,sentList,sentStat,sentBlockers,sentKey,sentSegPick,sentEvList};')();

// 1) 줄바꿈·글머리 우선, 머리글 제외
const fb = '홍길동님 수고하셨어요!\n\n오늘 중요한 포인트\n· 8:24 후렴 호흡이 좋았어요\n· 고음이 안정적이에요\n\n이번 주 연습\n· 후렴 두 마디';
assert.deepStrictEqual(f.splitSentences(fb), ['홍길동님 수고하셨어요!', '8:24 후렴 호흡이 좋았어요', '고음이 안정적이에요', '후렴 두 마디']);
// 2) 긴 한 줄만 보조 분리 — 시각·소수점·따옴표/괄호 안 마침표·노래 제목은 자르지 않음
const long = '8:24 부분에서 호흡이 길게 이어져서 좋았어요. 35:36 에서는 "Let it be. 처럼" 부르셨고 (약어 a.k.a. 포함) 끝음도 안정적이었어요. 다음에는 3.5박 쉬어 보세요';
const parts = f.splitSentences(long);
assert.strictEqual(parts.length, 3, JSON.stringify(parts));
assert(parts[0].startsWith('8:24') && parts[1].includes('Let it be. 처럼') && parts[1].includes('a.k.a.') && parts[2].includes('3.5박'));
assert.deepStrictEqual(f.splitSentences('짧은 문장. 두 개'), ['짧은 문장. 두 개']);   // 60자 이하는 줄 그대로
// 3) 분류: 시각 있음=ev, 시각 없는 AI 음향 판단=warn, 인사·교사 직접 문장=plain
const ai = '홍길동님 수고하셨어요!\n8:24 후렴 호흡이 좋았어요\n고음이 안정적이에요\n다음 시간에 또 만나요';
assert.strictEqual(f.sentClassify('8:24 후렴 호흡이 좋았어요', ai, [505]).kind, 'ev');   // AI 구조화 근거(±2초)와 일치할 때만 음향 평가가 ev
assert.strictEqual(f.sentClassify('8:24 후렴 호흡이 좋았어요', ai, [505]).t, 504);
assert.strictEqual(f.sentClassify('8:24 후렴 호흡이 좋았어요', ai).kind, 'warn');       // 시각만 적힌 음향 판단은 검증 아님 → 차단
assert.strictEqual(f.sentClassify('8:24 후렴 호흡이 좋았어요', ai, [600]).kind, 'warn'); // 근거 시각이 다르면 연결 안 됨
assert.strictEqual(f.sentClassify('8:24 후렴 가사를 말씀하셨어요', '8:24 후렴 가사를 말씀하셨어요').kind, 'ev'); // 음향 키워드 없는 내용 요약은 시각만으로 ev
// 시계 시간은 녹음 시각이 아님
for (const c of ['레슨 시작 오전 8:24 였어요', '오후 6:30 에 만나요', '6:30에 시작해요', '9:00부터 연습']) {
  assert.strictEqual(f.sentClassify(c, c).t, null, c); assert.notStrictEqual(f.sentClassify(c, c).kind, 'ev', c);
}
assert.strictEqual(f.sentClassify('오전 8:24 호흡이 좋았어요', '오전 8:24 호흡이 좋았어요').kind, 'warn');
assert.strictEqual(f.sentClassify('고음이 안정적이에요', ai).kind, 'warn');
assert.strictEqual(f.sentClassify('홍길동님 수고하셨어요!', ai).kind, 'plain');
assert.strictEqual(f.sentClassify('다음 시간에 또 만나요', ai).kind, 'plain');
assert.strictEqual(f.sentClassify('고음이 안정적이에요', '').kind, 'plain');         // AI 초안이 없는 레슨(V1) → 차단 없음
assert.strictEqual(f.sentClassify('제가 직접 쓴 음정 이야기', ai).kind, 'plain');    // 교사가 직접 쓴 문장은 확인 불필요
// 4) 전송 차단 + 확인 후 해제 + 카운트
const text = ai;
let b = f.sentBlockers(text, ai, {}, [504]);
assert.strictEqual(b.length, 1); assert.strictEqual(b[0].level, 'block');
assert.strictEqual(f.sentStat(f.sentList(text, ai, {}, [504])).text, '필수 확인 1개 남음 · 전체 4문장');
const ok = { [f.sentKey('고음이 안정적이에요')]: true };
assert.strictEqual(f.sentBlockers(text, ai, ok, [504]).length, 0);
assert.strictEqual(f.sentStat(f.sentList(text, ai, ok, [504])).text, '필수 확인 끝 · 전체 4문장');
// 5) 교사가 문장을 고치면 확인이 따라가지 않음(옛 확인은 새 문장에 적용 안 됨). 직접 쓴 문장이 되면 차단 대상도 아님
const edited = text.replace('고음이 안정적이에요', '고음이 많이 안정됐어요');
assert.strictEqual(f.sentList(edited, ai, ok, [504]).find(x => x.text.includes('많이')).ok, false);
assert.strictEqual(f.sentBlockers(edited, ai, {}, [504]).length, 0);
// 6) 연결: 승인 목록·카드·전달 문구
assert(/sentBlockers\(note\?\.feedback, ai\?\.feedback_text, rv\?\.sent_ok, /.test(src));
// 7) 전사 연결: 포함/허용오차(3초) 안일 때만, 순서 무관, 멀면 빈 문자열
const segs = [{ start: 500, end: 508, text: '후렴이에요' }, { start: 3, end: 8, text: '안녕하세요' }, { start: 30, end: 35, text: '다음' }];   // 정렬 안 됨
assert.strictEqual(f.sentSegPick(segs, 504), '후렴이에요');
assert.strictEqual(f.sentSegPick(segs, 510), '후렴이에요');   // 끝 +2초 허용
assert.strictEqual(f.sentSegPick(segs, 2136), '');            // 35:36 카드에 08:24 전사 금지
assert.strictEqual(f.sentSegPick(segs, 200), '');
assert.strictEqual(f.sentSegPick(null, 5), '');
// 8) AI 근거 목록은 문장 카드 안으로 흡수
assert.deepStrictEqual(f.sentEvList({ ai: { evidence: [{ t: 12, text: 'a' }, { t: null }, { evidence_start: 30 }] } }).map(e => e.t), [12, 30]);
assert(/AI 초안 근거 \$\{evs\.length\}개 전체 보기/.test(src));
assert(/sentCardsHTML\(cur\)/.test(src) && /sentWire\(me\)/.test(src) && /sentStat\(sentList\(rv\.feedback/.test(src));
assert(/data-sa="ok"/.test(src) && /data-sa="drop"/.test(src) && /data-sa="fix"/.test(src) && /근거 있는 문장 모두 맞아요/.test(src));
assert(/jumpPlay\(b, \+b\.dataset\.t\)/.test(src));   // 재생은 기존 단일 재생기(동시 1개)
// 9) 근거 시각 연결이 없으면 시각 있는 음향 판단도 필수 확인(회피 불가)
assert.strictEqual(f.sentBlockers(text, ai, {}).length, 2);
console.log('ok sentence-evidence');
