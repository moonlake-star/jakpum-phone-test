// (11/24 사용자 '로딩중 팝업이 연달아 2번씩 — 한 번 길게로, 다른 화면도 전수') 불러오기 창 이어 붙이기
const fs = require("fs"), assert = require("assert");
const B = fs.readFileSync(__dirname + "/../brand.js", "utf8"), T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(B.includes("const GRACE = 1200, QUIET = 2500;"), "끝난 뒤 1.2초 안 다음 읽기는 같은 창");
assert.ok(B.includes("quiet ? Math.max(d0, 2000) : d0") && B.includes("loading.lastOff = performance.now();"), "막 사라진 뒤 2.5초는 새 창을 늦게(짧은 읽기는 안 뜸)");
assert.ok(T.includes("globalThis.__quiet = (globalThis.__quiet || 0) + 1; let qd = false;") && T.includes("globalThis.__quiet = Math.max(0, (globalThis.__quiet || 1) - 1);"), "곡 불러오기 창과 공통 창이 겹치지 않음");
// 동작: 가짜 DOM으로 brand.js loading을 돌려 '끝 → 0.9초 뒤 다시 시작'이 한 창으로 이어지는지
const a = B.indexOf("  function prog(el"), b = B.indexOf("  // (11/03 17:28 사용자) 화면 맨 아래");
let now = 0; const timers = []; const st = (f, ms) => { timers.push({ f, at: now + ms }); return timers.length; }, ct = (i) => { if (i && timers[i - 1]) timers[i - 1].f = null; };
const run = (ms) => { const end = now + ms; for (;;) { const t = timers.filter(x => x.f && x.at <= end).sort((p, q) => p.at - q.at)[0]; if (!t) break; now = t.at; const f = t.f; t.f = null; f(); } now = end; };
const cls = new Set(), el = { classList: { add: (c) => cls.add(c), remove: (c) => cls.delete(c), contains: (c) => cls.has(c) }, querySelector: () => ({ textContent: "", style: {} }), setAttribute() {}, set innerHTML(v) {} };
let shows = 0; const realAdd = el.classList.add; el.classList.add = (c) => { if (c === "on" && !cls.has("on")) shows++; realAdd(c); };
const doc = { getElementById: () => el, createElement: () => el, body: { appendChild() {} } };
const L = new Function("document", "setTimeout", "clearTimeout", "performance", "requestAnimationFrame", "cancelAnimationFrame",
  "let lt = null, ln = 0, praf = 0, pt0 = 0;" + B.slice(a, b) + "; return loading;")(doc, st, ct, { now: () => now }, () => 0, () => {});
L(true); run(1000); assert.strictEqual(shows, 1, "1초 걸리는 첫 읽기 → 창 뜸");
L(false); run(900); L(true); run(1500); L(false); run(3000);
assert.strictEqual(shows, 1, "0.9초 뒤 이어진 두 번째 읽기는 같은 창(두 번 안 뜸)");
L(true); run(1000); L(false); run(3000); assert.strictEqual(shows, 1, "막 사라진 직후 1초짜리 읽기는 새 창 안 띄움");
console.log("loading-once OK");
