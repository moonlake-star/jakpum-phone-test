// (11/14 19:38 사용자) 위쪽 ↕ 손잡이 = 앞·뒤 부분 음정 구부리기(위아래로만) · 설명 창 처음만 · 한마디→피드백 · 빈 곳 밀기 좌우 우선 완화
const fs = require("fs"), path = require("path"), assert = require("assert");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
assert.ok(T.includes('const key = ve === "i" ? "tilt_in" : "tilt_out"') && T.includes("const c = (drag.y0 - l0.y) * drag.cpp"), "↕ 손잡이 = 위아래만(tilt_in·tilt_out)");
assert.ok(A.includes("function bendSet(st, cv, b, key, v, first)") && A.includes("G.TuneAdv = { bendGet, bendSet,"), "adv.js 구부리기 API");
assert.ok(T.includes('localStorage.setItem("tune_coach_seen"') && T.includes("if (sn[k0] && !st._coachSess[k0]) rows = [];"), "설명 창 한 번만");
assert.ok(T.includes('data-mnote disabled>💬 피드백</button>') && !T.includes(">💬 한마디<"), "한마디 → 피드백");
assert.ok(T.includes('Math.abs(dB) > 1.35 * Math.abs(dA) ? "pitch" : "time"'), "좌우 우선 완화");
console.log("bend-handles OK");
