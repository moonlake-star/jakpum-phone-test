// V2 피드백 프로토타입 로직 — 가상 레슨 데이터와 로컬 시뮬레이션만. 네트워크 호출 없음.
(function (root) {
  const MOCK_LESSON = {
    student: '가상수강생 A',
    song: '가상곡 (연습용)',
    teacherSaid: [
      '후렴 들어가기 전에 숨을 먼저 채우세요.',
      '고음에서 턱에 힘이 들어가요. 힘을 빼고 소리를 앞으로 보내세요.',
      '끝음을 너무 빨리 끊지 말고 끝까지 끌고 가세요.'
    ],
    best: { title: '베스트 편집본', len: 35, note: '가장 안정적이었던 후렴 35초' },
    makeup: { title: '메이크업본', len: 28, note: '음정·박자를 살짝 다듬은 시범본(가상)' },
    nextSongs: [{ title: '가상 추천곡 1', artist: '가상 가수', why: '음역이 비슷해서 후렴 연습에 좋아요' }]
  };

  const LEVELS = { simple: '심플', normal: '보통', detailed: '자세히' };
  const LINE_KEYS = ['greet', 'best', 'makeup', 'point1', 'point2', 'point3', 'why1', 'why2', 'mission1', 'mission2', 'song', 'cheer'];

  // AI 초안 시뮬레이션: 강사 발언을 근거로 12줄을 모두 채운다(90% 이상 자동 작성 콘셉트).
  function generateDraft(lesson) {
    const s = lesson.teacherSaid;
    return {
      greet: lesson.student + '님, 오늘 레슨 수고하셨어요!',
      best: lesson.best.note + '을(를) 골라 두었어요.',
      makeup: lesson.makeup.note + ' — 비교해서 들어 보세요.',
      point1: s[0], point2: s[1], point3: s[2],
      why1: '숨이 먼저 차면 후렴이 흔들리지 않아요.',
      why2: '힘을 빼면 고음이 더 편하고 선명해져요.',
      mission1: '이번 주: 후렴 전 숨 채우기 5번 반복',
      mission2: '이번 주: 고음 구간을 턱 힘 빼고 3번 부르기',
      song: '추천곡: ' + lesson.nextSongs[0].title + ' — ' + lesson.nextSongs[0].why,
      cheer: '조금씩 좋아지고 있어요. 다음 레슨도 기대할게요!'
    };
  }

  // 단계별 표시: 심플=5카드 핵심, 보통=+이유, 자세히=12줄 전체
  function visibleKeys(level) {
    if (level === 'simple') return ['best', 'makeup', 'point1', 'mission1', 'song', 'cheer'];
    if (level === 'normal') return ['best', 'makeup', 'point1', 'point2', 'point3', 'mission1', 'mission2', 'song', 'cheer'];
    return LINE_KEYS.slice();
  }

  // 상단 5카드(베스트·메이크업·핵심 포인트·다음 미션·추천곡) + 하단 응원
  function buildCards(draft, level) {
    const has = k => visibleKeys(level).includes(k);
    const pick = ks => ks.filter(has).map(k => draft[k]).filter(Boolean);
    return {
      cards: [
        { id: 'best', title: '베스트 편집본', lines: pick(['best']) },
        { id: 'makeup', title: '메이크업본', lines: pick(['makeup']) },
        { id: 'points', title: '핵심 포인트', lines: pick(['point1', 'point2', 'point3', 'why1', 'why2']) },
        { id: 'mission', title: '다음 미션', lines: pick(['mission1', 'mission2']) },
        { id: 'song', title: '추천곡', lines: pick(['song']) }
      ],
      cheer: draft.cheer
    };
  }

  // 전체 검토: 12줄을 모두 본 뒤에만 전달 가능
  function canDeliver(reviewedAll) { return reviewedAll === true; }

  // 전달은 시뮬레이션 전용 — 실제 전송 경로가 없다.
  function simulateDeliver(draft, reviewedAll) {
    if (!canDeliver(reviewedAll)) return { ok: false, reason: '전체 검토를 먼저 마쳐 주세요.' };
    return { ok: true, simulated: true, sent: false, message: '프로토타입이라 실제로는 보내지 않았어요.' };
  }

  const api = { MOCK_LESSON, LEVELS, LINE_KEYS, generateDraft, visibleKeys, buildCards, canDeliver, simulateDeliver };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.V2 = api;
})(typeof window !== 'undefined' ? window : globalThis);
