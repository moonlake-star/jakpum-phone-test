// (11/12 17:55) 길이 손잡이 = 음표 조금 아래(자리 없으면 위) · 맞히는 자리도 같은 높이 · (11/13 C안) 음표 끝에 붙은 동그라미, 30px 아래
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes("const CR = 13; let ay = sb.y + sb.h / 2 + 30; if (ay + CR > T + HP - 2) ay = sb.y - sb.h / 2 - 30;"), "아래, 없으면 위");
assert.ok(T.includes("st.hdl = { l: { x: lx, y: ay, r: R + 8 }, r: { x: rx, y: ay, r: R + 8 } };"), "맞히는 자리 = 동그라미 가운데(음표 끝)");
assert.ok(T.includes("g.arc(x, ay, CR, 0, Math.PI * 2)"), "동그라미");
console.log("hdl-below ok");
