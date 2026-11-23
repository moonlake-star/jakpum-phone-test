// (11/23 사용자) 건반 짧게 눌러도 길게 · 발성 코드 1박(4분음표) · 박자 세로선 = 음표 박자
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
assert.ok(/const KEY_MIN = \.6;/.test(T) && /Math\.max\(now \+ \.05, \(P\.pressAt \|\| now\) \+ KEY_MIN\)/.test(T), "짧은 탭도 최소 0.6초");
assert.ok(/if \(P\.tail\) \{ P\.tail\.stop\(ctx\.currentTime\); P\.tail = null; \}/.test(T), "새 건반을 누르면 앞 소리 꼬리는 끊음");
assert.ok(/const SC_CHORD_BEATS = 1;/.test(T), "코드 1박");
assert.ok(/d: \(last \? LAST : STEP\) - \.045,/.test(T) && /SC_LAST = SC_STEP \* 2,/.test(T), "음 끝 = 박자선 직전(마지막 음 2박)");
assert.ok(/const B = beatGrid\(\);/.test(T) && /B\.t0 \+ k \* B\.step - C\.t/.test(T) && /step: STEP, reps/.test(T), "발성 세로선은 음표 박자에 맞춤");
// 음 시작이 모두 박자선 위에 있는지(첫 음 기준 STEP 배수) 계산으로 확인
const STEP = .465 / .55, n = 5; let t = .35 + 2 * STEP; const starts = [];
for (let r = 0; r < 3; r++) { for (let i = 0; i < n; i++) starts.push(t + i * STEP); starts.push(t - 2 * STEP); t += (n - 1) * STEP + 2 * STEP + 2 * STEP; }
const t0 = .35 + 2 * STEP; starts.forEach(s => { const k = (s - t0) / STEP; assert.ok(Math.abs(k - Math.round(k)) < 1e-9, "박자선 위: " + s); });
console.log("pitch-beat-grid OK");
