// (11/12 17:55) 길이 손잡이 = 음표 조금 아래(자리 없으면 위) · 맞히는 자리도 같은 높이
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes("let ay = sb.y + sb.h / 2 + hh / 2 + 10; if (ay + hh / 2 > T + HP - 2) ay = sb.y - sb.h / 2 - hh / 2 - 10;"), "아래, 없으면 위");
assert.ok(T.includes("st.hdl = { l: { x: lx - R * 0.75, y: ay, r: R + 8 }, r: { x: rx + R * 0.75, y: ay, r: R + 8 } };"), "맞히는 자리");
console.log("hdl-below ok");
