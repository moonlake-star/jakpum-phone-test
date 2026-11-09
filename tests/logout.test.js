// 로그아웃 버튼(11/09): 두 앱 모두 있고, 로그인 정보만 지우며 녹음·설정은 건드리지 않는다
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
for (const [n, src] of [["선생님", t], ["수강생", s]]) { assert.ok(src.includes('id="btnLogout"') && src.includes('id="lgFoot"'), n + ": 로그아웃 버튼 없음"); assert.ok(src.includes("disableAutoSelect"), n + ": 구글 자동 선택 끄기 없음"); }
const body = t.slice(t.indexOf('$("btnLogout").onclick'), t.indexOf('$("btnLogin").onclick = login;'));
for (const k of ["vn_tok", "vn_ctok", "vn_hint"]) assert.ok(body.includes(k), "선생님: " + k + " 안 지움");
assert.ok(!/indexedDB|localStorage\.clear|deleteDatabase/.test(body), "선생님: 녹음 저장소를 건드리면 안 됨");
const sb = s.slice(s.indexOf("function doLogout"), s.indexOf("function loginView"));
assert.ok(sb.includes('"sn_tok", null') && !/localStorage\.clear|indexedDB/.test(sb), "수강생: 로그인 정보만 지워야 함");
console.log("logout ok");
