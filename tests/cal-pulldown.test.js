// (11/16) 달력: 아래로 당기면 날짜 칸에 이름·시간 · 접기 줄 · 당기기 함수 — 실제 코드 실행
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = T.indexOf("let calDet = false;"), b = T.indexOf("function calNums");
const ctx = { esc: (x) => String(x).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])), CAL_S: { done: ["✅", "완료"], makeup_done: ["🔁", "보강"], scheduled: ["C", "예정"], cancelled: ["✖", "휴강"], moved: ["↪", "이동"], review: ["⏳", "확인"], past: ["☑", "지난"] }, IC_CAL: "C", isStaffApp: () => false, calNums: (xs) => `<b class="icnum">${xs.length}</b>`, Map, Date };
vm.createContext(ctx); vm.runInContext(T.slice(a, b), ctx);
vm.runInContext(T.slice(T.indexOf("function calPullSet"), T.indexOf("function calCellWire(")), ctx);
const by = { "2026-11-19": [{ s: "scheduled", time: "19:00", name: "김하나" }, { s: "scheduled", time: "20:00", name: "박<b>x" }, { s: "cancelled", time: "21:00", name: "이도윤" }, { s: "scheduled", time: "22:00", name: "넷째" }] };
let h = ctx.calGrid("2026-11", by, null, true);
assert.ok(h.includes('class="cal"') && h.includes('id="calPull"') && h.includes("▾ 아래로 당기면 이름·시간"), "접힌 상태 + 당기기 줄");
assert.ok(h.includes("<b>19:00</b>김하나") && h.includes("박&lt;b&gt;x") && h.includes("+1") && !h.includes("넷째"), "이름·시간 3명까지 + 나머지 +N, 이스케이프");
assert.ok(h.includes('class="de off"'), "휴강은 흐리게");
assert.ok(!ctx.calGrid("2026-11", by, null, false).includes("class=\"dt\"") && !ctx.calGrid("2026-11", by, null, false).includes("calPull"), "수강생 달력(탭 없음)엔 영향 없음");
// 당기기 함수
const cl = new Set(), st = {}; const grid = { classList: { add: (c) => cl.add(c), remove: (c) => cl.delete(c), toggle: (c, v) => (v ? cl.add(c) : cl.delete(c)) }, style: { setProperty: (k, v) => (st[k] = v), removeProperty: (k) => delete st[k] } };
const btn = { textContent: "", setAttribute: (k, v) => (btn[k] = v) }; ctx.document = { getElementById: () => btn }; ctx.grid = grid;
vm.runInContext("calPullSet(grid, 0.5)", ctx); assert.ok(cl.has("pulling") && st["--p"] === "0.500");
vm.runInContext("calPullEnd(grid, true)", ctx); assert.ok(!cl.has("pulling") && cl.has("det") && !("--p" in st) && btn.textContent.includes("접기") && vm.runInContext("calDet", ctx) === true, "충분히 당기면 펼침");
h = ctx.calGrid("2026-11", by, null, true); assert.ok(h.includes('class="cal det"') && h.includes("▴ 이름·시간 접기"), "달을 넘겨도 펼침 유지");
vm.runInContext("calPullEnd(grid, false)", ctx); assert.ok(!cl.has("det") && vm.runInContext("calDet", ctx) === false, "덜 당기면 되돌아감");
assert.ok(T.includes("st.pull = true") && T.includes("calPullEnd(grid, s.p > 0.35)") && T.includes("(window.scrollY || 0) <= 2"), "제스처 연결·맨 위에서만");
console.log("cal-pulldown OK");
