// (11/08 사용자) 곡 서랍 '▶ 듣기' 한 번 = 펼침 + 재생. 합성 mock만 — 실기기(갤럭시·아이폰) 청감 미검증
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = T.slice(T.indexOf("// <stem-engine>"), T.indexOf("// </stem-engine>"));
function make(o = {}) {
  const w = { resumes: 0, srcs: 0, ctxs: 0 };
  class Ctx { constructor() { this.state = "suspended"; this.destination = {}; w.ctxs++; this.currentTime = 0; }
    resume() { w.resumes++; if (o.blocked) return new Promise(() => {}); this.state = "running"; return Promise.resolve(); } close() {}
    createGain() { return { gain: { value: 1, cancelScheduledValues() {}, setTargetAtTime() {} }, connect() {} }; }
    createBufferSource() { w.srcs++; return { connect() {}, disconnect() {}, start() {}, stop() {} }; }
    decodeAudioData() { return Promise.resolve({ duration: 100 }); } }
  const c = { Blob, Promise, Error, setTimeout, clearTimeout, setInterval, clearInterval, Date, Math }; vm.createContext(c); c.globalThis = c;
  const mk = vm.runInContext("(function(){" + code + "; return stemEngine; })()", c);
  const fetchBuf = () => new Promise(r => setTimeout(() => r(new ArrayBuffer(1000)), o.delay || 10));
  return { w, E: mk({ vol: 30, AC: Ctx, fetchBuf, resumeMs: 50, timers: { set: () => 1, clear() {} } }) };
}
(async () => {
  // 터치 안에서 unlock → 소리 장치가 로드 전에 이미 깨어남, 이후 play는 한 번만 시작
  { const { w, E } = make(); E.unlock(); assert.strictEqual(w.ctxs, 1); assert.strictEqual(w.resumes, 1, "터치 안에서 resume");
    await Promise.all([E.play(), E.play(), E.play()]); assert.strictEqual(w.ctxs, 1, "장치 재사용"); assert.strictEqual(w.srcs, 2, "MR·보컬 각 한 번 = 중복 시작 없음"); }
  // 로드 중 접기(destroy) → 늦게 끝나도 소리 안 남
  { const { w, E } = make({ delay: 30 }); E.unlock(); const p = E.play().catch(e => e.message); E.destroy(); assert.strictEqual(await p, "stale"); assert.strictEqual(w.srcs, 0); }
  // 곡 A 로드 중 곡 B: A 파기 → B만 재생
  { const a = make({ delay: 30 }), b = make(); a.E.unlock(); const pa = a.E.play().catch(e => e.message); a.E.destroy(); b.E.unlock(); await b.E.play(); assert.strictEqual(await pa, "stale"); assert.strictEqual(a.w.srcs, 0); assert.strictEqual(b.w.srcs, 2); }
  // 브라우저가 막으면 무한 대기 없이 blocked 오류 → 화면이 ▶ 복귀·재시도 안내
  { const { E } = make({ blocked: true }); E.unlock(); let m; try { await E.play(); } catch (e) { m = e.message; } assert.strictEqual(m, "blocked"); }
  // 화면 연결(정적)
  const pl = T.slice(T.indexOf("function songPlayer(el, ids, o)"), T.indexOf("// (11/05 00:14 사용자)"));
  assert.ok(/if \(o\.autoplay\) Q\("sgPb"\)\.onclick\(\)/.test(pl) && pl.includes("eng.unlock()") && pl.includes("blocked") && pl.includes("준비 중…"), "autoplay·unlock·blocked 안내");
  const pa = T.slice(T.indexOf("function songPaintList"), T.indexOf("// (11/07 17:33 사용자)"));
  assert.ok(pa.includes("songLib.auto = opening ? x.folder : null") && pa.includes("if (auto) songLib.auto = null") && pa.includes("autoplay: auto"), "열 때만 한 번 자동 재생(접기·20초 갱신은 아님)");
  assert.strictEqual((T.match(/autoplay:/g) || []).length, 1, "메이크업·노트 경로 자동재생 없음");
  const S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
  assert.ok(!/autoplay/.test(S.slice(S.indexOf("function wireStems(mk)"), S.indexOf("function lessonHtml(l, prev"))));
  console.log("song-autoplay: ok");
})().catch(e => { console.error(e); process.exit(1); });
