// 점검(11/14): 곡 서랍 코드 줄 '길게 눌러 고치기' 타이머가 곡을 닫을 때(dispose) 같이 꺼져야 함 — 안 그러면 닫힌 뒤 코드 편집 창이 뜸
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const d = src.indexOf("me.dispose = () => {"), line = src.slice(d, src.indexOf("\n", d));
assert.ok(line.includes("try { lpStop(); } catch {}"), "dispose에서 lpStop 호출 누락");
assert.ok(src.includes("let lp = null; const lpStop = () => { if (lp) { clearTimeout(lp.t); lp = null; } };"), "lpStop 정의가 바뀜");
// 축약 모델: lpStop 뒤에는 타이머가 편집 창을 열지 않음
let opened = 0, lp = null; const lpStop = () => { if (lp) { clearTimeout(lp.t); lp = null; } };
lp = { t: setTimeout(() => { if (!lp) return; lp = null; opened++; }, 30) }; lpStop();
setTimeout(() => { assert.strictEqual(opened, 0); console.log("chord-lp-dispose OK"); }, 80);
