// 카톡 개인화 후보 검토(#83 2단계): 읽기·검증·선택 저장·충돌·깨진 JSON·중복 승인·재업로드 후 재승인 (합성 데이터, 가짜 Drive)
// 재현: node tests/kakao-candidates.test.js
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#kc-begin\n([\s\S]*?)\/\/#kc-end/)[1];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const K = new Function("esc", code + "return {KC_NAME,kcValidate,kcApply,kcLoad,kcSave,kcStatusText,kcCardHtml};")(esc);

// 가짜 Drive: 폴더별 파일(name→{id,text}) / 호출 기록
function fakeDrive(files) {
  const d = { files, writes: [], n: 100 };
  d.list = async (folder) => Object.entries(d.files[folder] || {}).flatMap(([name, arr]) => arr.map(f => ({ id: f.id, name })));
  d.readJSON = async (id) => { for (const f of Object.values(d.files)) for (const arr of Object.values(f)) for (const x of arr) if (x.id === id) return JSON.parse(x.text); throw new Error("404"); };
  d.writeJSON = async (folder, name, obj, id) => {
    d.writes.push({ folder, name, id });
    if (d.failWrite) throw new Error("drive 500");
    const arr = (d.files[folder] ||= {})[name] ||= [];
    if (id) arr.find(x => x.id === id).text = JSON.stringify(obj); else arr.push({ id: "n" + d.n++, text: JSON.stringify(obj) });
    return id;
  };
  return d;
}
const doc = (sid, rev, cands) => ({ schema_version: 1, sid, student_name: "홍길동", revision: rev, candidates: cands, imports: {} });
const T = { id: "t_1", type: "teacher_style", status: "pending", n: 2, emoji_tokens: { "👍": 2 }, samples: [{ key: "k", text: "잘했어요 ○○님 👍", at: null }], applied: false };
const S1 = { id: "s_1", type: "student_reaction", status: "pending", kind: "direct_statement", category: "high_note", polarity: 1, confidence: "high", at: "2026-10-23T15:04:00+09:00", evidence: "고음이 편했어요", applied: false };
const S2 = { id: "s_2", type: "student_reaction", status: "pending", kind: "thanks", category: "specific_praise", polarity: 1, confidence: "low", at: null, evidence: "감사해요", applied: false };
const put = (d, folder, name, obj, id = "f" + Math.random().toString(36).slice(2, 6)) => ((d.files[folder] ||= {})[name] ||= []).push({ id, text: typeof obj === "string" ? obj : JSON.stringify(obj) });
const clone = (x) => JSON.parse(JSON.stringify(x));

(async () => {
  // ── 순수 검증 ──
  assert.equal(K.kcValidate(doc("s1", 1, [T, S1]), "s1"), null);
  assert(K.kcValidate(doc("s2", 1, []), "s1"), "다른 수강생 sid 거부");
  for (const bad of [null, [], "x", {}, { sid: "s1", revision: "1", candidates: [] }, { sid: "s1", revision: 1, candidates: {} }]) assert(K.kcValidate(bad, "s1"));
  assert(K.kcValidate(doc("s1", 1, [T, { ...S1, id: "t_1" }]), "s1"), "id 중복 거부");
  assert(K.kcValidate(doc("s1", 1, [{ ...T, status: "applied" }]), "s1"), "알 수 없는 status 거부");
  assert(K.kcValidate(doc("s1", 1, [{ ...T, type: "x" }]), "s1"), "알 수 없는 type 거부");
  assert(K.kcValidate(doc("s1", 1, [{ id: "", type: "teacher_style", status: "pending" }]), "s1"));

  // ── kcApply: status 외 필드 불변, revision+1, 같은 값이면 불변 ──
  const base = doc("s1", 3, [T, S1, S2]);
  let r = K.kcApply(base, { s_1: "approved", t_1: "excluded" });
  assert.equal(r.changed, 2); assert.equal(r.doc.revision, 4);
  assert.equal(base.revision, 3); assert.equal(base.candidates[1].status, "pending", "원본 불변");
  assert.deepEqual({ ...r.doc.candidates[1], status: "pending" }, S1, "status 외 필드 불변");
  r = K.kcApply(base, { s_1: "pending" }); assert.equal(r.changed, 0); assert.equal(r.doc.revision, 3, "변화 없으면 revision 유지(중복 승인 무해)");
  assert(K.kcApply(base, { nope: "approved" }).err); assert(K.kcApply(base, { s_1: "applied" }).err);
  assert(K.kcApply(base, { s_1: "approved", nope: "approved" }).err, "일부만 적용하지 않음");

  // ── 표시 문구: 완료 금지 ──
  const all = [["pending", false], ["approved", false], ["approved", true], ["excluded", false], ["excluded", true]].map(([status, applied]) => K.kcStatusText({ status, applied }));
  assert(all.every(t => !t.includes("완료")), "'완료' 표현 금지");
  assert(K.kcStatusText({ status: "approved", applied: false }).includes("반영 전"));
  assert(K.kcStatusText({ status: "approved", applied: true }).includes("반영한 기록"));
  let h = K.kcCardHtml(S1, undefined, "홍길동", esc);
  assert(h.includes("수강생 홍길동") && h.includes("신뢰도 <b>높음") && h.includes("고음이 편했어요") && h.includes("직접 한 말"));
  h = K.kcCardHtml(S2, "approved", "홍길동", esc); assert(h.includes("낮은 신호") && h.includes("선택 변경됨"));
  h = K.kcCardHtml(T, undefined, "홍길동", esc); assert(h.includes("선생님") && h.includes("가려진") && h.includes("○○님") && !h.includes("신뢰도"));
  h = K.kcCardHtml({ ...S1, evidence: '<img src=x onerror=alert(1)>"' }, undefined, "<b>", esc); assert(!h.includes("<img") && !h.includes("<b>홍"), "HTML 이스케이프");

  // ── kcLoad: 없음/깨짐/다른 학생/중복 파일 ──
  let d = fakeDrive({});
  assert.equal((await K.kcLoad(d, "F1", "s1")).state, "waiting", "후보 파일 없음 → 학습 대기");
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, "{깨진 json", "a1");
  let L = await K.kcLoad(d, "F1", "s1"); assert.equal(L.state, "error"); assert(L.msg.includes("깨져"));
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s2", 1, [T]), "a1");
  L = await K.kcLoad(d, "F1", "s1"); assert.equal(L.state, "error"); assert(L.msg.includes("다른 수강생"));
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 1, []), "a1"); put(d, "F1", K.KC_NAME, doc("s1", 1, []), "a2");
  L = await K.kcLoad(d, "F1", "s1"); assert.equal(L.state, "error"); assert(L.msg.includes("둘 이상"));
  d = fakeDrive({}); d.list = async () => { throw new Error("net"); };
  assert.equal((await K.kcLoad(d, "F1", "s1")).state, "error");

  // ── 정상 저장 + 학생 폴더 격리: 다른 폴더·프로필 파일은 읽기만도 안 함, 쓰기는 후보 파일 1곳 ──
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1, S2]), "c1"); put(d, "F2", K.KC_NAME, doc("s2", 7, [T]), "c2");
  put(d, "F1", "개인화.json", { student_id: "s1", events: [] }, "p1"); put(d, "DB", "강사개인화_t1.json", { teacher_id: "t1", events: [] }, "p2");
  const snap = (x) => JSON.stringify(x.files);
  L = await K.kcLoad(d, "F1", "s1"); assert.equal(L.state, "ok");
  const profBefore = [d.files.F1["개인화.json"][0].text, d.files.DB["강사개인화_t1.json"][0].text], otherBefore = d.files.F2[K.KC_NAME][0].text;
  let res = await K.kcSave(d, "F1", "s1", L, { s_1: "approved", s_2: "excluded" });
  assert.equal(res.kind, "saved"); assert.equal(res.changed, 2); assert.equal(res.fresh.doc.revision, 4);
  assert.deepEqual(d.writes, [{ folder: "F1", name: K.KC_NAME, id: "c1" }], "쓰기는 후보 파일 한 곳, 기존 파일 갱신(새 파일 아님)");
  assert.deepEqual([d.files.F1["개인화.json"][0].text, d.files.DB["강사개인화_t1.json"][0].text], profBefore, "프로필 불변");
  assert.equal(d.files.F2[K.KC_NAME][0].text, otherBefore, "다른 학생 폴더 불변");
  const saved = JSON.parse(d.files.F1[K.KC_NAME][0].text);
  assert.deepEqual(saved.candidates.map(c => c.status), ["pending", "approved", "excluded"]);
  assert.equal(saved.candidates.every(c => c.applied === false), true, "앱은 applied 를 바꾸지 않음");

  // ── 중복 승인(같은 선택 재저장) → noop, 쓰기 없음 ──
  d.writes.length = 0; L = res.fresh;
  res = await K.kcSave(d, "F1", "s1", L, { s_1: "approved", s_2: "excluded" });
  assert.equal(res.kind, "noop"); assert.equal(d.writes.length, 0);
  // 더블 클릭 유사: 같은 오래된 loaded 로 두 번 저장 → 두 번째는 conflict(이미 revision 이 올라감)
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1");
  L = await K.kcLoad(d, "F1", "s1");
  const [a, b] = [await K.kcSave(d, "F1", "s1", L, { s_1: "approved" }), await K.kcSave(d, "F1", "s1", L, { s_1: "approved" })];
  assert.equal(a.kind, "saved"); assert.equal(b.kind, "conflict"); assert.equal(JSON.parse(d.files.F1[K.KC_NAME][0].text).revision, 4, "revision 은 한 번만 증가");

  // ── 낙관적 충돌: 읽은 뒤 수집기가 새 후보 추가(revision 증가) → 저장 거부 + 최신본 반환 ──
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1");
  L = await K.kcLoad(d, "F1", "s1");
  d.files.F1[K.KC_NAME][0].text = JSON.stringify(doc("s1", 4, [T, S1, S2]));   // 새 업로드 후 수집기가 후보 추가
  d.writes.length = 0;
  res = await K.kcSave(d, "F1", "s1", L, { s_1: "approved" });
  assert.equal(res.kind, "conflict"); assert.equal(d.writes.length, 0, "충돌이면 쓰지 않음"); assert.equal(res.fresh.doc.candidates.length, 3);
  // 최신본으로 다시 선택하면 새 후보(S2)는 pending 이고 재승인 가능, 이전 승인은 유지
  res = await K.kcSave(d, "F1", "s1", res.fresh, { s_1: "approved", s_2: "approved" });
  assert.equal(res.kind, "saved"); assert.deepEqual(res.fresh.doc.candidates.map(c => c.status), ["pending", "approved", "approved"]); assert.equal(res.fresh.doc.revision, 5);
  // 같은 revision 이어도 내용이 바뀌었으면(다른 기기 저장 등) conflict
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1");
  d.files.F1[K.KC_NAME][0].text = JSON.stringify(doc("s1", 3, [T, { ...S1, status: "excluded" }]));
  assert.equal((await K.kcSave(d, "F1", "s1", L, { s_1: "approved" })).kind, "conflict");
  // 파일이 교체됨(다른 id) → conflict
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1");
  d.files.F1[K.KC_NAME][0].id = "c9"; assert.equal((await K.kcSave(d, "F1", "s1", L, { s_1: "approved" })).kind, "conflict");

  // ── 새 업로드 후 재승인: 제외했던 후보는 그대로 제외, 이미 반영(applied)된 승인 후보도 유지, 새 후보는 pending ──
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 6, [T, { ...S1, status: "approved", applied: true }, { ...S2, status: "excluded" }]), "c1");
  L = await K.kcLoad(d, "F1", "s1");
  d.files.F1[K.KC_NAME][0].text = JSON.stringify(doc("s1", 7, [T, { ...S1, status: "approved", applied: true }, { ...S2, status: "excluded" }, { ...S2, id: "s_3", evidence: "새 후보" }]));
  assert.equal((await K.kcSave(d, "F1", "s1", L, { t_1: "approved" })).kind, "conflict");
  L = await K.kcLoad(d, "F1", "s1"); assert.equal(L.doc.candidates[3].status, "pending", "새 후보는 승인 전");
  res = await K.kcSave(d, "F1", "s1", L, { s_3: "approved" });
  assert.equal(res.kind, "saved"); assert.deepEqual(res.fresh.doc.candidates.map(c => c.status + (c.applied ? "*" : "")), ["pending", "approved*", "excluded", "approved"]);

  // ── 깨진 JSON / 쓰기 실패 / 쓰기 후 검증 불일치 ──
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1");
  d.files.F1[K.KC_NAME][0].text = "{깨짐"; d.writes.length = 0;
  res = await K.kcSave(d, "F1", "s1", L, { s_1: "approved" }); assert.equal(res.kind, "error"); assert.equal(d.writes.length, 0, "깨진 파일 덮어쓰기 금지"); assert.equal(d.files.F1[K.KC_NAME][0].text, "{깨짐");
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1"); d.failWrite = true;
  res = await K.kcSave(d, "F1", "s1", L, { s_1: "approved" }); assert.equal(res.kind, "error"); assert(res.msg.includes("저장 실패")); assert.equal(JSON.parse(d.files.F1[K.KC_NAME][0].text).revision, 3, "실패하면 원본 유지");
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1");
  const w = d.writeJSON; d.writeJSON = async (...a) => { await w(...a); d.files.F1[K.KC_NAME][0].text = JSON.stringify(doc("s1", 9, [T, S1])); };   // 쓴 직후 다른 저장이 덮음
  assert.equal((await K.kcSave(d, "F1", "s1", L, { s_1: "approved" })).kind, "conflict", "쓴 직후 검증 불일치 → 충돌 표시(성공 오표시 금지)");
  // 후보 파일이 사라짐
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1"); d.files.F1 = {};
  res = await K.kcSave(d, "F1", "s1", L, { s_1: "approved" }); assert.equal(res.kind, "error"); assert.equal(d.writes.length, 0);
  // 교사/수강생 격리: 다른 sid 로 저장 시도 → 거부, 쓰기 없음
  d = fakeDrive({}); put(d, "F1", K.KC_NAME, doc("s1", 3, [T, S1]), "c1"); L = await K.kcLoad(d, "F1", "s1");
  res = await K.kcSave(d, "F1", "s2", L, { s_1: "approved" }); assert.equal(res.kind, "error"); assert.equal(d.writes.length, 0);

  // ── 앱 코드 정적 확인: 프로필 파일을 쓰지 않고, 스코프가 teacher/index.html 한 곳 ──
  const blk = code.concat(src.match(/const kcSt = \{\};[\s\S]*?\n\/\/ ── 과제 제출/)[0]);
  assert(!/개인화\.json|강사개인화|STUDENT_DOC|db_backup/.test(blk), "후보 검토 코드에서 프로필 파일을 참조하지 않음");
  assert((blk.match(/writeJSON\(/g) || []).length === 1,"writeJSON 은 kcSave 의 단일 경로(+ 의존성 주입)만");
  assert(src.includes('id="stuKakaoCand"'), "학생 화면에 후보 검토 영역");
  assert(!/완료/.test(blk.replace(/\/\/.*$/gm, "")), "후보 검토 화면에 '완료' 표현 없음(주석 제외)");
  console.log("kakao-candidates OK");
})().catch(e => { console.error(e); process.exit(1); });
