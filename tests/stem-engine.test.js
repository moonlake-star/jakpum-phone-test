// (11/08 사용자 재현 버그) 보컬 볼륨 0%→켜면 끊기고 MR보다 느려짐 · '불러오는 중' 과다 → 하나의 시계(WebAudio)·곡당 한 번 로드 회귀 방지
// 실제 음원·기기 청감은 검증하지 않음(합성 mock만): 실기기 시험은 PR 설명의 3줄 방법
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const block = (h) => { const a = h.indexOf("// <stem-engine>"), b = h.indexOf("// </stem-engine>"); assert.ok(a >= 0 && b > a, "엔진 블록"); return h.slice(a, b); };
assert.strictEqual(block(T), block(S), "선생님·수강생 엔진 코드가 같아야 함");
const code = block(T);

// ── 가짜 오디오 세계 ──
function world(opt = {}) {
  const w = { now: 0, ctxs: [], sources: [], timers: new Map(), tid: 0, net: 0, audios: [], urls: new Set(), revoked: 0, decodes: 0, played: 0 };
  class Param { constructor() { this.value = 1; this.sets = []; } cancelScheduledValues() {} setTargetAtTime(v, t, tc) { this.value = v; this.sets.push(v); } }
  class Ctx {
    constructor() { this.state = "suspended"; this.destination = {}; this.closed = false; w.ctxs.push(this); }
    get currentTime() { return w.now; }
    async resume() { this.state = "running"; } async close() { this.closed = true; this.state = "closed"; }
    createGain() { const g = { gain: new Param(), connect() {} }; this.gain = g; return g; }
    createBufferSource() { const s = { buffer: null, starts: [], stops: 0, connect() {}, disconnect() {}, start(when, off) { this.starts.push([when, off]); }, stop() { this.stops++; } }; w.sources.push(s); return s; }
    decodeAudioData(ab) { w.decodes++; if (opt.decodeFail) return Promise.reject(new Error("decode fail")); return Promise.resolve({ duration: opt.dur || 240, numberOfChannels: 2 }); }
  }
  class Aud { constructor() { this.currentTime = 0; this.paused = true; this.readyState = 4; this.seeking = false; this.duration = opt.dur || 240; this.volume = 1; this.sets = 0; w.audios.push(this); }
    play() { this.paused = false; w.played++; return Promise.resolve(); } pause() { this.paused = true; } removeAttribute() {} load() {} }
  const URLm = { createObjectURL: () => { const u = "blob:" + w.urls.size + Math.random(); w.urls.add(u); return u; }, revokeObjectURL: (u) => { if (w.urls.delete(u)) w.revoked++; } };
  const timers = { set: (f, ms) => { const id = ++w.tid; w.timers.set(id, [f, ms]); return id; }, clear: (id) => { w.timers.delete(id); } };
  const fetchBuf = async (k) => { w.net++; return new ArrayBuffer(opt.bytes || 4000000); };
  const ctx = { globalThis: undefined, Blob, Date, Math, Promise, Error, setTimeout, clearTimeout, setInterval, clearInterval };
  vm.createContext(ctx); ctx.globalThis = ctx; ctx.Audio = Aud; ctx.URL = URLm;
  const mk = vm.runInContext("(function(){" + code + "; return stemEngine; })()", ctx);
  w.make = (extra = {}) => mk({ vol: 30, fetchBuf, timers, AC: opt.noAC ? null : Ctx, Audio: (...a) => new Aud(...a), URL: URLm, ...extra });
  w.advance = (sec) => { w.now += sec; for (const [f] of [...w.timers.values()]) f(); };
  return w;
}

(async () => {
  // (1) 최초 1회 로드 · (2) 재생 중 0→30→100 20번 왕복: play/seek/network 늘지 않음
  { const w = world(), E = w.make();
    await Promise.all([E.load(), E.load(), E.play()]);   // 겹친 요청도 한 번
    assert.strictEqual(w.net, 2, "MR·보컬 각 1번만 받음"); assert.strictEqual(w.decodes, 2); assert.strictEqual(E.mode(), "web");
    assert.strictEqual(w.ctxs.length, 1);
    const n0 = { src: w.sources.length, starts: w.sources.map(s => s.starts.length).join(), net: w.net, dec: w.decodes, ctx: w.ctxs.length, stops: w.sources.map(s => s.stops).join() };
    for (let i = 0; i < 20; i++) for (const v of [0, 30, 100]) { E.setVol(v); w.advance(0.3); }
    assert.strictEqual(w.sources.length, n0.src, "소스 새로 안 만듦"); assert.strictEqual(w.sources.map(s => s.starts.length).join(), n0.starts, "start 다시 안 함");
    assert.strictEqual(w.sources.map(s => s.stops).join(), n0.stops, "stop 안 함"); assert.strictEqual(w.net, n0.net); assert.strictEqual(w.decodes, n0.dec); assert.strictEqual(w.ctxs.length, n0.ctx);
    assert.ok(E.isPlaying(), "계속 재생 중"); assert.strictEqual(w.ctxs[0].gain.gain.value, 1, "마지막 100% 반영"); assert.ok(w.ctxs[0].gain.gain.sets.length >= 60);
    // (3) 같은 시계: MR·보컬이 같은 when·같은 offset으로 시작, 4분 가상 시계 끝까지 같은 timebase
    const [m, v] = w.sources; assert.deepStrictEqual(m.starts, v.starts, "MR·보컬 같은 시작 시각·위치"); assert.ok(m.starts[0][0] >= 0);
    let ended = 0; E.destroy();
    const w2 = world(), E2 = w2.make({ onEnd: () => ended++ }); await E2.play();
    for (let i = 0; i < 1000; i++) { w2.advance(0.25); if (!E2.isPlaying()) break; }   // 250ms tick × 4분
    assert.strictEqual(ended, 1, "4분 뒤 한 번 끝남"); assert.strictEqual(w2.timers.size, 0, "끝나면 타이머 정리"); assert.strictEqual(w2.sources.length, 2);
    console.log("stem-engine: 1회 로드·볼륨 왕복·같은 시계·4분 ok"); }

  // (4) pause→resume · seek · 재생 중 seek: 네트워크 0, 두 소스가 항상 같은 위치로 시작
  { const w = world(), E = w.make(); await E.play(); w.advance(10); const t10 = E.pos(); assert.ok(Math.abs(t10 - 10) < 0.1);
    E.pause(); assert.ok(!E.isPlaying()); assert.strictEqual(w.timers.size, 0); w.advance(5); assert.ok(Math.abs(E.pos() - t10) < 0.01, "멈춘 동안 위치 그대로");
    await E.play(); const [a, b] = w.sources.slice(-2); assert.deepStrictEqual(a.starts, b.starts); assert.ok(Math.abs(a.starts[0][1] - t10) < 0.01, "멈춘 자리에서 다시");
    await E.seek(100); const [c, d] = w.sources.slice(-2); assert.deepStrictEqual(c.starts, d.starts); assert.strictEqual(c.starts[0][1], 100);
    w.advance(2); assert.ok(Math.abs(E.pos() - 102) < 0.1); assert.strictEqual(w.net, 2, "시킹·재시작에 네트워크 없음"); assert.strictEqual(w.timers.size, 1);
    for (let i = 0; i < 20; i++) await E.seek(i * 10); assert.strictEqual(w.net, 2); assert.strictEqual(w.timers.size, 1, "시킹해도 타이머 하나");
    E.destroy(); assert.strictEqual(w.timers.size, 0); assert.ok(w.ctxs[0].closed, "AudioContext 닫음");
    await assert.rejects(E.play(), /stale/, "닫은 뒤엔 재생 안 됨");
    console.log("stem-engine: 일시정지·시킹·정리 ok"); }

  // (4b) 늦은 응답: 로딩 중 곡 바꿈(destroy) → 응답이 와도 소리·context 안 생김 · 오류 뒤 재시도
  { const w = world(); let rel; const gate = new Promise(r => rel = r);
    const E = w.make({ fetchBuf: async (k) => { w.net++; await gate; return new ArrayBuffer(1e6); } });
    const p = E.play().catch(e => e.message); E.destroy(); rel(); assert.strictEqual(await p, "stale"); assert.strictEqual(w.ctxs.length, 0); assert.strictEqual(w.sources.length, 0);
    let fail = true; const w3 = world(); const E3 = w3.make({ fetchBuf: async () => { w3.net++; if (fail) throw new Error("net"); return new ArrayBuffer(1e6); } });
    await assert.rejects(E3.play(), /net/); fail = false; await E3.play(); assert.ok(E3.isPlaying(), "오류 뒤 다시 누르면 재생");
    // 디코드 중 destroy
    const w4 = world(); const E4 = w4.make(); const p4 = E4.play().catch(e => e.message); E4.destroy(); assert.strictEqual(await p4, "stale"); assert.ok(w4.ctxs.every(c => c.closed), "늦게 만든 context도 닫음"); assert.strictEqual(w4.sources.length, 0);
    console.log("stem-engine: 늦은 응답·재시도 ok"); }

  // 폴백: 디코드 실패·WebAudio 없음·너무 긴 곡 → 오디오 태그 2개 · 볼륨은 voc.volume만 · 불필요한 재탐색 없음
  for (const [name, opt] of [["decodeFail", { decodeFail: true }], ["noAC", { noAC: true }], ["long", { bytes: 20000 * 600 }]]) {
    const w = world(opt), E = w.make(); await E.play(); assert.strictEqual(E.mode(), "html", name); const [mr, voc] = w.audios; assert.ok(!mr.paused && !voc.paused);
    if (name === "decodeFail") assert.ok(w.ctxs.every(c => c.closed), "실패한 context 닫음");
    const ct = [mr.currentTime, voc.currentTime];
    for (let i = 0; i < 20; i++) for (const v of [0, 30, 100]) { E.setVol(v); mr.currentTime += 0.3; voc.currentTime += 0.3; w.advance(0.3); }
    assert.strictEqual(voc.volume, 1); assert.strictEqual(w.played, 2, "play 다시 안 함"); assert.strictEqual(w.net, 2);
    // 작은 어긋남(0.1초)은 건드리지 않음 · 큰 어긋남(1초)은 한 번 맞춤(2초에 한 번)
    const before = voc.currentTime; voc.currentTime = mr.currentTime + 0.1; const v1 = voc.currentTime; w.advance(0.25); assert.strictEqual(voc.currentTime, v1, "0.1초 차이는 보정 안 함");
    voc.currentTime = mr.currentTime + 1; w.advance(0.25); assert.strictEqual(voc.currentTime, mr.currentTime, "1초 차이는 맞춤");
    mr.readyState = 2; voc.currentTime = mr.currentTime + 1; const v2 = voc.currentTime; w.advance(0.25); assert.strictEqual(voc.currentTime, v2, "버퍼링 중엔 보정 안 함");
    E.destroy(); assert.strictEqual(w.revoked, 2, "object URL 정리"); assert.strictEqual(w.urls.size, 0); assert.strictEqual(w.timers.size, 0);
  }
  console.log("stem-engine: 폴백 ok");

  // (6) 볼륨 저장·배경 읽기가 전체 화면 busy를 안 부름(quietSave + readBlob quiet) — 실제 코드 실행
  { const a = T.indexOf("function quietSave"), b = T.indexOf("function songSave");
    const g = { __quiet: 0 }; const seen = []; const ctx = { globalThis: g, Promise, setTimeout }; vm.createContext(ctx);
    vm.runInContext(T.slice(a, b), ctx); const qs = vm.runInContext("quietSave", ctx);
    const p = qs(() => new Promise(r => setTimeout(() => { seen.push(g.__quiet); r(); }, 20))); assert.strictEqual(g.__quiet, 1, "저장 중엔 busy 억제"); await p; assert.strictEqual(g.__quiet, 0); assert.deepStrictEqual(seen, [1]);
    await qs(() => Promise.reject(new Error("x"))); assert.strictEqual(g.__quiet, 0, "실패해도 원복"); await qs(() => { throw new Error("sync"); }); assert.strictEqual(g.__quiet, 0);
    const rb = T.indexOf("const readBlob = "); const line = T.slice(rb, T.indexOf("\n", rb));
    const calls = []; const f = vm.runInNewContext("(function(autoBusy, api, DRIVE){" + line + "\n; return readBlob; })", {})((p) => { calls.push("busy"); return p; }, async () => ({ blob: async () => "B" }), "d");
    assert.strictEqual(await f("id", false, true), "B"); assert.deepStrictEqual(calls, [], "quiet 읽기는 팝업 경로 안 탐"); await f("id"); assert.deepStrictEqual(calls, ["busy"], "기존 읽기는 그대로");
    console.log("stem-engine: busy 억제 ok"); }

  // (5)(7)(8) 화면 코드 연결(정적): 곡 서랍 목록 갱신이 열린 카드를 부수지 않음 · 옛 어긋남 보정 제거 · 수강생도 엔진
  const pl = T.slice(T.indexOf("function songPlayer(el, ids, o)"), T.indexOf("// (11/05 00:14 사용자) 레슨 '오늘의 베스트'"));
  assert.ok(pl.includes("stemEngine({") && pl.includes("readBlob(ids[k], false, true)") && !pl.includes("new Audio") && !pl.includes(".currentTime = mr.currentTime") && !/\.voc\.volume/.test(pl), "선생님 플레이어: 엔진·조용한 읽기");
  assert.ok(!pl.includes("busy(") && !pl.includes("autoBusy("), "플레이어에 전체 화면 팝업 호출 없음");
  const pa = T.slice(T.indexOf("function songPaintList"), T.indexOf("// (11/07 17:33 사용자) 유튜브 주소만"));
  assert.ok(pa.includes("keep.el.remove()") && pa.includes("pl.appendChild(keep.el)") && pa.includes("quietSave("), "목록 다시 그려도 카드 보존·볼륨 저장 조용히");
  assert.ok(!/songLib\.list = nx; if \(ch && !\(sgCur/.test(T), "polling이 재생 여부로 repaint를 막던 옛 방식 제거");
  assert.ok(T.includes("function songDestroy()") && T.includes('if (view !== "vSongs" && view !== "vMkJob") { try { songDestroy(); }'), "화면 나가면 정리");
  const ws = S.slice(S.indexOf("function wireStems(mk)"), S.indexOf("function lessonHtml(l, prev"));
  assert.ok(ws.includes("stemEngine({") && !ws.includes("new Audio") && !ws.includes("bufMode") && ws.includes("stemsDestroy();"), "수강생 연습 곡도 같은 엔진");
  assert.ok(ws.includes('data-sgd') && ws.includes("window.open(driveUrl(st[k])"), "수강생 다운로드 3종 유지");
  assert.ok(T.includes('data-sgd="${k}"') && T.includes("songSave(await blob(k)"), "선생님 다운로드 3종 유지");
  console.log("stem-engine: 화면 연결 ok");
})().catch(e => { console.error(e); process.exit(1); });
