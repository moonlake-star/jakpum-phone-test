// (11/24 · 멜로다인 Select Special) 여러 음 고르기 ⇥ 끝까지: 고른 시작부터 곡 끝까지
const fs = require("fs"), assert = require("assert"); const T = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes('data-mend disabled aria-label="고른 곳부터 곡 끝까지 모두 고르기">⇥ 끝까지</button>') && T.includes("st.msel = [m_[0], Math.max(m_[1], end)];"), "끝까지 고르기");
console.log("select-end ok");
