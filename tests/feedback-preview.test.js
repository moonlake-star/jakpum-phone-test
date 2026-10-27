// 실제 UI 입력/저장 함수를 실행해 미리보기 → 검수.json → 글투 학습 계약을 확인한다.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = name => src.match(new RegExp('(?:async )?function '+name+'\\([^]*?\\n}\\n'))[0];
const functions = ['updateFeedbackDraft','feedbackPreviewHTML','wireFeedbackPreview','saveReview'].map(grab).join('\n');
function env(fail = false) {
  const els = {};
  for (const id of ['fb','ck','chkOk','btnSched','btnNow','previewSaveMsg','previewFeedback','btnPreviewSave','saveMsg'])
    els[id] = {value:'',textContent:'',disabled:false,checked:true};
  const cur = {review:{feedback:'AI 원문이에요 ^^',manual:[],approved_sig:'old'},ai:{feedback_text:'AI 원문이에요 ^^'},folder:{id:'lesson'},clips:[],sched:{pick:{okSig:'old'}}};
  els.fb.value = cur.review.feedback;
  let paints=0, writes=[], notices=[];
  const $ = id=>els[id], paintDeliver=()=>{paints++;}, writeJSON=async (folder,name,rv,id)=>{
    if(fail) throw Error('저장 실패');
    writes.push(JSON.parse(JSON.stringify(rv)));return 'review-id';
  };
  const esc=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const f = new Function('$','cur','paintDeliver','writeJSON','REVIEW','kick','toast','esc','missionState',functions+';return {updateFeedbackDraft,feedbackPreviewHTML,wireFeedbackPreview,saveReview};')($,cur,paintDeliver,writeJSON,'검수.json',()=>{throw Error('unexpected kick');},s=>notices.push(s),esc,()=> 'none');
  return {els,cur,f,writes,notices,get paints(){return paints;}};
}
(async()=>{
  const e=env();e.f.wireFeedbackPreview(e.cur);
  const initialField=e.els.previewFeedback;
  const final='오늘 아주 잘하셨어요~\n다음에도 편하게 불러봐요 :)';
  e.els.previewFeedback.value=final;e.els.previewFeedback.oninput();
  assert.equal(e.els.fb.value,final);assert.equal(e.cur.review.feedback,final);
  assert.equal(e.cur.sched.pick.okSig,null);assert.equal(e.els.chkOk.checked,false);
  assert(e.els.btnSched.disabled && e.els.btnNow.disabled);
  assert.equal(e.paints,0,'한글 입력 도중 미리보기 DOM을 교체하면 안 됨');
  assert.equal(e.els.previewFeedback,initialField);
  assert.equal(e.writes.length,0,'입력만으로 자동 저장/게시하지 않음');
  await e.els.btnPreviewSave.onclick();
  assert.equal(e.writes.length,1);
  const saved=e.writes[0];assert.equal(saved.feedback,final);assert.equal(saved.ai_feedback,'AI 원문이에요 ^^');
  assert(saved.reviewed_at);assert.equal(saved.edits.at(-1).text,final);
  assert(e.els.previewSaveMsg.textContent.includes('저장했어요'));
  // 같은 문구를 다시 저장해도 수정 이력이 늘지 않는다.
  await e.f.saveReview(true);assert.equal(e.writes[1].edits.length,1);
  // 기존 편집칸에서도 현재 초안과 미리보기/승인 상태가 동기화된다.
  e.f.updateFeedbackDraft('아래 편집칸에서 수정');assert.equal(e.cur.review.feedback,'아래 편집칸에서 수정');assert.equal(e.paints,2);
  const h=e.f.feedbackPreviewHTML({feedback:'</textarea><script>bad()</script>',practice:[]},{},' disabled');
  assert(h.includes('textarea id="previewFeedback"') && h.includes('aria-label='));
  assert(!h.includes('<script>') && h.includes('&lt;/textarea&gt;'));
  assert(h.includes('disabled'));
  // 저장 오류는 성공으로 표시되지 않으며 재시도할 초안은 유지된다.
  const bad=env(true);bad.f.wireFeedbackPreview(bad.cur);bad.els.previewFeedback.value=final;bad.els.previewFeedback.oninput();
  await bad.els.btnPreviewSave.onclick();assert.equal(bad.writes.length,0);assert.equal(bad.els.fb.value,final);
  assert(bad.els.previewSaveMsg.textContent.includes('저장하지 못했어요'));
  // 저장 중 다른 레슨으로 전환: 이전 레슨 저장은 끝나도 새 레슨 화면/상태를 건드리지 않는다.
  const sw=env();const old={review:{feedback:'다른 레슨'},sched:{pick:{}}};
  sw.f.wireFeedbackPreview(old); // 화면에 남은 이전 레슨 핸들러(cur !== old)
  sw.els.previewFeedback.value=final;sw.els.previewFeedback.oninput();
  assert.equal(sw.cur.review.feedback,'AI 원문이에요 ^^','다른 레슨 핸들러는 현재 레슨을 바꾸지 않음');
  await sw.els.btnPreviewSave.onclick();assert.equal(sw.writes.length,0,'다른 레슨 핸들러는 저장하지 않음');
  // 승인 무효화: 수정 후에는 승인 체크 해제 + 예약/즉시 공개 버튼 비활성
  const ap=env();ap.f.wireFeedbackPreview(ap.cur);ap.els.previewFeedback.value='수정';ap.els.previewFeedback.oninput();
  assert.equal(ap.els.chkOk.checked,false);assert(ap.els.btnSched.disabled&&ap.els.btnNow.disabled);
  // 원본 AI 이력 보존: 여러 번 고쳐 저장해도 ai_feedback 은 AI 원문 그대로
  ap.els.previewFeedback.value='두 번째 수정';ap.els.previewFeedback.oninput();await ap.els.btnPreviewSave.onclick();
  assert.equal(ap.writes.at(-1).ai_feedback,'AI 원문이에요 ^^');
  // 이미 저장한 빈 문구를 재열 때 AI 원문으로 되돌리지 않는다.
  assert(src.includes('if (!review.reviewed_at && !review.feedback && ai.feedback_text)'));
  assert(src.includes('review.reviewed_at ? (review.feedback ?? "")'));
  if(process.env.PREVIEW_REVIEW_FIXTURE) fs.writeFileSync(process.env.PREVIEW_REVIEW_FIXTURE,JSON.stringify(saved));
  console.log('feedback-preview ok (input/save/failure/approval/history/privacy contract)');
})().catch(e=>{console.error(e);process.exit(1);});
