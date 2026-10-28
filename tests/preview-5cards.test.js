// 10/28 승인 시안: 간단 미리보기 5칸 — 카드 구성, 카드별 저장이 노트 값과 카톡 문구를 같이 바꿈, 빈 값 처리, 이스케이프
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = n => src.match(new RegExp('function ' + n + '\\([^]*?\\n}\\n'))[0];
const cst = n => src.match(new RegExp('const ' + n + ' = [^]*?\\n(?=const |function |//)'))[0];
const esc = x => String(x).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const code = src.match(/const PV_ROWS[^\n]*\n/)[0] + src.match(/const pvH[^\n]*\n/)[0] + src.match(/const pvLines[^\n]*\n/)[0] + grab('feedbackPreviewHTML') + grab('setBlock') + cst('PV_EDS');
let drafts = [];
const f = new Function('esc', 'missionState', 'updateFeedbackDraft', 'cur', code + ';return {feedbackPreviewHTML,setBlock,PV_EDS,pvLines};')(
  esc, rv => rv.no_mission ? 'none' : (rv.practice || []).some(Boolean) ? 'set' : 'unset', v => { drafts.push(v); me.review.feedback = v; }, null);
var me;
// 1) 5칸 순서와 내용
const note = { feedback: '안녕하세요', best: { file_id: 'b', len: 35 }, makeup: { file_id: 'm', len: 28 }, practice: ['미션1'] };
const rv = { points: ['호흡', '고음'], practice: ['미션1'], cheer: '힘내요 <3', song: { title: '가짜 곡', artist: '홍길동', why: '톤' }, makeup_msg: '보정본' };
const h = f.feedbackPreviewHTML(note, rv, '');
const order = ['오늘의 베스트 편집본', '메이크업본', '오늘의 핵심 포인트', '다음 미션', '응원 메시지'].map(x => h.indexOf(x));
assert(order.every((x, i) => x > 0 && (i === 0 || x > order[i - 1])), '5칸 순서');
assert(h.includes('id="previewFeedback"') && h.includes('rows="5"') && h.includes('id="pvPoints"') && h.includes('호흡\n고음') && h.includes('힘내요 &lt;3') && h.includes('value="가짜 곡"'));
assert(h.includes('class="pvStrip"') && (h.match(/class="pvCard"/g) || []).length === 5);
// 포함 안 한 베스트·메이크업은 안내만(재생 버튼 없음)
const h2 = f.feedbackPreviewHTML({ feedback: '', best: null, makeup: null, practice: [] }, { no_mission: true }, '');
assert(!h2.includes('data-pvplay') && h2.includes('아직 포함 안 함') && h2.includes('메이크업본을 포함하면') && h2.includes('미션 없음(선생님이 선택)') && !h2.includes('id="pvMission"'));
// 2) setBlock: 덩어리 교체·추가·삭제
const fb = '홍길동님 수고하셨어요!\n\n오늘 중요한 포인트\n· 옛 포인트\n\n이번 주 연습\n· 옛 연습\n· 옛 연습2';
assert.equal(f.setBlock(fb, '이번 주 연습', ['새 연습']), '홍길동님 수고하셨어요!\n\n오늘 중요한 포인트\n· 옛 포인트\n\n이번 주 연습\n· 새 연습');
assert.equal(f.setBlock(fb, '오늘 중요한 포인트', ['A', 'B']).split('\n').slice(2, 5).join('|'), '오늘 중요한 포인트|· A|· B');
assert(!f.setBlock(fb, '이번 주 연습', []).includes('이번 주 연습'));
assert.equal(f.setBlock('인사', '이번 주 연습', ['하나']), '인사\n\n이번 주 연습\n· 하나');
assert.equal(f.setBlock('인사', '이번 주 연습', []), '인사');
// 3) 카드 저장: 미션 → review.practice + 카톡 문구 덩어리, 최대 2개 / 포인트 최대 3개 / 글머리 기호 제거
me = { review: { feedback: fb, practice: ['옛 연습', '옛 연습2'], points: ['옛 포인트'] } };
f.PV_EDS.pvMission.set(me, '· 첫째\n- 둘째\n셋째');
assert.deepEqual(me.review.practice, ['첫째', '둘째']); assert(me.review.feedback.includes('이번 주 연습\n· 첫째\n· 둘째') && !me.review.feedback.includes('셋째'));
f.PV_EDS.pvPoints.set(me, '1\n2\n3\n4');
assert.deepEqual(me.review.points, ['1', '2', '3']); assert(me.review.feedback.includes('오늘 중요한 포인트\n· 1\n· 2\n· 3'));
f.PV_EDS.pvCheer.set(me, '  응원  '); assert.equal(me.review.cheer, '응원');
assert.equal(f.PV_EDS.pvMission.get(me.review), '첫째\n둘째');
// 4) 노트에 실리는 값(buildNote)과 내용 서명(contentSig)에 새 칸 포함 → 고치면 '다시 공개' 대상
assert(/cheer: \(rv\.cheer \|\| ""\)\.trim\(\), song: rv\.song\?\.title/.test(src) && /msg: \(rv\.makeup_msg \|\| ""\)\.trim\(\)/.test(src));
assert(/n\.cheer \|\| "", n\.song \|\| null, n\.makeup\?\.msg \|\| ""/.test(src));
assert(/@media \(prefers-reduced-motion: reduce\) \{ \.pvEd \{ transition:none; \}/.test(src));
console.log('preview-5cards ok');
