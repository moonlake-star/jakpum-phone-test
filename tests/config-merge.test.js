// config.json stale overwrite 방지 시험 — index.html의 saveSubFolder/adoptConfig를 가짜 Drive에 붙여 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const body = src.match(/async function saveSubFolder[\s\S]*?\nfunction adoptConfig[\s\S]*?\n}\n/)[0];

function makeDrive(initial, hooks = {}) {
  const d = { file: JSON.parse(JSON.stringify(initial)), version: 1, writes: 0, hooks };
  d.external = (fn) => { fn(d.file); d.version++; };          // 다른 기기/관리자의 변경
  d.api = async (url, opt = {}) => {
    const json = (o) => ({ json: async () => JSON.parse(JSON.stringify(o)) });
    if (url.includes("fields=version")) { d.hooks.onVer?.(d); return json({ version: String(d.version) }); }
    if (url.includes("alt=media")) { d.hooks.onRead?.(d); return json(d.file); }
    if (opt.method === "PATCH") {
      d.hooks.beforeWrite?.(d);
      d.file = JSON.parse(await opt.body.text()); d.version++; d.writes++; return json({});
    }
    throw new Error("unexpected " + url);
  };
  return d;
}
const mk = (cfg, drive) => {
  const writeJSON = async (folder, name, obj, id) => drive.api(`UPLOAD/files/${id}?uploadType=media`, { method: "PATCH", body: new Blob([JSON.stringify(obj)]) });
  const box = { cfg };
  const f = new Function("box", "api", "writeJSON", "DRIVE", "UPLOAD",
    `let cfg = box.cfg; ${body}; return { saveSubFolder, get cfg() { return cfg; } };`);
  return f(box, drive.api, writeJSON, "DRIVE", "UPLOAD");
};
const base = () => ({
  kick_url: "https://x/y",
  students: {
    s1: { name: "가", folder: "F1", status: "active", sub: { "02_레슨": "L1" } },
    s2: { name: "나", folder: "F2", status: "active", sub: {} },
  },
});
const loaded = (c) => { Object.defineProperty(c, "_configId", { value: "CID", enumerable: false }); return c; };
(async () => {
  // 1. 기기 A가 구버전 로드 → 외부에서 철회·명단·결제 변경 → A가 폴더 생성: 외부 변경 유지
  {
    const d = makeDrive(base());
    const stale = loaded(JSON.parse(JSON.stringify(d.file)));
    d.external((f) => { f.students.s2.consent_withdrawn = "2026-10-26"; f.students.s3 = { name: "다", folder: "F3", sub: {} }; f.students.s1.paid_until = "2026-12-01"; f.new_setting = 1; });
    const app = mk(stale, d);
    assert.strictEqual(await app.saveSubFolder("s1", "04_과제제출", "NEW1"), "NEW1");
    assert.strictEqual(d.file.students.s2.consent_withdrawn, "2026-10-26");
    assert.ok(d.file.students.s3);
    assert.strictEqual(d.file.students.s1.paid_until, "2026-12-01");
    assert.strictEqual(d.file.new_setting, 1);
    assert.strictEqual(d.file.students.s1.sub["04_과제제출"], "NEW1");
    assert.strictEqual(d.file.students.s1.sub["02_레슨"], "L1");
    assert.strictEqual(app.cfg.students.s3.name, "다");               // 메모리 cfg도 최신 + 새 ID
    assert.strictEqual(app.cfg.students.s1.sub["04_과제제출"], "NEW1");
    assert.strictEqual(app.cfg._configId, "CID");
    assert.ok(!JSON.stringify(d.file).includes("_configId"));          // 공개 데이터 형식 유지
  }
  // 2. 화면용 임시값(_로 시작)은 메모리에만 남고 파일에는 안 쓰임
  {
    const d = makeDrive(base()), c = loaded(JSON.parse(JSON.stringify(d.file))); c.students.s1._rows = [1, 2];
    const app = mk(c, d);
    await app.saveSubFolder("s1", "07_커버제작", "MK");
    assert.deepStrictEqual(app.cfg.students.s1._rows, [1, 2]);
    assert.ok(!("_rows" in d.file.students.s1));
  }
  // 3. 철회된 수강생에게는 쓰지 않음(fail-closed) — 실제 운영 규격: consent_withdrawn 필드(날짜 문자열 또는 true)
  for (const val of ["2026-10-26", true]) {
    const d = makeDrive(base()), c = loaded(JSON.parse(JSON.stringify(d.file)));
    d.external((f) => { f.students.s1.consent_withdrawn = val; });       // status는 "active" 그대로
    await assert.rejects(mk(c, d).saveSubFolder("s1", "04_과제제출", "X"), /철회/);
    assert.strictEqual(d.writes, 0);
    assert.ok(!d.file.students.s1.sub["04_과제제출"]);
  }
  // 4. 명단에서 사라진 수강생 → 쓰지 않음
  {
    const d = makeDrive(base()), c = loaded(JSON.parse(JSON.stringify(d.file)));
    d.external((f) => { delete f.students.s1; });
    await assert.rejects(mk(c, d).saveSubFolder("s1", "04_과제제출", "X"), /찾지 못/);
    assert.strictEqual(d.writes, 0);
  }
  // 5. 다른 기기가 이미 같은 폴더 칸을 채움 → 덮어쓰지 않고 그 ID 사용
  {
    const d = makeDrive(base()), c = loaded(JSON.parse(JSON.stringify(d.file)));
    d.external((f) => { f.students.s1.sub["04_과제제출"] = "OTHER"; });
    const app = mk(c, d);
    assert.strictEqual(await app.saveSubFolder("s1", "04_과제제출", "MINE"), "OTHER");
    assert.strictEqual(d.writes, 0);
    assert.strictEqual(app.cfg.students.s1.sub["04_과제제출"], "OTHER");
  }
  // 6. 읽고 쓰는 사이 변경 감지 → 재시도 후 변경 보존
  {
    let injected = false;
    const d = makeDrive(base(), { beforeWrite: null });
    let verCalls = 0;
    d.hooks.onVer = (dd) => { if (++verCalls === 2 && !injected) { injected = true; dd.external((f) => { f.students.s2.paid = true; }); } };
    const app = mk(loaded(JSON.parse(JSON.stringify(d.file))), d);
    await app.saveSubFolder("s1", "04_과제제출", "N");
    assert.strictEqual(d.file.students.s2.paid, true);
    assert.strictEqual(d.file.students.s1.sub["04_과제제출"], "N");
  }
  // 7. 계속 바뀌면 실패(쓰지 않음)
  {
    const d = makeDrive(base());
    d.hooks.onVer = (dd) => dd.external((f) => { f.tick = (f.tick || 0) + 1; });
    await assert.rejects(mk(loaded(JSON.parse(JSON.stringify(d.file))), d).saveSubFolder("s1", "04_과제제출", "N"), /계속 바뀌/);
    assert.strictEqual(d.writes, 0);
  }
  // 8. 쓰기 직후 읽어 보니 내 변경이 없으면(쓰는 사이 다른 기기가 덮음) 재시도, 끝내 안 되면 실패
  {
    const d = makeDrive(base());
    d.hooks.beforeWrite = (dd) => { dd.hooks.beforeWrite = null; dd.hooks.onRead = (x) => { x.hooks.onRead = null; x.file.students.s1.sub = {}; }; };
    const app = mk(loaded(JSON.parse(JSON.stringify(d.file))), d);
    await app.saveSubFolder("s1", "04_과제제출", "N");     // 두 번째 시도에서 성공
    assert.strictEqual(d.file.students.s1.sub["04_과제제출"], "N");
  }
  // 9. [잔여 위험 재현 — 해결 아님] 두 기기가 거의 동시에 저장: 둘 다 '쓰기 직전 버전 확인'을 통과한 뒤
  //    A가 쓰고 확인까지 끝낸 다음 B가 자기가 읽었던 옛 내용으로 쓰면 A의 칸이 사라진다.
  //    Drive v3 내용 쓰기에 조건부 쓰기(If-Match)가 없어 이 수 초짜리 창은 앱만으로는 막을 수 없음.
  {
    const d = makeDrive(base());
    let bAtPatch, aDone; const pB = new Promise(r => bAtPatch = r), pA = new Promise(r => aDone = r);
    const client = (who) => ({ api: async (url, opt = {}) => {
      if (opt.method === "PATCH") { if (who === "A") await pB; else { bAtPatch(); await pA; } }
      return d.api(url, opt);
    } });
    const A = client("A"), B = client("B");
    const appA = mk(loaded(JSON.parse(JSON.stringify(d.file))), A), appB = mk(loaded(JSON.parse(JSON.stringify(d.file))), B);
    const ra = appA.saveSubFolder("s1", "04_과제제출", "A1").then(v => { aDone(); return v; });
    const rb = appB.saveSubFolder("s2", "04_과제제출", "B1");
    assert.deepStrictEqual(await Promise.all([ra, rb]), ["A1", "B1"]);   // 두 기기 모두 '성공'으로 보임
    assert.strictEqual(d.file.students.s2.sub["04_과제제출"], "B1");
    assert.strictEqual(d.file.students.s1.sub["04_과제제출"], undefined,
      "잔여 위험이 재현되지 않음 — 조건부 쓰기가 생겼다면 이 시험을 '보존됨'으로 바꿀 것");
    // 영향: s1의 04_과제제출 폴더는 드라이브에 남고 config 칸만 비게 됨 → 다음에 열면 폴더를 새로 하나 더 만들 수 있음(자료 삭제는 없음)
  }
  console.log("config-merge ok (9 scenarios, 9번은 미해결 잔여 위험 재현)");
})().catch((e) => { console.error(e); process.exit(1); });
