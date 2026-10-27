// 고른 하이라이트 이어 듣기: 같은 전사 플레이어로 차례대로, 구분음은 사이에만(첫 앞·끝 뒤 없음), 1개면 없음, 멈추면 다음으로 안 감
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const block = src.match(/let hlList = \[\], hlPlay = null, hlQ = null[\s\S]*?\nfunction allCands\(\)/)[0].replace(/\nfunction allCands\(\)$/, "");
const handler = src.match(/\$\("btnPlayAll"\)\.onclick = \(\) => \{[\s\S]*?\n\};\n/)[0].replace('$("btnPlayAll").onclick =', "const h =");
// 전사 재생이 칭찬 말 끝(hlPlay.end)에서 멈추고, 이어 듣기면 다음 것으로
assert.ok(/if \(hlPlay && t >= hlPlay\.end\) \{[\s\S]{0,200}if \(q && q === hlQ\) hlQueueNext\(\);/.test(src), "끝에서 멈춤/다음");
async function run(n, stopAtChime) {
  const log = [], el = () => ({ textContent: "", classList: { add() {}, remove() {} }, querySelectorAll: () => [], querySelector: () => null, open: true });
  const els = {}; const $ = (id) => (els[id] ??= el());
  const cands = Array.from({ length: n }, (_, i) => ({ id: "C" + i, start: 100 * i + 10, end: 100 * i + 40, cues: [] }));
  const cur = { cands, segs: [], review: { decisions: {} } };
  const ctx = { $, cur, sendList: () => cands, toast: (m) => log.push("toast:" + m), fmt: String, chimeCtx: null, window: {}, setTimeout,
    full: { pause() {}, currentTime: 0 }, chunkStart: 0, nowIdx: 0,
    playAt: async (t) => { log.push("at:" + t); }, playChime: async () => { log.push("chime"); if (stopAtChime && log.filter(x => x === "chime").length === stopAtChime) api.stop(); } };
  const f = new Function(...Object.keys(ctx), block + "\n" + handler + "\nreturn { h, stop: hlQueueStop, end: () => { const q = hlPlay && hlPlay.queue; hlPlay = null; if (q && q === hlQ) return hlQueueNext(); }, get q() { return hlQ; } };");
  const api = f(...Object.values(ctx));
  api.h(); await new Promise(r => setTimeout(r, 0));
  for (let i = 0; i < n + 1; i++) { await api.end(); await new Promise(r => setTimeout(r, 0)); }
  return log;
}
(async () => {
  assert.deepStrictEqual(await run(3), ["at:9.7", "chime", "at:109.7", "chime", "at:209.7"]);
  assert.deepStrictEqual(await run(1), ["at:9.7"]);
  assert.deepStrictEqual(await run(3, 1), ["at:9.7", "chime"]);          // 구분음 중 멈추면 다음 것 재생 안 함
  assert.deepStrictEqual(await run(0), ["toast:‘보내기’로 고른 하이라이트가 없어요"]);
  console.log("chime ok");
})().catch(e => { console.error(e); process.exit(1); });
