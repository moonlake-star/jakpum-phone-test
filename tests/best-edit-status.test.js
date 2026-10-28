// 실제 렌더 함수를 실행: 파일 방식·합성 검사·청감 검증을 구분한다.
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const fn = src.match(/function renderBest[\s\S]*?\n}\n/)[0];
function render(comp, composite = true) {
  const o = composite ? {...comp, isComposite: true} : {file_id: 'take', len: 10};
  const cur = {best: {status: 'ok', composite: comp}, review: {}};
  return new Function('cur','bestOptions','esc','fmt','tpHTML','makeupBoxHTML','inclHTML', fn + '; return renderBest();')(
    cur, () => composite ? [o] : [], x => String(x).replaceAll('<', '&lt;'), String, () => '', () => '', () => '');
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
// v6 계열: 다른 테이크를 하나도 못 가져왔으면 '11개 이어 붙임'처럼 보이지 않게(2026-10-27 사용자 지적)
h = render({method:'v6.1-reftime', mr_aligned:true, takes_used:1, seams:[], kept_ref_no_mr:2, lines:new Array(11)});
assert(h.includes('바꾼 곳이 없어요') && h.includes('사실상 단일 테이크') && h.includes('2구절') && !h.includes('11개'), h);
h = render({method:'v6.1-reftime', mr_aligned:true, takes_used:2, seams:[{ref_t:1},{ref_t:2}], lines:new Array(11)});
assert(h.includes('가져온 곳 2곳') && h.includes('테이크 2개') && !h.includes('11개'));
h = render({method:'v7-live', mr_aligned:true, takes_used:2, seams:[{ref_t:1},{ref_t:2},{ref_t:3}]});
assert(h.includes('직접 반주용') && h.includes('3구절') && h.includes('원래 목소리가 작게'));
h = render({method:'v7-live', mr_aligned:true, takes_used:1, seams:[], kept_ref_no_mr:2});
assert(h.includes('바꾼 곳이 없어요') && h.includes('템포·키'));
h = render({method:'v7.2-live', mr_aligned:true, takes_used:2, seams:[{ref_t:1}]});
assert(h.includes('원래 소리·박자 그대로') && h.includes('반주를 살짝'));
assert(h.includes('반주를 살짝 맞췄어요') && h.includes('원래 목소리가 작게'), h);   // 2026-10-28 화면 정리: 반주 템포를 바꾼다는 사실은 짧게 유지
assert(!h.includes('기준 테이크 박자 그대로'), 'v7.2는 반주 템포를 변경하므로 기존 안내는 잘못됨');
const today = src.match(/function renderToday[\s\S]*?\n}\n/)[0];
assert(today.indexOf('${head}') < today.indexOf('renderBest()'));
assert(today.indexOf('이번 주 연습') < today.indexOf('renderBest()'));
// #76 sections_only: 구절 교체 0이어도 여러 섹션을 이었으면 '한 테이크 그대로'라고 하지 않는다
{
  const base = {method:'v7.5-live', mr_aligned:true, takes_used:1, seams:[], len:20};
  const view = (o) => new Function('cur','bestOptions','esc','fmt','tpHTML','makeupBoxHTML','inclHTML', fn + '; return renderBest();')(
    {best:{status:'ok', composite:o}, review:{}}, () => [{...o, isComposite:true}], String, String, () => '', () => '', () => '');
  let h = view({...base, composition:'sections_only', sections_joined:2});
  assert(!h.includes('한 테이크 그대로'), h);
  assert(!h.includes('사실상 단일 테이크'), h);
  assert(h.includes('여러 섹션') && h.includes('청감 확인 필요'), h);
  h = view({...base, sections_joined:3});   // composition 없이 sections_joined만
  assert(!h.includes('한 테이크 그대로'), h);
  h = view({...base, composition:'single_take', sections_joined:1});
  assert(h.includes('이어 붙인 자리 없음(한 테이크 그대로)'), h);
  h = view({...base});   // 과거 메타 없음 → 단정 금지
  assert(!h.includes('이어 붙인 자리 없음(한 테이크 그대로)') && h.includes('확인하지 못했어요'), h);
}
console.log('best-edit-status ok (legacy/unknown/current/fallback/error + core first + sections_only)');
