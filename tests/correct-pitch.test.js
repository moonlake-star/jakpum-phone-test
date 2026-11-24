// (11/24 사용자 · 멜로다인 Correct Pitch) 여러 음 고르기 → 🎯 맞추기: 몸통 기준 정음 쪽 N% + 느린 흔들림 M% 줄이기, 손 고친 음·원음·몸통 없음 건너뜀
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), A = fs.readFileSync(__dirname + "/../adv.js", "utf8");
assert.ok(T.includes('data-mcp disabled aria-label="고른 음 음정 맞추기') && T.includes(">🎯 맞추기</button>"), "버튼");
assert.ok(T.includes("const c = bd.c + (b.c - bd.c) * pc / 100; list.push({ t0: +b.t0.toFixed(2), t1: +b.t1.toFixed(2), midi: Math.round(c) / 100 })"), "몸통에서 정음 쪽으로 N%");
assert.ok(T.includes('if (!bd || bd.kind === "none") { skip++; continue; }') && T.includes("fx.some(f => !f.cut && (f.off || f.midi != null) && selHit(f, b))"), "건너뛰는 음");
assert.ok(T.includes('TA.groupSet(st, cv, used, "drift", dr > 0 ? Math.round((1 - dr / 100) * 100) / 100 : null)') && A.includes("function groupSet(st, cv, bars, key, v)") && A.includes("groupVol, groupSet,"), "느린 흔들림 = drift");
console.log("correct-pitch ok");
