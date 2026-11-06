// (11/03 13:39 사용자) '불러오는 중' 로고 창 팁 — 기능이 바뀌면 실패해서 문구도 같이 고치게 함 · 끊김 없이 한 번만 뜨기
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = src.indexOf("const APP_TIPS = ["), b = src.indexOf("const appTips = (kind) =>");
assert.ok(a > 0 && b > a);
const block = src.slice(a, b), code = src.slice(0, a) + src.slice(b);
const L = new Function("return " + block.slice(block.indexOf("["), block.lastIndexOf("]") + 1))();
assert.ok(L.length >= 5);
for (const t of L) { assert.ok(code.includes(t.need), "기능이 바뀌었으면 팁 문구도: " + t.text); assert.ok(t.text.length <= 48, "짧게: " + t.text); }
const br = fs.readFileSync(__dirname + "/../brand.js", "utf8");
assert.ok(br.includes("const GRACE = 500;") && br.includes("loading.hide = setTimeout(() => { loading.hide = null; if (ln !== 0) return; prog(el, false);") && br.includes("setTips"), "연달아 읽어도 한 번만");
assert.ok(src.includes("Brand.setTips(appTips)"));
{ const ss = fs.readFileSync(__dirname + "/../student/index.html", "utf8"), a2 = ss.indexOf("const S_TIPS = ["), b2 = ss.indexOf("try { if (typeof Brand !== \"undefined\" && Brand.setTips) Brand.setTips(() => (typeof data");
  assert.ok(a2 > 0 && b2 > a2, "수강생 팁");
  const blk = ss.slice(a2, b2), cd = ss.slice(0, a2) + ss.slice(b2), S = new Function("return " + blk.slice(blk.indexOf("["), blk.lastIndexOf("]") + 1))();
  for (const t2 of S) { assert.ok(cd.includes(t2.need), "수강생 팁 기능: " + t2.text); assert.ok(t2.text.length <= 48); }
  const tt = L.map(x => x.text).join("|"); assert.ok(!S.some(x => tt.includes(x.text)), "선생님·수강생 팁은 서로 달라야"); }
console.log("app-tips ok", L.length);
// (11/03 22:33 사용자) 불러오는 중 팁 박스 → 원래 팝업(작은 로고 + 글 + 진행 바) · 터치 안 막음 · 연달아 읽어도 한 번만
{ const br2 = fs.readFileSync(__dirname + "/../brand.js", "utf8");
  assert.ok(br2.includes('<div class="lg"></div><div class="tx"></div><div class="br"><i></i></div>') && !br2.includes('class="bx"') && !br2.includes("queued") && !br2.includes('tipFn("load")'), "원래 팝업");
  assert.ok(/\n\s*let lt = null, ln = 0;/.test(br2) && /\n\s*const GRACE = 500;/.test(br2), "변수 선언이 주석에 묻히지 않음"); }
// (11/03 17:28 사용자) 화면 맨 아래 고정 팁 칸 · 누르면 그 팁이 맨 위인 목록 · 전체화면은 팝업 없이 아래 팁 한 줄/💡 팁 보기 → 목록
{ const b6 = fs.readFileSync(__dirname + "/../brand.js", "utf8"), t6 = fs.readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(b6.includes("function tipBar(on)") && b6.includes("function tipSheet(list, first, host)") && b6.includes("order = [L[f], ...L.filter((_, i) => i !== f)]") && b6.includes("setTimeout(() => { tipBarRefresh(); tipNudge(); }, 30)"));
  for (const f of ["teacher", "student"]) assert.ok(fs.readFileSync(__dirname + `/../${f}/index.html`, "utf8").includes("Brand.tipBar(true)"), f);
  assert.ok(t6.includes('tlEl.onclick = () => openTips(tipI);') && t6.includes('tb.className = "tfTipsBtn"')); }
// (11/06 23:35 사용자) 화면이 바뀔 때마다 팁 칸이 살짝 올라왔다 제자리로
{ const b7 = require("fs").readFileSync(__dirname + "/../brand.js", "utf8"); require("assert").ok(b7.includes("#brTipBar.nudge{animation:brTipNudge 1.3s") && b7.includes("translateY(-30px)") && b7.includes("brTipFlash")); console.log("tip nudge ok"); }
