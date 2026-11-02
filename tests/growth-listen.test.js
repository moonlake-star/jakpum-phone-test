// (11/02) 성장 탭 ▶ 예시 듣기(레슨 음정분석 근거 시각) · 같은 곡 처음/지금(메이크업 원래 목소리, 노래 시작부터) · 수강생 페이지 버튼
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const seg = src.slice(src.indexOf('const SAME_FILE = "before_vocal.mp3";'), src.indexOf("async function pushGrowthAll() {"));
(async () => {
  const files = { F1: [{ name: "음정분석.json", id: "P1" }], F2: [{ name: "음정분석.json", id: "P2" }], MK1: [{ name: "before_vocal.mp3", id: "V1" }], MK2: [] };
  const jsons = { P1: { observations: [{ id: "bias", evidence: [{ t: 65.2, lyric: "사랑으로" }] }, { id: "weak_band", evidence: [{ t: 80, lyric: "" }, { t: 90 }] }, { id: "range", evidence: [{ t: 1 }] }] },
    P2: { observations: [{ id: "bias", evidence: [{ t: 30 }, { t: 40 }] }] } };
  const store = {}, opened = [];
  const f = new Function("list", "api", "LS", "openLink", "$", "esc", "fmt", "saidPlay", "window", "DRIVE", "toast", "errMsg",
    seg + "return { voiceStart, hbExamples, growthSameAudio, sameAudio };")(
    async (id) => files[id] || [], async (u) => ({ json: async () => jsons[u.match(/files\/(\w+)/)[1]] }), { get: (k) => store[k], set: (k, v) => { store[k] = v; } },
    async (id) => opened.push(id), () => null, (s) => String(s), (t) => String(t), () => {}, {}, "D", () => {}, (e) => e.message);
  // 무음 1초 뒤 소리 → 약 0.6초
  const sr = 1000, x = new Float32Array(3000); for (let i = 1000; i < 3000; i++) x[i] = Math.sin(i) * 0.5;
  assert.strictEqual(f.voiceStart(x, sr), 0.6);
  assert.strictEqual(f.voiceStart(new Float32Array(500), sr), 0);
  // 습관 근거: 최근 레슨부터, 종류마다 최대 2개
  const ex = await f.hbExamples("S", [{ kind: "lesson", id: "F1", date: "2026-10-25" }, { kind: "makeup", id: "MK1" }, { kind: "lesson", id: "F2", date: "2026-10-29" }]);
  assert.deepStrictEqual(ex.bias.map(e => [e.lesson, e.t]), [["F2", 30], ["F2", 40]]);
  assert.deepStrictEqual(ex.band.map(e => [e.lesson, e.t]), [["F1", 80], ["F1", 90]]);
  // 같은 곡: 메이크업만, 파일 없으면 건너뜀, 링크는 한 번만 열기
  store.vn_same_aud = { MK1: { f: "V1", t0: 12.3 } };
  const n = { same: [{ first: { mk: true, id: "MK1" }, last: { mk: true, id: "MK2" } }, { first: { lesson: true, id: "F1" }, last: { mk: true, id: "MK1" } }] };
  await f.growthSameAudio(n);
  assert.deepStrictEqual([n.same[0].first.f, n.same[0].first.t0, n.same[0].last.f, n.same[1].first.f], ["V1", 12.3, undefined, undefined]);
  assert.deepStrictEqual(opened, ["V1"], "같은 파일은 한 번만 공개");
  // 연결
  assert.ok(src.includes('data-hb="${hk[ic]}"') && src.includes("hbExamples(sid, songs)") && src.includes("await growthSameAudio(n)"));
  assert.ok(src.includes('lesson: o.x.kind === "lesson", id: o.x.id || "", mk: o.x.kind === "makeup"'));
  assert.ok(stu.includes('class="grPlay" data-f="${esc(s.first.f)}"') && stu.includes("▶ 지금 (") && stu.includes("grAud.currentTime > t0 + 20"));
  console.log("growth-listen ok");
})().catch(e => { console.error(e); process.exit(1); });
