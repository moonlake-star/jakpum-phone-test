// 과제 AI 분석 요청 큐(#74 앱 2단계): 가짜 Drive 로만 검증. 실 Drive·토큰·유료 API 없음.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#mq-begin\n([\s\S]*?)\/\/#mq-end/)[1];
const M = new Function(code + "return {mqGate,mqBuild,mqState,mqRequest,mqReqName,mqStatusName,mqBytes};")();
const Q = "QUEUEFOLDER12345", NOW = new Date("2026-10-26T01:02:03.456Z");
const mkCfg = (over) => ({ students: { s1: { name: "가" }, s2: { name: "나" }, t1: { status: "test" }, w1: { consent_withdrawn: "2026-01-01" } },
  mission_ai: { enabled: true, queue_folder: Q, allowed_students: ["s1", "t1", "w1"], ...over } });
function drive(init = {}, opt = {}) {   // 가짜 Drive: 폴더별 파일 {name:{id,body}}
  const d = { folders: { [Q]: { ...init } }, writes: [], n: 0, failWrite: opt.failWrite || 0 };
  d.io = {
    list: async (f) => Object.entries(d.folders[f] || {}).map(([name, x]) => ({ id: x.id, name, size: x.size ?? JSON.stringify(x.body).length })),
    readJSON: async (id) => { for (const f of Object.values(d.folders)) for (const x of Object.values(f)) if (x.id === id) return JSON.parse(JSON.stringify(x.body)); throw new Error("없음"); },
    readStore: async (sid) => d.store?.[sid] ?? null,
    write: async (folder, name, obj, id) => {
      if (d.failWrite > 0) { d.failWrite--; throw new Error("드라이브 503"); }
      d.writes.push({ folder, name, obj, id });
      const cur = d.folders[folder][name]; d.folders[folder][name] = { id: cur?.id || "w" + (++d.n), body: obj }; return d.folders[folder][name].id;
    },
  };
  return d;
}
const yes = async () => true, no = async () => false;
const run = async () => {
  // 1) 기본 OFF/조건 미충족 → Drive 쓰기 0
  for (const c of [{ students: {} }, mkCfg({ enabled: "true" }), mkCfg({ enabled: false }), mkCfg({ queue_folder: "../x" }), mkCfg({ queue_folder: undefined }),
    mkCfg({ allowed_students: "s1" }), mkCfg({ allowed_students: [] })]) {
    const d = drive(); const r = await M.mqRequest(d.io, c, "s1", "f1", yes, NOW);
    assert.equal(r.ok, false); assert.equal(d.writes.length, 0); assert.equal((await M.mqState(d.io, c, "s1", "f1")).key, "disabled");
  }
  // 2) 다른 sid·시험·동의철회·잘못된 id 거부
  for (const [sid, fid] of [["s2", "f1"], ["t1", "f1"], ["w1", "f1"], ["s1/../x", "f1"], ["s1", "f/1"], ["s1", ""], ["s1", "a".repeat(101)]]) {
    const d = drive(); const r = await M.mqRequest(d.io, mkCfg(), sid, fid, yes, NOW);
    assert.equal(r.ok, false, sid + fid); assert.equal(d.writes.length, 0);
  }
  // 3) 미승인/승인 확인 예외 → 쓰기 0
  { const d = drive(); assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", no, NOW)).ok, false); assert.equal(d.writes.length, 0);
    assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", async () => { throw new Error("x"); }, NOW)).ok, false);
    assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", async () => "yes", NOW)).ok, false); assert.equal(d.writes.length, 0); }
  // 4) 명시 호출 1회만 쓰기, 계약 모양·4KB 이하·파일명 규칙, 원본 위치에는 쓰지 않음
  const d = drive();
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "none");
  assert.equal(d.writes.length, 0);   // 상태 확인은 쓰지 않음
  const r1 = await M.mqRequest(d.io, mkCfg(), "s1", "f1", yes, NOW);
  assert.equal(r1.ok, true); assert.equal(d.writes.length, 1);
  const w = d.writes[0]; assert.equal(w.folder, Q); assert.equal(w.name, "요청_s1_f1.json"); assert.equal(w.id, undefined);
  assert.deepEqual(w.obj, { type: "mission_analyze", student_id: "s1", file_id: "f1", received_at: "2026-10-26T01:02:03+00:00" });
  assert(M.mqBytes(w.obj) <= 4096);
  const allowed = new Set(["type", "student_id", "file_id", "received_at", "teacher_choice", "song_hint", "memo", "force"]);
  assert(Object.keys(w.obj).every(k => allowed.has(k)));
  // 5) 중복 요청 거부(상태: 서버 실행 대기), 쓰기 늘지 않음
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "waiting");
  assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", yes, NOW)).ok, false); assert.equal(d.writes.length, 1);
  // 6) 상태 폴링: 상태 파일이 생기면 바뀜. done 이면 완료/제한적 구분, 수강생 간 격리(다른 sid 상태는 안 보임)
  const stName = M.mqStatusName("s1", "f1"), rq = "2026-10-26T01:02:03+00:00";
  d.folders[Q][stName] = { id: "st1", body: { status: "done", limited: true, mode: "free_limited", submission_id: "s1:f1", request_received_at: rq } };
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "unverified");   // 결과 저장소에 항목 없음 → 완료로 표시 안 함
  const item = { student_id: "s1", source_file_id: "f1", submission_id: "s1:f1", status: "limited" };
  d.store = { s1: { items: { "s1:f1": item } } };
  let s = await M.mqState(d.io, mkCfg(), "s1", "f1"); assert.equal(s.key, "done_limited"); assert(/AI 분석 완료 아님/.test(s.label));
  d.store = { s1: { items: { "s1:f1": { ...item, student_id: "s2" } } } };
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "unverified");
  d.store = { s1: { items: { "s1:f1": item } } };
  d.folders[Q][stName].body = { ...d.folders[Q][stName].body, limited: false, mode: "paid" };   // 유료 완료 + 항목이 limited 이면 여전히 제한적
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "done_limited");
  d.store = { s1: { items: { "s1:f1": { ...item, status: "analyzed" } } } };
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "done_ai");
  d.folders[Q][stName].body.limited = true;                                     // 서버가 제한적이라 하면 AI 완료 아님
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "done_limited");
  d.folders[Q][stName].body.submission_id = "s2:f1";                            // 다른 과제 상태는 거부
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "error");
  d.folders[Q][stName].body.submission_id = "s1:f1";
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f9")).key, "none");        // 다른 파일/수강생 상태가 새어 나오지 않음
  // done 은 재요청 불가, rejected 도 불가
  assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", yes, NOW)).ok, false); assert.equal(d.writes.length, 1);
  d.folders[Q][stName].body = { status: "rejected", reason: "허용 수강생이 아님", request_received_at: rq };
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "rejected");
  assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", yes, NOW)).ok, false);
  // deferred: 재요청 불가(서버가 다시 실행하면 처리)
  d.folders[Q][stName].body = { status: "deferred", reason: "상한", request_received_at: rq };
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "deferred"); assert.equal((await M.mqRequest(d.io, mkCfg(), "s1", "f1", yes, NOW)).ok, false);
  // failed: force + 새 received_at 으로 같은 요청 파일을 갱신(새 파일 아님)
  d.folders[Q][stName].body = { status: "failed", reason: "시간초과", attempts: 2, request_received_at: rq };
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "failed");
  const later = new Date("2026-10-26T05:00:00Z");
  const r2 = await M.mqRequest(d.io, mkCfg(), "s1", "f1", yes, later);
  assert.equal(r2.ok, true); assert.equal(d.writes.length, 2);
  assert.equal(d.writes[1].obj.force, true); assert.equal(d.writes[1].obj.received_at, "2026-10-26T05:00:00+00:00"); assert.equal(d.writes[1].id, "w1");
  assert.equal((await M.mqState(d.io, mkCfg(), "s1", "f1")).key, "waiting");   // 새 요청은 서버 대기로 표시
  // 7) 쓰기 실패 → 명확한 메시지, 쓰기 기록 없음, 다시 시도하면 1회 성공(복구)
  { const e = drive({}, { failWrite: 1 });
    const bad = await M.mqRequest(e.io, mkCfg(), "s1", "f2", yes, NOW);
    assert.equal(bad.ok, false); assert(/다시 눌러/.test(bad.msg)); assert.equal(e.writes.length, 0);
    assert.equal((await M.mqState(e.io, mkCfg(), "s1", "f2")).key, "none");
    assert.equal((await M.mqRequest(e.io, mkCfg(), "s1", "f2", yes, NOW)).ok, true); assert.equal(e.writes.length, 1); }
  // 8) 상태 읽기 실패는 오류 표시(완료로 가장하지 않음)
  { const e = drive(); e.io.list = async () => { throw new Error("네트워크"); };
    const st = await M.mqState(e.io, mkCfg(), "s1", "f1"); assert.equal(st.key, "error"); assert.equal(st.canRequest, false); }
  // 9) 동시 이중 클릭: 쓰기 1회
  { const e = drive(); const [a, b] = await Promise.all([M.mqRequest(e.io, mkCfg(), "s1", "f3", yes, NOW), M.mqRequest(e.io, mkCfg(), "s1", "f3", yes, NOW)]);
    assert.equal(e.writes.length, 1); assert.equal([a, b].filter(x => x.ok).length, 1); }
  // 10) 비정상 크기 요청 파일은 읽지 않음
  { const e = drive({ [M.mqReqName("s1", "f4")]: { id: "r", body: {}, size: 99999 }, [M.mqStatusName("s1", "f4")]: { id: "q", body: { status: "done" } } });
    assert.equal((await M.mqState(e.io, mkCfg(), "s1", "f4")).key, "error"); }
  // 11) 화면 연결: 기존 패널 재사용, 직접 분석처럼 보이지 않는 문구, rec.ai 직접 생성 금지, 원본 파일 쓰기 없음
  assert(src.includes("바로 분석하지 않고, 서버에서 실행해야 시작돼요") && src.includes("data-mqreq") && src.includes("mqGate(cfg, sid).ok"));
  assert(!/rec\.ai\s*=[^=]/.test(src));
  const wr = [...code.matchAll(/io\.write\(/g)].length; assert.equal(wr, 1);   // 코어의 쓰기 호출은 요청 파일 하나뿐
  console.log("mission-queue-request ok");
};
run().catch(e => { console.error(e); process.exit(1); });
