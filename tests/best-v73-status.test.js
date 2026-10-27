// v7.3-live 결과·기존 MP3 메타데이터가 교사 화면 표시와 재생 선택(눌림)에 그대로 맞는지 (실제 renderBest/bestOptions/bestPicked 실행)
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const grab = n => src.match(new RegExp('function ' + n + '[\\s\\S]*?\\n}\\n'))[0];
const code = ['bestOptions', 'bestPicked', 'renderBest'].map(grab).join('\n');
const esc = x => String(x).replaceAll('<', '&lt;');
function run(composite, pick = 0, pickId) {
  const best = { status: 'ok', best: { file_id: 'b1', len: 30, kind_ko: '후보1' }, alternatives: [{ file_id: 'b2', len: 28, kind_ko: '후보2' }], composite };
  const cur = { best, review: pickId === undefined ? { bestPick: pick } : { bestPick: pick, bestPickId: pickId }, st: {}, folder: {} };
  const f = new Function('cur', 'esc', 'fmt', 'tpHTML', 'bestMakeupLabel',
    code + '; return {html: renderBest(), picked: bestPicked(), opts: bestOptions()};');
  return f(cur, esc, String, () => '', () => '메이크업');
}
const v73 = (o = {}) => ({ status: 'ok', file_id: 'c1', len: 40, kind_ko: '베스트 편집본', method: 'v7.3-live', mr_aligned: true, rhythm_verified: false, needs_listen: true, ...o });

// 1) v7.3 이음새 있음: 3번째 항목, 고르면 눌림 표시, 확신 못 한 구절 수·청감 안내, 검증됨처럼 보이지 않음
let r = run(v73({ takes_used: 2, seams: [{ ref_t: 1 }, { ref_t: 2 }], kept_ref_no_mr: 1 }), 2, 'c1');
assert.strictEqual(r.opts.length, 3); assert.strictEqual(r.picked.file_id, 'c1');
assert(/aria-pressed="true" data-k="2"/.test(r.html));
assert(r.html.includes('원래 소리·박자 그대로') && r.html.includes('2구절'));
assert(r.html.includes('확신 못 한 1구절은 기준 테이크 그대로') && r.html.includes('꼭 들어보고'), r.html);
assert(!r.html.includes('자동 검사 통과') && !r.html.includes('박자 검증됨') && !r.html.includes('기준 테이크 박자 그대로'));
// 2) 전부 거절(fail-closed): 단일 테이크로 표시하고 이유 안내
r = run(v73({ takes_used: 1, seams: [], kept_ref_no_mr: 4 }), 2, 'c1');
assert(r.html.includes('사실상 단일 테이크') && r.html.includes('박자·이음새를 확신할 수 없어') && r.html.includes('4구절') && r.html.includes('이어 붙인 곳 없음'), r.html);
// 3) 기존 MP3(방식 정보 없음/옛 방식)는 새 결과처럼 보이면 안 됨
for (const old of [{}, { method: 'v5-mrabs', rhythm_verified: false }, { method: 'v7.3-live', mr_aligned: false }]) {
  r = run({ status: 'ok', file_id: 'c0', len: 40, kind_ko: '베스트 편집본', takes_used: 3, seams: [{}], ...old }, 2, 'c0');
  assert(r.html.includes('새 MR 정렬 결과로 확인되지 않았어요'), JSON.stringify(old));
  assert(!r.html.includes('직접 반주용'));
}
// 4) 편집본 없음: 후보1 안내
r = run({ status: 'none', fallback: 'best_take' }, 2, 'c1');
assert.strictEqual(r.picked.file_id, 'b1'); assert(r.html.includes('전에 고르신 베스트 편집본이 지금 없어'));
// 5) 후보를 직접 고르면 편집본 문구 안 섞임
r = run(v73({ takes_used: 2, seams: [{}] }), 1, 'b2');
assert.strictEqual(r.picked.file_id, 'b2'); assert(!r.html.includes('직접 반주용'));
// 6) 미선택(bestPick 없음): 어떤 버튼도 ✓·눌림 아님, 후보 1 재생, 선택 안내
r = run(v73({ takes_used: 2, seams: [{}] }), null);
assert.strictEqual(r.picked.file_id, 'b1'); assert(!r.html.includes('aria-pressed="true"') && !r.html.includes('✓ '));
assert(r.html.includes('아직 고르지 않았어요'));
// 6b) 번호만 있고 파일 ID 없는 옛 저장값도 선택으로 보지 않음
r = run(v73({ takes_used: 2, seams: [{}] }), 2);
assert.strictEqual(r.picked.file_id, 'b1'); assert(!r.html.includes('aria-pressed="true"'));
// 7) 선택 뒤 편집본 파일 ID가 바뀜(재생성): 선택 해제 + 새로 만들어졌다는 안내
r = run(v73({ takes_used: 2, seams: [{}], file_id: 'c2' }), 2, 'c1');
assert.strictEqual(r.picked.file_id, 'b1'); assert(!r.html.includes('aria-pressed="true"'));
assert(r.html.includes('고르신 뒤 편집본이 새로 만들어졌어요'));
// 8) seams=0 이지만 takes_used 복수: composition 으로 구분 — '한 테이크 그대로'로 단정 금지
r = run(v73({ takes_used: 3, seams: [], composition: 'sections_only', sections_joined: 3, ref_takes: [1, 2, 3] }), 2, 'c1');
assert(r.html.includes('aria-pressed="true" data-k="2"'));
assert(r.html.includes('서로 다른 기준 섹션 3개') && r.html.includes('구절 교체 없음') && r.html.includes('꼭 들어보고') && r.html.includes('청감 미검증'), r.html);
assert(!r.html.includes('한 테이크 그대로') && !r.html.includes('사실상 단일 테이크') && !r.html.includes('0곳') && !r.html.includes('0구절'), r.html);
// 8b) 구형 메타(composition 없음) + takes 복수 + seams 0 → 모른다고 표시(단일 테이크/섹션 연결 단정 금지)
r = run(v73({ takes_used: 3, seams: [], kept_ref_no_mr: 2 }), 2, 'c1');
assert(r.html.includes('구성 정보가 없는 편집본') && r.html.includes('구성 정보 없음'), r.html);
assert(!r.html.includes('한 테이크 그대로') && !r.html.includes('사실상 단일 테이크') && !r.html.includes('서로 다른 기준 섹션'), r.html);
// 8c) composition=single_take 명시 / 옛 메타라도 takes=1,seams=0 이면 단일 테이크
for (const o of [{ composition: 'single_take', takes_used: 1, seams: [] }, { takes_used: 1, seams: [] }]) {
  r = run(v73(o), 2, 'c1');
  assert(r.html.includes('사실상 단일 테이크') && r.html.includes('한 테이크 그대로'), JSON.stringify(o));
}
// 8d) composition=phrase_swap: 구절 교체 안내, 단일/섹션 문구 아님
r = run(v73({ takes_used: 2, seams: [{}, {}], composition: 'phrase_swap' }), 2, 'c1');
assert(r.html.includes('2구절') && !r.html.includes('한 테이크 그대로') && !r.html.includes('서로 다른 기준 섹션'), r.html);
console.log('best-v73-status ok');
