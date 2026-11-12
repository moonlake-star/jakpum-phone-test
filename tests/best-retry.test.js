// (11/12 22:31) 편집본 실패 레슨 열면 서버 바로 깨워 다시(15분에 한 번) · 반복 강조 말버릇 화면에서도 거름
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes("function bestAutoRetry(me)") && H.includes("(bestAutoRetry(cur), \"편집본을 다시 만들고 있어요"), "자동 다시");
assert.ok(H.includes('const EMPH_SKIP = new Set("되게 그런'), "말버릇 거름");
console.log("best-retry ok");
