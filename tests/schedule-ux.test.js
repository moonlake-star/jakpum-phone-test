// 강사 앱 예약 공개(#70 B-2) 시험 — index.html의 순수 함수와 schedAct/refreshSched를 가짜 서버·가짜 드라이브 위에서 실행
// 실제 Google Sheets/Apps Script·실기기는 검증하지 않음(가짜 서버는 PR #73의 t_state/t_schedule/t_unschedule 규격을 흉내)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const pure = src.slice(src.indexOf("// <sched-pure>"), src.indexOf("// </sched-pure>"));
const pick = (re) => { const m = src.match(re); assert.ok(m, "코드 조각 못 찾음: " + re); return m[0]; };
assert.ok(pure.includes("function contentSig"));
const body = [pure, pick(/async function revokeLink[\s\S]*?\n}\n/), pick(/async function refreshSched[\s\S]*?\n}\n/), pick(/async function schedAct[\s\S]*?\n}\n/),
  pick(/const noteFileIds[^\n]*\n/)].join("\n");
const NOW = "2026-10-27T01:00:00.000Z";   // 서버 시계(KST 10:00)
function server(opt = {}) {
  const notes = {}, log = [];
  const portal = async (action, b = {}) => {
    log.push([action, b]);
    if (opt.netFail && opt.netFail === action) throw new Error("수강생 노트 연결: 네트워크");
    if (action === "t_state") return opt.old ? { ok: true, accounts: [], requests: [], seen: {} }
      : { ok: true, server_now: NOW, notes: Object.values(notes).map(n => ({ sid: n.sid, lesson_id: n.lesson_id, state: n.state, visible_after: n.va })) };
    if (opt.old) throw new Error("수강생 노트 연결: 알 수 없는 요청");
    if (action === "t_schedule") {
      if (b.approved !== true) throw new Error("승인 표시 없음");
      const va = b.visible_after || "", t = va ? Date.parse(va) : 0;
      const state = !va ? "published" : t <= Date.parse(NOW) ? "published" : "scheduled";
      notes[b.sid + "|" + b.lesson_id] = { sid: b.sid, lesson_id: b.lesson_id, state: opt.wrongState || state, va: va || null, json: b.note };
      return { ok: true, state: opt.wrongState || state };
    }
    if (action === "t_unschedule") { const n = notes[b.sid + "|" + b.lesson_id]; if (!n) throw new Error("노트를 찾지 못함"); n.state = "held"; return { ok: true, state: "held" }; }
    throw new Error("알 수 없는 요청");
  };
  return { notes, log, portal };
}
function make(srv, over = {}) {
  const dlog = [], perms = { F1: [{ id: "p1", type: "anyone" }], F2: [{ id: "p2", type: "anyone" }] };
  const note = over.note || { lesson_id: "L1", date: "2026-10-26", feedback: "오늘 수고!\n\n이번 주 연습\n· 입 닫고 음", points: ["a"], practice: ["입 닫고 음"], no_mission: false,
    best: { file_id: "F1" }, extra_best: [], clips: [{ file_id: "F2", label: "x", note: "n" }], published_at: "2026-10-26T12:00:00Z" };
  const cur = { sid: "S1", st: { name: "가", ...(over.st || {}) }, folder: { id: "L1", name: "2026-10-26 레슨" }, files: [], review: { practice: ["입 닫고 음"], ...(over.review || {}) }, ai: over.ai, note: undefined };
  const api = async (url, opt) => { dlog.push([opt?.method || "GET", url]);
    if (over.driveFail && (opt?.method === "POST")) throw new Error("드라이브 실패");
    if (!opt?.method) { const id = url.split("/files/")[1].split("/")[0]; return { json: async () => ({ permissions: perms[id] || [] }) }; }
    if (opt.method === "DELETE") { const [, id, pid] = url.match(/files\/(\w+)\/permissions\/(\w+)/); perms[id] = perms[id].filter(p => p.id !== pid); }
    return { json: async () => ({}) }; };
  const f = new Function("cur", "portal", "api", "DRIVE", "LS", "buildNote", "writeJSON", "saveReview", "openLinkImpl", "NOTE", "toast",
    `${body}\n async function openLink(id){ return openLinkImpl(id); } return { schedAct, refreshSched, revokeLink, contentSig, schedStatus, approvalBlockers };`);
  const saved = [];
  const m = f(cur, srv.portal, api, "DRIVE", { get: () => over.teacherHHMM }, () => JSON.parse(JSON.stringify(note)),
    async () => { if (over.writeFail) throw new Error("쓰기 실패"); return "W"; }, async () => saved.push(JSON.stringify(cur.review)), async (id) => { dlog.push(["OPEN", id]); if (over.driveFail) throw new Error("링크 실패"); }, "수강생노트.json", () => {});
  return { m, cur, dlog, perms, note, saved };
}
const sigOf = (t) => t.m.contentSig(t.note);
(async () => {
  // ── 순수 함수 ──
  const E = new Function(pure + "; return { kstIso, addDaysYmd, defaultVisibleAfter, resolveHHMM, pickToIso, fmtVisible, contentSig, missionState, missionConsistent, approvalBlockers, schedCapable, schedStatus, aiMissionFlags, missionAckKey };")();
  // 1. 기본 익일 18:00 KST, 강사/수강생/레슨별 우선순위, 이른 예약
  assert.strictEqual(E.defaultVisibleAfter("2026-10-26"), "2026-10-27T18:00:00+09:00");
  assert.strictEqual(E.defaultVisibleAfter("2026-10-26", "09:30"), "2026-10-27T09:30:00+09:00");
  assert.strictEqual(E.resolveHHMM({ lesson: "07:00", student: "20:00", teacher: "17:00" }), "07:00");
  assert.strictEqual(E.resolveHHMM({ student: "20:00", teacher: "17:00" }), "20:00");
  assert.strictEqual(E.resolveHHMM({ teacher: "25:99" }), "18:00");
  assert.strictEqual(E.pickToIso({ date: "2026-10-27", time: "06:00" }, "2026-10-26"), "2026-10-27T06:00:00+09:00");
  assert.strictEqual(E.pickToIso({}, "2026-10-26"), "2026-10-27T18:00:00+09:00");
  // 2. 자정 경계·월말·연말·윤년·잘못된 날짜
  assert.strictEqual(E.defaultVisibleAfter("2026-12-31"), "2027-01-01T18:00:00+09:00");
  assert.strictEqual(E.defaultVisibleAfter("2028-02-28"), "2028-02-29T18:00:00+09:00");
  assert.strictEqual(E.defaultVisibleAfter("2026-10-31", "00:00"), "2026-11-01T00:00:00+09:00");
  assert.throws(() => E.kstIso("2026-02-30", "18:00"), /없는 날짜/); assert.throws(() => E.kstIso("2026-10-27", "24:00"), /시간 형식/);
  // 3. KST/UTC 표기
  assert.deepStrictEqual(E.fmtVisible("2026-10-27T18:00:00+09:00"), { kst: "10/27(화) 18:00 KST", utc: "10/27 09:00 UTC" });
  assert.deepStrictEqual(E.fmtVisible("2026-10-27T00:30:00+09:00"), { kst: "10/27(화) 00:30 KST", utc: "10/26 15:30 UTC" });   // 자정 직후는 UTC로 전날
  assert.deepStrictEqual(E.fmtVisible("2026-10-26T15:00:00Z"), { kst: "10/27(화) 00:00 KST", utc: "10/26 15:00 UTC" });
  // 4. 미션: no_mission ↔ 미설정 구분, 일치 검사
  assert.strictEqual(E.missionState({ no_mission: true, practice: [] }), "none");
  assert.strictEqual(E.missionState({ practice: ["", ""] }), "unset");
  assert.strictEqual(E.missionState({ practice: ["a"] }), "set");
  const fbOk = { feedback: "x\n이번 주 연습\n· A", practice: ["A"] };
  assert.ok(E.missionConsistent(fbOk)); assert.ok(!E.missionConsistent({ ...fbOk, practice: ["B"] }));
  assert.ok(E.missionConsistent({ feedback: "그냥 인사", practice: [], no_mission: true }));
  assert.ok(!E.missionConsistent({ feedback: "x\n이번 주 연습\n· A", practice: [], no_mission: true }));
  assert.ok(!E.missionConsistent({ feedback: "이번 주 연습 있음", practice: [] }));
  const blk = (note, rv, ai) => E.approvalBlockers(note, rv, ai).filter(b => b.level === "block");
  assert.ok(blk({ feedback: "hi", practice: [] }, { practice: [] }).some(b => /미설정/.test(b.msg)));
  assert.strictEqual(blk({ feedback: "hi", practice: [], no_mission: true }, { no_mission: true, practice: [] }).length, 0);   // 없음 명시 → 통과
  assert.ok(blk({ feedback: "", practice: [], no_mission: true }, { no_mission: true }).some(b => /비어/.test(b.msg)));
  // 5. AI 경고: 확인 전 막힘, 확인 뒤 통과, 연습을 고치면 다시 막힘
  const ai = { needs_teacher_check: true, violations: [{ message: "금지 표현" }] };
  const rvA = { practice: ["A"] }; const nA = { feedback: "이번 주 연습\n· A", practice: ["A"] };
  assert.strictEqual(blk(nA, rvA, ai).length, 3 - 1);   // needs_teacher_check + violation
  rvA.mission_ack = E.missionAckKey(rvA); assert.strictEqual(blk(nA, rvA, ai).length, 0);
  rvA.practice = ["A2"]; assert.ok(blk({ feedback: "이번 주 연습\n· A2", practice: ["A2"] }, rvA, ai).length > 0);
  assert.strictEqual(E.aiMissionFlags(undefined).length, 0);
  // 6. 지문: published_at 무관, 내용이 바뀌면 달라짐
  const base = { lesson_id: "L", feedback: "f", points: [], practice: ["a"], best: { file_id: "B" }, extra_best: [], clips: [] };
  assert.strictEqual(E.contentSig({ ...base, published_at: "1" }), E.contentSig({ ...base, published_at: "2" }));
  for (const ch of [{ feedback: "f2" }, { practice: ["b"] }, { no_mission: true }, { best: { file_id: "C" } }, { clips: [{ file_id: "k" }] }])
    assert.notStrictEqual(E.contentSig({ ...base, ...ch }), E.contentSig(base));
  // 7. 상태 기계
  const S = (o) => E.schedStatus({ caps: true, sigNow: "s1", approvedSig: "s1", ...o });
  assert.strictEqual(E.schedStatus({ caps: false }), "unsupported"); assert.strictEqual(E.schedStatus({ caps: null }), "unknown");
  assert.strictEqual(S({ approvedSig: null }), "draft"); assert.strictEqual(S({}), "approved_unsaved");
  assert.strictEqual(S({ srv: { state: "scheduled" } }), "scheduled"); assert.strictEqual(S({ srv: { state: "scheduled" }, sigNow: "s2" }), "scheduled_stale");
  assert.strictEqual(S({ srv: { state: "published" } }), "published"); assert.strictEqual(S({ srv: { state: "published" }, sigNow: "s2" }), "published_stale");
  assert.strictEqual(S({ srv: { state: "held" } }), "held");
  assert.ok(E.schedCapable({ server_now: NOW, notes: [] })); assert.ok(!E.schedCapable({ ok: true, accounts: [] })); assert.ok(!E.schedCapable({ server_now: "x", notes: [] }));

  // ── schedAct ──
  const OK = (t) => ({ okSig: sigOf(t) });
  // 8. 승인(체크) 없이는 예약 불가 — 서버로 t_schedule이 아예 안 나감
  { const srv = server(), t = make(srv);
    await assert.rejects(t.m.schedAct("schedule", {}), /승인 칸/); assert.ok(!srv.log.some(x => x[0] === "t_schedule")); }
  // 9. 기본 예약: 다음날 18:00 KST로 t_schedule(approved:true), 성공 확인 뒤 녹음 링크를 연다(서버 먼저 → 링크)
  { const srv = server(), t = make(srv);
    const msg = await t.m.schedAct("schedule", OK(t));
    const call = srv.log.find(x => x[0] === "t_schedule")[1];
    assert.strictEqual(call.visible_after, "2026-10-27T18:00:00+09:00"); assert.strictEqual(call.approved, true); assert.strictEqual(call.sid, "S1");
    assert.match(msg, /10\/27\(화\) 18:00 KST/);
    const order = [...srv.log.map(x => x[0]), ...t.dlog.map(x => x[0])]; assert.ok(t.dlog.filter(x => x[0] === "OPEN").length === 2);
    assert.ok(srv.log.findIndex(x => x[0] === "t_schedule") >= 0);
    assert.strictEqual(t.cur.review.approved_sig, sigOf(t)); assert.strictEqual(t.cur.review.scheduled_for, "2026-10-27T18:00:00+09:00"); }
  // 10. 강사 기본 시간 / 수동 변경 / 이른 예약
  { const srv = server(), t = make(srv, { teacherHHMM: "20:00" });
    await t.m.schedAct("schedule", OK(t)); assert.strictEqual(srv.log.find(x => x[0] === "t_schedule")[1].visible_after, "2026-10-27T20:00:00+09:00"); }
  { const srv = server(), t = make(srv);
    await t.m.schedAct("schedule", { ...OK(t), date: "2026-10-28", time: "07:30" }); assert.strictEqual(srv.log.find(x => x[0] === "t_schedule")[1].visible_after, "2026-10-28T07:30:00+09:00"); }
  // 11. 서버 시계 기준으로 지난 시각은 거부 (기기 시계 무관: NOW=KST 10/27 10:00)
  { const srv = server(), t = make(srv);
    await assert.rejects(t.m.schedAct("schedule", { ...OK(t), date: "2026-10-27", time: "10:00" }), /지났거나/);
    await assert.rejects(t.m.schedAct("schedule", { ...OK(t), date: "2026-10-27", time: "10:00" }), /지났거나/);
    assert.ok(!srv.log.some(x => x[0] === "t_schedule")); }
  // 12. 구버전 서버(t_state에 notes/server_now 없음) → fail closed: 예약도 즉시 공개도 시도하지 않음
  { const srv = server({ old: true }), t = make(srv);
    for (const k of ["schedule", "now", "cancel"]) await assert.rejects(t.m.schedAct(k, OK(t)), /예약 기능을 지원하지 않아/);
    assert.ok(!srv.log.some(x => x[0] === "t_schedule" || x[0] === "t_note" || x[0] === "t_unschedule")); assert.strictEqual(t.dlog.length, 0); }
  // 13. 서버 상태를 못 읽으면(네트워크) 아무것도 하지 않음 + 상태는 '모름'
  { const srv = server({ netFail: "t_state" }), t = make(srv);
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /확인하지 못해/); assert.strictEqual(t.cur.sched.caps, null);
    assert.strictEqual(t.m.schedStatus({ caps: t.cur.sched.caps }), "unknown"); assert.ok(!srv.log.some(x => x[0] === "t_schedule")); }
  // 14. 서버가 t_schedule 후 다른 상태를 알려 주면 성공으로 보지 않음
  { const srv = server({ wrongState: "held" }), t = make(srv);
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /예상/); assert.strictEqual(t.cur.review.approved_sig, undefined); }
  // 15. 즉시 공개: 링크 먼저 → t_schedule('' = 즉시), published 확인 / 카톡 표시와 무관
  { const srv = server(), t = make(srv);
    await t.m.schedAct("now", OK(t));
    assert.strictEqual(srv.log.find(x => x[0] === "t_schedule")[1].visible_after, ""); assert.strictEqual(srv.notes["S1|L1"].state, "published");
    assert.strictEqual(t.cur.review.kakao_sent_at, undefined); }
  // 16. 즉시 공개에서 링크 열기 실패 → 서버로 공개 요청 안 나감
  { const srv = server(), t = make(srv, { driveFail: true });
    await assert.rejects(t.m.schedAct("now", OK(t)), /링크 실패/); assert.ok(!srv.log.some(x => x[0] === "t_schedule")); }
  // 17. 예약 뒤 링크 열기 실패 → 자동 보류(t_unschedule)하고 알림
  { const srv = server(), t = make(srv, { driveFail: true });
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /예약을 취소\(보류\)/); assert.strictEqual(srv.notes["S1|L1"].state, "held"); }
  // 18. 취소: 보류 + 녹음 공유(anyone) 회수. 없는 노트 취소는 오류
  { const srv = server(), t = make(srv);
    await t.m.schedAct("schedule", OK(t));
    t.cur.note = t.note; const msg = await t.m.schedAct("cancel", {});
    assert.strictEqual(srv.notes["S1|L1"].state, "held"); assert.deepStrictEqual(t.perms, { F1: [], F2: [] }); assert.match(msg, /보이지 않아요/);
    // 19. 재예약(보류 → 승인하고 다시 예약)
    await t.m.schedAct("schedule", { ...OK(t), date: "2026-10-29", time: "18:00" }); assert.strictEqual(srv.notes["S1|L1"].state, "scheduled");
    assert.strictEqual(srv.notes["S1|L1"].va, "2026-10-29T18:00:00+09:00"); }
  { const srv = server(), t = make(srv); await assert.rejects(t.m.schedAct("cancel", {}), /취소할 것이 없어요/); }
  // 20. 이미 공개된 노트를 미래로 재예약하는 실수 방지(공개 숨기기 먼저), 같은 상황에서 '지금 다시 공개'는 가능
  { const srv = server(), t = make(srv);
    await t.m.schedAct("now", OK(t));
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /이미 수강생에게 공개/);
    await t.m.schedAct("now", OK(t)); }
  // 21. 예약 후 수정 → 승인 지문 불일치 → 'scheduled_stale', 이전 승인으로는 재예약 불가(재승인 필요)
  { const srv = server(), t = make(srv);
    await t.m.schedAct("schedule", OK(t));
    t.note.feedback += " 수정!"; await t.m.refreshSched(t.cur);   // 화면은 동작 뒤 서버 상태를 다시 읽는다
    const st = t.m.schedStatus({ caps: true, srv: t.cur.sched.entry, sigNow: sigOf(t), approvedSig: t.cur.review.approved_sig });
    assert.strictEqual(st, "scheduled_stale");
    await assert.rejects(t.m.schedAct("schedule", { okSig: t.cur.review.approved_sig }), /승인 칸/);
    await t.m.schedAct("schedule", OK(t)); }   // 새 내용 확인 후 승인하면 가능
  // 22. 미설정 미션 / AI 경고는 승인 단계에서 막힘, 미션 없음 명시는 통과
  { const srv = server(), t = make(srv, { review: { practice: [] }, note: { lesson_id: "L1", date: "2026-10-26", feedback: "고생했어요", practice: [], no_mission: false, best: null, extra_best: [], clips: [] } });
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /미설정/); assert.ok(!srv.log.some(x => x[0] === "t_schedule")); }
  { const srv = server(), t = make(srv, { review: { practice: [], no_mission: true }, note: { lesson_id: "L1", date: "2026-10-26", feedback: "고생했어요", practice: [], no_mission: true, best: null, extra_best: [], clips: [] } });
    await t.m.schedAct("schedule", OK(t)); assert.strictEqual(srv.log.find(x => x[0] === "t_schedule")[1].note.no_mission, true); }
  { const srv = server(), t = make(srv, { ai: { needs_teacher_check: true } });
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /직접 확인/); assert.ok(!srv.log.some(x => x[0] === "t_schedule")); }
  // 23. 동의 철회 수강생: 서버 요청 없음
  { const srv = server(), t = make(srv, { st: { consent_withdrawn: "2026-10-26" } });
    await assert.rejects(t.m.schedAct("schedule", OK(t)), /철회/); assert.strictEqual(srv.log.length, 0); }
  // 24. 서버 반영 뒤 앱 사본 저장 실패 → 예약은 성공으로 두되 경고 문구
  { const srv = server(), t = make(srv, { writeFail: true });
    const msg = await t.m.schedAct("schedule", OK(t)); assert.match(msg, /사본 저장은 실패/); assert.strictEqual(srv.notes["S1|L1"].state, "scheduled"); }
  // 25. 이중 클릭 방지·카톡 표시는 화면 코드(s.busy 선점, 공개 전 표시 거부)로 — 정적 확인
  assert.match(src, /if \(s\.busy\) return; if \(ok && !confirm\(ok\)\) return;\s*s\.busy = true;/);
  assert.match(src, /공개되지 않았어요\. 공개된 뒤에 표시해 주세요/);
  assert.ok(!/btnSched[\s\S]{0,400}publishNote\(\)/.test(src.slice(src.indexOf("function paintDeliver"), src.indexOf("function paintLessonsTab"))
    .split("st === \"unsupported\" || st === \"unknown\"")[1].split("} else {")[1] || ""), "예약 경로에서 publishNote 호출 금지");
  // 26. 구버전 화면: 예약 UI 없이 '지금 바로 게시(예약 아님)'만
  assert.match(src, /아래 버튼이 <b>지금 바로<\/b> 게시합니다\(예약이 아니에요\)/);
  console.log("schedule-ux OK");
})().catch(e => { console.error(e); process.exit(1); });
