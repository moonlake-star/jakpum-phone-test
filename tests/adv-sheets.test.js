// 점검(11/14): 🎛 보정 설정 창의 [취소]·[✓ 적용]이 연결돼 있고, 🌬 치찰음·호흡 창이 오류 없이 열린다
// (11/13 #684에서 취소·적용 코드가 엉뚱한 창에 들어가 → 보정 설정은 적용 버튼이 죽고, 치찰음 창은 열리다 오류로 안 열렸음)
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const src = fs.readFileSync(__dirname + "/../adv.js", "utf8");
function mkEl() {   // 아주 작은 가짜 DOM: innerHTML에 class="…이름…"이 있는 칸만 querySelector로 찾아짐(없으면 null — 실제 브라우저와 같음)
  const el = { style: {}, children: [], _kids: {}, _l: {}, _html: "", removed: false, attrs: {}, className: "", textContent: "", hidden: false, disabled: false,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { el.children.push(c); return c; }, insertBefore(c) { el.children.push(c); return c; }, remove() { el.removed = true; },
    setAttribute(k, v) { el.attrs[k] = v; }, getAttribute(k) { return el.attrs[k]; },
    addEventListener(ev, fn) { (el._l[ev] = el._l[ev] || []).push(fn); }, removeEventListener() {},
    querySelector(sel) { const m = /^\.([\w-]+)$/.exec(sel); if (!m) return null; const re = new RegExp('class="[^"]*\\b' + m[1] + '\\b'); if (!re.test(el._html)) return null; return (el._kids[m[1]] = el._kids[m[1]] || mkEl()); },
    querySelectorAll() { return []; }, setPointerCapture() {}, getBoundingClientRect() { return { left: 0, top: 0, width: 300, height: 300 }; }, focus() {}, blur() {}, closest() { return null; } };
  Object.defineProperty(el, "innerHTML", { get: () => el._html, set: (v) => { el._html = String(v); el._kids = {}; } });
  return el;
}
const toasts = [], doc = { createElement: () => mkEl(), head: mkEl(), body: mkEl(), getElementById: () => null, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] };
const ctx = { document: doc, JSON, Math, Object, Array, String, Number, Float64Array, Uint8Array, Date, Map, Set, Promise, console, setTimeout: (f) => 0, clearTimeout() {}, requestAnimationFrame: () => 0, navigator: {}, localStorage: { getItem: () => null, setItem() {} } };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const A = ctx.TuneAdv; assert.ok(A && typeof A.globalSheet === "function" && typeof A.uvSheet === "function");
const mkSt = () => ({ ne: { notes: [], global: {} }, onGlobalApply() { this.applied = (this.applied || 0) + 1; } });
// 1) 보정 설정 창: 만들기 오류 없음 · 취소/적용 버튼에 동작이 연결됨
{ const host = mkEl(), st = mkSt(), cv = { pts: [], levels: [3] };
  const r0 = A.globalSheet(host, st, cv), d = r0 || host.children[host.children.length - 1];
  assert.ok(d && host.children.includes(d), "보정 설정 창이 화면에 붙지 않음");
  const ap = d.querySelector(".advGApply"), ca = d.querySelector(".advGCancel");
  assert.ok(ap && typeof ap.onclick === "function", "✓ 적용 버튼에 동작이 없음");
  assert.ok(ca && typeof ca.onclick === "function", "취소 버튼에 동작이 없음");
  assert.ok(typeof d.querySelector(".advX").onclick === "function", "✕ 버튼에 동작이 없음");
  ap.onclick();   // 바꾼 값이 없으면 아무 일도 안 하고(오류도 없음) 창은 그대로
  assert.strictEqual(d.removed, false, "바꾼 것 없이 적용을 눌러도 창이 닫히면 안 됨(예전 동작)");
  ca.onclick(); assert.strictEqual(d.removed, true, "취소를 누르면 닫혀야 함"); }
// 2) 치찰음·호흡 창: 열림(오류 없음) · 화면에 붙음 · ✕로 닫힘 · 바깥 톡으로 닫힘
{ const host = mkEl(), st = mkSt(), cv = { pts: [], levels: [3] };
  const d = A.uvSheet(host, st, cv, [10, 12]);
  assert.ok(d && host.children.includes(d), "치찰음 창이 화면에 붙지 않음");
  assert.ok(!d.querySelector(".advGApply"), "치찰음 창에 보정설정의 적용 버튼이 있으면 안 됨");
  const click = d._l.click && d._l.click[0]; assert.ok(click, "바깥 톡 닫기 없음");
  click({ target: d }); assert.strictEqual(d.removed, true, "바깥 톡으로 닫혀야 함"); }
console.log("adv-sheets OK");
