// v7.2-live 결과·기존 MP3 메타데이터가 교사 화면 표시와 재생 선택(눌림)에 그대로 맞는지 (실제 renderBest/bestOptions/bestPicked 실행)
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = n => src.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0];
const code = ['bestOptions', 'bestPicked', 'renderBest'].map(grab).join('\n');
const esc = x => String(x).replaceAll('<', '&lt;');
function run(composite, pick = 0, extra = {}) {
  const best = { status: 'ok', best: { file_id: 'b1', len: 30, kind_ko: '후보1' }, alternatives: [{ file_id: 'b2', len: 28, kind_ko: '후보2' }], composite, ...extra };
  const cur = { best, review: { bestPick: pick }, st: {}, folder: {} };
  const f = new Function('cur', 'esc', 'fmt', 'tpHTML', 'bestMakeupLabel',
    code + '; return {html: renderBest(), picked: bestPicked(), opts: bestOptions()};');
  return f(cur, esc, String, () => '', () => '메이크업');
}
const v72 = (o = {}) => ({ status: 'ok', file_id: 'c1', len: 40, kind_ko: '베스트 편집본', method: 'v7.2-live', mr_aligned: true, rhythm_verified: false, needs_listen: true, ...o });

// 1) 새 v7.2 결과(이음새 있음): 편집본이 3번째 항목, 고르면 그 항목으로 재생·눌림 표시
let r = run(v72({ takes_used: 2, seams: [{ ref_t: 1 }, { ref_t: 2 }], kept_ref_no_mr: 1 }), 2);
assert.strictEqual(r.opts.length, 3); assert.strictEqual(r.picked.file_id, 'c1');
assert(r.html.includes('data-k="2"') && /aria-pressed="true" data-k="2"/.test(r.html));
assert(r.html.includes('원래 소리·박자 그대로') && r.html.includes('2구절'));
assert(r.html.includes('확신 못 한 1구절은 기준 테이크 그대로') && r.html.includes('꼭 들어보고'), r.html);
assert(r.html.includes('기준 테이크 반주 기준(바꾼 구절만 반주 길이 조정)') && !r.html.includes('기준 테이크 박자 그대로'));
assert(!r.html.includes('자동 검사 통과') && !r.html.includes('박자 검증됨'));          // rhythm_verified=false 를 검증됨처럼 보이지 않게

// 2) v7.2 인데 전부 거절(fail-closed): '단일 테이크'로 표시하고 이유(박자·이음새)를 알림
r = run(v72({ takes_used: 1, seams: [], kept_ref_no_mr: 4 }), 2);
assert(r.html.includes('바꾼 곳이 없어요') && r.html.includes('사실상 단일 테이크') && r.html.includes('박자·이음새를 확신할 수 없어') && r.html.includes('4구절'), r.html);
assert(r.html.includes('이어 붙인 곳 없음'));

// 3) 기존 MP3(방식 정보 없음/옛 방식)는 새 v7.2 결과처럼 보이면 안 되고 자동으로 바뀌지도 않음
for (const old of [{}, { method: 'v5-mrabs', rhythm_verified: false }, { method: 'v4-rhythm', rhythm_verified: true }, { method: 'v7.2-live', mr_aligned: false }]) {
  r = run({ status: 'ok', file_id: 'c0', len: 40, kind_ko: '베스트 편집본', takes_used: 3, seams: [{}], ...old }, 2);
  assert(r.html.includes('새 MR 정렬 결과로 확인되지 않았어요'), JSON.stringify(old));
  assert(!r.html.includes('직접 반주용'));
}

// 4) 편집본이 없을 때(생성 보류/실패) 고른 번호 2가 사라져도 후보1로 안내, 다른 후보로 조용히 바뀌지 않음
r = run({ status: 'none', fallback: 'best_take' }, 2);
assert.strictEqual(r.picked.file_id, 'b1'); assert(r.html.includes('편집본 생성 보류'));
assert(r.html.includes('전에 고르신 베스트 편집본이 지금 없어'));
// 5) 후보를 직접 고르면 편집본 문구가 섞이지 않음
r = run(v72({ takes_used: 2, seams: [{}] }), 1);
assert.strictEqual(r.picked.file_id, 'b2'); assert(!r.html.includes('직접 반주용'));
console.log('best-v72-status ok');
