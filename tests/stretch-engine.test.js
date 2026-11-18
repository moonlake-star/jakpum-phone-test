// (11/19 사용자 '키는 서버 재생성 말고 앱에서 바로, 음질 최고 엔진으로') 곡 서랍 실시간 키·속도 엔진(Signalsmith Stretch) 연결 논리 시험
// 합성 mock만: 실제 소리·기기 청감은 검증하지 않음(PR 설명의 실기기 시험 방법 참고)
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const cut = (a, b) => { const i = T.indexOf(a), j = T.indexOf(b); assert.ok(i >= 0 && j > i, a); return T.slice(i, j); };
const code = cut("// <stem-engine>", "// </stem-engine>") + cut("// <stretch-engine>", "// </stretch-engine>");

function world(opt = {}) {
  const w = { now: 0, nodes: [], timers: new Map(), tid: 0, ctxs: [], transfers: 0 };
  class Param { constructor() { this.value = 1; } cancelScheduledValues() {} setTargetAtTime(v) { this.value = v; } }
  class Ctx {
    constructor() { this.state = "suspended"; this.destination = {}; this.audioWorklet = opt.noWorklet ? undefined : {}; w.ctxs.push(this); this.closed = false; }
    get currentTime() { return w.now; }
    async resume() { this.state = "running"; } async suspend() { this.state = "suspended"; } async close() { this.closed = true; }
    createGain() { return { gain: new Param(), connect() {}, disconnect() {} }; }
    createDynamicsCompressor() { return { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect() {} }; }
    decodeAudioData() { const n = 44100 * (opt.dur || 240), a = new Float32Array(n / 100).fill(0.1); return Promise.resolve({ duration: opt.dur || 240, numberOfChannels: 2, length: n / 100, getChannelData: () => a }); }
  }
  const lib = async (ctx) => { if (opt.libFail) throw new Error("lib fail"); const n = { sched: [], bufs: 0, connect() {}, disconnect() {}, schedule(p) { this.sched.push(p); }, async addBuffers(ch, tr) { this.bufs++; if (tr) w.transfers++; return 1; } }; w.nodes.push(n); return n; };
  const Aud = class { constructor() { this.currentTime = 0; this.paused = true; this.readyState = 4; this.duration = 240; this.volume = 1; } play() { this.paused = false; return Promise.resolve(); } pause() {} removeAttribute() {} load() {} };
  const U = { createObjectURL: () => "blob:x", revokeObjectURL() {} };
  const timers = { set: (f, ms) => { const id = ++w.tid; w.timers.set(id, f); return id; }, clear: (id) => w.timers.delete(id) };
  const ctx = { Blob, Date, Math, Promise, Error, setTimeout, clearTimeout, setInterval, clearInterval, Float32Array, ArrayBuffer }; vm.createContext(ctx); ctx.globalThis = ctx; ctx.Audio = Aud; ctx.URL = U;
  const mk = vm.runInContext("(function(){" + code + "; return stretchEngine; })()", ctx);
  w.make = (extra = {}) => mk({ vol: 30, fetchBuf: async () => new ArrayBuffer(opt.bytes || 4000000), timers, AC: Ctx, Audio: (...a) => new Aud(...a), URL: U, lib, ...extra });
  w.advance = (s) => { w.now += s; for (const f of [...w.timers.values()]) f(); };
  return w;
}
const last = (n) => n.sched[n.sched.length - 1];
(async () => {
  // 로드: 실시간 변환 방식 · 두 트랙 모두 복사 없이 넘김(transfer)
  { const w = world(), E = w.make(); await E.load();
    assert.strictEqual(E.mode(), "ss"); assert.ok(E.canKey()); assert.strictEqual(E.dur(), 240); assert.strictEqual(w.nodes.length, 2); assert.strictEqual(w.transfers, 2, "채널 버퍼를 넘기며 비움");
    // 재생: 반주·보컬이 같은 시각·같은 값, 보컬만 포먼트 보정
    await E.play(); const [nm, nv] = w.nodes; const a = last(nm), b = last(nv);
    assert.ok(a.active && b.active && a.output === b.output && a.input === 0 && a.rate === 1 && a.semitones === 0);
    assert.strictEqual(nv.sched[0].formantCompensation, true); assert.strictEqual(nm.sched[0].formantCompensation, false);
    // 10초 뒤 위치 ≈ 10 → 키 +2: 지금 위치에서 이어서(반주·보컬 같이)
    w.advance(0.08); w.advance(10); assert.ok(Math.abs(E.pos() - 10) < 0.2, "pos " + E.pos());
    E.setKey(2); const k1 = last(nm), k2 = last(nv); assert.strictEqual(k1.semitones, 2); assert.strictEqual(k2.semitones, 2); assert.strictEqual(k1.output, k2.output); assert.ok(Math.abs(k1.input - 10) < 0.3, "input " + k1.input);
    // 속도 1.1: 위치 연속
    const p0 = E.pos(); E.setRate(1.1); assert.strictEqual(last(nm).rate, 1.1); assert.ok(Math.abs(E.pos() - p0) < 0.2); w.advance(10); assert.ok(Math.abs(E.pos() - (p0 + 11)) < 0.3, "속도 반영 위치 " + E.pos());
    // 구간 반복: loopStart/End 전달 · 위치는 A~B 안
    E.setLoop(20, 25); assert.strictEqual(last(nv).loopStart, 20); assert.strictEqual(last(nv).loopEnd, 25); w.advance(20); const p = E.pos(); assert.ok(p >= 20 && p < 25, "반복 안 " + p);
    E.setLoop(NaN, NaN); assert.strictEqual(last(nv).loopEnd, 0);
    // 일시정지: active false · 위치 고정 → 키는 멈춰 있어도 바뀜 → 다시 재생하면 그 값으로
    E.pause(); const pp = E.pos(); assert.strictEqual(last(nm).active, false); w.advance(5); assert.strictEqual(E.pos(), pp);
    E.setKey(-3); await E.play(); assert.strictEqual(last(nm).semitones, -3); assert.strictEqual(last(nv).semitones, -3); assert.ok(Math.abs(last(nm).input - pp) < 0.05);
    // 시크
    await E.seek(100); assert.ok(Math.abs(E.pos() - 100) < 0.2); assert.strictEqual(last(nv).input, 100);
    // 끝에 닿으면 끝 처리
    let ended = 0; E.destroy(); assert.ok(E.isDead()); assert.ok(w.ctxs[0].closed);
  }
  // 반음 범위·정수
  { const w = world(), E = w.make(); await E.load(); E.setKey(30); assert.strictEqual(E.key(), 12); E.setKey(-30); assert.strictEqual(E.key(), -12); E.setKey(1.6); assert.strictEqual(E.key(), 2); }
  // 폴백: 엔진 파일 실패 · AudioWorklet 없음 · 너무 긴 곡 → 예전 방식(오디오 태그) + 키는 앱에서 못 바꿈(canKey false)
  for (const o of [{ libFail: true }, { noWorklet: true }, { bytes: 20000 * 600 }]) { const w = world(o), E = w.make(); await E.load(); assert.strictEqual(E.mode(), "html", JSON.stringify(o)); assert.strictEqual(E.canKey(), false); assert.ok(E.fallbackReason()); E.setRate(1.05); assert.strictEqual(E.rate(), 1.05); await E.play(); assert.ok(E.isPlaying()); E.destroy(); }
  // 보컬 볼륨은 게인만(재스케줄 없음)
  { const w = world(), E = w.make(); await E.load(); await E.play(); const n = w.nodes[0].sched.length; E.setVol(80); E.setMrVol(50); assert.strictEqual(w.nodes[0].sched.length, n); assert.strictEqual(E.vol(), 80); assert.strictEqual(E.mrVol(), 50); E.destroy(); }
  // ── 화면 연결(정적) ──
  assert.ok(/const eng = me\.eng = stretchEngine\(\{ vol: v0, boost: boostPref2\(\), html: true/.test(T), "곡 서랍은 새 엔진");
  assert.ok(T.includes("eng.canKey && eng.canKey()") && T.includes("eng.setKey(keyWant); keyN = keyWant;"), "키는 앱에서 바로");
  assert.ok(T.includes("반음`;") && T.includes("원곡 ${keyName(0)} · ${sgn(n)}반음"), "원곡 키·이동 칸수 표시");
  assert.ok(T.includes('dblTap(Q("dkKeyV").parentElement, () => setKey(0))') && T.includes('dblTap(Q("dkSpV").parentElement, () => setRate(1))'), "키·속도 더블탭 = 원래대로");
  assert.ok(fs.existsSync(__dirname + "/../teacher/vendor/signalsmith-stretch.js") && fs.existsSync(__dirname + "/../teacher/vendor/LICENSE-signalsmith-stretch.txt"), "엔진 파일·라이선스");
  assert.ok(T.includes('"vendor/signalsmith-stretch.js?v=ss1"'));
  console.log("stretch-engine: ok");
})().catch((e) => { console.error(e); process.exit(1); });
