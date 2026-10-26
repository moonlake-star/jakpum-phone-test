// 듣기 연타 시험 — playAt/fetchChunk를 꺼내, 먼저 누른 조각이 늦게 도착해도 나중 것을 덮지 않는지 확인
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const fn = src.match(/async function fetchChunk[\s\S]*?\nasync function playAt[\s\S]*?\n}\n/)[0];
const helpers = (src.match(/let playSeq[\s\S]*?\nfunction setFullSrc[^\n]*\n/) || [""])[0];
assert.ok(helpers, "재생 요청 번호(playSeq) 코드가 없음");

function mk() {
  const pend = [], made = [], revoked = [];
  const URLx = { createObjectURL: (b) => { const u = "blob:" + b.tag; made.push(u); return u; }, revokeObjectURL: (u) => revoked.push(u) };
  const full = { src: "", plays: 0, play: async () => { full.plays++; } };
  const api = (url, opt) => new Promise((ok) => pend.push({ range: opt.headers.Range, done: (tag) => ok({ blob: async () => ({ tag }) }) }));
  const f = new Function("URL", "full", "api", "cur", "player", "toast", "$", "DRIVE",
    `const BPS = 5000, CHUNK = 120; let nextChunk = null, chunkStart = 0, listenFile = null, followTranscript = false;
     ${helpers} ${fn}
     return { playAt, get chunkStart() { return chunkStart; }, setNext: (c) => nextChunk = c, get next() { return nextChunk; } };`);
  const cur = { files: [{ id: "F", name: "듣기용.mp3" }] };
  const el = { classList: { remove() {} } };
  const app = f(URLx, full, api, cur, null, () => {}, () => el, "D");
  return { app, pend, made, revoked, full };
}
const tick = () => new Promise(r => setImmediate(r));
(async () => {
  // 1. A(10초) 누르고 B(300초) 누름 → B가 먼저, A가 늦게 도착 → 화면/소리는 B 유지, A 조각은 해제
  { const t = mk();
    const pA = t.app.playAt(10), pB = t.app.playAt(300); await tick();
    assert.strictEqual(t.pend.length, 2);
    t.pend[1].done("B"); await pB; assert.strictEqual(t.full.src, "blob:B");
    t.pend[0].done("A"); await pA;
    assert.strictEqual(t.full.src, "blob:B", "늦게 온 예전 조각이 덮어씀");
    assert.strictEqual(t.app.chunkStart, 300); assert.ok(t.revoked.includes("blob:A")); assert.strictEqual(t.full.plays, 1); }
  // 2. 순서대로 도착하면 마지막 것 재생 + 바뀐 이전 blob URL 해제
  { const t = mk();
    const p1 = t.app.playAt(0); await tick(); t.pend[0].done("C1"); await p1;
    const p2 = t.app.playAt(120); await tick(); t.pend[1].done("C2"); await p2;
    assert.strictEqual(t.full.src, "blob:C2"); assert.deepStrictEqual(t.revoked, ["blob:C1"]); }
  // 3. 미리 받는 중(아직 URL 없음)인 다음 조각과 같은 위치를 눌러도 빈 src로 재생하지 않음
  { const t = mk(); t.app.setNext({ t0: 120, loading: true });
    const p = t.app.playAt(120); await tick(); assert.strictEqual(t.pend.length, 1); t.pend[0].done("N"); await p;
    assert.strictEqual(t.full.src, "blob:N"); }
  // 4. 다 받아 둔 다음 조각은 그대로 사용(추가 요청 없음), 다른 곳을 누르면 그 조각은 해제
  { const t = mk(); t.app.setNext({ t0: 120, url: "blob:pre" });
    await t.app.playAt(120); assert.strictEqual(t.pend.length, 0); assert.strictEqual(t.full.src, "blob:pre");
    t.app.setNext({ t0: 240, url: "blob:pre2" }); const p = t.app.playAt(500); await tick(); t.pend[0].done("Z"); await p;
    assert.ok(t.revoked.includes("blob:pre2")); assert.strictEqual(t.app.next, null); }
  console.log("playat-seq ok (4 scenarios)");
})().catch((e) => { console.error(e); process.exit(1); });
