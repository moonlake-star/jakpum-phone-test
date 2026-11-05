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
  // 앱: 진짜 _시스템 → 강사 → 체험 순서(11/05)
  const lc = g(/async function loadConfig\(\) \{[\s\S]*?\n\}\n/);
  assert.ok(lc.indexOf("_시스템'") < lc.indexOf("_체험시스템") && lc.indexOf("_강사시스템") < lc.indexOf("_체험시스템") && lc.includes('cfg.role !== "teacher") continue'));
  console.log("staff ok");
})().catch(e => { console.error(e); process.exit(1); });

// (11/05 사용자) 강사 본인 작업칸: 원장 앱에서 만들면 그 강사 폴더 안에 status "teacher" 칸 → 강사 앱 목록에 '선생님 본인 곡·작업'(메이크업·커버 탭)
{
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "teacher", "index.html"), "utf8");
  assert.ok(src.includes('async function joinCreateStudent(rawName, forTest = false, tid = "", self = false)') && src.includes('status: self ? "teacher" : forTest ? "test" : "active"'), "본인 작업칸은 status teacher");
  assert.ok(src.includes("async function createSelfSlot(tid)") && src.includes('joinCreateStudent(s.name + "(선생님)", false, tid, true)') && src.includes("data-selfmk"), "원장 앱 강사 권한 칸에 '작업칸 만들기'");
  assert.ok(src.includes('x.status !== "teacher" && !x.consent_withdrawn'), "본인 작업칸은 수강생 노트 서버 권한 목록에서 뺌");
  console.log("staff: 본인 작업칸 ok");
}

// (11/05 사용자) 원장 화면 '강사 · 고급 보정 권한' 칸은 강사가 없어도 보이고 바로 강사 추가 · 강사 계정이 체험 보기보다 먼저
{
  const s2 = require("fs").readFileSync(require("path").join(__dirname, "..", "teacher", "index.html"), "utf8");
  assert.ok(s2.includes('if (isStaffApp() || isDemo()) { box.innerHTML = ""; return; }') && s2.includes('id="stfAdd"') && s2.includes("await joinCreateStaff(nm, em)"), "강사 없어도 칸이 보이고 바로 강사 등록");
  assert.ok(s2.indexOf("name='_강사시스템'") < s2.indexOf("name='_체험시스템'") && s2.includes("if (cfg.demo_readonly !== true) { Object.defineProperty(cfg, \"_configId\", { value: cid"), "강사 계정이 체험 보기보다 먼저, 저장된 체험판이면 다시 찾음");
  console.log("staff: 강사 패널·로드 순서 ok");
}

// (11/05 사용자) 원장 앱을 열면 본인 작업칸 없는 강사 칸을 자동으로 만듦(한 번에 하나씩, 실패한 강사는 반복 안 함)
{
  const s3 = require("fs").readFileSync(require("path").join(__dirname, "..", "teacher", "index.html"), "utf8");
  assert.ok(s3.includes("const selfAuto = { busy: false, fail: {}, ok: {}, checked: {} };") && s3.includes("if (!selfAuto.busy && S.some(([k]) => !selfSlotOf(k) && !selfAuto.fail[k]))") && s3.includes("if (made) paintAdvPerm();"), "작업칸 자동 만들기(무한 반복 방지)");
  console.log("staff: 작업칸 자동 ok");
}

// (11/05) 강사 앱 설정에 작업칸이 실제로 들어갔는지 읽어서 확인·재전송
{
  const s4 = require("fs").readFileSync(require("path").join(__dirname, "..", "teacher", "index.html"), "utf8");
  assert.ok(s4.includes("async function staffVerify(tid, fix)") && s4.includes("강사 앱에 반영됨") && s4.includes("data-resend") && s4.includes("staffConfigFor(cfg, tid), s.cfg_id"), "강사 앱 반영 확인·다시 보내기");
  console.log("staff: 반영 확인 ok");
}

// (11/05 사용자) 강사도 올리자마자 서버를 바로 깨움: 강사 설정에 kick_url 전달 + 반영 확인에 포함
{
  const src = require("fs").readFileSync(require("path").join(__dirname, "..", "teacher", "index.html"), "utf8");
  const a = src.indexOf("function staffConfigFor(c, tid)"), b = src.indexOf("async function staffSync(tid)");
  assert.ok(a > 0 && b > a, "staffConfigFor 위치");
  const staffConfigFor = new Function(src.slice(a, b) + "; return staffConfigFor;")();
  const base = { kick_url: "https://script.google.com/macros/s/ABC/exec", student_page_url: "https://x/s/", github_token: "SECRET", staff: { T1: { name: "송", sys: "S", folder: "F", adv: false } },
    students: { A: { teacher_id: "T1", name: "가" }, B: { teacher_id: "T2", name: "나" } } };
  const c = staffConfigFor(base, "T1");
  assert.strictEqual(c.kick_url, base.kick_url, "강사 설정에 바로 처리 주소");
  assert.deepStrictEqual(Object.keys(c.students), ["A"], "남의 수강생은 안 넘김");
  assert.ok(!JSON.stringify(c).includes("SECRET") && !("github_token" in c), "키·토큰은 안 넘김");
  const { kick_url, ...noKick } = base;
  assert.ok(!("kick_url" in staffConfigFor(noKick, "T1")), "주소가 없으면 빈 칸도 안 만듦");
  // 반영 확인: 작업칸 + 바로 처리 주소가 둘 다 있어야 '반영됨'
  assert.ok(/const has = async \(\) => \{[^}]*students\?\.\[sl\[0\]\][^}]*kick_url/.test(src), "staffVerify가 kick_url까지 확인");
  console.log("staff: 강사 kick_url ok");
}
