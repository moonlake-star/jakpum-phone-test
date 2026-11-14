// (11/14 21:57 사용자) 건반 자리 터치 = 늘 건반(아래 가려진 손잡이·음표보다 먼저) · 건반에 걸친 손잡이는 안 그림
const fs = require("fs"), path = require("path"), assert = require("assert");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
const i = T.indexOf("건반 자리는 늘 건반이 먼저"), j = T.indexOf("const VH = st.vhdl");
assert.ok(i > 0 && j > i, "건반 확인이 손잡이 확인보다 먼저");
assert.ok(T.includes("if (ix >= L + 8) vh(") && T.includes("if (lx >= L + 8) drawA("), "건반에 걸친 손잡이 숨김");
console.log("kb-first OK");
