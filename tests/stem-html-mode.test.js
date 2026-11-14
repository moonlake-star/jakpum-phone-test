// (11/10 B) 곡 서랍: 일반 오디오 태그 방식 — 다른 앱이 소리를 시작해 태그가 멈추면 화면도 멈춤, 웹오디오 장치는 만들지 않음
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(t.includes("stemEngine({ vol: v0, boost: boostPref(), html: true"), "곡 서랍이 오디오 태그 방식이어야 함");
assert.ok(t.includes("au.mr.onpause = () => { if (!playing || au.mr.ended || swapping) return;"), "다른 앱이 멈추게 한 경우 처리 없음");
assert.ok(t.includes("!d.html && est <= "), "html 옵션이 웹오디오 디코드를 건너뛰어야 함");
const src = t.slice(t.indexOf("function stemEngine(d)"), t.indexOf("// </stem-engine>"));
const G = {}; const made = [];
const mkAudio = () => { const a = { paused: true, currentTime: 0, duration: 100, readyState: 4, ended: false, volume: 1, play() { a.paused = false; return Promise.resolve(); }, pause() { a.paused = true; }, load() {}, removeAttribute() {} }; made.push(a); return a; };
const E = new Function(src + "; return stemEngine;")()({ html: true, AC: function () { throw new Error("웹오디오를 만들면 안 됨"); }, Audio: mkAudio, URL: { createObjectURL: () => "blob:x", revokeObjectURL() {} }, Blob: class {}, timers: { set: () => 1, clear() {} }, fetchBuf: async () => new ArrayBuffer(10), onPause: () => { E.paused = true; } });
(async () => {
  E.unlock(); await E.load(); assert.equal(E.mode(), "html"); await E.play(); assert.ok(E.isPlaying());
  made[0].currentTime = 12; made[0].pause(); made[0].onpause();   // 다른 앱이 소리를 시작해 시스템이 태그를 멈춤
  assert.ok(!E.isPlaying() && E.paused, "멈춤 반영 안 됨"); assert.ok(made[1].paused, "보컬 태그도 멈춰야 함");
  console.log("stem html mode ok");
})().catch((e) => { console.error(e); process.exit(1); });
