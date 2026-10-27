// 열린 화면 레슨 알림(#34) 시험: 30분 전 브리핑·시작·4회차 10분 전 결제 확인의 계획 규칙 (합성 데이터, 가짜 Drive)
// 재현: node tests/lesson-alerts.test.js
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#la-begin\n([\s\S]*?)\/\/#la-end/)[1];
const L = new Function(code + "return {laParse,laPlan,laLoad,laGate,laSeenPrune};")();
const P = (o = {}) => ({ active_start: "10:00", active_end: "22:00", tz: "Asia/Seoul", notify: true, snooze_until: null, off_days: [], ...o });
const kst = (s) => Date.parse(s + "+09:00");
const CFG = { students: { S1: { name: "가", status: "active", payments: [{ date: "2026-10-01", sessions: 4 }] }, S2: { name: "나", status: "active", payments: [] },
  T: { name: "연습", status: "test", payments: [{ date: "2026-10-01", sessions: 4 }] }, W: { name: "철회", status: "active", consent_withdrawn: true } } };
const les = (o) => ({ event_id: "e", student_id: "S1", start: kst("2026-10-27T15:00:00"), status: "scheduled", session_no: 4, cycle_size: 4, paid_status: "unknown", ...o });
const kinds = (a) => a.map(x => x.kind).join(",");
const plan = (ls, now, p = P(), sent = new Set()) => L.laPlan(ls, CFG, p, kst(now), sent);

(async () => {
  // 1. 정시: 14:30 브리핑 / 15:00 시작 / 14:50 결제
  assert.strictEqual(kinds(plan([les()], "2026-10-27T14:30:00")), "briefing");
  assert.strictEqual(kinds(plan([les()], "2026-10-27T14:50:30")), "briefing,payment");
  assert.strictEqual(plan([les()], "2026-10-27T14:20:00").length, 0, "30분보다 이른 시각엔 없음");
  assert.strictEqual(kinds(plan([les()], "2026-10-27T15:00:00")), "start");
  // 2. 늦은 실행: 시작 +5분 뒤 시작 알림 없음, 결제는 정시+3분 뒤 없음, 브리핑은 시작 뒤 없음
  assert.strictEqual(kinds(plan([les()], "2026-10-27T15:04:00")), "start");
  assert.strictEqual(plan([les()], "2026-10-27T15:05:00").length, 0);
  assert.strictEqual(kinds(plan([les()], "2026-10-27T14:52:00")), "briefing,payment");
  assert.strictEqual(kinds(plan([les()], "2026-10-27T14:53:00")), "briefing", "결제는 +3분 지나면 건너뜀");
  assert.ok(plan([les()], "2026-10-27T14:52:00").every(a => a.late));
  // 3. 결제: 회차 불명·배수 아님·결제기록 없음·이미 납부 → 0, 금액·미납 단정 문구 없음
  for (const o of [{ session_no: undefined }, { session_no: 3 }, { cycle_size: 0 }, { session_no: 4.5 }, { paid_status: "paid" }, { student_id: "S2" }])
    assert.ok(!kinds(plan([les(o)], "2026-10-27T14:51:00")).includes("payment"), JSON.stringify(o));
  const pay = plan([les({ session_no: 8 })], "2026-10-27T14:51:00").find(a => a.kind === "payment");
  assert.ok(pay && !/원|\d{3},?\d{3}|미납/.test(pay.text), pay && pay.text);
  // 4. 제외 대상: 연습용·철회·없는 학생·취소/연기/완료
  for (const sid of ["T", "W", "NOPE"]) assert.strictEqual(plan([les({ student_id: sid })], "2026-10-27T14:55:00").length, 0, sid);
  for (const status of ["cancelled", "postponed", "completed", "done"]) assert.strictEqual(plan([les({ status })], "2026-10-27T14:55:00").length, 0, status);
  // 5. 중복: 같은 학생·시각 두 줄 → 파서에서 1건, 이미 띄운 키 → 0, 다른 cron이 겹쳐도 같은 키
  const pr = L.laParse({ schema: 1, teacher_id: "default", lessons: [{ student_id: "S1", start: "2026-10-27T15:00:00+09:00" }, { student_id: "S1", start: "2026-10-27T06:00:00Z" }] }, "default");
  assert.strictEqual(pr.lessons.length, 1);
  const first = plan([les()], "2026-10-27T14:55:00"), sent = new Set(first.map(a => a.key));
  assert.strictEqual(plan([les()], "2026-10-27T14:56:00", P(), sent).length, 0);
  assert.strictEqual(new Set(first.map(a => a.key)).size, first.length);
  // 6. 재예약(시간 변경)은 새 키 → 다시 알림 / 취소하면 없음
  const moved = plan([les({ start: kst("2026-10-27T16:00:00") })], "2026-10-27T15:31:00", P(), sent);
  assert.strictEqual(kinds(moved), "briefing");
  assert.strictEqual(plan([les({ start: kst("2026-10-27T16:00:00"), status: "cancelled" })], "2026-10-27T15:31:00").length, 0);
  // 7. 강사 설정: 알림 OFF·스누즈·쉬는 날·활동창 밖(결제도 예외 없음)
  assert.strictEqual(plan([les()], "2026-10-27T14:55:00", P({ notify: false })).length, 0);
  assert.strictEqual(plan([les()], "2026-10-27T14:55:00", P({ snooze_until: "2026-10-27T06:30:00+00:00" })).length, 0);   // 15:30 KST까지
  assert.strictEqual(plan([les()], "2026-10-27T14:55:00", P({ snooze_until: "2026-10-27T05:00:00+00:00" })).length > 0, true);   // 14:00에 끝남
  assert.strictEqual(plan([les()], "2026-10-27T14:55:00", P({ off_days: ["2026-10-27"] })).length, 0);
  assert.strictEqual(plan([les({ start: kst("2026-10-27T22:30:00") })], "2026-10-27T22:20:00", P()).length, 0, "창(~22:00) 밖");
  assert.strictEqual(plan([les()], "2026-10-27T14:55:00", P({ tz: "Mars/Base" })).length, 0);
  // 8. KST 자정: 활동창 13:00~01:00, 00:30 레슨은 전날 창에 속함 / 쉬는 날은 창이 시작된 날 기준
  const night = P({ active_start: "13:00", active_end: "01:00" });
  const nl = les({ start: kst("2026-10-28T00:30:00") });
  assert.strictEqual(kinds(plan([nl], "2026-10-28T00:00:30", night)), "briefing");
  assert.strictEqual(kinds(plan([nl], "2026-10-28T00:21:00", night)), "briefing,payment");
  assert.strictEqual(plan([nl], "2026-10-28T00:00:30", P({ active_start: "13:00", active_end: "01:00", off_days: ["2026-10-27"] })).length, 0, "창이 27일에 시작 → 27일 쉬는 날");
  assert.strictEqual(plan([nl], "2026-10-28T00:00:30", P({ active_start: "13:00", active_end: "01:00", off_days: ["2026-10-28"] })).length > 0, true);
  assert.strictEqual(plan([nl], "2026-10-28T00:00:30", P()).length, 0, "기본 창(10~22시)엔 자정 레슨 알림 없음");
  // 9. 브리핑 늦춤: 창이 레슨 전에 열리면 창 시작으로 (이른 레슨, 14시 활동 시작)
  const early = les({ start: kst("2026-10-27T14:20:00") }), late = P({ active_start: "14:00", active_end: "23:00" });
  assert.strictEqual(plan([early], "2026-10-27T13:50:30", late).length, 0);
  assert.strictEqual(kinds(plan([early], "2026-10-27T14:00:30", late)), "briefing");
  // 10. 파서: 시간대 없는 시각·다른 강사·형식 오류
  assert.strictEqual(L.laParse({ schema: 1, teacher_id: "default", lessons: [{ student_id: "S1", start: "2026-10-27T15:00:00" }, { student_id: "bad id", start: "2026-10-27T15:00:00+09:00" }] }, "default").lessons.length, 0);
  assert.ok(L.laParse({ schema: 1, teacher_id: "other", lessons: [] }, "default").error);
  assert.ok(L.laParse({ schema: 2, teacher_id: "default", lessons: [] }, "default").error);
  assert.ok(L.laParse([], "default").error);
  // 11. 로드: 파일 없음=none(알림 0) / 중복 / 읽기 실패 / 강사 분리
  const drive = (files, fail) => ({ list: async () => { if (fail === "list") throw new Error("x"); return files.map(f => ({ id: f.id, name: f.name })); },
    readJSON: async (id) => { if (fail === "read") throw new Error("x"); return files.find(f => f.id === id).json; } });
  const doc = (tid) => ({ schema: 1, teacher_id: tid, lessons: [{ student_id: "S1", start: "2026-10-27T15:00:00+09:00" }] });
  assert.strictEqual((await L.laLoad(drive([]), "F", "default")).state, "none");
  assert.strictEqual((await L.laLoad(drive([{ id: "1", name: "레슨일정.json", json: doc("default") }, { id: "2", name: "레슨일정.json", json: doc("default") }]), "F", "default")).state, "error");
  assert.strictEqual((await L.laLoad(drive([{ id: "1", name: "레슨일정.json", json: doc("default") }], "read"), "F", "default")).state, "error");
  assert.strictEqual((await L.laLoad(drive([], "list"), "F", "default")).state, "error");
  assert.strictEqual((await L.laLoad(drive([{ id: "1", name: "레슨일정.json", json: doc("tb") }]), "F", "ta")).state, "error", "강사 B 일정은 강사 A가 쓰지 않음");
  const ok = await L.laLoad(drive([{ id: "1", name: "레슨일정.json", json: doc("default") }]), "F", "default");
  assert.strictEqual(ok.state, "ok"); assert.strictEqual(ok.lessons.length, 1);
  // 12. 기본 OFF·UI 연결: 켜기 전엔 타이머가 돌지 않는다(저장값 1일 때만), 저장 키는 강사별
  assert.ok(/const laIsOn = \(\) => LS\.get\(laOnKey\(\)\) === 1;/.test(src));
  assert.ok(/laOnKey = \(\) => "vn_la_on:" \+ tpTid\(\)/.test(src) && /laSeenKey = \(\) => "vn_la_seen:" \+ tpTid\(\)/.test(src));
  assert.ok(/if \(!laIsOn\(\) \|\| document\.hidden/.test(src), "화면이 숨겨졌을 땐 알리지 않음");
  // 13. 본 이름 충돌 회귀: 설정 카드 읽기 함수와 플레이어 tpLoad가 서로 덮어쓰지 않는다
  assert.strictEqual((src.match(/^async function tpLoad\(/gm) || []).length, 1);
  // 14. 오래된 '본 키' 정리
  const now = Date.now(); assert.deepStrictEqual(Object.keys(L.laSeenPrune({ a: now - 1000, b: now - 3 * 864e5, c: "x" }, now)), ["a"]);
  console.log("lesson-alerts.test.js OK");
})().catch(e => { console.error(e); process.exit(1); });
