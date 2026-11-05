// (11/05 사용자) 오늘 할 일 정리: 옆으로 밀면 숨김 · 4개까지만 보이고 '더 보기' · '다시 보기'
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(t.includes('const tdKey = (x) => x.t + "|" + x.c') && t.includes("vn_todo_hide") && t.includes("TD_SHOW = 4"), "숨김 키(상태 바뀌면 다시 나타남)·4개 접기");
assert.ok(t.includes('id="tdMoreBtn"') && t.includes('id="tdShowAll"') && t.includes("숨긴 ${tdHidN}개"), "더 보기·다시 보기");
assert.ok(t.includes('addEventListener("pointermove"') && t.includes("Math.abs(dx) > 80") && t.includes("touch-action:pan-y") && t.includes('if (el.dataset.sw) { delete el.dataset.sw; return; }'), "옆으로 밀기(세로 스크롤 우선, 밀기 직후 클릭 무시)");
console.log("todo-swipe: ok");

// (11/05 사용자) 밀 때 '가리기' 글자 · 하나 가릴 때 전체 다시 그리기(=불러오는 중 팝업) 금지 · 메인 목록의 배경 불러오기는 전체 화면 안내 없음
{
  assert.ok(t.includes('<span>🙈 가리기</span><span>가리기 🙈</span>') && t.includes("wrap.dataset.dir") && t.includes("wrap.dataset.ready") && t.includes(".tdW[data-ready] .tdBg"), "밀 때 뒤에 '가리기' 글자");
  const a = t.indexOf("const wireTodo = () => {"), b = t.indexOf("  wireTodo();", a);
  assert.ok(a > 0 && b > a, "wireTodo 위치"); const wire = t.slice(a, b);
  assert.ok(wire.includes("setTimeout(repaintTodo, 190)") && !wire.includes("paintList("), "가리기·다시 보기는 오늘 할 일 카드만 다시 그림(paintList 금지)");
  assert.ok(t.includes("const repaintTodo = () => { const c = $(\"todoCard\")") && t.includes("tdExtra = xs.map("), "카드만 다시 그려도 덧붙은 줄 유지");
  assert.ok(!/\$\("vList"\)\.querySelector\("\.card"\)/.test(t), "배치 알림 줄을 첫 카드(연습 천재 입구)에 붙이지 않음");
  const f = t.slice(t.indexOf("function listBgQuiet()"), t.indexOf("function autoBusy(p)"));
  assert.ok(f.includes('getElementById("vList")') && f.includes('.attSheet'), "목록이 보이고 시트가 없을 때만 조용히");
  assert.ok(t.includes("|| listBgQuiet()) return p;"), "autoBusy가 listBgQuiet을 확인");
  // 실제 함수 동작: 목록 보임/숨김/시트 열림
  const mk = (hidden, sheet) => ({ document: { getElementById: () => ({ classList: { contains: () => hidden } }), querySelector: () => sheet ? {} : null } });
  const run = (env) => new Function("document", f + "; return listBgQuiet();")(env.document);
  global.document ??= undefined;
  assert.strictEqual(run(mk(false, false)), true, "목록 보임 → 조용히");
  assert.strictEqual(run(mk(true, false)), false, "다른 화면(수강생·레슨) → 안내 그대로");
  assert.strictEqual(run(mk(false, true)), false, "시트 열림 → 안내 그대로");
  console.log("todo-swipe: 가리기 글자·카드만 다시·배경 조용 ok");
}
