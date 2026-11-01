// (11/02 사용자 시안 승인) 신규 수강생 등록·첫 레슨 배치: 배치 알림 파일 쓰기/읽기, 화면 연결
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
(async () => {
  const store = {}; let n = 0;
  const list = async (sys) => Object.entries(store).filter(([, v]) => v.parent === sys).map(([id, v]) => ({ id, name: v.name }));
  const api = async (url) => ({ json: async () => JSON.parse(JSON.stringify(store[url.split("/files/")[1].split("?")[0]].obj)) });
  const writeJSON = async (folder, name, obj, id) => { id = id || "F" + (++n); store[id] = { parent: folder || store[id]?.parent, name, obj }; return id; };
  const f = new Function("list", "api", "writeJSON", "DRIVE", g(/const ASSIGN_FILE = [^\n]*\n/) + g(/async function asgRead\([^\n]*\n/) + g(/async function asgAdd\([^\n]*\n/) + "return { asgRead, asgAdd };")(list, api, writeJSON, "D");
  await f.asgAdd("SYS", { id: "A1", name: "김하나", start: "2026-11-06T19:00:00+09:00", len: 50, profile: "50대" });
  await f.asgAdd("SYS", { id: "A2", name: "이둘" });
  const r = await f.asgRead("SYS"); assert.deepStrictEqual(r.items.map(x => x.id), ["A1", "A2"], "한 파일에 이어 붙임");
  assert.ok(src.includes('id="nsBtn"') && src.includes("newStudentSheet()") && src.includes("asgStaffCheck()"), "버튼·강사 팝업 연결");
  assert.ok(src.includes("attendees: [{ email: s.email }], guestsCanModify: true") && src.includes("events?sendUpdates=all"), "강사 초대(폰 알림)·강사도 옮기기 가능");
  assert.ok(src.includes('sys: s.sys || "", folder: s.folder || ""'), "강사 설정에 배치 알림 위치");
  console.log("assign ok");
})().catch(e => { console.error(e); process.exit(1); });
