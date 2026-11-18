// (11/19 사용자) 곡 서랍 목록은 저장해 둔 것을 먼저 보여주고 뒤에서 새로 받는다
const fs = require("fs"), assert = require("assert");
const h = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert(/function songCacheGet\(\)/.test(h) && /function songCachePut\(\)/.test(h), "캐시 함수");
const i = h.indexOf("async function openSongs"), j = h.indexOf("function songPollArm");
const body = h.slice(i, j);
assert(body.indexOf("songCacheGet()") > 0 && body.indexOf("songCacheGet()") < body.indexOf("await songLoad()"), "불러오기 전에 저장본을 먼저 그림");
assert(/function songPaintList\(\)[\s\S]{0,200}songCachePut\(\)/.test(h), "목록이 바뀔 때마다 저장");
console.log("song-cache ok");
