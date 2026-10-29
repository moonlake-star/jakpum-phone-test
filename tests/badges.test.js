// 수강생 배지/칭호(이슈 #181): 모의 데이터 전용 · 독립 폴더 badges/ · 기존 화면 미연결
const fs = require('fs'), assert = require('assert');
const B = require('../badges/badges-logic.js');
const L = (d, extra) => ({ type: 'lesson', date: d, ...(extra || {}) });

// 칭호: 레슨 누적만, 하락 없음, 5단계
assert.deepStrictEqual(B.TITLE_STEPS.map((t) => t.name), ['새싹 가수', '연습하는 가수', '노래하는 사람', '무대 위 가수', '작품 가수']);
assert.strictEqual(B.PROVISIONAL, true, '임계값은 가정값 표시');
assert.strictEqual(B.titleFor(0).title.name, '새싹 가수');
assert.strictEqual(B.titleFor(4).title.name, '연습하는 가수');
assert.strictEqual(B.titleFor(3).remaining, 1);
assert.strictEqual(B.titleFor(48).next, null);
assert.strictEqual(B.titleFor(2, 3).title.name, '무대 위 가수', '저장된 최고 칭호 아래로 내려가지 않음');
assert.strictEqual(B.titleFor(5, 0).title.name, '연습하는 가수');

// 주 연속(월요일 시작), 보강 포함
assert.strictEqual(B.bestStreak(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28', '2026-10-05']), 5);
assert.strictEqual(B.bestStreak(['2026-09-07', '2026-09-21']), 1, '건너뛴 주는 끊김');
assert.strictEqual(B.bestStreak(['2026-09-07', '2026-09-09']), 1, '같은 주는 1주');
assert.strictEqual(B.bestStreak(['2026-09-13', '2026-09-14']), 2, '일요일→월요일은 다음 주');

// 자동 배지: 레슨 5주 연속 → 첫 레슨·4회·5주 연속 획득, 날짜는 달성 시점
let r = B.evaluate(B.DEMO);
const got = (id) => r.badges.find((b) => b.id === id);
assert.strictEqual(got('first_lesson').date, '2026-09-07');
assert.strictEqual(got('four_done').date, '2026-09-28');
assert.strictEqual(got('streak5').date, '2026-10-05');
assert.strictEqual(got('first_mission').earned, true);
assert.strictEqual(got('missions5').earned, false);
assert.deepStrictEqual({ ...got('missions5').progress }, { have: 2, need: 5, unit: '회' });
assert.strictEqual(got('replay_note').earned, false, '노트 재생 이벤트 없으면 획득 불가(추정 금지)');
assert.strictEqual(got('first_reflection').earned, true);
assert.strictEqual(r.title.title.name, '연습하는 가수');

// 데이터 없음 → 아무것도 추정하지 않음
r = B.evaluate({});
assert.ok(r.badges.every((b) => !b.earned) && r.summary.lessons === 0 && r.recent.length === 0);

// 영구 유지: 이벤트가 사라져도 kept의 배지·최고 연속·칭호는 남음
const first = B.evaluate(B.DEMO);
r = B.evaluate({ events: [L('2026-10-12')], awards: [], kept: first.nextKept });
assert.strictEqual(r.badges.find((b) => b.id === 'streak5').earned, true);
assert.strictEqual(r.bestStreak, 5);
assert.strictEqual(r.title.title.name, '연습하는 가수');

// 선생님 수여: 6종 이상, 코멘트·클립·근거, 녹음 없으면 빈 상태, 자동 배지는 수여 불가
assert.ok(['🚀', '🎤', '🌬️', '🎶', '💖', '🎬'].every((i) => B.CATALOG.some((b) => b.icon === i && b.kind === 'teacher')));
let s = B.awardBadge({ events: [] }, 'first_song', { date: '2026-10-10', comment: '끝까지 불렀어요' });
assert.strictEqual(B.evaluate(s).badges.find((b) => b.id === 'first_song').award.clip, null);
s = B.awardBadge(s, 'first_song', { date: '2026-10-10', comment: 'x', clip: { start_s: 12, label: 'a' }, evidence: 'e' });
assert.strictEqual(s.awards.length, 1, '같은 배지 재수여는 교체');
assert.strictEqual(B.evaluate(s).badges.find((b) => b.id === 'first_song').award.clip.start_s, 12);
assert.throws(() => B.awardBadge(s, 'four_done', { date: '2026-10-10' }));
assert.throws(() => B.awardBadge(s, 'rhythm', { date: '10/10' }));
assert.throws(() => B.awardBadge(s, 'rhythm', { date: '2026-10-10', clip: { start_s: 'x' } }));
assert.strictEqual(B.DEMO.awards[0].clip.sample, true, '데모 클립은 샘플 표시');

// 재생은 한 번에 하나
const p = B.createSinglePlayer();
assert.strictEqual(p.play('a').stopped, null);
assert.strictEqual(p.play('b').stopped, 'a');
p.stop(); assert.strictEqual(p.current, null);

// 카탈로그 확장성: id 유일, auto는 rule 보유, 카테고리 정의됨
assert.strictEqual(new Set(B.CATALOG.map((b) => b.id)).size, B.CATALOG.length);
assert.ok(B.CATALOG.every((b) => b.cat in B.CATEGORIES && (b.kind === 'teacher' || (b.rule && b.rule.gte > 0))));

// 화면·격리: 샘플 안내, 순위/비교/벌점 표현 없음, 외부 호출 없음, 기존 화면과 연결 없음
const html = fs.readFileSync(__dirname + '/../badges/index.html', 'utf8');
const logic = fs.readFileSync(__dirname + '/../badges/badges-logic.js', 'utf8');
assert.ok(html.includes('샘플 화면입니다') && html.includes('실제 음원 아님'));
assert.ok(!/순위\s*\d|랭킹|상위\s*\d|벌점/.test(html.replace(/순위·비교·점수 깎임은 없어요/, '')));
for (const f of [html, logic]) assert.ok(!/fetch\(|XMLHttpRequest|localStorage|googleapis|<audio/.test(f), '네트워크·저장·음원 호출 없음');
assert.ok(/min-height:3rem/.test(html) && /font-size:calc\(18px \* var\(--fz\)\)/.test(html), '큰 터치 영역·글씨 크기 조절');
for (const f of ['teacher/index.html', 'student/index.html', 'index.html', 'home.html', 'sw.js']) {
  assert.ok(!/badges\//.test(fs.readFileSync(__dirname + '/../' + f, 'utf8')), f + '가 badges를 불러오면 안 됨');
}
console.log('badges ok');
