// (11/11 08:22 사용자 '원음으로 보냈는데 갈색') 🎤 원음 음 = 분홍 막대 + 분홍 테두리 + '🎤 원음' 글자(노랑 = 선생님이 음을 바꾼 것과 구분)
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes('raw: "rgba(255,138,176,.34)"') && T.includes("return fx_.off ? SRC_C.raw : SRC_C.teacher;"), "막대 색");
assert.ok(T.includes('g.strokeStyle = f.off ? "#ff9ec0" : "#ffd27a"') && T.includes('g.fillText("🎤 원음"'), "테두리·글자");
assert.ok(T.includes("g.fillStyle = rw_ ? SRC_C.raw :"), "정음 없는 자리(회색 점선)라도 원음이면 분홍");
console.log("raw-color ok");
