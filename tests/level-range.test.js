// (11/24 · 멜로다인 Leveling) 여러 음 고르기 → 🔊 고르게: 평균 크기 쪽으로 작은 음 N%↑·큰 음 M%↓, ±12dB, 0.12초 미만·무음 제외
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), A = fs.readFileSync(__dirname + "/../adv.js", "utf8");
assert.ok(T.includes('data-mlv disabled aria-label="고른 음 볼륨 고르게') && T.includes(">🔊 고르게</button>"), "버튼");
assert.ok(T.includes("const vals = L.map(([b, db]) => { const d_ = mean - db, g = d_ > 0 ? d_ * qv / 100 : d_ * lv / 100; return [b, Math.round(Math.max(-12, Math.min(12, g)) * 10) / 10]; });"), "평균 쪽으로 N%·M%, ±12dB");
assert.ok(T.includes("barsIn(cv, m_[0], m_[1]).filter(b => b.t1 - b.t0 >= 0.12)") && A.includes("function groupGain(st, cv, vals)") && A.includes("if (n.mute) continue;"), "짧은 음·무음 제외");
// 계산: 크기 −2dB·−10dB, 50%/50% → 평균 −6 → +2(작은 음)·−2(큰 음)
const mean = (-2 + -10) / 2, g = (db, q, l) => { const d_ = mean - db; return d_ > 0 ? d_ * q / 100 : d_ * l / 100; };
assert.strictEqual(g(-10, 50, 50), 2); assert.strictEqual(g(-2, 50, 50), -2); assert.strictEqual(g(-10, 100, 0), 4); assert.strictEqual(g(-2, 100, 0), -0);
console.log("level-range ok");
