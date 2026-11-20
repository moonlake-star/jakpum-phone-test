// (11/20 사용자) '수강생이 한 말 확인'은 접어서 한 줄로, 펼쳐도 3개까지만, 나머지는 '더 보기'
const fs = require("fs"), assert = require("assert");
const h = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const i = h.indexOf("function saidBoxHTML"), body = h.slice(i, h.indexOf("async function paintSaid"));
assert(/const saidUI = \{ open: false/.test(h), "기본 접힘");
assert(/data-saidtoggle/.test(body) && /class="saidBody" \$\{open \? "" : "hidden"\}/.test(body), "접기/펼치기");
assert(/SHOW = 3/.test(body) && /data-saidmore/.test(body) && /n >= SHOW/.test(body), "3개만 + 더 보기");
assert(/data-said="\$\{n\}" data-v="yes"/.test(body) && /data-saidplay/.test(body), "맞아요/아니에요/듣기 유지");
console.log("said-compact ok");
