// #147: 수강생 미리보기 글칸 — 접힘 5줄 ↔ 터치 12줄(250ms), 저장 시 접힘·내용 유지, 되돌리기, 긴 글, 동작 줄이기, 전체 화면(읽기 전용)
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = name => src.match(new RegExp('(?:async )?function '+name+'\\([^]*?\\n}\\n'))[0];
const consts = ['PV_ROWS','pvH','SV_MAX_CLIPS','svMd','svList','svPlayer','svSidOk','svMakeupOk'].map(n => src.match(new RegExp('const ' + n + '[^\\n]*\\n'))[0]).join('');
const code = consts + ['pvSetOpen','openStudentView','closeStudentView','studentViewHTML','svLessonHtml','updateFeedbackDraft','feedbackPreviewHTML','wireFeedbackPreview'].map(grab).join('\n');
const esc = x => String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
function mk(saveOk = true) {
  const mkEl = () => ({ value:'', textContent:'', disabled:false, checked:false, style:{}, dataset:{}, attrs:{}, setAttribute(k,v){ this.attrs[k]=v; } });
  const els = {};
  for (const id of ['fb','chkOk','btnSched','btnNow','previewSaveMsg','previewFeedback','btnPreviewSave','btnPreviewCancel','btnPreviewToggle','btnPreviewFull']) els[id] = mkEl();
  let overlay = null; const keys = [];
  const document = {
    getElementById: id => id === 'pvFull' ? overlay : els[id],
    createElement: () => { const d = { _h: '', set innerHTML(h){ d._h = h; }, get innerHTML(){ return d._h; }, querySelector: () => ({ focus(){} }), remove(){ overlay = null; } }; return d; },
    body: { appendChild: d => { overlay = d; } },
    addEventListener: (_, fn) => keys.push(fn),
    removeEventListener: (_, fn) => { const i = keys.indexOf(fn); if (i >= 0) keys.splice(i, 1); },
  };
  const cur = { review: { feedback: '저장된 글', practice: ['음정 연습'] }, sched: { busy: false, pick: {} } };
  els.fb.value = cur.review.feedback; let paints = 0, saves = 0;
  const buildNote = () => ({ date: '2026-10-28', feedback: els.fb.value, practice: ['음정'], no_mission: false, best: null, clips: [] });
  const f = new Function('$','cur','paintDeliver','saveReview','esc','missionState','document','buildNote',
    code + ';return {pvSetOpen,wireFeedbackPreview,feedbackPreviewHTML,studentViewHTML,svLessonHtml,openStudentView,closeStudentView,updateFeedbackDraft};')(
    id => els[id], cur, () => { paints++; }, async () => { saves++; return saveOk; }, esc, () => 'set', document, buildNote);
  return { els, cur, f, keys, get overlay(){ return overlay; }, get paints(){ return paints; }, get saves(){ return saves; } };
}
(async () => {
  // 1) 기본 5줄(높이 138px = 5×24+18), 펼침 12줄(306px). 접근성 속성
  const h0 = mk().f.feedbackPreviewHTML({ feedback: '안녕', practice: ['a'] }, {}, '');
  assert(h0.includes('rows="5"') && h0.includes('height:138px') && h0.includes('aria-expanded="false"') && h0.includes('펼치기 (12줄)'));
  const h1 = mk().f.feedbackPreviewHTML({ feedback: '안녕', practice: ['a'] }, {}, '', true);
  assert(h1.includes('rows="12"') && h1.includes('height:306px') && h1.includes('aria-expanded="true"'));
  assert(h0.includes('전체 화면 보기') && h0.includes('btnPreviewCancel') && h0.includes('btnPreviewSave'));
  // 2) 터치(포커스/포인터) → 12줄, 입력해도 DOM 교체 없음(커서·한글 조합 보호), 값 그대로
  const e = mk(); e.f.wireFeedbackPreview(e.cur); const fld = e.els.previewFeedback;
  fld.onpointerdown(); assert.equal(fld.style.height, '306px'); assert.equal(fld.dataset.open, '1'); assert.equal(e.cur.sched.pvBase, '저장된 글');
  fld.value = '고친 글\n둘째 줄'; fld.oninput(); assert.equal(e.paints, 0); assert.equal(fld.value, '고친 글\n둘째 줄'); assert.equal(fld.style.height, '306px');
  fld.onfocus(); assert.equal(e.cur.sched.pvBase, '저장된 글', '재포커스해도 되돌릴 기준 글은 그대로');
  // 3) 저장 성공 → 접힘 상태로 다시 그림, 고친 글 유지, 기준 초기화
  await e.els.btnPreviewSave.onclick();
  assert.equal(e.saves, 1); assert.equal(e.cur.sched.pvExpanded, false); assert.equal(e.cur.sched.pvBase, undefined); assert.equal(e.cur.review.feedback, '고친 글\n둘째 줄');
  assert.equal(e.paints, 1); assert(e.els.previewSaveMsg.textContent.includes('저장했어요'));
  // 4) 저장 실패 → 펼친 채 유지(수정 내용 보존)
  const bad = mk(false); bad.f.wireFeedbackPreview(bad.cur); bad.els.previewFeedback.onfocus(); bad.els.previewFeedback.value = '못 저장'; bad.els.previewFeedback.oninput();
  await bad.els.btnPreviewSave.onclick(); assert.equal(bad.cur.sched.pvExpanded, true); assert.equal(bad.cur.review.feedback, '못 저장'); assert(bad.els.previewSaveMsg.textContent.includes('저장하지 못했어요'));
  // 5) 되돌리기: 저장 안 한 고침 취소 → 펼치기 전 글, 5줄
  const c = mk(); c.f.wireFeedbackPreview(c.cur); c.els.previewFeedback.onfocus(); c.els.previewFeedback.value = '버릴 글'; c.els.previewFeedback.oninput();
  c.els.btnPreviewCancel.onclick();
  assert.equal(c.els.previewFeedback.value, '저장된 글'); assert.equal(c.cur.review.feedback, '저장된 글'); assert.equal(c.els.previewFeedback.style.height, '138px'); assert.equal(c.cur.sched.pvBase, undefined);
  assert.equal(c.saves, 0, '되돌리기는 저장/게시하지 않음');
  // 6) 접기/펼치기 버튼(터치 못 쓰는 경우)
  const t = mk(); t.f.wireFeedbackPreview(t.cur);
  t.els.btnPreviewToggle.onclick(); assert.equal(t.els.previewFeedback.style.height, '306px');
  t.els.btnPreviewToggle.onclick(); assert.equal(t.els.previewFeedback.style.height, '138px');
  assert.equal(t.els.btnPreviewToggle.attrs['aria-expanded'], 'false');
  // 7) 긴 글: 값은 자르지 않고(저장 내용 보존) 12줄 높이 한도 안에서 스크롤 — CSS overflow-y:auto
  const long = Array.from({ length: 200 }, (_, i) => '줄 ' + i).join('\n');
  const L = mk(); L.f.wireFeedbackPreview(L.cur); L.els.previewFeedback.onfocus(); L.els.previewFeedback.value = long; L.els.previewFeedback.oninput();
  assert.equal(L.cur.review.feedback, long); assert.equal(L.els.previewFeedback.style.height, '306px');
  assert(L.f.feedbackPreviewHTML({ feedback: long, practice: [] }, {}, '').includes('줄 199'));
  assert(L.f.feedbackPreviewHTML({ feedback: '</textarea><script>x()</script>', practice: [] }, {}, '').includes('&lt;/textarea&gt;'));
  // 8) CSS: 250ms 전환, 동작 줄이기 시 전환 없음, 줄높이/패딩이 JS 높이식과 일치
  const css = src.match(/#previewFeedback \{[^}]*\}/)[0];
  assert(/transition:\s*height 250ms/.test(css) && /overflow-y:\s*auto/.test(css) && /line-height:\s*24px/.test(css) && /padding:\s*8px/.test(css) && /box-sizing:\s*border-box/.test(css) && /border-width:\s*1px/.test(css));
  assert(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*#previewFeedback\s*\{\s*transition:\s*none/.test(src));
  assert.equal(5 * 24 + 8 * 2 + 2, 138);
  // 9) 전체 화면 보기: 읽기 전용(입력칸·오디오 없음), 글 이스케이프
  const v = e.f.studentViewHTML({ date: '2026-10-28', feedback: '<img src=x onerror=1>좋아요', practice: ['음정'], no_mission: false, best: null, clips: [] });
  assert(!/<textarea|<input|contenteditable|<audio|<button class="play"|data-au|drive\.google/i.test(v) && !v.includes('<img') && v.includes('읽기 전용') && v.includes('다음 미션') && !v.includes('오늘 부른'));
  // 9-a) 학생 화면 일치: student/index.html의 lessonHtml을 꺼내 같은 가짜 노트로 돌려 출력이 같아야 함(재생 버튼만 같은 자리표시로 바꿔 비교)
  const ssrc = fs.readFileSync(__dirname + '/../student/index.html', 'utf8');
  const sGrab = n => ssrc.match(new RegExp('function ' + n + '\\([^]*?\\n}\\n'))[0];
  const sMd = ssrc.match(/const md = [^\n]*\n/)[0], sList = ssrc.match(/const listHtml = [^\n]*\n/)[0], sMax = ssrc.match(/const MAX_CLIPS[^\n]*\n/)[0];
  const stuLesson = new Function('esc', 'player', sMd + sList + sMax + ssrc.match(/const sidOk = [^\n]*\n/)[0] + ssrc.match(/const makeupOk = [^\n]*\n/)[0] + sGrab('lessonHtml').replace('<button class="ghost" id="back">← 전체 노트</button>', '') + ';return lessonHtml;')(
    esc, (id, label) => `<div class="play" aria-disabled="true">▶ ${esc(label)} <span class="muted">(미리보기라 재생 안 해요)</span></div>`);
  const norm = h => h.replace(/\s+/g, ' ').trim();
  const base = { date: '2026-10-28', feedback: '잘했어요\n둘째 줄 <b>', points: ['호흡', '', '음정'], practice: ['음정 한 가지', '호흡 둘째'], no_mission: false, highlight: '후렴 호흡이 좋았어요', extra_best: [] };
  const A = n => ({ file_id: 'f' + n, label: n + '구간', note: n + '번 메모' });
  const cases = {
    '선택 0(기본 미선택)': { ...base, best: null, clips: [] },
    '선택 1(클립)': { ...base, best: null, clips: [A(1)] },
    '선택 다수(5개→3개만)': { ...base, best: null, clips: [1, 2, 3, 4, 5].map(A) },
    '베스트 포함(편집본)': { ...base, best: { file_id: 'b1', kind_ko: '편집본', len: 42, edited: true }, clips: [A(1)] },
    '베스트 포함(원본)': { ...base, best: { file_id: 'b2', kind_ko: '원본', len: 30, edited: false }, clips: [] },
    '베스트 제외(클립만)': { ...base, best: null, clips: [A(1), A(2)] },
    '메이크업 포함': { ...base, best: { file_id: 'b1', kind_ko: '편집본', len: 42, edited: true }, makeup: { file_id: 'm1', source_file_id: 'b1', len: 40 }, clips: [] },
    '메이크업 원본 불일치(숨김)': { ...base, best: { file_id: 'b1', kind_ko: '편집본', len: 42, edited: true }, makeup: { file_id: 'm1', source_file_id: 'zz', len: 40 }, clips: [] },
    '미션 없음': { ...base, practice: [], no_mission: true, best: null, clips: [] },
    '글 없음': { ...base, feedback: '', highlight: '', points: [], practice: [], best: null, clips: [] },
  };
  cases['추천곡·응원·메이크업 문구'] = { ...base, best: { file_id: 'b1', kind_ko: '편집본', len: 42, edited: true }, makeup: { file_id: 'm1', source_file_id: 'b1', len: 40, msg: '보정 <b>버전' }, cheer: '힘내요 😊', song: { title: '가짜 곡', artist: '홍길동', why: '톤' }, clips: [A(1)] };
  for (const mode of ['simple', 'normal', 'detail'])
    for (const [name, note] of Object.entries(cases)) {
      const body = e.f.studentViewHTML(note, mode).match(/<div id="pvFullBody">([^]*)<\/div><\/div>\s*$/)[1];
      assert.equal(norm(body), norm(stuLesson(note, null, mode)), '학생 화면과 다름: ' + mode + ' ' + name);
    }
  // 9-b) 공개 금지: 고르지 않은 오디오는 화면에 없다(노트에 없는 파일·다른 버전·베스트)
  const none = e.f.studentViewHTML(cases['선택 0(기본 미선택)']);
  assert(!none.includes('오늘의 클립') && !none.includes('오늘 부른') && !none.includes('여러 번 부른') && !none.includes('다른 버전'));
  const one = e.f.studentViewHTML(cases['선택 1(클립)']);
  assert(one.includes('1구간') && !one.includes('2구간'));
  assert.equal(e.f.studentViewHTML(cases['선택 다수(5개→3개만)']).split('class="clip"').length - 1, 3, '수강생처럼 클립은 최대 3개');
  assert(src.includes('extra_best: []'), 'buildNote는 안 고른 편집본을 싣지 않음');
  e.els.btnPreviewFull.onclick(); assert(e.overlay && e.overlay.innerHTML.includes('수강생에게 이렇게 보여요') && e.overlay.innerHTML.includes('고친 글'));
  assert.equal(e.keys.length, 1); e.keys[0]({ key: 'Escape' }); assert.equal(e.overlay, null); assert.equal(e.keys.length, 0);
  assert.equal(e.saves, 1, '전체 화면 보기는 저장·게시·공개 호출을 하지 않음');
  const fn = grab('openStudentView') + grab('studentViewHTML') + grab('svLessonHtml');
  assert(!/writeJSON|portal\(|openLink|publishNote|saveReview|api\(/.test(fn), '전체 화면 보기 코드에 쓰기/공개 호출 없음');
  assert(grab('openStudentView').includes('buildNote()'), '실제 수강생 노트 생성 경로(buildNote)와 같은 데이터를 사용');
  console.log('preview-5to12 ok (5↔12줄·250ms·reduced-motion·저장/되돌리기·긴 글·전체화면 읽기 전용)');
})().catch(err => { console.error(err); process.exit(1); });
