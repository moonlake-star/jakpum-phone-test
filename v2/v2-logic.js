// V2 피드백 프로토타입 로직 — 가상 레슨 데이터와 로컬 시뮬레이션만. 네트워크 호출·저장 없음.
// 콘셉트: AI가 레슨 녹음·선생님 말을 근거로 피드백의 90% 이상을 쓰고, 선생님은 한 번 훑으며 필요한 카드만 고친 뒤 전달.
(function (root) {
  const BUILD = 'v2-proto-2026-10-29-01';
  const LEVELS = { simple: '심플', normal: '보통', detailed: '자세히' };
  const LV = { simple: 1, normal: 2, detailed: 3 };
  const MAX_LINES = 12;

  // 가상 레슨(실제 수강생·녹음 아님)
  const MOCK_LESSON = {
    student: '가상수강생',
    round: 3,
    date: '2026-10-29',
    song: '연습곡 A (가상)',
    audio: '../sample.mp3',
    teacherSaid: [
      { t: 312, text: '후렴 들어가기 전에 숨을 먼저 채우세요.' },
      { t: 498, text: '고음에서 턱에 힘이 들어가요. 힘 빼고 소리를 앞으로.' },
      { t: 655, text: '그렇죠! 방금 후렴 아주 좋았어요.' },
      { t: 731, text: '끝음을 빨리 끊지 말고 끝까지 끌고 가세요.' },
      { t: 902, text: '숨 먼저 채우는 거, 지난주에 이어서 계속 가져가요.' }
    ],
    emphasis: [{ term: '숨', count: 4, prev: true }, { term: '턱', count: 3, prev: false }, { term: '끝음', count: 3, prev: false }]
  };

  const STEPS = ['녹음 받기', '말 받아쓰기', '선생님 강조 찾기', '베스트·메이크업 고르기', '피드백 초안 쓰기'];

  // 카드 정의: 학생 화면 상단 5개 + 하단 응원. item.lv = 이 단계부터 보임(1 심플 · 2 보통 · 3 자세히)
  function generateDraft(lesson) {
    const L = lesson || MOCK_LESSON;
    const mm = t => Math.floor(t / 60) + ':' + String(Math.floor(t % 60)).padStart(2, '0');
    const it = (text, lv, ev) => ({ text, lv, ev: ev || '', ai: text });
    return {
      greet: `${L.student}님, 오늘 레슨 수고 많으셨어요!`,
      cards: [
        { id: 'best', icon: '🎵', title: '오늘의 베스트', audio: { kind: 'best', len: 32, seed: 7 }, items: [
          it('오늘 가장 좋았던 후렴 32초예요.', 1, '선생님 ' + mm(655) + ' “아주 좋았어요”'),
          it('숨을 먼저 채우고 들어간 덕분에 후렴이 흔들리지 않았어요.', 2, '선생님 ' + mm(312)),
          it('두 번 부른 후렴 중 음정이 더 안정된 쪽으로 골랐어요.', 3, '자동 비교(참고)') ] },
        { id: 'makeup', icon: '✨', title: '메이크업본', audio: { kind: 'makeup', len: 28, seed: 13 }, items: [
          it('같은 후렴을 음정·박자만 살짝 다듬은 시범본이에요.', 1, '자동 보정(시범)'),
          it('원본과 번갈아 들으면 고칠 곳이 더 잘 들려요.', 2),
          it('실제 실력이 아니라 “이렇게 들리면 좋아요”를 보여 주는 참고용이에요.', 3) ] },
        { id: 'points', icon: '📌', title: '핵심 포인트', items: [
          it('후렴 전에 숨을 먼저 채우기', 1, '선생님 ' + mm(312) + ' · 지난주부터 이어짐'),
          it('고음에서 턱 힘 빼고 소리를 앞으로', 2, '선생님 ' + mm(498)),
          it('끝음은 끝까지 끌고 가기', 2, '선생님 ' + mm(731)),
          it('숨이 먼저 차 있으면 첫 음이 흔들리지 않아요.', 3),
          it('턱에 힘이 빠지면 고음이 더 편하고 선명해져요.', 3) ] },
        { id: 'mission', icon: '🎯', title: '다음 미션', items: [
          it('후렴 전 숨 채우고 들어가기 5번', 1, '선생님 ' + mm(902)),
          it('고음 구간만 턱 힘 빼고 3번 부르기', 2, '선생님 ' + mm(498)),
          it('하루 5분, 주 3번이면 충분해요. 녹음은 원하실 때만 보내 주세요.', 3) ] },
        { id: 'song', icon: '🎧', title: '추천 곡', items: [
          it('추천곡 B (가상) — 음역이 비슷해요', 1, '음역 비교(참고)'),
          it('후렴 숨 채우기 연습하기 좋은 곡이에요.', 2),
          it('원키로 시작하고, 높으면 반 키 내려서 불러 보세요.', 3) ] }
      ],
      cheer: { id: 'cheer', icon: '💬', title: '응원 한마디', items: [
        it('조금씩 확실히 좋아지고 있어요. 다음 레슨도 기대할게요!', 1) ] }
    };
  }

  function allCards(d) { return d.cards.concat([d.cheer]); }
  function visibleItems(card, level) { return card.items.filter(i => i.lv <= (LV[level] || 2)); }

  // 학생 화면 카드(빈 카드는 숨김)
  function buildStudentView(d, level) {
    return {
      greet: d.greet,
      cards: d.cards.map(c => ({ id: c.id, icon: c.icon, title: c.title, audio: c.audio || null, lines: visibleItems(c, level).map(i => i.text) }))
        .filter(c => c.lines.length || c.audio),
      cheer: visibleItems(d.cheer, level).map(i => i.text)
    };
  }

  // 카드 수정: 지금 단계에서 보이는 줄을 고친 글로 바꿈(최대 12줄). 안 보이는 단계의 줄은 그대로 둠.
  function editCard(card, level, text) {
    const lines = String(text || '').split('\n').map(s => s.trim()).filter(Boolean).slice(0, MAX_LINES);
    const vis = visibleItems(card, level);
    const lv = LV[level] || 2;
    const kept = card.items.filter(i => !vis.includes(i));
    const next = lines.map((t, k) => vis[k] ? Object.assign({}, vis[k], { text: t }) : { text: t, lv, ev: '선생님 추가', ai: '' });
    // 원래 순서 유지: 보이는 줄 자리에 새 줄, 나머지는 뒤
    card.items = next.concat(kept).sort((a, b) => a.lv - b.lv);
    return card;
  }

  // AI가 쓴 비율(글자 기준): 선생님이 바꾸지 않은 글자 / 전체
  function aiShare(d) {
    let total = 0, same = 0;
    for (const c of allCards(d)) for (const i of c.items) {
      total += i.text.length;
      if (i.ai && i.text === i.ai) same += i.text.length;
      else if (i.ai) { let p = 0; while (p < i.text.length && i.text[p] === i.ai[p]) p++; same += p; }
    }
    return total ? Math.round(same / total * 100) : 100;
  }

  // 검토: 카드를 한 번씩 화면에 띄워 보면 확인됨(누를 필요 없음). 모든 카드 확인 전엔 전달 잠김.
  function reviewProgress(d, seen) {
    const ids = allCards(d).map(c => c.id);
    const done = ids.filter(id => seen.has(id)).length;
    return { done, total: ids.length, all: done === ids.length };
  }
  function canDeliver(reviewedAll) { return reviewedAll === true; }

  // 전달은 시뮬레이션 전용 — 실제 전송 경로가 없다.
  function simulateDeliver(d, reviewedAll) {
    if (!canDeliver(reviewedAll)) return { ok: false, reason: '카드를 끝까지 한 번 훑어 주세요.' };
    return { ok: true, simulated: true, sent: false, message: '시험판이라 실제로는 아무에게도 보내지 않았어요.' };
  }

  // 가짜 파형(결정적) — 실제 녹음 분석 아님
  function mockPeaks(seed, n) {
    const out = []; let x = seed || 1;
    for (let k = 0; k < (n || 90); k++) {
      x = (x * 9301 + 49297) % 233280;
      const env = 0.45 + 0.4 * Math.sin(k / (n || 90) * Math.PI);
      out.push(Math.max(0.08, Math.min(1, env * (0.55 + 0.45 * x / 233280))));
    }
    return out;
  }

  const api = { BUILD, LEVELS, MAX_LINES, MOCK_LESSON, STEPS, generateDraft, allCards, visibleItems, buildStudentView, editCard, aiShare, reviewProgress, canDeliver, simulateDeliver, mockPeaks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.V2 = api;
})(typeof window !== 'undefined' ? window : globalThis);
