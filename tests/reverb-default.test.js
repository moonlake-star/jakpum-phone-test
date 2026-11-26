// (11/02 17:39 사용자) 리버브 기본 기준 15% → 30% · (11/09 21:23) 30% → 20%, 슬라이더는 그대로
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(te.includes("REV_DEF = 40") && te.includes("mkRev: REV_DEF,") && te.includes('(r === REV_DEF ? " (표준)"') && te.includes("r.result.wet_v2 ? r.result.wet_gain : r.result.wet_gain * 2"));
assert.ok(/id="mkRev" min="0" max="100"/.test(te), "슬라이더 유지");
console.log("reverb-default ok");
