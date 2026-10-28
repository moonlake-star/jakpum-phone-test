// V2 프로토타입: 5카드+응원, 단계별 표시, 카드 수정(12줄), AI 작성 비율, 전체 훑기 전 전달 차단, 실제 전송 경로 없음, V1 무변경
const fs = require('fs'), assert = require('assert'), cp = require('child_process');
const V2 = require('../v2/v2-logic.js');
let d = V2.generateDraft(V2.MOCK_LESSON);

// 학생 화면: 상단 5카드 순서 + 하단 응원
const sv = V2.buildStudentView(d, 'detailed');
assert.deepEqual(sv.cards.map(x => x.title), ['오늘의 베스트', '메이크업본', '핵심 포인트', '다음 미션', '추천 곡']);
assert(sv.cheer.length >= 1 && sv.greet);
assert(sv.cards[0].audio && sv.cards[1].audio, '베스트·메이크업은 소리 카드');

// 심플 < 보통 < 자세히 (보이는 줄 수)
const n = lv => V2.buildStudentView(d, lv).cards.reduce((s, c) => s + c.lines.length, 0);
assert(n('simple') < n('normal') && n('normal') < n('detailed'), '단계별 줄 수');
assert.equal(V2.buildStudentView(d, 'simple').cards.find(c => c.id === 'points').lines.length, 1);

// 처음엔 AI가 100% 작성
assert.equal(V2.aiShare(d), 100);

// 카드 수정: 보이는 줄만 바뀌고 숨은 단계 줄은 남음, 12줄 제한
const pts = d.cards.find(c => c.id === 'points');
const before = pts.items.length;
V2.editCard(pts, 'simple', '숨을 먼저 꽉 채우기');
assert.equal(pts.items.length, before, '숨은 줄 유지');
assert.equal(V2.visibleItems(pts, 'simple')[0].text, '숨을 먼저 꽉 채우기');
assert(V2.aiShare(d) < 100 && V2.aiShare(d) > 80, 'AI 비율이 조금 줄어듦');
V2.editCard(pts, 'normal', Array.from({ length: 15 }, (_, i) => '줄' + i).join('\n'));
assert.equal(V2.visibleItems(pts, 'normal').length, 12, '최대 12줄');
assert(pts.items.some(i => i.lv === 3), '자세히 줄은 그대로');

// 검토: 모든 카드(5+응원)를 훑어야 전달 가능
d = V2.generateDraft(V2.MOCK_LESSON);
const seen = new Set(['best', 'makeup', 'points']);
let p = V2.reviewProgress(d, seen);
assert.equal(p.total, 6); assert.equal(p.all, false);
assert.equal(V2.simulateDeliver(d, p.all).ok, false);
['mission', 'song', 'cheer'].forEach(x => seen.add(x));
p = V2.reviewProgress(d, seen); assert(p.all);
const r = V2.simulateDeliver(d, p.all);
assert(r.ok && r.simulated && r.sent === false);

// 가짜 파형은 항상 같은 모양
assert.deepEqual(V2.mockPeaks(7, 10), V2.mockPeaks(7, 10));

// 가상 데이터만: 실제 수강생 이름·Drive ID 없음
const logic = fs.readFileSync(__dirname + '/../v2/v2-logic.js', 'utf8');
assert(!/김미영|[A-Za-z0-9_-]{28,}/.test(logic), '실명·파일 ID 금지');

// 실제 전송/네트워크/저장 코드 없음
for (const f of ['v2/v2-logic.js', 'v2/index.html']) {
  const s = fs.readFileSync(__dirname + '/../' + f, 'utf8');
  assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|script\.google|googleapis|api\.|Authorization|localStorage|navigator\.share|kakao/i.test(s), f + ' 네트워크/저장/공유 금지');
}
// V1 무변경: main 대비 v2/·tests/v2-*만 추가
try {
  const out = cp.execSync('git diff --name-only origin/main...HEAD', { cwd: __dirname + '/..', stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean);
  assert(out.every(f => f.startsWith('v2/') || f === 'tests/v2-prototype.test.js'), 'V1 파일 변경 금지: ' + out);
} catch (e) { if (e.name === 'AssertionError') throw e; }
console.log('v2-prototype ok');
