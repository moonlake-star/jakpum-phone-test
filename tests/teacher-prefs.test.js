// 강사 알림·활동창 설정(#70) 시험: 문서 계약(rev/expected_rev/request_id/teacher_id), 자정 경계, 강사별 분리, 알림 OFF/스누즈/쉬는 날,
// 쓰기 실패·동시 수정 충돌 시 기존 값 보존 (합성 데이터, 가짜 Drive — 실제 Drive·운영 설정은 건드리지 않음)
// 재현: node tests/teacher-prefs.test.js
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#tp-begin\n([\s\S]*?)\/\/#tp-end/)[1];
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const T = new Function("esc", code + "return {tpDocName,tpValidate,tpParse,tpLoad:tpPrefsLoad,tpPatch,tpSave,tpWindowText,tpSnoozeText,tpHtml,tpKst,TP_DEFAULT};")(esc);
// 백엔드 문서 계약 고정: app/jakpum/teacher_prefs_store.py 의 키 목록과 같아야 한다
assert.deepStrictEqual(Object.keys(T.TP_DEFAULT).sort(), ["active_end", "active_start", "notify", "off_days", "publish_time", "ready_time", "snooze_until", "tz"]);

function fakeDrive(files = {}) {
  const d = { files, writes: [], n: 100 };
  d.list = async (folder) => { if (d.failList) throw new Error("list 500"); return Object.entries(d.files[folder] || {}).flatMap(([name, arr]) => arr.map(f => ({ id: f.id, name }))); };
  d.readJSON = async (id) => { for (const f of Object.values(d.files)) for (const arr of Object.values(f)) for (const x of arr) if (x.id === id) return JSON.parse(x.text); throw new Error("404"); };
  d.writeJSON = async (folder, name, obj, id) => {
    d.writes.push({ folder, name, id, obj });
    if (d.failWrite) throw new Error("drive 500");
    if (d.onWrite) d.onWrite();
    const arr = (d.files[folder] ||= {})[name] ||= [];
    if (id) arr.find(x => x.id === id).text = JSON.stringify(obj); else arr.push({ id: "n" + d.n++, text: JSON.stringify(obj) });
    return id;
  };
  return d;
}
const F = "DB";
const put = (d, name, obj, id = "f" + Math.random().toString(36).slice(2, 6)) => ((d.files[F] ||= {})[name] ||= []).push({ id, text: typeof obj === "string" ? obj : JSON.stringify(obj) });
const NOW = new Date("2026-10-26T15:30:00Z");   // KST 2026-10-27 00:30
const stored = (d, name) => JSON.parse(d.files[F][name][0].text);

(async () => {
  // 1. 파일 이름·강사 ID (Python doc_name과 같은 규칙: 영문·숫자·_-)
  assert.strictEqual(T.tpDocName("default"), "강사설정_default.json");
  assert.throws(() => T.tpDocName("../x")); assert.throws(() => T.tpDocName("김선생")); assert.throws(() => T.tpDocName(""));
  assert.strictEqual(T.tpKst(NOW), "2026-10-27T00:30:00+09:00");

  // 2. 검증: 13:00~01:00(자정 경계) 허용, 같으면 거부, 형식·시간대·날짜 오류 거부
  const ok = T.tpValidate({ active_start: "13:00", active_end: "01:00" });
  assert.strictEqual(ok.active_start, "13:00"); assert.strictEqual(ok.active_end, "01:00");
  assert.strictEqual(T.tpWindowText("13:00", "01:00"), "13:00부터 다음날 01:00까지(자정을 넘겨요)");
  assert.strictEqual(T.tpWindowText("10:00", "22:00"), "10:00부터 22:00까지");
  assert.throws(() => T.tpValidate({ active_start: "10:00", active_end: "10:00" }), /같아요/);
  assert.doesNotThrow(() => T.tpValidate({ active_start: "00:00", active_end: "23:59" }));
  for (const bad of [{ active_start: "24:00" }, { active_start: "9:00" }, { tz: "Mars/Base" }, { notify: "yes" }, { snooze_until: "2026-10-27T01:00:00" }, { snooze_until: "내일" }, { off_days: ["2026-02-30"] }, { off_days: "2026-10-27" }, { foo: 1 }])
    assert.throws(() => T.tpValidate(bad), undefined, JSON.stringify(bad));
  assert.deepStrictEqual(T.tpValidate({ off_days: ["2026-10-28", "2026-10-27", "2026-10-28"] }).off_days, ["2026-10-27", "2026-10-28"]);
  assert.strictEqual(T.tpValidate({ snooze_until: "2026-10-27T03:00:00+00:00" }).snooze_until, "2026-10-27T03:00:00+00:00");

  // 3. 읽기: 파일 없음=기본값 rev0 / 관대한 읽기(틀린 키만 기본값) / 다른 강사 파일 무시 / 깨진 JSON·중복 파일은 error(덮어쓰기 금지)
  let d = fakeDrive();
  let L = await T.tpLoad(d, F, "default");
  assert.strictEqual(L.state, "ok"); assert.strictEqual(L.doc.rev, 0); assert.strictEqual(L.fileId, null); assert.strictEqual(L.doc.prefs.notify, true);
  d = fakeDrive(); put(d, "강사설정_default.json", { schema: 1, teacher_id: "default", rev: 3, request_ids: ["a", 5], prefs: { active_start: "13:00", active_end: "99:99", notify: false, snooze_until: "naive" }, students: { S1: { publish_time: "09:30" }, "bad id": { publish_time: "09:30" }, S2: { publish_time: "7pm" } } }, "ID1");
  L = await T.tpLoad(d, F, "default");
  assert.strictEqual(L.doc.rev, 3); assert.strictEqual(L.doc.prefs.active_start, "13:00"); assert.strictEqual(L.doc.prefs.active_end, "22:00"); assert.strictEqual(L.doc.prefs.notify, false); assert.strictEqual(L.doc.prefs.snooze_until, null);
  assert.deepStrictEqual(L.doc.request_ids, ["a"]); assert.deepStrictEqual(L.doc.students, { S1: { publish_time: "09:30" } }); assert.ok(L.warns.length >= 2);
  d = fakeDrive(); put(d, "강사설정_default.json", { teacher_id: "other", rev: 9, prefs: { notify: false } });
  L = await T.tpLoad(d, F, "default"); assert.strictEqual(L.state, "error");
  assert.strictEqual((await T.tpSave(d, F, "default", { notify: false }, 0, "wrong-owner", NOW)).kind, "error");
  assert.strictEqual(d.writes.length, 0);   // 다른 강사 문서는 절대 덮어쓰지 않음
  d = fakeDrive(); put(d, "강사설정_default.json", null);
  assert.strictEqual((await T.tpLoad(d, F, "default")).state, "error");
  assert.strictEqual((await T.tpSave(d, F, "default", { notify: false }, 0, "null-doc", NOW)).kind, "error");
  assert.strictEqual(d.writes.length, 0);
  d = fakeDrive(); put(d, "강사설정_default.json", "{깨짐");
  L = await T.tpLoad(d, F, "default"); assert.strictEqual(L.state, "error");
  let r = await T.tpSave(d, F, "default", { notify: false }, 0, "r1", NOW); assert.strictEqual(r.kind, "error"); assert.strictEqual(d.writes.length, 0);   // 깨진 파일을 덮어쓰지 않음
  d = fakeDrive(); put(d, "강사설정_default.json", {}); put(d, "강사설정_default.json", {});
  assert.strictEqual((await T.tpLoad(d, F, "default")).state, "error");
  d = fakeDrive(); d.failList = true; assert.strictEqual((await T.tpLoad(d, F, "default")).state, "error");
  assert.strictEqual((await T.tpLoad(fakeDrive(), F, "김선생")).state, "error");

  // 4. 첫 저장(파일 없음 → 새로 만듦, rev 1) — 백엔드 문서 계약 키 그대로, 수강생 override 보존
  d = fakeDrive();
  r = await T.tpSave(d, F, "default", { active_start: "13:00", active_end: "01:00", notify: false, off_days: ["2026-10-31"] }, 0, "r1", NOW);
  assert.strictEqual(r.kind, "saved"); assert.strictEqual(r.fresh.doc.rev, 1);
  let s = stored(d, "강사설정_default.json");
  assert.deepStrictEqual(Object.keys(s).sort(), ["prefs", "request_ids", "rev", "schema", "students", "teacher_id", "updated_at"]);
  assert.strictEqual(s.schema, 1); assert.strictEqual(s.teacher_id, "default"); assert.strictEqual(s.rev, 1); assert.deepStrictEqual(s.request_ids, ["r1"]); assert.strictEqual(s.updated_at, "2026-10-27T00:30:00+09:00");
  assert.deepStrictEqual(s.prefs, { active_start: "13:00", active_end: "01:00", tz: "Asia/Seoul", publish_time: "18:00", ready_time: "16:00", notify: false, snooze_until: null, off_days: ["2026-10-31"] });
  assert.strictEqual(d.writes[0].id, undefined);

  // 5. 두 번째 저장: expected_rev 일치 → rev 2, 안 바뀐 값·students 보존 / 같은 request_id 재시도는 duplicate(다시 쓰지 않음)
  d = fakeDrive(); put(d, "강사설정_default.json", { schema: 1, teacher_id: "default", rev: 4, request_ids: ["x"], prefs: { ...T.TP_DEFAULT, notify: false, off_days: ["2026-12-25"] }, students: { S1: { publish_time: "09:30" } } }, "ID1");
  r = await T.tpSave(d, F, "default", { snooze_until: "2026-10-27T03:00:00+00:00" }, 4, "r2", NOW);
  assert.strictEqual(r.kind, "saved"); s = stored(d, "강사설정_default.json");
  assert.strictEqual(s.rev, 5); assert.deepStrictEqual(s.request_ids, ["x", "r2"]); assert.strictEqual(s.prefs.notify, false); assert.deepStrictEqual(s.prefs.off_days, ["2026-12-25"]); assert.strictEqual(s.prefs.snooze_until, "2026-10-27T03:00:00+00:00");
  assert.deepStrictEqual(s.students, { S1: { publish_time: "09:30" } }); assert.strictEqual(d.writes[0].id, "ID1");
  r = await T.tpSave(d, F, "default", { snooze_until: "2026-10-27T03:00:00+00:00" }, 4, "r2", NOW);   // 응답 유실 후 재시도: expected_rev가 지나갔어도 중복 성공
  assert.strictEqual(r.kind, "duplicate"); assert.strictEqual(d.writes.length, 1); assert.strictEqual(stored(d, "강사설정_default.json").rev, 5);
  // 알림 OFF → 켜기, 스누즈 해제(null)
  r = await T.tpSave(d, F, "default", { notify: true, snooze_until: null }, 5, "r3", NOW);
  assert.strictEqual(r.kind, "saved"); assert.strictEqual(stored(d, "강사설정_default.json").prefs.notify, true); assert.strictEqual(stored(d, "강사설정_default.json").prefs.snooze_until, null);
  // 바뀐 게 없으면 noop(쓰지 않음)
  const w = d.writes.length; r = await T.tpSave(d, F, "default", { notify: true }, 6, "r4", NOW); assert.strictEqual(r.kind, "noop"); assert.strictEqual(d.writes.length, w);
  // request_ids는 최근 20개만
  for (let i = 0; i < 25; i++) { const cur = (await T.tpLoad(d, F, "default")).doc; const rr = await T.tpSave(d, F, "default", { ready_time: i % 2 ? "15:00" : "14:00" }, cur.rev, "q" + i, NOW); assert.strictEqual(rr.kind, "saved"); }
  assert.strictEqual(stored(d, "강사설정_default.json").request_ids.length, 20);

  // 6. 동시 수정 충돌: 화면을 연 뒤 다른 기기가 먼저 저장 → 덮어쓰지 않음, 최신 값 반환
  d = fakeDrive(); put(d, "강사설정_default.json", { schema: 1, teacher_id: "default", rev: 2, request_ids: ["x"], prefs: { ...T.TP_DEFAULT, notify: false }, students: {} }, "ID1");
  const before = d.files[F]["강사설정_default.json"][0].text;
  r = await T.tpSave(d, F, "default", { notify: true }, 1, "rZ", NOW);   // 내 화면은 rev 1 기준, 실제는 rev 2
  assert.strictEqual(r.kind, "conflict"); assert.strictEqual(r.fresh.doc.rev, 2); assert.strictEqual(r.fresh.doc.prefs.notify, false);
  assert.strictEqual(d.writes.length, 0); assert.strictEqual(d.files[F]["강사설정_default.json"][0].text, before);
  // 쓰는 도중(쓰기 직전 재읽기 이후) 다른 기기가 덮어쓴 경우: 쓴 직후 재읽기로 감지 → conflict
  d = fakeDrive(); put(d, "강사설정_default.json", { schema: 1, teacher_id: "default", rev: 0, request_ids: [], prefs: T.TP_DEFAULT, students: {} }, "ID1");
  d.onWrite = () => { d.onWrite = null; const other = { schema: 1, teacher_id: "default", rev: 1, request_ids: ["other"], prefs: { ...T.TP_DEFAULT, notify: false }, students: {} };
    d.files[F]["강사설정_default.json"][0].text = JSON.stringify(other); d.writes.push("race"); };
  // (onWrite는 내 쓰기 직전에 호출되고 내 쓰기가 뒤이어 일어나므로, 아래는 '쓴 뒤 다른 쓰기가 덮음'을 흉내내도록 writeJSON을 감싼다)
  d.onWrite = null; const orig = d.writeJSON;
  d.writeJSON = async (...a) => { const x = await orig(...a); d.files[F]["강사설정_default.json"][0].text = JSON.stringify({ schema: 1, teacher_id: "default", rev: 1, request_ids: ["other"], prefs: { ...T.TP_DEFAULT, notify: false }, students: {} }); return x; };
  r = await T.tpSave(d, F, "default", { ready_time: "15:00" }, 0, "rM", NOW);
  assert.strictEqual(r.kind, "conflict"); assert.strictEqual(r.fresh.doc.request_ids.at(-1), "other");

  // 7. 서버(Drive) 쓰기 실패: 기존 값 그대로, error. 같은 요청 번호로 재시도하면 정상 저장
  d = fakeDrive(); put(d, "강사설정_default.json", { schema: 1, teacher_id: "default", rev: 2, request_ids: ["x"], prefs: { ...T.TP_DEFAULT, active_start: "13:00", active_end: "01:00" }, students: { S1: { publish_time: "09:30" } } }, "ID1");
  const keep = d.files[F]["강사설정_default.json"][0].text;
  d.failWrite = true; r = await T.tpSave(d, F, "default", { notify: false }, 2, "rF", NOW);
  assert.strictEqual(r.kind, "error"); assert.ok(r.msg.includes("기존 설정은 그대로")); assert.strictEqual(d.files[F]["강사설정_default.json"][0].text, keep);
  d.failWrite = false; r = await T.tpSave(d, F, "default", { notify: false }, 2, "rF", NOW);
  assert.strictEqual(r.kind, "saved"); assert.strictEqual(stored(d, "강사설정_default.json").prefs.active_end, "01:00"); assert.strictEqual(stored(d, "강사설정_default.json").prefs.notify, false);
  // 검증 실패는 쓰지 않음(자정 경계 같은 시각)
  d.writes.length = 0; r = await T.tpSave(d, F, "default", { active_start: "01:00", active_end: "01:00" }, 3, "rV", NOW); assert.strictEqual(r.kind, "invalid"); assert.strictEqual(d.writes.length, 0);
  r = await T.tpSave(d, F, "default", { notify: true }, 3, "", NOW); assert.strictEqual(r.kind, "invalid");
  // 쓴 뒤 재읽기 실패 → '확인 못 함'(성공이라 말하지 않음)
  d = fakeDrive(); const o2 = d.writeJSON; d.writeJSON = async (...a) => { const x = await o2(...a); d.failList = true; return x; };
  r = await T.tpSave(d, F, "default", { notify: false }, 0, "rU", NOW); assert.strictEqual(r.kind, "error"); assert.ok(r.unverified);

  // 8. 강사별 분리: 강사 A·B 파일이 섞이지 않음, B 저장이 A에 영향 없음
  d = fakeDrive();
  assert.strictEqual((await T.tpSave(d, F, "ta", { active_start: "13:00", active_end: "01:00" }, 0, "a1", NOW)).kind, "saved");
  assert.strictEqual((await T.tpSave(d, F, "tb", { notify: false }, 0, "b1", NOW)).kind, "saved");
  assert.strictEqual(stored(d, "강사설정_ta.json").prefs.notify, true); assert.strictEqual(stored(d, "강사설정_tb.json").prefs.active_start, "10:00");
  assert.strictEqual((await T.tpLoad(d, F, "ta")).doc.prefs.active_end, "01:00"); assert.strictEqual((await T.tpLoad(d, F, "tb")).doc.prefs.notify, false);
  // 다른 강사의 내용이 같은 파일명에 들어 있으면 읽기/저장 모두 차단(덮어쓰기 금지)
  put(d, "강사설정_tc.json", { teacher_id: "ta", rev: 7, prefs: { notify: false } });
  assert.strictEqual((await T.tpLoad(d, F, "tc")).state, "error");
  const wBefore = d.writes.length;
  assert.strictEqual((await T.tpSave(d, F, "tc", { notify: true }, 0, "tc1", NOW)).kind, "error");
  assert.strictEqual(d.writes.length, wBefore);

  // 9. 화면 문구: 스누즈/OFF/쉬는 날/자정 경계가 보이고, 사용자 입력은 이스케이프
  assert.strictEqual(T.tpSnoozeText(null, NOW), "꺼짐"); assert.ok(T.tpSnoozeText("2026-10-26T17:30:00+00:00", NOW).includes("2시간") || T.tpSnoozeText("2026-10-26T17:30:00+00:00", NOW).includes("약 2시간"));
  assert.ok(T.tpSnoozeText("2026-10-26T15:50:00+00:00", NOW).includes("20분")); assert.ok(T.tpSnoozeText("2026-10-26T15:00:00+00:00", NOW).includes("끝남"));
  const Ld = { state: "ok", doc: { rev: 3, updated_at: "2026-10-27T00:30:00+09:00", prefs: { ...T.TP_DEFAULT, active_start: "13:00", active_end: "01:00", notify: false, off_days: ["2026-10-31"] }, students: {} }, warns: [] };
  let h = T.tpHtml(Ld, {}, NOW, esc, "", false);
  assert.ok(h.includes("다음날 01:00까지")); assert.ok(h.includes("2026-10-31")); assert.ok(!/data-tpk="notify" checked/.test(h)); assert.ok(h.includes("id=\"tpSave\" disabled"));
  h = T.tpHtml(Ld, { notify: true }, NOW, esc, "<b>x</b>", false); assert.ok(h.includes("(1곳 바뀜)")); assert.ok(h.includes("&lt;b&gt;x&lt;/b&gt;")); assert.ok(/data-tpk="notify" checked/.test(h));
  assert.ok(T.tpHtml({ state: "error", msg: "읽지 못함" }, {}, NOW, esc, "", false).includes("읽지 못함"));
  assert.deepStrictEqual(T.tpPatch(Ld.doc.prefs, { notify: false, active_start: "13:00", off_days: ["2026-10-31", "2026-11-01"] }), { off_days: ["2026-10-31", "2026-11-01"] });

  // 10. index.html 연결: 목록 화면에 prefsBox, 강사 ID·저장 위치는 config에서, 앱 #25(검수.json 정리) 코드 보존
  assert.ok(src.includes('id="prefsBox"')); assert.ok(src.includes("cfg?.system?.db_backup")); assert.ok(src.includes("async function markHeldLocal"));
  console.log("teacher-prefs OK");
})().catch(e => { console.error(e); process.exit(1); });
