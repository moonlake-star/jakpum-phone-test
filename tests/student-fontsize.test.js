// 수강생 화면 글씨 크기(2026-10-29): 4단계, 이 폰에 기억(sn_fz), 버튼은 제목 줄(따라다니지 않음), 안내는 처음 2번·바꾸면 끝
const fs = require("fs"), assert = require("assert");
const s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const grab = (re) => { const m = s.match(re); assert.ok(m, "없음 " + re); return m[0]; };
const store = {}, LS = { get: (k) => (k in store ? store[k] : null), set: (k, v) => { store[k] = v; } };
let fzv = null; const document = { documentElement: { style: { setProperty: (k, v) => { fzv = v; } } } };
const fzApply = new Function("document", grab(/const FZ = [^\n]*\n/) + grab(/function fzApply\([^\n]*\n/) + "; return fzApply;")(document);
assert.strictEqual(fzApply(1.3), 1.3); assert.strictEqual(fzv, "1.3");
assert.strictEqual(fzApply(7), 1, "모르는 값은 보통"); assert.strictEqual(fzApply(null), 1);
assert.ok(/html \{ font-size:calc\(16px \* var\(--fz, 1\)\); \}/.test(s) && s.includes("font:calc(19px * var(--fz, 1))"), "rem·본문 같이 커짐");
assert.ok(s.includes('fzApply(LS.get("sn_fz") ?? 1);'), "열 때 기억한 크기");
assert.ok(s.includes('LS.set("sn_fz", v)'), "고르면 기억");
assert.ok(/<h1><button type="button" class="fzBtn" id="fzBtn"/.test(s) && !/\.fzBtn \{[^}]*position:fixed/.test(s), "제목 줄에만, 고정 아님");
const hint = grab(/function fzHint\(\)[\s\S]*?\n}\n/);
assert.ok(hint.includes("n >= 2") && hint.includes('LS.get("sn_fz") != null'), "처음 2번만, 바꾼 적 있으면 안 띄움");
console.log("student-fontsize ok");
