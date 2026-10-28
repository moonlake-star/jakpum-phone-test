// V2 피드백 프로토타입 로직 — 가상 레슨 데이터와 로컬 시뮬레이션만. 네트워크 호출·저장 없음.
// 사용자 승인 시안(2026-10-29 '수강생 피드백 페이지 — 새로운 설계 구조'): ① AI 자동 생성 ② 강사 검토(한눈에) ③ 카드 편집(12줄)
// ④ 수강생 화면 미리보기(실시간) ⑤ 수강생 최종 화면(모바일) ⑥ 강사는 '확인 및 전달'만.
(function (root) {
  const BUILD = 'v2-proto-2026-10-29-02';
  const LEVELS = { simple: '심플', normal: '보통', detailed: '자세히' };
  const LV = { simple: 1, normal: 2, detailed: 3 };
  const MAX_LINES = 12, MAX_CHARS = 500;

  // 가상 레슨(실제 수강생·녹음 아님)
  const MOCK_LESSON = {
    student: '가상수강생', round: 3, date: '2026-10-29', song: '연습곡 A (가상)', audio: '../sample.mp3',
    inputs: [{ icon: '🎙️', name: '레슨 녹음' }, { icon: '📝', name: '강사 노트' }, { icon: '🎵', name: '수강생 녹음' }, { icon: '🤖', name: 'AI 분석' }],
    emphasis: [{ term: '호흡', count: 4, prev: true }, { term: '고음', count: 3, prev: false }, { term: '감정', count: 3, prev: false }]
  };

  // ① 생성 단계에 보이는 6개 항목(시안 왼쪽 목록)
  const GEN_ITEMS = [
    { id: 'best', tag: '베스트 편집본', tone: 'red', desc: '가장 좋은 부분을 모아 편집' },
    { id: 'makeup', tag: '메이크업본', tone: 'purple', desc: '보완이 필요한 부분 수정' },
    { id: 'points', tag: '⭐ 오늘의 핵심 포인트', tone: 'plain', desc: '3가지 핵심 개선 포인트' },
    { id: 'mission', tag: '☑️ 다음 미션', tone: 'plain', desc: '연습할 내용과 방법' },
    { id: 'song', tag: '🎵 추천곡', tone: 'plain', desc: '현재 실력에 맞는 곡 추천' },
    { id: 'cheer', tag: '💗 응원 메시지', tone: 'plain', desc: '개인화된 격려 메시지' }
  ];

  const it = (text, lv, ev) => ({ text, lv, ev: ev || '', ai: text, on: true });

  function generateDraft(lesson) {
    const L = lesson || MOCK_LESSON;
    return {
      greet: `${L.student}님, 오늘 레슨 수고 많으셨어요!`,
      cards: [
        { id: 'best', badge: '베스트', tone: 'red', title: '오늘의 베스트 편집본', audio: { kind: 'best', len: 45, seed: 7 }, items: [
          it('오늘 정말 좋은 테이크가 많이 나왔어요!', 1, '선생님 10:55 “아주 좋았어요”'),
          it('특히 1절이 가장 안정적이었습니다.', 2, '자동 비교(참고)'),
          it('후렴 전에 호흡을 먼저 채운 덕분에 흔들림이 적었어요.', 3, '선생님 5:12') ] },
        { id: 'makeup', badge: '메이크업본', tone: 'purple', title: '메이크업본 (AI 보정)', audio: { kind: 'makeup', len: 45, seed: 13 }, items: [
          it('호흡과 박자가 훨씬 편안해졌어요.', 1, '자동 보정(시범)'),
          it('감정 표현이 더 자연스러워졌어요.', 2),
          it('실제 실력이 아니라 “이렇게 들리면 좋아요”를 보여 주는 참고용이에요.', 3) ] },
        { id: 'points', icon: '⭐', title: '오늘의 핵심 포인트', items: [
          it('호흡이 한층 안정적이에요.', 1, '선생님 5:12 · 지난주부터 이어짐'),
          it('후렴 감정 표현이 좋아요.', 2, '선생님 10:55'),
          it('고음에서 음정이 안정적이에요.', 2, '선생님 8:18'),
          it('이 부분을 중심으로 연습했으니 천천히 들어보시고', 3),
          it('다음 레슨에서 더 깊이 다뤄볼게요.', 3) ] },
        { id: 'mission', icon: '☑️', title: '다음 미션', check: true, items: [
          it('지금에서 호흡 유지 연습', 1, '선생님 15:02'),
          it('후렴 감정 표현 조금 더 크게', 2, '선생님 10:55'),
          it('고음 음정 안정화 연습', 2, '선생님 8:18'),
          it('하루 5분, 주 3번이면 충분해요. 녹음은 원하실 때만 보내 주세요.', 3) ] },
        { id: 'song', icon: '🎵', title: '추천곡', song: { title: '가상곡 B', artist: '가상가수' }, items: [
          it('지금의 톤과 감정에 잘 어울리는 곡이에요. 😊', 1, '음역 비교(참고)'),
          it('후렴 호흡 연습하기에도 좋아요.', 2),
          it('원키로 시작하고, 높으면 반 키 내려서 불러 보세요.', 3) ] }
      ],
      cheer: { id: 'cheer', icon: '💗', title: '응원 메시지', items: [
        it('오늘 정말 잘 하셨어요! 꾸준히 하시면 더 멋진 목소리가 될 거예요.', 1),
        it('작은 변화가 큰 성장을 만듭니다. 😊', 1) ] }
    };
  }

  // 'AI 문구 제안' — 카드별 다른 표현(가상, 로컬 목록에서 차례로)
  const SUGGEST = {
    best: ['오늘 녹음 중 가장 빛났던 순간을 모았어요!\n1절에서 소리가 특히 안정적이었어요.', '오늘 베스트 테이크예요.\n처음보다 확실히 편안하게 부르셨어요.'],
    makeup: ['음정과 박자를 살짝 다듬은 버전이에요.\n원본과 번갈아 들어 보세요.', '조금만 다듬으면 이렇게 들려요.\n목표 소리로 참고해 주세요.'],
    points: ['호흡이 안정되면서 소리가 편해졌어요.\n후렴의 감정 표현이 살아났어요.\n고음에서 음정이 흔들리지 않았어요.', '숨을 먼저 채우는 습관이 자리 잡고 있어요.\n후렴에서 감정이 잘 전달돼요.\n고음 음정이 좋아졌어요.'],
    mission: ['후렴 전 숨 채우고 들어가기 5번\n후렴을 조금 더 크게 표현해 보기\n고음 구간만 천천히 3번', '호흡 유지하며 1절 부르기\n감정을 한 단계 더 크게\n고음 구간 음정 확인하며 연습'],
    song: ['지금 음역에 편하게 맞는 곡이에요.\n후렴 호흡 연습에 좋아요.', '오늘 배운 호흡을 써 보기 좋은 곡이에요.\n편한 키로 불러 보세요.'],
    cheer: ['오늘 정말 수고 많으셨어요! 한 주 한 주 확실히 좋아지고 있어요.', '꾸준함이 제일 큰 실력이에요. 다음 레슨도 기대할게요! 😊']
  };
  function suggest(id, k) { const a = SUGGEST[id] || []; return a.length ? a[((k || 0) % a.length + a.length) % a.length] : ''; }

  function allCards(d) { return d.cards.concat([d.cheer]); }
  function visibleItems(card, level) { return card.items.filter(i => i.lv <= (LV[level] || 2)); }
  function cardText(card, level) { return visibleItems(card, level).map(i => i.text).join('\n'); }
  function counts(text) { const t = String(text || ''); return { lines: t.split('\n').filter(s => s.trim()).length, chars: t.length }; }

  // 학생 화면(빈 카드는 숨김, 미션은 체크된 줄만)
  function buildStudentView(d, level) {
    const lines = c => visibleItems(c, level).filter(i => !c.check || i.on).map(i => i.text);
    return {
      greet: d.greet,
      cards: d.cards.map(c => ({ id: c.id, badge: c.badge || '', tone: c.tone || '', icon: c.icon || '', title: c.title, audio: c.audio || null, song: c.song || null, check: !!c.check, lines: lines(c) }))
        .filter(c => c.lines.length || c.audio),
      cheer: lines(d.cheer)
    };
  }

  // 카드 수정: 지금 단계에서 보이는 줄을 고친 글로 바꿈(최대 12줄·500자). 안 보이는 단계의 줄은 그대로.
  function editCard(card, level, text) {
    const lines = String(text || '').slice(0, MAX_CHARS).split('\n').map(s => s.replace(/^\s*[•·\-]\s*/, '').trim()).filter(Boolean).slice(0, MAX_LINES);
    const vis = visibleItems(card, level), lv = LV[level] || 2;
    const kept = card.items.filter(i => !vis.includes(i));
    const next = lines.map((t, k) => vis[k] ? Object.assign({}, vis[k], { text: t }) : { text: t, lv, ev: '선생님 추가', ai: '', on: true });
    card.items = next.concat(kept).sort((a, b) => a.lv - b.lv);
    return card;
  }
  function toggleCheck(card, idx, level) { const i = visibleItems(card, level)[idx]; if (i) i.on = !i.on; return card; }

  // 'AI 원문 다시 보기': 고친 줄의 AI 원래 문장
  function originals(d) {
    const out = [];
    for (const c of allCards(d)) for (const i of c.items) if (i.text !== i.ai) out.push({ card: c.title, ai: i.ai || '(선생님이 새로 추가)', now: i.text });
    return out;
  }

  // AI가 쓴 비율(글자 기준): 바꾸지 않은 글자 / 전체
  function aiShare(d) {
    let total = 0, same = 0;
    for (const c of allCards(d)) for (const i of c.items) {
      total += i.text.length;
      if (i.ai && i.text === i.ai) same += i.text.length;
      else if (i.ai) { let p = 0; while (p < i.text.length && i.text[p] === i.ai[p]) p++; same += p; }
    }
    return total ? Math.round(same / total * 100) : 100;
  }

  // 검토: 카드를 한 번씩 화면에 띄워 보면 확인됨(누를 필요 없음). 다 보기 전엔 전달 잠김.
  function reviewProgress(d, seen) {
    const ids = allCards(d).map(c => c.id);
    const done = ids.filter(id => seen.has(id)).length;
    return { done, total: ids.length, all: done === ids.length };
  }
  function canDeliver(reviewedAll) { return reviewedAll === true; }
  function simulateDeliver(d, reviewedAll) {
    if (!canDeliver(reviewedAll)) return { ok: false, reason: '카드를 끝까지 한 번 훑어 주세요.' };
    return { ok: true, simulated: true, sent: false, message: '시험판이라 실제로는 아무에게도 보내지 않았어요.' };
  }
  // 임시저장: 이 화면 안에서만(새로고침하면 사라짐)
  function snapshot(d) { return JSON.parse(JSON.stringify(d)); }

  function mmss(s) { return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(Math.floor(s % 60)).padStart(2, '0'); }
  // 가짜 파형(결정적) — 실제 녹음 분석 아님
  function mockPeaks(seed, n) {
    const out = []; let x = seed || 1; n = n || 90;
    for (let k = 0; k < n; k++) {
      x = (x * 9301 + 49297) % 233280;
      const env = 0.45 + 0.4 * Math.sin(k / n * Math.PI);
      out.push(Math.max(0.08, Math.min(1, env * (0.5 + 0.5 * x / 233280))));
    }
    return out;
  }

  const api = { BUILD, LEVELS, MAX_LINES, MAX_CHARS, MOCK_LESSON, GEN_ITEMS, generateDraft, suggest, allCards, visibleItems, cardText, counts, buildStudentView, editCard, toggleCheck, originals, aiShare, reviewProgress, canDeliver, simulateDeliver, snapshot, mmss, mockPeaks };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.V2 = api;
})(typeof window !== 'undefined' ? window : globalThis);
