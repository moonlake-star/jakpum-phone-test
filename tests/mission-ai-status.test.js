// 과제 AI 분석 상태/초안 미리보기(#74 앱 1단계): 서버 결과 없이는 ‘분석 완료’ 표시 금지(fail-closed). 합성 데이터만.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#ms-begin\n([\s\S]*?)\/\/#ms-end/)[1];
const M = new Function(code + "return {MS_CAPS,msValid,msStatus,msMission,msDraftUse,msOnSent,msMock};")();
const sid = "s1", rec = { id: "f1" };
const good = () => ({ id: "f1", ai: { source: "server", status: "done", mission_approved: true, submission_id: "s1:f1", student_id: "s1", source_file_id: "f1", lesson_id: "L1", mission_id: "m1", mission_text: "후렴 호흡", draft: "잘했어요", evidence: [{ point: "호흡", measured: true }], warnings: [] } });

// 서버 연결 전: 기록이 없으면 항상 ‘준비 안 됨’, 분석 완료 불가
assert.equal(M.msStatus(rec, sid).key, "off");
assert.equal(M.msStatus(rec, sid, { ai: true }).key, "ready");
assert.equal(M.msStatus({ id: "f1", ai: M.msMock() }, sid).key, "invalid");   // 예시/mock 은 완료로 인정 안 됨
assert.equal(M.msValid({ id: "f1", ai: M.msMock() }, sid), false);
// 완료 인정은 서버 결과 + 학생·파일·미션·승인 모두 일치할 때만
assert.equal(M.msStatus(good(), sid).key, "done");
const muts = [a => a.source = "client", a => a.mission_approved = false, a => a.submission_id = "s2:f1", a => a.student_id = "s2", a => a.source_file_id = "f9",
  a => a.lesson_id = "", a => a.mission_id = "", a => a.draft = "  ", a => a.evidence = [], a => delete a.evidence];
muts.forEach((mut, i) => { const r = good(); mut(r.ai); assert.equal(M.msStatus(r, sid).key, "invalid", "mut" + i); assert.equal(M.msValid(r, sid), false); });
{ const r = good(); r.ai.evidence = []; r.ai.limited = true; assert.equal(M.msValid(r, sid), true); }   // 제한적 분석은 근거 0개 허용
for (const [st, key] of [["queued", "queued"], ["running", "running"], ["failed", "failed"], ["zzz", "invalid"]]) { const r = good(); r.ai.status = st; assert.equal(M.msStatus(r, sid).key, key); }
// 미션: 승인 확인 못 하면 unknown, 다른 수강생 결과는 거부
assert.equal(M.msMission(rec, sid).state, "unknown");
assert.equal(M.msMission(good(), sid).state, "approved"); assert.equal(M.msMission(good(), "s2").state, "unknown");
// 초안 넣기: 유효 결과만, 쓰던 글은 덮지 않음
assert.equal(M.msDraftUse(good(), sid, "").ok, true);
assert.equal(M.msDraftUse(good(), sid, "홍길동님, 녹음 잘 들었어요! ").ok, true);
assert.equal(M.msDraftUse(good(), sid, "내가 쓰던 답장").ok, false);
assert.equal(M.msDraftUse(rec, sid, "").ok, false);
// 보냄 기록: 유효 결과 없으면 아무것도 안 남김, 수정 여부 구분
assert.equal(M.msOnSent(rec, sid, "x"), null);
assert.equal(M.msOnSent(good(), sid, "잘했어요").edited, false);
assert.equal(M.msOnSent(good(), sid, "잘했어요 더 연습!").edited, true);
// 화면 연결 확인: 서버 연결 전 문구, 예시 라벨, 앱이 rec.ai 를 직접 만들지 않음
assert(src.includes("AI 분석 준비 안 됨(서버 연결 전)") && src.includes("실제 분석 아님"));
assert(!/rec\.ai\s*=[^=]/.test(src), "앱이 rec.ai 를 직접 만들면 안 됨");
console.log("mission-ai-status ok");
