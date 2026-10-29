// 수강생 배지/칭호 로직 — 모의 데이터 전용. 네트워크 호출·저장·운영 데이터 접근 없음.
// 칭호 임계값(TITLE_STEPS)은 '테스트 명세 가정값'이며 사용자 확정 전에는 운영에 적용하지 않는다(PROVISIONAL).
(function (root) {
  const PROVISIONAL = true;
  const TITLE_STEPS = [
    { id: 'sprout', icon: '🌱', name: '새싹 가수', min: 0 },
    { id: 'practicing', icon: '🌿', name: '연습하는 가수', min: 4 },
    { id: 'singer', icon: '🌳', name: '노래하는 사람', min: 12 },
    { id: 'stage', icon: '🎙️', name: '무대 위 가수', min: 24 },
    { id: 'artist', icon: '👑', name: '작품 가수', min: 48 },
  ];
  const CATEGORIES = { lesson: '레슨', mission: '미션', note: '노트·소감', teacher: '선생님 수여' };
  // rule: metric은 summarize()가 만든 값 이름. 해당 이벤트 데이터가 없으면 획득 불가(추정·허위 집계 없음).
  const METRIC_EVENT = { lessons: 'lesson', bestWeekStreak: 'lesson', missions: 'mission', bestMissionWeekStreak: 'mission', reflections: 'reflection', noteReplays: 'note_replay' };
  const CATALOG = [
    { id: 'first_lesson', icon: '🎵', name: '첫 레슨', cat: 'lesson', kind: 'auto', rule: { metric: 'lessons', gte: 1 } },
    { id: 'four_done', icon: '🏅', name: '4회 완주', cat: 'lesson', kind: 'auto', rule: { metric: 'lessons', gte: 4 } },
    { id: 'streak5', icon: '🔥', name: '5주 연속 레슨', cat: 'lesson', kind: 'auto', rule: { metric: 'bestWeekStreak', gte: 5 } },
    { id: 'first_mission', icon: '📝', name: '첫 미션 해 옴', cat: 'mission', kind: 'auto', rule: { metric: 'missions', gte: 1 } },
    { id: 'missions5', icon: '📚', name: '미션 5회 해 옴', cat: 'mission', kind: 'auto', rule: { metric: 'missions', gte: 5 } },
    { id: 'mission_streak3', icon: '🌟', name: '미션 3주 연속', cat: 'mission', kind: 'auto', rule: { metric: 'bestMissionWeekStreak', gte: 3 } },
    { id: 'first_reflection', icon: '💬', name: '첫 소감', cat: 'note', kind: 'auto', rule: { metric: 'reflections', gte: 1 } },
    { id: 'replay_note', icon: '🎧', name: '노트 다시 듣기', cat: 'note', kind: 'auto', rule: { metric: 'noteReplays', gte: 1 } },
    { id: 'high_note', icon: '🚀', name: '고음 돌파', cat: 'teacher', kind: 'teacher' },
    { id: 'first_song', icon: '🎤', name: '첫 완곡', cat: 'teacher', kind: 'teacher' },
    { id: 'steady_breath', icon: '🌬️', name: '호흡 안정', cat: 'teacher', kind: 'teacher' },
    { id: 'rhythm', icon: '🎶', name: '리듬 타기', cat: 'teacher', kind: 'teacher' },
    { id: 'emotion', icon: '💖', name: '감정 전달', cat: 'teacher', kind: 'teacher' },
    { id: 'first_work', icon: '🎬', name: '나의 첫 작품', cat: 'teacher', kind: 'teacher' },
  ];
  const DAY = 86400000;
  const dayNum = (s) => Math.floor(Date.parse(s + 'T00:00:00Z') / DAY);
  const weekNum = (s) => Math.floor((dayNum(s) - 4) / 7); // 월요일 시작(1970-01-05=월)
  function bestStreak(dates) {
    const w = [...new Set((dates || []).map(weekNum))].sort((a, b) => a - b);
    let best = 0, run = 0, prev = null;
    for (const x of w) { run = prev !== null && x === prev + 1 ? run + 1 : 1; prev = x; if (run > best) best = run; }
    return best;
  }
  // events: {type:'lesson'|'mission'|'reflection'|'note_replay', date:'YYYY-MM-DD'} — 보강 레슨도 type 'lesson'(makeup:true)로 그대로 센다.
  function summarize(events) {
    const by = (t) => (events || []).filter((e) => e.type === t);
    const lessons = by('lesson'), missions = by('mission');
    return {
      lessons: lessons.length, missions: missions.length,
      reflections: by('reflection').length, noteReplays: by('note_replay').length,
      bestWeekStreak: bestStreak(lessons.map((e) => e.date)),
      bestMissionWeekStreak: bestStreak(missions.map((e) => e.date)),
    };
  }
  // 칭호는 누적 레슨 횟수만으로 결정. 입력이 줄어도 저장된 최고 칭호(keptIndex) 아래로 내려가지 않는다.
  function titleFor(lessons, keptIndex) {
    let i = 0;
    TITLE_STEPS.forEach((t, k) => { if (lessons >= t.min) i = k; });
    i = Math.max(i, keptIndex || 0);
    const next = TITLE_STEPS[i + 1] || null;
    return {
      index: i, title: TITLE_STEPS[i], next, remaining: next ? Math.max(0, next.min - lessons) : 0,
      progress: next ? Math.min(1, Math.max(0, (lessons - TITLE_STEPS[i].min) / (next.min - TITLE_STEPS[i].min))) : 1,
    };
  }
  function earnDate(def, events) {
    const { metric, gte } = def.rule;
    const dates = (events || []).filter((e) => e.type === METRIC_EVENT[metric]).map((e) => e.date).sort();
    if (!/Streak$/.test(metric)) return dates.length >= gte ? dates[gte - 1] : null;
    for (let n = gte; n <= dates.length; n++) if (bestStreak(dates.slice(0, n)) >= gte) return dates[n - 1];
    return null;
  }
  // state: {events, awards:[{badge,date,comment,clip:{start_s,label,sample}|null,evidence}], kept:{titleIndex,earned:{id:date},bestStreak}}
  // kept는 '한 번 얻은 것은 영구 유지' 저장분. 새 계산이 더 작아도 지우지 않는다.
  function evaluate(state) {
    const ev = state.events || [], kept = state.kept || {}, sum = summarize(ev);
    const awards = Object.fromEntries((state.awards || []).map((a) => [a.badge, a]));
    const badges = CATALOG.map((def) => {
      let date = null, progress = null;
      if (def.kind === 'auto') {
        date = earnDate(def, ev);
        progress = { have: Math.min(sum[def.rule.metric], def.rule.gte), need: def.rule.gte, unit: /Streak$/.test(def.rule.metric) ? '주' : '회' };
      } else if (awards[def.id]) date = awards[def.id].date;
      if (!date && kept.earned && kept.earned[def.id]) date = kept.earned[def.id];
      return { ...def, earned: !!date, date, progress, award: awards[def.id] || null };
    });
    const t = titleFor(sum.lessons, kept.titleIndex);
    const earned = {};
    badges.forEach((b) => { if (b.earned) earned[b.id] = b.date; });
    const best = Math.max(kept.bestStreak || 0, sum.bestWeekStreak);
    return {
      summary: sum, title: t, badges, bestStreak: best,
      recent: badges.filter((b) => b.earned).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 3),
      nextBadge: badges.filter((b) => !b.earned && b.kind === 'auto')
        .sort((a, b) => b.progress.have / b.progress.need - a.progress.have / a.progress.need)[0] || null,
      nextKept: { titleIndex: t.index, earned, bestStreak: best },
    };
  }
  // 선생님 수여. clip이 없으면 빈 상태(녹음 없음). 있으면 start_s 숫자 필수. clip.sample=true면 화면에 '샘플' 표시.
  function awardBadge(state, badgeId, a) {
    const def = CATALOG.find((b) => b.id === badgeId);
    if (!def || def.kind !== 'teacher') throw new Error('선생님이 수여하는 배지가 아님');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date || '')) throw new Error('날짜 필요');
    if (a.clip && !(typeof a.clip.start_s === 'number' && a.clip.start_s >= 0)) throw new Error('시작 위치 필요');
    const rec = { badge: badgeId, date: a.date, comment: a.comment || '', clip: a.clip || null, evidence: a.evidence || '' };
    return { ...state, awards: [...(state.awards || []).filter((x) => x.badge !== badgeId), rec] };
  }
  // 재생은 한 번에 하나: 새로 시작하면 이전 것을 멈춘다.
  function createSinglePlayer() {
    let cur = null;
    return {
      play(id) { const stopped = cur && cur !== id ? cur : null; cur = id; return { playing: id, stopped }; },
      stop() { cur = null; },
      get current() { return cur; },
    };
  }
  const DEMO = {
    sample: true,
    events: [
      { type: 'lesson', date: '2026-09-07' }, { type: 'lesson', date: '2026-09-14' }, { type: 'lesson', date: '2026-09-21' },
      { type: 'lesson', date: '2026-09-28', makeup: true }, { type: 'lesson', date: '2026-10-05' },
      { type: 'mission', date: '2026-09-15' }, { type: 'mission', date: '2026-09-22' },
      { type: 'reflection', date: '2026-09-22' },
    ],
    awards: [{
      badge: 'high_note', date: '2026-10-05', comment: '후렴 높은 음을 편하게 넘겼어요. 이 순간을 기억해 두세요!',
      clip: { start_s: 83, label: '후렴 높은 음 (샘플)', sample: true }, evidence: '10/5 레슨 1:23 — 가상 예시',
    }],
    kept: {},
  };
  const api = { PROVISIONAL, TITLE_STEPS, CATEGORIES, CATALOG, summarize, titleFor, evaluate, awardBadge, createSinglePlayer, bestStreak, DEMO };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Badges = api;
})(typeof self !== 'undefined' ? self : this);
