// (11/12 18:15~20:23 사용자 시안 고) 다 고른 여러 음 = 보라 · 손잡이 3개 음표 아래(‹ 첫 음 왼쪽 아래 · › 끝 음 오른쪽 아래 · ↕ 가운데 아래)
// ‹ › 바로 = 비율(1/4) · 꾹 0.5초 = 더 미세(1/12) · ↕ 바로 = 센트(1/4, ±100) · 꾹 0.5초 = 반음씩 · 고르는 동안만 분홍 범위
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes("if (st && st.msel && st.advOn && st.mStr && !st.mSelecting) {"), "다 고른 뒤 보라");
assert.ok(T.includes('g.fillStyle = "rgba(169,116,255,.88)"'), "보라 음표");
assert.ok(T.includes("st.mHdl = { l: { x: lx, y: yl, r: R + 9 }, r: { x: rx, y: yr, r: R + 9 }, p: { x: px_, y: py, r: 26 }"), "손잡이 3개");
assert.ok(T.includes("s_.k = STR_K / 3;"), "꾹 = 미세 길이");
assert.ok(T.includes("c = G.semi ? G.base + Math.round(c / 100 / 1) * 100 * 1 : G.base + c * STR_K;") && T.includes("if (!G.semi) c = Math.max(-100, Math.min(100, c));"), "센트·반음");
assert.ok(T.includes("const out = groupShift(cv, m_[0], m_[1], dc / 100);"), "같은 양 더하기");
assert.ok(T.includes("if (drag.armed && st.mMode) st.mSelecting = true;"), "고르는 동안 분홍");
console.log("multi-purple ok");
