// (11/05 사용자 '되도록 불러오는 중 팝업이 자주 안 뜨게') 전체 화면 팝업 규칙 회귀 방지
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");

// 1) '방금 눌렀다'는 누름(click)만 — 스크롤·밀기(pointerdown)는 세지 않음
assert.ok(t.includes('document.addEventListener("click", () => { lastTap = Date.now(); }, true);') && !t.includes('document.addEventListener("pointerdown", () => { lastTap = Date.now(); }, true);'), "lastTap은 click만");

// 2) 규칙 함수를 실제로 실행: 화면별·읽기/쓰기별
const a = t.indexOf("const AUTOBUSY_MS"), b = t.indexOf("async function api(url, opt = {}, retried = false) {");
assert.ok(a > 0 && b > a);
const code = t.slice(a, b) + "; return { autoBusy, listBgQuiet, AUTOBUSY_MS, setTap: (v) => { lastTap = v; } };";
function world(view, sheet) {
  const shownIds = new Set([view]); const calls = [];
  const document = { getElementById: (id) => ({ classList: { contains: () => !shownIds.has(id) } }), querySelector: () => (sheet ? {} : null) };
  const busy = (on) => calls.push(on);
  const o = new Function("document", "busy", "let lastTap = Date.now();" + code)(document, busy); o.calls = calls; return o;
}
const quiet = (view, read, sheet) => world(view, sheet).listBgQuiet(read);
assert.strictEqual(quiet("vList", false), true, "메인 목록: 쓰기도 조용히");
assert.strictEqual(quiet("vList", true), true, "메인 목록: 읽기도 조용히");
assert.strictEqual(quiet("vStu", true), true, "수강생 화면: 읽기는 조용히(칸마다 자기 글자)");
assert.strictEqual(quiet("vStu", false), false, "수강생 화면: 저장(쓰기)은 안내 그대로");
assert.strictEqual(quiet("vLesson", true), false, "레슨 화면: 안내 그대로");
assert.strictEqual(quiet("vMkJob", true), false, "메이크업 화면: 안내 그대로");
assert.strictEqual(quiet("vList", true, true), false, "시트가 열려 있으면 안내 그대로");

// 3) 1.5초 넘을 때만 · 눌렀던 게 오래전이면 아예 안 뜸
(async () => {
  const w = world("vLesson"); assert.strictEqual(w.AUTOBUSY_MS, 1500);
  await w.autoBusy(new Promise(r => setTimeout(r, 300)), true); assert.deepStrictEqual(w.calls, [], "0.3초: 팝업 없음");
  const w2 = world("vLesson"); await w2.autoBusy(new Promise(r => setTimeout(r, 1700)), true); assert.deepStrictEqual(w2.calls, [true, false], "1.7초: 팝업 떴다 사라짐");
  const w3 = world("vLesson"); w3.setTap(Date.now() - 9000); await w3.autoBusy(new Promise(r => setTimeout(r, 1700)), true); assert.deepStrictEqual(w3.calls, [], "눌린 지 오래된 배경 읽기는 팝업 없음");
  console.log("loading-popup: 규칙 ok");
})().catch(e => { console.error(e); process.exit(1); });

// 4) 읽기/쓰기 구분이 호출 지점에 연결돼 있음 · 명시 팝업은 0.4초 뒤부터 · 메인 목록 재사용 캐시
assert.ok(t.includes('autoBusy(api(url, { ...opt, _nb: true }, retried), !opt.method || String(opt.method).toUpperCase() === "GET")'), "api: GET이면 읽기");
assert.ok(t.includes("})(), true);") || t.includes("json())(), true);"), "readJSON 읽기");
assert.ok(/autoBusy\(portal\(action, \{ \.\.\.extra, _nb: true \}\), \/\^t_\(state\|usage/.test(t), "portal: 읽기 동작만 읽기");
assert.ok(t.includes('msg.replace(/…$/, "") + "…", 400);'), "명시 팝업도 0.4초 뒤부터");
assert.ok(t.includes("listNet = {}; show(\"vList\");") && t.includes("listNet.join ??= loadAccounts()") && t.includes("(listNet.asg ??= asgOwnerTodos())"), "메인 목록 다시 그릴 때 같은 정보 재사용(새로고침에서만 비움)");
