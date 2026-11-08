// 갤럭시 뒤로 가기(스와이프·내비 버튼): 화면 → 직전 화면 · 첫 화면은 두 번 밀어야 닫힘.
// (11/09 01:38 사용자 '뒤로 가기에 앱이 꺼지는 경우가 있음') 크롬의 '건너뛸 칸' 규칙까지 흉내 낸 가짜 history 위에서 brand.js + 선생님 앱 뒤로 가기 처리를 돌려 봄.
//  크롬 규칙: 뒤로·앞으로 이동 뒤 화면을 만지기 전에 만든 칸이 있으면, 그 문서의 칸이 모두 '건너뛸 칸'이 되어 다음 뒤로 가기가 앱 밖으로 나감.
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const br = fs.readFileSync(__dirname + "/../brand.js", "utf8"), T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
let stack, idx, act, skippable, exited, ls;
const reset = () => { stack = [null]; idx = 0; act = false; skippable = false; exited = false; ls = []; };
const fire = () => { const e = {}; ls.forEach(f => f(e)); return e; };
const H = { get state() { return stack[idx]; }, get length() { return stack.length; },
  pushState(s) { if (!act) skippable = true; stack.length = idx + 1; stack.push(s); idx++; },
  replaceState(s) { stack[idx] = s; },
  back() { H.go(-1); }, go(n) { const j = idx + n; if (j < 0) return; idx = j; act = false; fire(); } };
const sysBack = () => { if (exited) return; if (idx === 0 || skippable) { exited = true; return; } idx--; act = false; fire(); };   // 사용자의 뒤로 밀기
const touch = () => { act = true; skippable = false; (ls.downs || []).forEach(f => f()); };   // 화면을 만짐(= 크롬의 사용자 활성)
function boot() {
  reset(); ls.downs = [];
  const G = { history: H, location: { href: "x" }, addEventListener: (k, f) => { if (k === "popstate") ls.push(f); if (k === "pointerdown") ls.downs.push(f); },
    document: { getElementById: () => null, addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} }, appendChild() {}, setAttribute() {} }), head: { appendChild() {} }, body: null, querySelector: () => null } };
  G.window = G; G.self = G; vm.createContext(G); vm.runInContext(br, G); return G;
}
// 선생님 앱 뒤로 가기 처리(그대로 잘라 와서 실행)
const block = T.match(/let backSkip = false;[\s\S]*?\n}\);\n/)[0];
assert.ok(!/pushState/.test(block), "뒤로 가기 처리 중엔 새 칸을 만들지 않음");
function teacher(G) {
  const app = { visible: "vList", calls: [], toasts: [], stack: [] };
  const $ = id => ({ classList: { contains: c => id !== app.visible } });
  const goBack = () => { app.calls.push("back"); app.visible = app.stack.pop() || "vList"; };
  const win = { addEventListener: (k, f) => ls.push(f) };
  new Function("history", "window", "$", "goBack", "renderList", "toast", "Brand", "document", block)(H, win, $, goBack, () => {}, (m) => app.toasts.push(m), G.Brand, { querySelector: () => null });
  app.open = (v) => { touch(); app.stack.push(app.visible); app.visible = v; };   // 화면 버튼을 눌러 이동(= 만짐)
  return app;
}
// ① 화면 3단계 깊이 → 뒤로 3번(화면 안 만지고 연달아) = 한 단계씩, 앱 안 꺼짐
{ const G = boot(), a = teacher(G); touch();
  a.open("vStu"); a.open("vLesson"); a.open("vMkJob");
  sysBack(); sysBack(); sysBack();
  assert.ok(!exited, "연달아 뒤로 3번에도 앱이 안 꺼짐"); assert.deepStrictEqual(a.calls, ["back", "back", "back"]); assert.strictEqual(a.visible, "vList");
  sysBack(); assert.ok(!exited, "첫 화면 첫 번째 뒤로 = 안내만"); assert.ok(/한 번 더 뒤로/.test(a.toasts[0]));
  sysBack(); assert.ok(exited, "한 번 더 = 닫힘"); }
// ② 예전 방식(뒤로 가기 처리 중 칸 다시 만들기)이면 두 번째 뒤로에 꺼졌던 것 — 규칙 흉내가 맞는지 확인
{ reset(); touch(); H.pushState({ a: 1 }); H.pushState({ a: 2 }); sysBack(); H.pushState({ again: 1 }); sysBack(); assert.ok(exited, "예전 방식은 꺼짐(재현)"); }
// ③ 첫 화면에서 안내 뒤 화면을 만지면 다시 보호됨
{ const G = boot(), a = teacher(G); touch(); sysBack(); assert.ok(!exited); touch(); sysBack(); assert.ok(!exited, "만진 뒤엔 다시 안내부터"); assert.strictEqual(a.toasts.length, 2); }
// ④ 앱을 열자마자(안 만지고) 뒤로 = 바로 닫힘(첫 화면이므로 정상)
{ boot(); sysBack(); assert.ok(exited); }
// ⑤ 수강생 페이지도 같은 방식
assert.ok(S.includes("function snSub() {}") && S.includes("Brand.backToBase()") && !/addEventListener\("popstate"[\s\S]{0,600}pushState/.test(S));
assert.ok(/function show\(view\) \{ syncBackHistory\(view\);/.test(T) && T.includes("function syncBackHistory(view) {}"));
console.log("back-gesture ok");
