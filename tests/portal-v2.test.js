// 수강생 노트 v2(시트 방식) 선생님 앱 쪽 시험 — index.html의 portal/publishNote/closeWithdrawn을 가짜 환경에서 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const pick = (re) => { const m = src.match(re); assert.ok(m, "코드 조각 못 찾음: " + re); return m[0]; };
const body = [
  pick(/async function portal\([\s\S]*?\n}\n/), pick(/async function loadAccounts\(\)[\s\S]*?\n}\n/),
  pick(/async function closeWithdrawn[\s\S]*?\n}\n/), pick(/const noteFileIds[^\n]*\n/),
  pick(/async function openLink[\s\S]*?\n}\n/), pick(/async function publishNote\(\)[\s\S]*?\n}\n/),
].join("\n");
function env(cfg, cur) {
  const log = [];
  const fetch = async (url, opt) => { const b = JSON.parse(opt.body); log.push(["portal", b.action, b]);
    if (b.action === "t_state") return { json: async () => ({ ok: true, accounts: cfg._acc || [], requests: [], seen: {} }) };
    return { json: async () => ({ ok: true }) }; };
  const api = async (url, opt) => { log.push(["drive", opt?.method || "GET", url]); return { json: async () => ({ id: "P" }) }; };
  const f = new Function("cfg", "cur", "fetch", "api", "DRIVE", "savedToken", "getToken", "writeJSON", "saveReview", "buildNote",
    `let token = "T"; const NOTE = "수강생노트.json"; ${body}; return { portal, loadAccounts, closeWithdrawn, publishNote };`);
  const writeJSON = async (folder, name) => { log.push(["write", name]); return "NEWID"; };
  return { log, m: f(cfg, cur, fetch, api, "DRIVE", () => "T", async () => "T", writeJSON, async () => log.push(["review"]), () => cur._note) };
}
(async () => {
  const note = { lesson_id: "L1", date: "2026-10-26", published_at: "p", best: { file_id: "B1" }, extra_best: [{ file_id: "C1" }, null], clips: [{ file_id: "K1" }, { file_id: "K2" }] };
  // 1. 게시: 녹음 4개를 먼저 링크로 연 뒤 시트에 노트, 그다음 드라이브 사본
  {
    const cur = { st: { name: "가" }, sid: "S1", files: [], folder: { id: "L1" }, review: {}, _note: note };
    const { log, m } = env({ portal_url: "https://x", students: {} }, cur);
    await m.publishNote();
    const perms = log.filter(x => x[0] === "drive" && x[1] === "POST").map(x => x[2]);
    assert.deepStrictEqual(perms.map(u => u.split("/files/")[1].split("/")[0]), ["B1", "C1", "K1", "K2"]);
    assert.ok(perms.every(u => u.includes("sendNotificationEmail=false")));
    const iNote = log.findIndex(x => x[1] === "t_note"), iLastPerm = log.map(x => x[1]).lastIndexOf("POST"), iWrite = log.findIndex(x => x[0] === "write");
    assert.ok(iLastPerm < iNote && iNote < iWrite, "순서: 링크 열기 → 시트 → 사본");
    assert.strictEqual(log[iNote][2].sid, "S1"); assert.strictEqual(log[iNote][2].note.lesson_id, "L1");
    assert.strictEqual(log[iNote][2].access_token, "T");
  }
  // 2. 동의 철회 수강생은 게시 거부(아무것도 열지 않음)
  {
    const cur = { st: { name: "가", consent_withdrawn: "2026-10-26" }, sid: "S1", files: [], folder: { id: "L1" }, review: {}, _note: note };
    const { log, m } = env({ portal_url: "https://x", students: {} }, cur);
    await assert.rejects(m.publishNote(), /철회/);
    assert.strictEqual(log.length, 0);
  }
  // 3. 연결 주소 없으면 게시 전에 멈춤(링크도 안 엶)
  {
    const cur = { st: { name: "가" }, sid: "S1", files: [], folder: { id: "L1" }, review: {}, _note: { lesson_id: "L1" } };
    const { log, m } = env({ students: {} }, cur);
    await assert.rejects(m.publishNote(), /portal_url/);
    assert.ok(!log.some(x => x[0] === "write"));
  }
  // 4. 철회된 수강생의 승인은 '닫힘'으로, 다른 수강생은 그대로
  {
    const cfg = { portal_url: "https://x", students: { S1: { consent_withdrawn: true }, S2: {} },
      _acc: [{ email: "a@x", sid: "S1", state: "approved" }, { email: "b@x", sid: "S2", state: "approved" }, { email: "c@x", sid: "S1", state: "rejected" }] };
    const { log, m } = env(cfg, {});
    const { rows, acc } = await m.loadAccounts();
    assert.strictEqual(acc.approved["b@x"], "S2");
    await m.closeWithdrawn(rows);
    const sets = log.filter(x => x[1] === "t_account").map(x => x[2]);
    assert.deepStrictEqual(sets.map(s => [s.email, s.state]), [["a@x", "closed"]]);
  }
  console.log("portal-v2 ok (4 scenarios)");
})().catch((e) => { console.error(e); process.exit(1); });
