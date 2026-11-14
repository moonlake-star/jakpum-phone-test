// (11/14 20:54 사용자 '살짝 내렸더니 다음 음 넘어가는 곳이 출렁') 고친 음 끝의 미끄러지는 칸은 머문 칸 기준(끌어내리지 않음)
const fs = require("fs"), path = require("path"), assert = require("assert");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const src = H.match(/function pvFixCenter\(f, raw, fps\) \{[\s\S]*?f\._cen = out; f\._cenRaw = raw; return out;\n\}/)[0];
const pvFixCenter = new Function(src + "; return pvFixCenter;")();
const fps = 25, raw = new Map();
for (let k = 0; k < 20; k++) raw.set(k, 6230);           // 0.8초 D4+30
for (let k = 17; k < 20; k++) raw.set(k, 6230 + (k - 16) * 55);   // 끝 3칸 E4로 미끄러짐
for (let k = 20; k < 30; k++) raw.set(k, 6400);
const cen = pvFixCenter({ t0: 0, t1: 0.79 }, raw, fps);
assert.ok(Math.abs(cen.get(5) - 6230) < 1, "음 안 = 6230");
for (const k of [17, 18, 19]) assert.ok(Math.abs(cen.get(k) - 6230) < 25, `끝 칸 ${k} 기준이 미끄러짐을 따라가지 않음: ${cen.get(k)}`);
assert.ok(H.includes("const cen = pvFixCenter(f, raw, fps), s_ = cen.get(k) ?? r0, c_ = 1;") && H.includes("const s_ = pvFixCenter(f, raw, fps).get(k) ?? r0, c_ = 1;"), "미리듣기 두 곳 모두");
console.log("fix-center-edge OK");
