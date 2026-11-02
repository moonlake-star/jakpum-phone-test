// (11/03 02:48 사용자) 음정 판단 확인 ▶ 버튼 = 재생/일시정지 토글
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(te.includes('if (mkPlaying && mkU === b) { $("mkPP").click(); return; }'), "듣는 중 같은 버튼 = 멈춤");
assert.ok(te.includes('lab = (on ? "❚❚ " : "▶ ") + fmt(+x.dataset.t)') && te.includes("function paintTransport() { try { paintMkU(); } catch {}"), "버튼 모양이 상태를 따라감");
assert.ok(te.includes("mkStop(); mkU = null; mkTracks = {};"));
console.log("review-play-toggle ok");
