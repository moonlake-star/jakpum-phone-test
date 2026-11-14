// (11/14 18:56 사용자) 고급 칸을 좌우로 밀면 흐름 ↔ 비브라토 — 세로 칸은 좌우 밀기 = 탭 넘김, 가로 칸은 값 조절 그대로
const fs = require("fs"), path = require("path"), assert = require("assert");
const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
assert.ok(A.includes('if (o.vert && d.ax === "h") { d.sw = dx_; return; }'), "세로 칸 좌우 = 값 안 바꿈");
assert.ok(A.includes('new CustomEvent("advswipe", { bubbles: true, detail: was.sw < 0 ? 1 : -1 })'), "왼쪽으로 밀면 다음 탭");
assert.ok(A.includes('el.addEventListener("advswipe"') && A.includes("Math.abs(dx) >= 50 && Math.abs(dx) > 1.6 * Math.abs(dy)"), "패널 빈 곳 밀기");
assert.ok(A.includes('e.target.closest(".advSc")'), "칸 위에서 시작한 밀기는 칸이 처리");
console.log("adv-tab-swipe OK");
