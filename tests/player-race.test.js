// 교사 재생기 비동기 경합 시험(DOM·오디오 모의): A/B 느림·빠름, 닫은 카드 늦은 응답, metadata timeout, seek 연타, 재생 교대, 이어 듣기 큐
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = src.indexOf("const player = new Audio()"), b = src.indexOf("function speakerName(");
assert.ok(a > 0 && b > a);
const body = src.slice(a, b);
const queueSrc = "";   // 이어 듣기는 2026-10-27부터 전사 플레이어(하이라이트)로 → tests/chime.test.js

function makeEnv() {
  const log = [], blobs = {}, timers = [];
  class FakeAudio {
    constructor() { this.l = {}; this._src = ""; this.readyState = 0; this.paused = true; this.duration = NaN; this.currentTime = 0; this.autoMeta = true; this.onended = null; }
    addEventListener(t, f) { (this.l[t] ??= new Set()).add(f); }
    removeEventListener(t, f) { this.l[t]?.delete(f); }
    emit(t) { [...(this.l[t] || [])].forEach(f => f()); }
    set src(v) {
      this._src = v; this.readyState = 0; this.duration = NaN; log.push("src:" + v);
      if (this.autoMeta) Promise.resolve().then(() => { if (this._src === v) { this.readyState = 1; this.duration = 100; this.emit("loadedmetadata"); } });
    }
    get src() { return this._src; }
    async play() { this.paused = false; log.push("play:" + this._src); this.emit("play"); }
    pause() { if (!this.paused) log.push("pause"); this.paused = true; this.emit("pause"); }
  }
  const mkRoot = () => {
    const seek = { value: 0, oninput: null }, time = { textContent: "" };
    const btns = ["start", "back", "play", "fwd", "end"].map(k => ({ dataset: { tp: k }, onclick: null, textContent: "" }));
    return { isConnected: true, btns, seek,
      querySelector(s) { return s === ".tpSeek" ? seek : s === ".tpTime" ? time : btns[2]; },
      querySelectorAll() { return btns; } };
  };
  const readBlob = (id) => new Promise((res, rej) => { blobs[id] = { res, rej }; });
  const toasts = [];
  const doc = { addEventListener() {}, querySelectorAll: () => [] };
  const URLm = { createObjectURL: (x) => "blob:" + x, revokeObjectURL() {} };
  const setTimeoutM = (f, ms) => { const t = { f, ms }; timers.push(t); return t; };
  const full = { paused: true, pause() {} };
  const cur = { clipUrls: {}, clips: [{ name: "c1.m4a", id: "F1" }] };
  const button = { textContent: "" };
  const factory = new Function("Audio", "document", "URL", "readBlob", "toast", "fmt", "cur", "setTimeout", "clearTimeout", "full",
    "playChime", "sendList", "$", "chimeCtx",
    body + queueSrc + "\nreturn { player, playShared, tpWire, tpDetach };");
  const api = factory(FakeAudio, doc, URLm, readBlob, (m) => toasts.push(m), (x) => String(x), cur, setTimeoutM, (t) => { if (t) t.dead = true; }, full,
    async () => {}, () => [{ id: "c1" }], () => button, null);
  return { api, log, blobs, mkRoot, toasts, timers, flush: () => new Promise(r => setImmediate(r)) };
}
const btn = () => ({ isConnected: true, textContent: "▶", dataset: { label: "▶" } });
(async () => {
  // 1) A 느림 / B 빠름: 나중에 누른 B만 재생, A 응답이 늦게 와도 덮어쓰지 않음
  { const e = makeEnv(), rA = e.mkRoot(), rB = e.mkRoot();
    e.api.tpWire(rA, "A", true); await e.flush();
    e.api.tpDetach(); e.api.tpWire(rB, "B", true); await e.flush();
    e.blobs.B.res("B"); await e.flush();
    e.blobs.A.res("A"); await e.flush();
    assert.deepStrictEqual(e.log.filter(x => x.startsWith("play")), ["play:blob:B"]);
    assert.ok(!e.log.includes("src:blob:A"), "A의 늦은 응답이 B를 덮어씀"); }
  // 2) 닫은 카드의 늦은 응답: detach 후 응답이 와도 재생 안 함
  { const e = makeEnv(), r = e.mkRoot();
    e.api.tpWire(r, "A", true); await e.flush(); e.api.tpDetach(); r.isConnected = false;
    e.blobs.A.res("A"); await e.flush();
    assert.ok(!e.log.some(x => x.startsWith("play")) && !e.log.some(x => x.startsWith("src"))); }
  // 3) metadata timeout: 7초 후 안내 토스트, 다시 누르면 재시도 가능
  { const e = makeEnv(), r = e.mkRoot();
    const p = e.api.player; p.autoMeta = false; e.api.tpWire(r, "A", true); await e.flush(); e.blobs.A.res("A"); await e.flush();
    const t = e.timers.at(-1); assert.strictEqual(t.ms, 7000); t.f(); await e.flush();
    assert.ok(e.toasts.some(m => m.includes("지연")));
    p.autoMeta = true; r.btns[2].onclick(); await e.flush();
    assert.ok(e.log.includes("play:blob:A"), "timeout 뒤 재시도 실패"); }
  // 4) seek 연타: 로딩 중 여러 번 움직여도 마지막 위치만 적용
  { const e = makeEnv(), r = e.mkRoot(); e.api.player.autoMeta = false;
    e.api.tpWire(r, "A", false);
    for (const v of [100, 300, 700]) { r.seek.value = v; r.seek.oninput({ target: { value: v } }); }
    await e.flush(); e.blobs.A.res("A"); await e.flush();
    e.api.player.readyState = 1; e.api.player.duration = 100; e.api.player.emit("loadedmetadata"); await e.flush();
    assert.strictEqual(e.api.player.currentTime, 70); }
  // 5) 재생 교대: 일반 재생 버튼 → 재생 바로 교대하면 이전 버튼의 늦은 응답은 무시
  { const e = makeEnv(), r = e.mkRoot(), bt = btn();
    e.api.playShared(bt, "S"); await e.flush();
    e.api.tpWire(r, "A", true); await e.flush();
    e.blobs.S.res("S"); await e.flush(); e.blobs.A.res("A"); await e.flush();
    assert.ok(!e.log.includes("play:blob:S"), "교대 후 이전 재생이 살아남음");
    assert.ok(e.log.includes("play:blob:A")); }
  console.log("player-race ok (5 scenarios)");
})().catch(err => { console.error(err); process.exit(1); });
