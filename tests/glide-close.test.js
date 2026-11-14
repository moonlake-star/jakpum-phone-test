// 점검(11/14): 보정 전체화면을 닫을 때 관성 미끄러짐(시간·위아래)이 계속 돌다가 닫힌 화면에서 seek를 부르지 않게 멈춘다
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const dec = src.indexOf("let drag = null, pinch = null, preview = null, tGlide = null, vGlide = null;");
const stop = src.indexOf("st.glideStop = () => { tGlide = null; vGlide = null; };");
assert.ok(dec > 0 && stop > dec, "glideStop은 두 변수 선언 뒤에 있어야 함");
const done = src.indexOf("const done = () => {"), doneEnd = src.indexOf("\n", done), line = src.slice(done, doneEnd);
assert.ok(line.includes("st.glideStop && st.glideStop()"), "닫을 때 glideStop 호출 누락");
assert.ok(line.indexOf("glideStop") < line.indexOf("wrap.remove()"), "화면 제거 전에 멈춰야 함");
// 의미 시험(축약 모델): 멈춘 뒤에는 step이 seek를 부르지 않음
let seeks = 0; const g = { t: { v: 1 } }, stopAll = () => { g.t = null; };
const stepT = (gl) => { if (g.t !== gl) return; seeks++; };
const gl = g.t; stepT(gl); assert.strictEqual(seeks, 1); stopAll(); stepT(gl); assert.strictEqual(seeks, 1);
console.log("glide-close OK");
