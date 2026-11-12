// (11/12 10:52 사용자 '끊김 없이 · 음 수정 후 들어보기 딜레이 없이 바로') 재생 중 소리 바뀜 = 30ms 겹쳐 이어 받기 · 재생 대기 최대 0.25초
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes("function mkSwapTracks(only)") && H.includes("sg.gain.linearRampToValueAtTime(1, when + F)") && H.includes("old._g.gain.linearRampToValueAtTime(0, when + F)"), "겹쳐 이어 받기");
assert.ok(H.includes("if (ch && mkPlaying) mkSwapTracks();") && H.includes("try { mkSwapTracks(tr); } catch {}"), "고친 소리·전체 보정 소리 모두 멈추지 않고");
assert.ok(H.includes("PVP.later = fire; setTimeout(fire, 250); return; }") && !H.includes("끝나면 바로 재생해요"), "재생 대기 최대 0.25초");
console.log("seamless-swap ok");
