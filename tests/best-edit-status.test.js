// 실제 렌더 함수를 실행: 파일 방식·합성 검사·청감 검증을 구분한다.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const fn = src.match(/function renderBest[\s\S]*?\n}\n/)[0];
function render(comp, composite = true) {
  const o = composite ? {...comp, isComposite: true} : {file_id: 'take', len: 10};
  const cur = {best: {composite: comp}, review: {}};
  return new Function('cur','bestOptions','bestPicked','esc','fmt','tpHTML','bestMakeupLabel', fn + '; return renderBest();')(
    cur, () => [o], () => o, x => String(x).replaceAll('<', '&lt;'), String, () => '', () => '메이크업');
}
for (const comp of [{}, {method:'v4-rhythm', rhythm_verified:true}, {method:'v5-mrabs', rhythm_verified:false}]) {
  assert(render(comp).includes('새 MR 정렬 결과로 확인되지 않았어요'));
}
let h = render({method:'v5-mrabs', rhythm_verified:true});
assert(h.includes('자동 검사 통과') && h.includes('실제 청감 확인 필요'));
h = render({status:'none', fallback:'best_take', why:'<unsafe>'}, false);
assert(h.includes('편집본 생성 보류') && h.includes('&lt;unsafe>') && !h.includes('<unsafe>'));
assert(render({status:'error', why:'오류'}, false).includes('편집본 생성 실패'));
assert(!render(undefined, false).includes('새 MR 정렬 방식'));
const today = src.match(/function renderToday[\s\S]*?\n}\n/)[0];
assert(today.indexOf('${head}') < today.indexOf('renderBest()'));
assert(today.indexOf('이번 주 연습') < today.indexOf('renderBest()'));
console.log('best-edit-status ok (legacy/unknown/current/fallback/error + core first)');
