// (11/02 사용자 시안 승인) 강사 계정: 강사로 승인 → 강사 폴더·_강사시스템 설정·공유, 강사 설정엔 그 강사 수강생만
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const code = g(/const JOIN_STAFF = [^\n]*\n/) + g(/const staffOf = [^\n]*\n/) + g(/const staffEmails = [^\n]*\n/) + g(/async function cfgUpdate\([\s\S]*?\n\}\n/) + g(/function staffConfigFor\([\s\S]*?\n\}\n/) + g(/async function joinCreateStaff\([\s\S]*?\n\}\n/) + g(/function joinStudentName\([\s\S]*?\n\}\n/);
(async () => {
  let cfgObj = { _configId: "CFG", practice_check: true, student_page_url: "https://x/s/", students: { S1: { name: "윤지선", folder: "F1" }, S2: { name: "김하나", folder: "F2", teacher_id: "T9" } }, staff: {} };
  const calls = [], files = {}; let n = 0, version = 1, stored = JSON.parse(JSON.stringify(cfgObj));
  const api = async (url, opt = {}) => { calls.push([opt.method || "GET", url, opt.body]);
    const j = (o) => ({ json: async () => o });
    if (url.includes("/files/F1?fields=parents")) return j({ parents: ["ROOT"] });
    if (url.includes("/files/CFG?fields=version")) return j({ version });
    if (url.includes("/files/CFG?alt=media")) return j(JSON.parse(JSON.stringify(stored)));
    if (url.includes("/permissions")) return j({ id: "PERM" });
    throw new Error("unexpected " + url); };
  const joinMakeFolder = async (name, parent) => { const id = "D" + (++n); files[id] = { name, parent }; return id; };
  const writeJSON = async (folder, name, obj, id) => { if (id === "CFG") { stored = JSON.parse(JSON.stringify(obj)); version++; return id; } files[id || "J" + (++n)] = { name, folder, obj }; return id || "J" + n; };
  const adoptConfig = (c) => { cfgObj = Object.assign(c, { _configId: "CFG" }); };
  const LS = { get: (k) => k === "vn_hint" ? "burninsongs@gmail.com" : null };
  const f = new Function("api", "joinMakeFolder", "writeJSON", "adoptConfig", "LS", "DRIVE", "getCfg", "esc",
    `let cfg; Object.defineProperty(globalThis, "__c", { get: getCfg, configurable: true });\n` + code.replace(/\bcfg\b/g, "__c") + "return { joinCreateStaff, staffConfigFor };")(api, joinMakeFolder, writeJSON, adoptConfig, LS, "D", () => cfgObj, (s) => s);
  const r = await f.joinCreateStaff("홍강사", "ECO9336@gmail.com");
  assert.ok(r.tid.startsWith("TCH_"));
  const names = Object.values(files).map(x => x.name);
  assert.ok(names.includes("강사_홍강사") && names.includes("_강사시스템") && names.includes("수강생") && names.includes("config.json"));
  const perm = calls.find(c => c[1].includes("/permissions")); const pb = JSON.parse(perm[2]);
  assert.deepStrictEqual([pb.role, pb.type, pb.emailAddress], ["writer", "user", "eco9336@gmail.com"], "강사 폴더만 편집 공유");
  assert.strictEqual(files[Object.keys(files).find(k => files[k].name === "강사_홍강사")].parent, "ROOT");
  const st = stored.staff[r.tid]; assert.strictEqual(st.email, "eco9336@gmail.com"); assert.strictEqual(stored.staff_owner.email, "burninsongs@gmail.com");
  assert.deepStrictEqual(stored.staff_owner.roles, ["owner", "teacher", "developer"]);
  const sc = files[Object.keys(files).find(k => files[k].name === "config.json")].obj;
  assert.strictEqual(sc.role, "teacher"); assert.deepStrictEqual(sc.students, {}, "새 강사는 수강생 없음(다른 수강생 안 보임)");
  const sc2 = f.staffConfigFor(stored.students ? { ...stored } : stored, "T9"); assert.deepStrictEqual(Object.keys(sc2.students), ["S2"]);
  assert.ok(!("payments" in sc2) && !("portal_url" in sc2) && !("kick_url" in sc2));
  await assert.rejects(f.joinCreateStaff("다른이름", "eco9336@gmail.com"), /이미 강사/);
  // 앱: 진짜 _시스템 → 체험 → 강사 순서
  const lc = g(/async function loadConfig\(\) \{[\s\S]*?\n\}\n/);
  assert.ok(lc.indexOf("_시스템'") < lc.indexOf("_체험시스템") && lc.indexOf("_체험시스템") < lc.indexOf("_강사시스템") && lc.includes('cfg.role !== "teacher") continue'));
  console.log("staff ok");
})().catch(e => { console.error(e); process.exit(1); });
