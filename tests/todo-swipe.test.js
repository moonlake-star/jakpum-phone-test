// (11/05 사용자) 오늘 할 일 정리: 옆으로 밀면 숨김 · 4개까지만 보이고 '더 보기' · '다시 보기'
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(t.includes('const tdKey = (x) => x.t + "|" + x.c') && t.includes("vn_todo_hide") && t.includes("TD_SHOW = 4"), "숨김 키(상태 바뀌면 다시 나타남)·4개 접기");
assert.ok(t.includes('id="tdMoreBtn"') && t.includes('id="tdShowAll"') && t.includes("숨긴 ${tdHidN}개"), "더 보기·다시 보기");
assert.ok(t.includes('addEventListener("pointermove"') && t.includes("Math.abs(dx) > 80") && t.includes("touch-action:pan-y") && t.includes('if (el.dataset.sw) { delete el.dataset.sw; return; }'), "옆으로 밀기(세로 스크롤 우선, 밀기 직후 클릭 무시)");
console.log("todo-swipe: ok");
