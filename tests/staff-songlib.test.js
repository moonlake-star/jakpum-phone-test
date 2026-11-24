// (11/24 사용자 '곡 서랍 기능 강사에게도 오픈 — 합주 베스트는 빼고')
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("const songRows = isStaffApp() ? songRow1 : songRow1 + `<div class=\"card tabRow\" id=\"jamBtn\""), "강사: 곡 서랍만(합주 베스트 없음)");
assert.ok(T.includes('if (isStaffApp()) { if (cfg?.song_lib) return (songLib.root = cfg.song_lib);'), "강사 앱은 공유받은 곡서랍 폴더를 씀");
assert.ok(T.includes("...(c.song_lib ? { song_lib: c.song_lib } : {}),"), "강사 설정에 곡서랍 위치");
const fn = T.slice(T.indexOf("async function staffSongShare(force) {"), T.indexOf("async function staffPortalSync(force) {"));
assert.ok(fn.includes('role: "writer", emailAddress: s.email') && fn.includes("sendNotificationEmail=false") && fn.includes("staffConfigFor({ ...cfg, song_lib: root }, tid)"), "원장 앱이 곡서랍 폴더만 강사 계정에 편집자로 공유 + 설정 반영");
assert.ok(fn.includes("if (isStaffApp()") , "강사 앱에서는 공유 안 함");
// 강사 설정: 결제·다른 수강생 없음(곡서랍 위치만 추가)
const cf = new Function("return " + T.match(/function staffConfigFor\(c, tid\) \{[\s\S]*?\n\}/)[0])();
const o = cf({ staff: { T1: { name: "강사" } }, song_lib: "SL", students: { a: { teacher_id: "T1" }, b: { teacher_id: "T2" } }, payments: { x: 1 } }, "T1");
assert.ok(o.song_lib === "SL" && Object.keys(o.students).join() === "a" && !o.payments);
console.log("staff-songlib OK");
