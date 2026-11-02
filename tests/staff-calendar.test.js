// (11/02 사용자 승인 2단계) 강사 레슨 캘린더: 등록(매주 반복)·이동·휴강·지우기 → 강사 구글 캘린더 + 레슨일정.json, 원장 화면엔 강사 색(보기만)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const start = src.indexOf("// ── 강사 레슨 캘린더(11/02"), end = src.indexOf("function schAddSheet(");
const code = src.slice(start, end) + g(/function calNums\([\s\S]*?\n\}\n/);
(async () => {
  const files = {}, cal = [], store = { items: [] }; let fid = 0, evn = 0;
  const cfg = { name: "홍강사", sys: "SYS", role: "teacher", students: { S2: { name: "이하나", teacher_id: "T9" } } };
  const list = async (sys) => Object.entries(files).map(([id, f]) => ({ id, name: f.name }));
  const api = async (url) => ({ json: async () => JSON.parse(JSON.stringify(files[url.match(/files\/([^?]+)/)[1]].obj)) });
  const writeJSON = async (folder, name, obj, id) => { id = id || "F" + (++fid); files[id] = { name, obj: JSON.parse(JSON.stringify(obj)) }; return id; };
  const calToken = async () => "TOK";
  const fetch = async (url, opt) => { cal.push([opt.method, url, opt.body && JSON.parse(opt.body)]); return { status: opt.method === "DELETE" ? 204 : 200, ok: true, json: async () => ({ id: "EV" + (++evn) }) }; };
  const moved = []; const calMoveEvent = async (id, l) => moved.push([id, l]);
  const f = new Function("cfg", "list", "api", "writeJSON", "calToken", "fetch", "calMoveEvent", "LS", "DRIVE", "staffOf", "asgRead", "isStaffApp",
    code + "return { schWeekly, schMergeAsg, schDays, schAdd, schMove, schCancel, schDelete, schLoad, calNums, staffColor, schCache: () => schCache };")(
    cfg, list, api, writeJSON, calToken, fetch, calMoveEvent, { set() {} }, "D", () => ({ T9: { name: "홍강사", sys: "SYS" }, T8: { name: "김강사" } }),
    async () => ({ items: [{ id: "A1", sid: "S2", name: "이하나", start: "2030-01-03T19:00:00+09:00", len: 50, event_id: "OWNEREV" }] }), () => true);
  // 매주 반복: 같은 요일·시간 4회
  assert.deepStrictEqual(f.schWeekly("2030-01-01", "19:00", 4), ["2030-01-01T19:00", "2030-01-08T19:00", "2030-01-15T19:00", "2030-01-22T19:00"]);
  // 강사 앱 처음 열 때: 원장이 배치한 첫 레슨이 일정에 들어감(한 번만)
  await f.schLoad(true); assert.strictEqual(f.schCache().self.items.length, 1); assert.strictEqual(f.schCache().self.items[0].event_id, "OWNEREV");
  await f.schLoad(true); assert.strictEqual(f.schCache().self.items.length, 1, "두 번 들어가지 않음");
  // 등록: 구글 캘린더에 하나씩(초대 메일 없음) + 파일에 한 번에
  assert.strictEqual(await f.schAdd("S2", f.schWeekly("2030-01-01", "19:00", 4), 50), 4);
  const posts = cal.filter(c => c[0] === "POST"); assert.strictEqual(posts.length, 4); assert.ok(posts.every(c => /sendUpdates=none/.test(c[1])));
  assert.strictEqual(posts[0][2].summary, "이하나 레슨"); assert.strictEqual(posts[0][2].start.dateTime, "2030-01-01T19:00:00+09:00"); assert.strictEqual(posts[0][2].end.dateTime, "2030-01-01T19:50:00+09:00");
  assert.deepStrictEqual(posts[0][2].reminders.overrides.map(o => o.minutes), [60, 0]);
  const sch = Object.values(files).find(x => x.name === "레슨일정.json").obj; assert.strictEqual(sch.items.length, 5);
  // 캘린더 줄: 미래는 예정, 강사 앱은 옮길 수 있게 event_id
  const days = f.schDays(sch.items); assert.ok(days.every(x => x.s === "scheduled" && x.event_id && x.sch)); assert.strictEqual(days.find(x => x.date === "2030-01-08").time, "19:00");
  // 이동: 구글 일정 자체를 옮김 + 파일 시각 갱신
  const it = sch.items.find(x => x.start.startsWith("2030-01-08"));
  await f.schMove(it.id, "2030-01-09", "20:00"); assert.deepStrictEqual(moved.at(-1), [it.event_id, "2030-01-09T20:00"]);
  assert.ok(f.schCache().self.items.find(x => x.id === it.id).start === "2030-01-09T20:00:00+09:00");
  // 휴강: 제목 [휴강]·알림 끔 → 되돌리기
  await f.schCancel(it.id, true); let p = cal.filter(c => c[0] === "PATCH").at(-1); assert.ok(p[2].summary.startsWith("[휴강]") && p[2].reminders.overrides.length === 0);
  assert.strictEqual(f.schDays(f.schCache().self.items).find(x => x.sch === it.id).s, "cancelled");
  await f.schCancel(it.id, false); p = cal.filter(c => c[0] === "PATCH").at(-1); assert.strictEqual(p[2].summary, "이하나 레슨");
  // 지우기: 구글에서도 지움
  await f.schDelete(it.id); assert.ok(cal.some(c => c[0] === "DELETE" && c[1].includes(it.event_id))); assert.strictEqual(f.schCache().self.items.length, 4);
  // 지난 레슨 · 원장 화면(보기만: 옮기기용 event_id 없음, 강사 색)
  const ro = f.schDays([{ id: "x", sid: "S2", start: "2020-01-01T10:00:00+09:00", len: 50, event_id: "E" }], { ro: true, tid: "T9", color: "#ffb27a", tname: "홍강사" })[0];
  assert.strictEqual(ro.s, "past"); assert.ok(!ro.event_id && ro.ev === "E" && ro.ro && ro.color === "#ffb27a");
  assert.notStrictEqual(f.staffColor("T9"), f.staffColor("T8"), "강사마다 다른 색");
  const nums = f.calNums([{ color: "" }, { color: "#ffb27a" }, { color: "#ffb27a" }]); assert.ok(nums.includes(">1<") && nums.includes('background:#ffb27a">2<'));
  // 화면 연결
  assert.ok(src.includes('id="schAdd"') && src.includes("schEditSheet(day[+b.dataset.se]") && src.includes("if (x.sch) { await schMove(x.sch, dt, tm);"));
  assert.ok(src.includes("구글 캘린더 앱에서 직접 바꾼 건 여기로 돌아오지 않아요"), "사용 안내");
  console.log("staff-calendar ok");
})().catch(e => { console.error(e); process.exit(1); });
// 3단계: 강사 수강생 노트엔 강사 이름 · 강사 폴더에 녹음함
{ const s2 = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
  assert.ok(s2.includes('${l.teacher_name ? esc(l.teacher_name) + " " : ""}선생님 한마디') && src.includes("teacher_name: noteTeacher()"));
  const nt = new Function("cfg", "cur", "isStaffApp", "staffOf", src.match(/function noteTeacher\(\) \{[\s\S]*?\n\}\n/)[0] + "return noteTeacher();");
  assert.strictEqual(nt({ students: { S2: { teacher_id: "T9" } } }, { sid: "S2" }, () => false, () => ({ T9: { name: "홍강사" } })), "홍강사");
  assert.strictEqual(nt({ students: { S1: {} } }, { sid: "S1" }, () => false, () => ({})), "", "원장 수강생은 그대로 ‘선생님 한마디’");
  assert.strictEqual(nt({ name: "홍강사" }, {}, () => true, () => ({})), "홍강사");
  assert.ok(src.includes('joinMakeFolder("녹음함", folder)')); }
