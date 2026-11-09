// (11/09 11:35 사용자 '곡 서랍 재생이 다른 앱보다 3dB 넘게 작음') 리미터 천장 −1 dBFS · 보컬을 줄여도 원곡(반주+보컬 100%)과 같은 크기로 자동 보상(최대 +9 dB)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const comp = new Function("EN", "vol", T.match(/const comp = \(\) => \{[^\n]*\};/)[0] + " return comp();");
const EN = { mm: 1, vv: 1, mv: 0 };   // 반주·보컬 크기 같고 서로 상관 없음
assert.ok(Math.abs(comp(EN, 100) - 1) < 1e-9, "원곡 그대로면 보상 없음");
assert.ok(Math.abs(20 * Math.log10(comp(EN, 0)) - 3.01) < 0.05, "보컬 0%면 +3 dB");
assert.ok(comp(null, 30) === 1, "에너지 모르면 그대로");
assert.ok(comp({ mm: 0.01, vv: 1, mv: 0 }, 0) <= 10 ** (9 / 20) + 1e-9, "최대 +9 dB");
assert.ok(T.includes("lim.threshold.value = -1;") && T.includes("try { EN = energy(m, v); } catch { EN = null; }") && T.includes("setMaster(0.05);"));
// (11/09 11:46) 이미 마스터링된 곡은 더 안 키움: 원곡 실효값 −9 dBFS → ×1 · 조용한 곡 −24 dBFS → 최대 +6 dB · −17 dBFS → +3 dB
const lift = new Function("EN", "const BOOST_TARGET = -11;" + T.match(/const lift = \(\) => \{[^\n]*\};/)[0] + " return lift();");
const en = (db) => { const e = 10 ** (db / 10) / 2; return { mm: e * 1000, vv: e * 1000, mv: 0, n: 1000 }; };
assert.strictEqual(lift(en(-9)), 1, "마스터링된 곡 그대로"); assert.ok(Math.abs(20 * Math.log10(lift(en(-24))) - 6) < 1e-6, "최대 +6"); assert.ok(Math.abs(20 * Math.log10(lift(en(-15))) - 4) < 1e-6, "−15 → +4"); assert.strictEqual(lift(null), 1);
console.log("stem-loud ok");
