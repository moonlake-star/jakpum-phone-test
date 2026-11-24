// (11/24 사용자 '홈 빨간 점·확인 대기 1건을 눌러도 무반응') 숨긴 할 일이어도 확인 대기를 누르면 열림
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes('const bl = todo.filter(x => x.bell); if (bl.length === 1) return tdOpen(bl[0]);'), "1건이면 바로 열기");
assert.ok(T.includes("bl.forEach(x => { if (h[tdKey(x)]) { delete h[tdKey(x)]; ch = true; } });"), "여러 건이면 숨긴 것도 펼침");
assert.ok(T.includes("tdOpen(todo[+el.dataset.n]);") && T.includes("const tdOpen = (x) => {"), "할 일 줄과 같은 열기");
assert.ok(T.includes('if (b.dataset.bt === "today" && $("vList")?.dataset.tab === "today" && b.querySelector(".dot") && $("oneLine")) { $("oneLine").click(); return; }'), "빨간 점 '오늘' 다시 누르면 열기");
console.log("oneline-bell OK");
