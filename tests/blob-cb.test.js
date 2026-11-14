// (11/14 20:49 사용자) 덩어리 굵기 = 원래 부른 보컬 크기 · C+B(곡 전체 18dB × 음 안 12dB) · 음 볼륨 고침은 dB로 더함
const fs = require("fs"), path = require("path"), assert = require("assert");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(T.includes('cv.env.src === "raw" ? envCv(cv) : null'), "서버 원래 보컬 크기 먼저");
assert.ok(T.includes("g_ = Math.max(0, Math.min(1, (pk + gdb + 18) / 18))") && T.includes("(v - pk + 12) / 12"), "C+B");
assert.ok(H.includes('if (fb_ && !mkTracks.bv) mkLoad("bv", fb_.id)'), "편집 화면은 보정 전 보컬을 먼저 받음");
console.log("blob-cb OK");
