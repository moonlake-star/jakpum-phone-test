// #207 시안①: 문장별 근거 확인 — 분리 규칙·분류·전송 차단·교사 수정 시 재확인
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const code = src.match(/\/\/ <sent-pure>([^]*?)\/\/ <\/sent-pure>/)[1];
const f = new Function(code + ';return {splitSentences,sentClassify,sentList,sentStat,sentBlockers,sentKey};')();

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
assert.deepStrictEqual(f.sentClassify('8:24 후렴 호흡이 좋았어요', ai).kind, 'ev');
assert.strictEqual(f.sentClassify('8:24 후렴 호흡이 좋았어요', ai).t, 504);
assert.strictEqual(f.sentClassify('고음이 안정적이에요', ai).kind, 'warn');
assert.strictEqual(f.sentClassify('홍길동님 수고하셨어요!', ai).kind, 'plain');
assert.strictEqual(f.sentClassify('다음 시간에 또 만나요', ai).kind, 'plain');
assert.strictEqual(f.sentClassify('고음이 안정적이에요', '').kind, 'plain');         // AI 초안이 없는 레슨(V1) → 차단 없음
assert.strictEqual(f.sentClassify('제가 직접 쓴 음정 이야기', ai).kind, 'plain');    // 교사가 직접 쓴 문장은 확인 불필요
// 4) 전송 차단 + 확인 후 해제 + 카운트
const text = ai;
let b = f.sentBlockers(text, ai, {});
assert.strictEqual(b.length, 1); assert.strictEqual(b[0].level, 'block');
assert.strictEqual(f.sentStat(f.sentList(text, ai, {})).text, '필수 확인 1개 남음 · 전체 4문장');
const ok = { [f.sentKey('고음이 안정적이에요')]: true };
assert.strictEqual(f.sentBlockers(text, ai, ok).length, 0);
assert.strictEqual(f.sentStat(f.sentList(text, ai, ok)).text, '필수 확인 끝 · 전체 4문장');
// 5) 교사가 문장을 고치면 확인이 따라가지 않음(옛 확인은 새 문장에 적용 안 됨). 직접 쓴 문장이 되면 차단 대상도 아님
const edited = text.replace('고음이 안정적이에요', '고음이 많이 안정됐어요');
assert.strictEqual(f.sentList(edited, ai, ok).find(x => x.text.includes('많이')).ok, false);
assert.strictEqual(f.sentBlockers(edited, ai, {}).length, 0);
// 6) 연결: 승인 목록·카드·전달 문구
assert(/sentBlockers\(note\?\.feedback, ai\?\.feedback_text, rv\?\.sent_ok\)/.test(src));
assert(/sentCardsHTML\(cur\)/.test(src) && /sentWire\(me\)/.test(src) && /sentStat\(sentList\(rv\.feedback/.test(src));
assert(/data-sa="ok"/.test(src) && /data-sa="drop"/.test(src) && /data-sa="fix"/.test(src) && /근거 있는 문장 모두 맞아요/.test(src));
assert(/jumpPlay\(b, \+b\.dataset\.t\)/.test(src));   // 재생은 기존 단일 재생기(동시 1개)
console.log('ok sentence-evidence');
