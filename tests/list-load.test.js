// 선생님 목록 불러오기 시험 — studentData/listData를 꺼내 가짜 드라이브(지연·실패 주입)로 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const lim = src.match(/function limiter[\s\S]*?\n}\n/)[0];
const m = src.match(/const LIST_CONC[\s\S]*?\nconst listData[\s\S]*?\n}\)\);\n/);
assert.ok(m, "목록 동시성 제한/부분 실패 처리 코드를 찾지 못함");
const body = m[0];

function mkDrive(nStu, nLes, fail = {}) {
  const st = { active: 0, max: 0, calls: 0 }, tree = {}, students = {};
  for (let s = 0; s < nStu; s++) {
    const sid = "s" + s, root = "R" + s; students[sid] = { name: sid, sub: { "02_레슨": root } };
    tree[root] = Array.from({ length: nLes }, (_, i) => ({ id: `L${s}_${i}`, name: `2026-10-${String(10 + i).padStart(2, "0")}_${i + 1}회차`, mimeType: "application/vnd.google-apps.folder" }));
    for (const l of tree[root]) tree[l.id] = [{ id: l.id + "_rv", name: "검수.json", mimeType: "application/json" }];
  }
  const io = async (key) => { st.calls++; st.active++; st.max = Math.max(st.max, st.active);
    await new Promise(r => setTimeout(r, 1)); st.active--; if (fail[key]) throw new Error("드라이브 503: " + key); };
  const list = async (id) => { await io(id); return tree[id] || []; };
  const readJSON = async (id) => { await io(id); return { sent: { feedback: true } }; };
  return { st, students, list, readJSON };
}
function mk(d) {
  const f = new Function("cfg", "list", "readJSON", "loadSubs", "REVIEW", "NOTE", "MKREQ",
    `${lim}; ${body}; return { listData, studentData, LIST_CONC };`);
  return f({ students: d.students }, d.list, d.readJSON, async () => ({ recs: [] }), "검수.json", "노트.json", "요청.json");
}
(async () => {
  // 1. 20명 × 10레슨: 동시 호출이 6개를 넘지 않고, 모든 레슨이 정상
  { const d = mkDrive(20, 10), a = mk(d);
    const data = await a.listData();
    assert.strictEqual(a.LIST_CONC, 6); assert.ok(d.st.max <= 6, "동시 " + d.st.max); assert.ok(d.st.max >= 2);
    assert.strictEqual(data.length, 20); assert.ok(data.every(x => !x.err && x.rows.length === 10 && x.rows.every(r => r.fb && !r.err)));
    assert.ok(!("err" in data[0].rows[0])); }                                          // 정상 행 형식은 예전 그대로
  // 2. 레슨 하나 실패 → 그 레슨만 err, 나머지·다른 학생은 정상
  { const d = mkDrive(3, 4, { L1_2: 1 }), data = await mk(d).listData();
    assert.ok(data.every(x => !x.err));
    const bad = data[1].rows.find(r => r.l.id === "L1_2");
    assert.ok(bad.err && /503/.test(bad.err)); assert.deepStrictEqual(bad.files, []);
    assert.strictEqual(data[1].rows.filter(r => r.err).length, 1); assert.strictEqual(data[0].rows.filter(r => r.err).length, 0); }
  // 3. 실패한 레슨은 지난번 저장본의 상태(fb 등)를 유지
  { const d = mkDrive(1, 2, { L0_0: 1 }), prev = [{ sid: "s0", rows: [{ l: { id: "L0_0" }, fb: true, ai: true, pub: true }] }];
    const r = (await mk(d).listData(prev))[0].rows.find(x => x.l.id === "L0_0");
    assert.ok(r.err && r.fb && r.ai && r.pub); }
  // 4. 학생 한 명의 레슨 폴더 목록 실패 → 그 학생만 err(지난번 행 유지), 목록 전체는 성공
  { const d = mkDrive(3, 2, { R2: 1 }), prev = [{ sid: "s2", rows: [{ l: { id: "old" }, fb: false }], subs: [{ memo: "m" }], jobs: [] }];
    const data = await mk(d).listData(prev);
    assert.strictEqual(data.length, 3); assert.ok(!data[0].err && !data[1].err);
    assert.ok(/503/.test(data[2].err)); assert.strictEqual(data[2].rows[0].l.id, "old"); assert.strictEqual(data[2].subs[0].memo, "m");
    const none = (await mk(mkDrive(1, 1, { R0: 1 })).listData())[0];                // 저장본 없으면 빈 칸 + err
    assert.ok(none.err); assert.deepStrictEqual(none.rows, []); }
  console.log("list-load ok (4 scenarios)");
})().catch((e) => { console.error(e); process.exit(1); });
