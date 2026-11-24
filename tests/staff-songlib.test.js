// (11/24 사용자 '곡 서랍 기능 강사에게도 — 합주 베스트는 빼고' · '내 폴더를 공개하진 말고') 강사는 자기 폴더 안의 곡서랍을 따로 씀
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("const songRows = isStaffApp() ? songRow1 : songRow1 + `<div class=\"card tabRow\" id=\"jamBtn\""), "강사: 곡 서랍만(합주 베스트 없음)");
assert.ok(T.includes("if (isStaffApp()) { const sf = cfg?.folder;") && T.includes("return (songLib.root = await joinMakeFolder(SONG_LIB, sf)); }"), "강사 폴더 안 곡서랍");
assert.ok(!T.includes("staffSongShare") && !T.includes("song_lib: root"), "원장 곡서랍 공유 없음");
assert.ok(T.includes('const songCacheKey = () => SONG_CACHE_KEY + (isStaffApp() ? "_staff" : "");'), "목록 저장본 따로");
console.log("staff-songlib OK");
