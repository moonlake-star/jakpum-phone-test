// V2 프로토타입: 12줄 초안, 5카드+응원, 단계별 표시, 전체 검토 전 전달 차단, 실제 전송 경로 없음, V1 무변경
const fs = require('fs'), assert = require('assert'), cp = require('child_process');
const V2 = require('../v2/v2-logic.js');
const d = V2.generateDraft(V2.MOCK_LESSON);
assert.equal(V2.LINE_KEYS.length, 12);
assert(V2.LINE_KEYS.every(k => typeof d[k] === 'string' && d[k].length > 0), '12줄 모두 AI가 채움');
const c = V2.buildCards(d, 'detailed');
assert.deepEqual(c.cards.map(x => x.title), ['베스트 편집본', '메이크업본', '핵심 포인트', '다음 미션', '추천곡']);
assert(c.cheer);
assert(V2.visibleKeys('simple').length < V2.visibleKeys('normal').length && V2.visibleKeys('normal').length < V2.visibleKeys('detailed').length);
assert.equal(V2.visibleKeys('detailed').length, 12);
assert.equal(V2.simulateDeliver(d, false).ok, false);
const r = V2.simulateDeliver(d, true);
assert(r.ok && r.simulated && r.sent === false);
// 실제 전송/네트워크 코드 없음
for (const f of ['v2/v2-logic.js', 'v2/index.html']) {
  const s = fs.readFileSync(__dirname + '/../' + f, 'utf8');
  assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|script\.google|api\.|Authorization|localStorage/.test(s), f + ' 네트워크/저장 금지');
}
// V1 무변경: main 대비 v2/·tests/v2-*만 추가
try {
  const out = cp.execSync('git diff --name-only origin/main...HEAD', { cwd: __dirname + '/..', stdio: ['ignore', 'pipe', 'ignore'] }).toString().split('\n').filter(Boolean);
  assert(out.every(f => f.startsWith('v2/') || f === 'tests/v2-prototype.test.js'), 'V1 파일 변경 금지: ' + out);
} catch (e) { if (e.name === 'AssertionError') throw e; }
console.log('v2-prototype ok');
