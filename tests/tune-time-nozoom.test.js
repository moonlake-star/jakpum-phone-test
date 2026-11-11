// 현재 위치 시간은 고급 모드에서도 보이고, 배율(×1.4) 글자는 없음 (11/11 사용자)
const fs = require("fs"), assert = require("assert"), s = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(!/advOn \.port \.tfTop \.tfTime\{display:none\}/.test(s), "고급 모드에서 시간 숨기지 않음");
assert.ok(!s.includes("×${st.yz"), "배율 글자 없음"); assert.ok(s.includes("tm.textContent = fmt(t);"));
console.log("tune-time-nozoom ok");
