const fs = require('fs'), assert = require('assert');
const html = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const body = html.match(/<script>([\s\S]*?)<\/script>/);
assert(body);
new Function(body[1]); // 전체 스크립트 문법 검증
assert(html.includes('id="bestMakeup"'), '베스트 메이크업 버튼 누락');
assert(html.includes('function makeupFromBest('), '베스트 메이크업 요청 누락');
assert(html.includes('source_is_clip: true, start: null, end: null'), '베스트 음원 직접 처리 설정 누락');
assert(html.includes('id="btnSpeakerEdit"'), '수동 화자 수정 버튼 누락');
const extract = (a, b) => html.slice(html.indexOf(a), html.indexOf(b, html.indexOf(a)));
const speaker = extract('function speakerIssues(ai) {', '\nfunction renderSpkState(ai)');
const identify = (cur) => new Function('cur',speaker+'\nreturn speakerIssues;')(cur);
const withSpeakers = (people, roles) => ({ summary:{ speakers_talk_sec:people },segs:[], review:{speakers:roles}, spkSaved:false, voice:null });
assert.deepStrictEqual(identify(withSpeakers({A:300,B:200,C:10},{A:'teacher',B:'student',C:'unknown'}))({}), [],
 '학습 완료 1:1 화자에는 확인 요구 없음');
assert(identify(withSpeakers({A:300,B:200,C:70},{A:'teacher',B:'student'}))({}).length,
 '확인 필요한 주요 제3화자는 경고 유지');
assert(identify(withSpeakers({A:300,B:200},{A:'student',B:'student'}))({}).length,
 '강사 화자가 불명인 상황은 경고 유지');
const makeup = extract('function bestMakeupJob(o) {', '\nasync function makeupFromBest');
const job = {req:{lesson_folder:'lesson1',source_id:'file1',best_file_id:'file1',status:'done'}};
const m = new Function('cur',makeup+'\nreturn {bestMakeupLabel,bestMakeupJob};')({
  folder:{id:'lesson1'}, st:{_jobs:[job]}
});
assert.strictEqual(m.bestMakeupLabel({file_id:'file1'}),'메이크업 듣기');
assert.strictEqual(m.bestMakeupLabel({file_id:'file2'}),'메이크업');
console.log('best-makeup-speakers test ok');
