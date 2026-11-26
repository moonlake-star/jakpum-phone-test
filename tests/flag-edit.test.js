// (11/26 사용자) 피드백 번호 핸들: 음표에서 더 멀리(52px) · 누르면 바로 피드백 고치기(onNote) · 번호 위 톡은 음표 고르기보다 먼저
const fs = require("fs"), assert = require("assert"); const T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes("const OFF = 52, up_ = py - OFF >= T + br + 1"), "멀리");
assert.ok(T.includes('if (typeof o.onNote === "function") { pauseNow(); st.popPin = null; lastView = view; o.onNote(h.n); return; }'), "누르면 고치기");
assert.ok(T.includes("if (!onFlag_ && !d.mode && e.type === \"pointerup\" && typeof o.onFix === \"function\" && isPaused() && st.tbars)"), "번호가 먼저");
console.log("flag-edit ok");
