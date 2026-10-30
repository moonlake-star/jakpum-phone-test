// (10/30 사용자) 글 속 ▶시각 버튼: 누르면 그 버튼이 ❚❚, 다시 누르면 멈춤
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = t.match(/let jumpCur = null[^]*?\nfunction jumpPlay[^]*?\n\}\n/)[0];
const mkBtn = (txt) => ({ textContent: txt, dataset: {}, isConnected: true });
const b1 = mkBtn("▶ 49:36"), b2 = mkBtn("▶ 72:00");
const full = { paused: true, src: "", play() { this.paused = false; return Promise.resolve(); }, pause() { this.paused = true; } };
const document = { querySelectorAll: () => [b1, b2].filter(b => b.dataset.jumpon) };
let played = [];
const f = new Function("document", "full", "toast", "hlQueueStop", "playAt", "rangeAt", "chipRanges", "miniMarks", "miniLabel", "fmt", "cur", code + "return { jumpPlay, paintJump, get cur() { return jumpCur; } };")(
  document, full, () => {}, () => {}, (x) => { played.push(x); full.src = "x"; full.paused = false; return Promise.resolve(); },
  (x) => [x, x + 10], () => [], (m) => marks.push(m), () => {}, (x) => String(x), { segs: [] });
const marks = [];
(async () => {
  await f.jumpPlay(b1, 49.5);
  assert.deepStrictEqual(played, [48.5]); assert.deepStrictEqual(marks[0], [{ start: 49.5, end: 59.5 }], "재생바 노란 칸"); assert.strictEqual(b1.textContent, "❚❚ 49:36");
  f.jumpPlay(b1, 49.5); f.paintJump();
  assert.ok(full.paused && played.length === 1, "같은 버튼 다시 누르면 멈춤(처음부터 아님)"); assert.strictEqual(b1.textContent, "▶ 49:36");
  await f.jumpPlay(b2, 72); assert.strictEqual(b1.textContent, "▶ 49:36"); assert.strictEqual(b2.textContent, "❚❚ 72:00");
  assert.ok(/!jumpLock && jumpCur/.test(t) && /paintJump\(\); \}; full\.onpause/.test(t));
  console.log("jump-toggle ok");
})().catch(e => { console.error(e); process.exit(1); });
