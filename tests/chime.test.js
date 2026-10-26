// 이어 듣기 구분음: 클립 사이에만(첫 앞·끝 뒤 없음), 1개면 없음, 멈추면 다음으로 안 감 — 가짜 플레이어로 순서 확인
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const body = src.match(/\$\("btnPlayAll"\)\.onclick = async \(\) => \{[\s\S]*?\n\};\n/)[0];
async function run(n, stopAfter) {
  const log = [], btn = { textContent: "" };
  const player = { src: "", play() { log.push("clip:" + this.src); setTimeout(() => this.onended && this.onended(), 0); }, pause() {} };
  const $ = () => btn, clips = Array.from({ length: n }, (_, i) => ({ id: "f" + i, name: "C" + i + ".mp3" }));
  const cur = { clips, clipUrls: {} };
  const sendList = () => clips.map((c, i) => ({ id: "C" + i }));
  const playChime = async () => { log.push("chime"); if (stopAfter && log.filter(x => x === "chime").length === stopAfter) btnState.stop(); };
  const btnState = {};
  const ctx = { $, cur, sendList, player, playChime, readBlob: async (id) => id, URL: { createObjectURL: (x) => x }, toast: () => {}, pauseOthers: () => {}, tpDetach: () => {},
    window: {}, chimeCtx: null };
  const f = new Function(...Object.keys(ctx), "let queueStop=null;" + body.replace('$("btnPlayAll").onclick =', "const h =") + "return [h, () => queueStop];");
  const [h, qs] = f(...Object.values(ctx));
  btnState.stop = () => qs()();
  await h(); await new Promise(r => setTimeout(r, 50));
  return log;
}
(async () => {
  assert.deepStrictEqual(await run(3), ["clip:f0", "chime", "clip:f1", "chime", "clip:f2"]);
  assert.deepStrictEqual(await run(1), ["clip:f0"]);
  assert.deepStrictEqual(await run(3, 1), ["clip:f0", "chime"]);          // 구분음 중 멈추면 다음 클립 재생 안 함
  console.log("chime ok");
})();
