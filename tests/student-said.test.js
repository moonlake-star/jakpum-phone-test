// '수강생이 한 말' 확인(맞아요/아니에요) 시험 — index.html의 확인 블록을 가짜 Drive에 붙여 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const body = src.match(/\/\/ ── 수강생이 한 말 확인\(백엔드[\s\S]*?\/\/ ── 수강생이 한 말 확인 끝 ──/)[0];

function makeDrive(initial, hooks = {}) {
  const d = { file: JSON.parse(JSON.stringify(initial)), version: 1, writes: 0, hooks };
  d.external = (fn) => { fn(d.file); d.version++; };          // 자동 수집기의 저장
  d.api = async (url, opt = {}) => {
    const json = (o) => ({ json: async () => JSON.parse(JSON.stringify(o)) });
    if (url.includes("fields=version")) { d.hooks.onVer?.(d); return json({ version: String(d.version) }); }
    if (url.includes("alt=media")) { assert.ok(/_=\d+/.test(url) && opt.cache === "no-store", "캐시 없이 최신본을 읽어야 함"); d.hooks.onRead?.(d); return json(d.file); }
    throw new Error("unexpected " + url);
  };
  d.writeJSON = async (folder, name, obj, id) => { assert.strictEqual(id, "REC"); d.hooks.beforeWrite?.(d); d.file = JSON.parse(JSON.stringify(obj)); d.version++; d.writes++; return id; };
  d.list = async (folder) => { assert.strictEqual(folder, "F1"); return [{ id: "X", name: "레슨분석.json" }, { id: "REC", name: "수강생기록.json" }]; };
  return d;
}
const mk = (cfg, drive) => new Function("cfg", "api", "writeJSON", "list", "DRIVE", "esc", "toast", "errMsg", "rootFile", "paintBriefing", "stuCur",
  `${body}\n; return { saidUsed, saidPending, patchSaid, setSaid, saidBoxHTML };`)(cfg, drive.api, drive.writeJSON, drive.list, "DRIVE",
  (s) => String(s ?? ""), () => {}, (e) => e.message, async () => null, () => {}, null);
const rec0 = () => ({
  briefing: "지난 레슨 요약",
  profile: {
    goal: [
      { quote: "고음을 편하게", meaning: "고음 목표", date: "2026-10-01", lesson: "L1" },                       // 예전(표시 없음)
      { quote: "축가 부르고 싶어요", meaning: "", date: "2026-10-20", lesson: "L2", t: 12, approved: false },
      { quote: "축가 부르고 싶어요", meaning: "", date: "2026-10-25", lesson: "L3", t: 40, approved: false },   // 같은 말, 다른 레슨
    ],
    worry: [{ quote: "목이 쉬어요", meaning: "", date: "2026-10-20", lesson: "L2", approved: false }],
    taste: [{ quote: "발라드 좋아요", date: "2026-10-20", lesson: "L2", approved: true }],
  },
  songs: { "사랑": { artist: "A", mentions: [], key_notes: [] } },
  lessons: [{ id: "L2", date: "2026-10-20" }],
});
const cfg = () => ({ students: { s1: { name: "가", folder: "F1", _root: { "수강생기록.json": { at: "t", data: {} } } } } });
const K = { kind: "goal", quote: "축가 부르고 싶어요", date: "2026-10-20", lesson: "L2" };
(async () => {
  // 1. 맞아요 → 그 한 항목만 true, 같은 말의 다른 레슨 항목·다른 종류·다른 필드는 그대로
  {
    const d = makeDrive(rec0()), c = cfg(), app = mk(c, d);
    await app.setSaid("s1", K, true);
    const exp = rec0(); exp.profile.goal[1].approved = true;
    assert.deepStrictEqual(d.file, exp);
    assert.strictEqual(d.file.profile.goal[2].approved, false);
    assert.strictEqual(d.writes, 1);
    assert.ok(!c.students.s1._root["수강생기록.json"], "캐시를 비워 다음 화면에서 새로 읽음");
  }
  // 2. 화면을 연 뒤(앱이 읽은 뒤) 수집기가 새 레슨·새 말을 저장 → 클릭해도 그 변경 유지
  {
    const d = makeDrive(rec0()), app = mk(cfg(), d);
    const shown = app.saidPending(JSON.parse(JSON.stringify(d.file)));   // 앱이 들고 있는 예전 화면
    assert.strictEqual(shown.length, 3);
    d.external((f) => { f.lessons.push({ id: "L4", date: "2026-10-26" }); f.profile.worry.push({ quote: "숨이 차요", date: "2026-10-26", lesson: "L4", approved: false }); f.briefing = "새 브리핑"; });
    await app.setSaid("s1", { kind: "worry", ...shown.find(x => x.kind === "worry") }, "rejected");
    assert.strictEqual(d.file.lessons.length, 2);
    assert.strictEqual(d.file.briefing, "새 브리핑");
    assert.strictEqual(d.file.profile.worry.length, 2);
    assert.strictEqual(d.file.profile.worry[0].approved, "rejected");   // 지우지 않고 표시만
    assert.strictEqual(d.file.profile.worry[1].approved, false);
  }
  // 3. 읽는 도중 수집기가 저장 → 다시 읽고 그 변경 위에 고침
  {
    let once = true;
    const d = makeDrive(rec0(), { onRead: (dd) => { if (once) { once = false; dd.external((f) => { f.songs["새곡"] = { mentions: [] }; }); } } });
    await mk(cfg(), d).setSaid("s1", K, true);
    assert.ok(d.file.songs["새곡"]);
    assert.strictEqual(d.file.profile.goal[1].approved, true);
    assert.strictEqual(d.writes, 1);
  }
  // 4. 쓰기 직후 수집기가 예전본으로 덮음 → 확인에서 걸려 다시 써서 반영
  {
    let once = true;
    const d = makeDrive(rec0(), { beforeWrite: (dd) => {} });
    const orig = d.writeJSON;
    d.writeJSON = async (...a) => { const r = await orig(...a); if (once) { once = false; d.external((f) => { f.profile.goal[1].approved = false; f.lessons.push({ id: "L5" }); }); } return r; };
    await mk(cfg(), d).setSaid("s1", K, true);
    assert.strictEqual(d.file.profile.goal[1].approved, true);
    assert.strictEqual(d.file.lessons.at(-1).id, "L5");
    assert.strictEqual(d.writes, 2);
  }
  // 5. 계속 바뀌면 쓰지 않고 실패(fail-closed), 최신본에 그 말이 없으면 쓰지 않음
  {
    const d = makeDrive(rec0(), { onVer: (dd) => dd.version++ });
    await assert.rejects(mk(cfg(), d).setSaid("s1", K, true), /잠시 뒤/);
    assert.strictEqual(d.writes, 0);
    const d2 = makeDrive(rec0());
    await assert.rejects(mk(cfg(), d2).setSaid("s1", { ...K, date: "2026-10-21" }, true), /찾지 못했어요/);
    assert.strictEqual(d2.writes, 0);
  }
  // 6. 서버 규칙과 같음: true·표시 없음만 사용, false·"rejected"·null은 제외 / 확인 전 목록은 false만
  {
    const app = mk(cfg(), makeDrive(rec0()));
    assert.deepStrictEqual([{}, { approved: true }, { approved: false }, { approved: "rejected" }, { approved: null }].map(app.saidUsed), [true, true, false, false, false]);
    const r = rec0(); app.patchSaid(r, K, "rejected");
    assert.ok(!r.profile.goal.filter(app.saidUsed).some(x => x.lesson === "L2"));
    assert.deepStrictEqual(app.saidPending(r).map(x => x.kind + x.lesson), ["goalL3", "worryL2"]);
    assert.deepStrictEqual(app.saidPending(rec0(), "L3").map(x => x.date), ["2026-10-25"]);   // 레슨 화면은 그 레슨 것만
    const h = app.saidBoxHTML(app.saidPending(rec0()));
    assert.ok(h.includes("확인 전") && h.includes("맞아요") && h.includes("아니에요"));
    assert.strictEqual(app.saidBoxHTML([]), "");
  }
  console.log("student-said: ok");
})().catch((e) => { console.error(e); process.exit(1); });
