// (11/02 17:39 사용자) 리버브 기본 기준 15% → 30% · (11/09 21:23) 30% → 20%, 슬라이더는 그대로
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(te.includes("r.result?.wet_gain ?? 0.0288") && te.includes("mkRev: 20,") && te.includes('(r === 20 ? " (표준)"'));
assert.ok(/id="mkRev" min="0" max="100"/.test(te), "슬라이더 유지");
console.log("reverb-default ok");
