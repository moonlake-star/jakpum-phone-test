// (11/09 사용자 '레슨 녹음도 크게') 선생님 앱 레슨 녹음 '크게 듣기': 기본 꺼짐 · 켠 때만 blob 소리를 WebAudio(+6 dB·리미터)로 · 다른 도메인은 건드리지 않음
// 실제 폰 청감·화면 끔 동작은 검증하지 않음(합성 mock만)
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = T.indexOf("const LOUD_DB"), b = T.indexOf('player.addEventListener("play", () => loudRoute(player));');
assert.ok(a > 0 && b > a, "크게 듣기 블록");
const code = T.slice(a, b);
function world(on) {
  const w = { routed: [], ctxs: [], store: on === "default" ? {} : on ? { jk_lessonLoud: "1" } : { jk_lessonLoud: "0" } };
  class Param { constructor() { this.value = 1; } cancelScheduledValues() {} setTargetAtTime(v) { this.value = v; } }
  class Ctx { constructor() { this.state = "suspended"; this.destination = { id: "dest" }; this.currentTime = 0; w.ctxs.push(this); }
    resume() { this.state = "running"; } createGain() { const g = { gain: new Param(), connect(t) { this.to = t; } }; (this.gains ||= []).push(g); return g; }
    createDynamicsCompressor() { const c = { threshold: {}, knee: {}, ratio: {}, attack: {}, release: {}, connect(t) { this.to = t; } }; this.comp = c; return c; }
    createMediaElementSource(el) { const s = { el, connect(t) { this.to = t; } }; w.routed.push(s); return s; } }
  const els = []; const player = { paused: true, currentSrc: "", src: "" }, full = { paused: true, currentSrc: "", src: "" };
  const ctx = { window: { AudioContext: Ctx }, localStorage: { getItem: (k) => w.store[k] ?? null, setItem: (k, v) => { w.store[k] = v; } }, document: { querySelectorAll: () => els }, player, full, WeakSet, Math, Number };
  vm.createContext(ctx); const mk = vm.runInContext("(function(){" + code + "; return { loudRoute, loudSet, loudActive, get ctx(){return loudCtx}, get on(){return loudOn} }; })()", ctx);
  return { w, mk, player, full, els };
}
// (1) 끈 사람(0): blob이어도 보내지 않음 · (11/09 11:42) 아무것도 안 고른 사람은 기본 켜짐
{ const { w, mk, player } = world(false); player.currentSrc = "blob:x"; mk.loudRoute(player); assert.strictEqual(w.routed.length, 0); assert.strictEqual(mk.ctx, null); assert.strictEqual(mk.on, false); }
{ const { mk } = world("default"); assert.strictEqual(mk.on, true, "기본 켜짐"); }
// (2) 켜면: blob만 보냄 → 마스터(+6 dB) → 리미터 → 출력, 같은 태그는 한 번만
{ const { w, mk, player } = world(false); player.currentSrc = "blob:x"; player.paused = false; mk.loudSet(true);
  assert.strictEqual(w.routed.length, 1, "재생 중이던 태그도 바로 보냄"); const c = w.ctxs[0], m = c.gains[0];
  assert.ok(Math.abs(m.gain.value - 10 ** (6 / 20)) < 1e-9); assert.strictEqual(w.routed[0].to, m); assert.strictEqual(m.to, c.comp); assert.strictEqual(c.comp.to, c.destination);
  mk.loudRoute(player); assert.strictEqual(w.routed.length, 1, "한 번만"); assert.strictEqual(w.store.jk_lessonLoud, "1"); assert.ok(mk.loudActive(), "재생 중이면 화면 꺼도 유지");
  player.paused = true; assert.ok(!mk.loudActive());
  mk.loudSet(false); assert.strictEqual(m.gain.value, 1, "끄면 증폭만 1배"); assert.strictEqual(w.store.jk_lessonLoud, "0"); }
// (3) 다른 도메인 주소는 켜도 건드리지 않음(소리 사라짐 방지)
{ const { w, mk, player } = world(true); player.currentSrc = "https://www.googleapis.com/drive/v3/files/x?alt=media"; mk.loudRoute(player); assert.strictEqual(w.routed.length, 0); }
// (4) 저장된 켬 상태로 시작
{ const { mk } = world(true); assert.strictEqual(mk.on, true); }
// (5) 연결 확인: play 이벤트·화면 끄기 예외·토글 버튼
assert.ok(T.includes('player.addEventListener("play", () => loudRoute(player))') && T.includes('full.addEventListener("play", () => loudRoute(full))'));
assert.ok(T.includes("c === loudCtx && loudActive()") && (T.match(/data-tploud/g) || []).length >= 3);
console.log("lesson-loud ok");
