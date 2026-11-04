// (11/04 사용자 승인) 수강생 사용 기록: 열기·노트·재생·들은 초·끝까지·음정선 화면 → 모아서 한 번에(내용은 안 보냄)
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const src = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const a = src.indexOf("const UT = {"), b = src.indexOf("async function load() {");
assert.ok(a > 0 && b > a);
const block = src.slice(a, b);
const sent = [], listeners = {};
class HTMLMediaElement { constructor(id, dur) { this.id = id; this.duration = dur; this.currentTime = 0; this.dataset = {}; } }
let now = 0;
const ctx = { HTMLMediaElement, performance: { now: () => now }, setTimeout: () => 1, clearTimeout() {}, MutationObserver: class { observe() {} },
  document: { body: {}, visibilityState: "visible", addEventListener: (k, f) => { (listeners[k] ||= []).push(f); } },
  fetch: (u, o) => { sent.push(JSON.parse(o.body)); return Promise.resolve(); }, PORTAL_URL: "x", Map, Math, JSON, Promise };
vm.createContext(ctx);
vm.runInContext("let idToken = null, data = null;\n" + block + "\nthis.track = track; this.utFlush = utFlush; this.utWire = utWire; this.UT = UT; this.setTok = (t) => { idToken = t; data = {}; };", ctx);
ctx.track("open"); ctx.utFlush(); assert.strictEqual(sent.length, 0, "로그인 전에는 안 보냄");
ctx.setTok("TOK"); ctx.utWire(); ctx.UT.cur = "L1";
const au = new HTMLMediaElement("au_abc", 100);
const fire = (k, el) => listeners[k].forEach(f => f({ target: el }));
fire("play", au); now = 30000; au.currentTime = 95; fire("pause", au);
ctx.document.visibilityState = "hidden"; listeners.visibilitychange.forEach(f => f());
assert.strictEqual(sent.length, 1);
const ev = sent[0].events;
assert.strictEqual(sent[0].action, "track"); assert.strictEqual(sent[0].id_token, "TOK");
assert.deepStrictEqual(ev.map(e => e.k), ["play", "listen", "done"]);
assert.strictEqual(ev[1].s, 30); assert.strictEqual(ev[0].f, "clip"); assert.ok(ev.every(e => e.lesson === "L1"));
assert.ok(!JSON.stringify(sent).includes("abc"), "파일 이름·ID는 안 보냄");
// 중간부터 틀어 끝 부분만 들은 건 '끝까지'가 아님
sent.length = 0; au.currentTime = 80; fire("play", au); now = 40000; au.currentTime = 95; fire("pause", au); ctx.utFlush();
assert.deepStrictEqual(sent[0].events.map(e => e.k), ["play", "listen"]);
// 연결: 노트 열기·포털 열기·음정선 화면
assert.ok(src.includes('track("note", { lesson: id })') && src.includes('track("open", { lesson: "" })') && src.includes('n.id === "tuneFs"'));
// 선생님 앱: 성장 탭에 사용 카드
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(t.includes('portal("t_usage")') && t.includes('<div id="grUse"></div>') && t.includes("일째 안 열어 봄"));
console.log("usage-track ok");
