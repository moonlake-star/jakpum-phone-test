// #80·#81 카톡: 글은 하나(한마디=fb), 멘트+링크 복사는 링크 1번, 🎲는 첫 인사만, 복사·클립 보내기 ≠ 보냄
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = n => src.match(new RegExp('function ' + n + '\\([^]*?\\n}\\n'))[0];
const G = src.match(/const GREETS = [^\n]*\n/)[0];
const { swapGreeting } = new Function(G + grab('swapGreeting') + 'return {swapGreeting};')();
const body = '홍길동님, 오늘 레슨 수고 많으셨어요!\n\n오늘 중요한 포인트\n· 직접 고친 문장';
const a = swapGreeting(body, '홍길동', 1);
assert.equal(a.split('\n')[0], '홍길동님 오늘 레슨도 고생 많으셨습니다 :)'); assert.equal(a.split('\n').slice(1).join('\n'), body.split('\n').slice(1).join('\n'), '본문은 그대로');
assert.notEqual(swapGreeting(a, '홍길동', 2).split('\n')[0], a.split('\n')[0], '누를 때마다 다른 인사말');
const b = swapGreeting('오늘 중요한 포인트\n· 하나', '홍길동', 0); assert(b.startsWith('홍길동님, 오늘 레슨 수고 많으셨어요!\n\n오늘 중요한 포인트'), '인사말이 없으면 맨 위에 한 줄만');
// 링크 1번
let fbv = '본문'; const cur = { note: { lesson_id: 'L1' }, folder: { id: 'L1' } };
const KL = src.match(/const KAKAO_LINE = [^\n]*\n/)[0];
const kct = new Function('$', 'cur', 'studentPage', KL + grab('kakaoCopyText') + 'return kakaoCopyText;')(() => ({ value: fbv }), cur, () => 'https://x/student/');
const t1 = kct(); assert.equal((t1.match(/https:\/\/x\/student\/\?l=L1/g) || []).length, 1);
fbv = t1; assert.equal((kct().match(/\?l=L1/g) || []).length, 1, '이미 링크가 있으면 다시 안 붙임');
// (10/30 21:59) 짧게: 본문은 안 넣고 인사 + 안내 한 줄 + 링크
fbv = '홍길동님, 오늘 레슨 수고 많으셨어요!\n\n· 8:24 긴 피드백 본문'; cur.st = { name: '홍길동' }; const t2 = kct();
assert(t2.startsWith('홍길동님, 오늘 레슨 수고 많으셨어요!\n') && !t2.includes('긴 피드백 본문') && t2.split('\n').length === 4, t2);
// 화면: 카톡 입력칸은 하나도 없음, 버튼 3역할 + 완료 표시
assert(!src.includes('id="kakaoMsg"') && !src.includes('btnKakaoCopy') && !src.includes('btnKakaoRe"'));
for (const k of ['멘트+링크 복사', '🎲 인사말 바꾸기', '카카오톡 열기', '카톡 전송 완료 표시']) assert(src.includes(k), k);
// 클립 보내기·복사는 보냄 처리 안 함
const share = src.match(/\$\("btnShare"\)\.onclick = async \(\) => \{[^]*?\n\};\n/)[0];
assert(!/markSent|kakao_sent_at/.test(share), '클립 보내기 ≠ 보냄');
assert(!/markSent|kakao_sent_at/.test(src.match(/\$\("btnCopy"\)\.onclick[^\n]*\n[^\n]*\n/)[0]), '복사 ≠ 보냄');
console.log('kakao-single ok');
