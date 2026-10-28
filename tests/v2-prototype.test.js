// V2 프로토타입(시안 2026-10-29): 5카드+응원, 단계별 표시, 카드 편집(12줄·500자)·AI 문구 제안, 미션 체크, AI 원문 보기,
// AI 작성 비율, 전체 훑기 전 전달 차단, 실제 전송 경로 없음, V1 무변경
const fs = require('fs'), assert = require('assert'), _cp = null;
const V2 = require('../v2/v2-logic.js');
let d = V2.generateDraft(V2.MOCK_LESSON);

// ① 생성 항목 6개(시안 왼쪽 목록)
assert.deepEqual(V2.GEN_ITEMS.map(g => g.id), ['best', 'makeup', 'points', 'mission', 'song', 'cheer']);

// 학생 화면: 상단 5카드 순서 + 하단 응원
const sv = V2.buildStudentView(d, 'detailed');
assert.deepEqual(sv.cards.map(x => x.title), ['오늘의 베스트 편집본', '메이크업본 (AI 보정)', '오늘의 핵심 포인트', '다음 미션', '추천곡']);
assert(sv.cheer.length >= 1 && sv.greet);
assert(sv.cards[0].audio && sv.cards[1].audio && sv.cards[0].badge === '베스트', '베스트·메이크업은 소리 카드');
assert(sv.cards[4].song && sv.cards[4].song.title, '추천곡 제목');

// 심플 < 보통 < 자세히
const n = lv => V2.buildStudentView(d, lv).cards.reduce((s, c) => s + c.lines.length, 0);
assert(n('simple') < n('normal') && n('normal') < n('detailed'), '단계별 줄 수');
assert.equal(V2.buildStudentView(d, 'normal').cards.find(c => c.id === 'points').lines.length, 3, '보통 = 핵심 3가지');
assert.equal(V2.aiShare(d), 100);

// 카드 편집: 글머리표 제거, 보이는 줄만 교체, 숨은 줄 유지, 12줄·500자 제한
const pts = d.cards.find(c => c.id === 'points');
const before = pts.items.length;
V2.editCard(pts, 'simple', '• 호흡이 아주 안정적이에요');
assert.equal(pts.items.length, before, '숨은 줄 유지');
assert.equal(V2.visibleItems(pts, 'simple')[0].text, '호흡이 아주 안정적이에요');
assert(V2.aiShare(d) < 100 && V2.aiShare(d) > 80);
V2.editCard(pts, 'normal', Array.from({ length: 15 }, (_, i) => '줄' + i).join('\n'));
assert.equal(V2.visibleItems(pts, 'normal').length, 12, '최대 12줄');
assert(pts.items.some(i => i.lv === 3), '자세히 줄은 그대로');
V2.editCard(pts, 'simple', 'ㄱ'.repeat(800));
assert(V2.visibleItems(pts, 'simple')[0].text.length <= V2.MAX_CHARS, '500자 제한');
assert(V2.originals(d).length > 0, 'AI 원문 다시 보기');

// AI 문구 제안: 카드별로 돌아가며
assert(V2.suggest('points', 0) && V2.suggest('points', 0) !== V2.suggest('points', 1));
assert.equal(V2.suggest('points', 2), V2.suggest('points', 0));

// 미션 체크 해제 → 학생 화면에서 빠짐
d = V2.generateDraft(V2.MOCK_LESSON);
const mis = d.cards.find(c => c.id === 'mission');
const m0 = V2.buildStudentView(d, 'normal').cards.find(c => c.id === 'mission').lines.length;
V2.toggleCheck(mis, 1, 'normal');
assert.equal(V2.buildStudentView(d, 'normal').cards.find(c => c.id === 'mission').lines.length, m0 - 1);

// 검토: 카드 6개(5+응원)를 다 훑어야 전달 가능
const seen = new Set(['best', 'makeup', 'points']);
let p = V2.reviewProgress(d, seen);
assert.equal(p.total, 6); assert.equal(p.all, false);
assert.equal(V2.simulateDeliver(d, p.all).ok, false);
['mission', 'song', 'cheer'].forEach(x => seen.add(x));
p = V2.reviewProgress(d, seen); assert(p.all);
const r = V2.simulateDeliver(d, p.all);
assert(r.ok && r.simulated && r.sent === false);

// 임시저장은 복사본(원본과 분리)
const snap = V2.snapshot(d); snap.cards[0].items[0].text = 'x'; assert.notEqual(d.cards[0].items[0].text, 'x');
assert.equal(V2.mmss(45), '00:45');
assert.deepEqual(V2.mockPeaks(7, 10), V2.mockPeaks(7, 10));

// 가상 데이터만: 실제 수강생 이름·Drive ID 없음
const logic = fs.readFileSync(__dirname + '/../v2/v2-logic.js', 'utf8');
assert(!/김미영|[A-Za-z0-9_-]{28,}/.test(logic), '실명·파일 ID 금지');

// 실제 전송/네트워크/저장/공유 코드 없음
for (const f of ['v2/v2-logic.js', 'v2/index.html']) {
  const s = fs.readFileSync(__dirname + '/../' + f, 'utf8');
  assert(!/fetch\(|XMLHttpRequest|sendBeacon|WebSocket|script\.google|googleapis|api\.|Authorization|localStorage|sessionStorage|indexedDB|navigator\.share|kakao/i.test(s), f + ' 네트워크/저장/공유 금지');
}
// V1 분리: 지금 앱(teacher/student)은 V2 파일을 불러오지 않는다(병합 후에도 다른 PR을 막지 않도록 diff 검사 대신)
for (const f of ['teacher/index.html', 'student/index.html']) {
  const s = fs.readFileSync(__dirname + '/../' + f, 'utf8');
  assert(!/v2-logic\.js|src=["'][^"']*v2\//.test(s), f + '가 V2를 불러오면 안 됨');
}
console.log('v2-prototype ok');
