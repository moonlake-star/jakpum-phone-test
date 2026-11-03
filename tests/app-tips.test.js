// (11/03 13:39 사용자) '불러오는 중' 로고 창 팁 — 기능이 바뀌면 실패해서 문구도 같이 고치게 함 · 끊김 없이 한 번만 뜨기
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = src.indexOf("const APP_TIPS = ["), b = src.indexOf("const appTips = () =>");
assert.ok(a > 0 && b > a);
const block = src.slice(a, b), code = src.slice(0, a) + src.slice(b);
const L = new Function("return " + block.slice(block.indexOf("["), block.lastIndexOf("]") + 1))();
assert.ok(L.length >= 5);
for (const t of L) { assert.ok(code.includes(t.need), "기능이 바뀌었으면 팁 문구도: " + t.text); assert.ok(t.text.length <= 48, "짧게: " + t.text); }
const br = fs.readFileSync(__dirname + "/../brand.js", "utf8");
assert.ok(br.includes("const GRACE = 500;") && br.includes("loading.hide = setTimeout(() => { loading.hide = null; if (ln !== 0) return; prog(el, false);") && br.includes("setTips"), "연달아 읽어도 한 번만");
assert.ok(src.includes("Brand.setTips(appTips)"));
console.log("app-tips ok", L.length);
