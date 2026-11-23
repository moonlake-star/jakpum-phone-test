// (11/23 사용자) 공개/예약 직후 목록 줄이 바로 '피드백 ✓'
const fs = require("fs"), assert = require("assert");
const h = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const i = h.indexOf("rv.approved_sig = sig; rv.approved_sig_v = SIG_V;"), b = h.slice(i, i + 900);
assert(/sent \?\?= \{\}\)\.feedback \?\?=/.test(b) && /r\.fb = true/.test(b) && /vn_list/.test(b), "공개 직후 행 갱신");
console.log("publish-row-fb ok");
