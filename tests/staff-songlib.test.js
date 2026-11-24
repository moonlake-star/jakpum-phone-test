// (11/24 사용자 '곡 서랍 기능 강사에게도 — 합주 베스트는 빼고' · '내 폴더를 공개하진 말고') 강사는 자기 폴더 안의 곡서랍을 따로 씀
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("const songRows = isStaffApp() ? songRow1 : songRow1 + `<div class=\"card tabRow\" id=\"jamBtn\""), "강사: 곡 서랍만(합주 베스트 없음)");
assert.ok(T.includes("if (isStaffApp()) { const sf = cfg?.folder;") && T.includes("return (songLib.root = await joinMakeFolder(SONG_LIB, sf)); }"), "강사 폴더 안 곡서랍");
assert.ok(!T.includes("staffSongShare") && !T.includes("song_lib: root"), "원장 곡서랍 공유 없음");
assert.ok(T.includes('const songCacheKey = () => SONG_CACHE_KEY + (isStaffApp() ? "_staff" : "") + (songLib.who ? "_t" + songLib.who : "");'), "목록 저장본 따로(강사 앱·원장이 보는 강사 곡서랍마다)");
// (11/24 사용자 '원장이 강사 곡서랍 보기' · '복사 대신 공유로 용량 아끼기')
assert.ok(T.includes("if (songLib.who) { const w0 = songLib.who, r = await songStaffRoot(w0, create); if (songLib.who !== w0)") && T.includes('data-who="${esc(t)}"'), "원장: 강사 곡서랍 고르기");
assert.ok(T.includes('body: JSON.stringify({ type: "user", role: "reader", emailAddress: st.email })') && T.includes("mimeType: SONG_SC, shortcutDetails: { targetId: x.folder }, parents: [root]"), "공유 = 보기 권한 + 바로가기(복사 없음)");
assert.ok(T.includes('if (!x.ref) return writeJSON(x.folder, "song.json", x.d, x.fileId);') && !/writeJSON\((?:c?x)\.folder, "song\.json"/.test(T.replace('if (!x.ref) return writeJSON(x.folder, "song.json", x.d, x.fileId);', "")), "곡 기록 저장은 모두 songWrite(공유곡은 원본 대신 강사 수정 파일)");
assert.ok(T.includes("// 공유곡: 원본 폴더는 절대 안 지움"), "공유곡 지우기 = 바로가기만");
// 공유곡 저장: 원본과 다른 값만 수정 파일에
{ const a = T.indexOf("const SONG_SC ="), b = T.indexOf("async function songShareState(");
  const calls = []; const env = { writeJSON: async (f, n, o, id) => { calls.push([f, n, o, id]); return "ov1"; }, readJSON: async () => ({ title: "A", edits: {}, lyrics: [[1, "x"]] }), songLib: { root: "R" } };
  const f = new Function(...Object.keys(env), T.slice(a, b) + "; return { songWrite, songReadD };")(...Object.values(env));
  (async () => { const x = { folder: "F", fileId: "S", ref: "SC", ovRoot: "R2", orig: { title: "A", edits: {}, lyrics: [[1, "x"]] }, d: { title: "A", edits: { 3: { ly: "y" } }, lyrics: [[1, "x"]], analysis: { big: 1 } } };
    await f.songWrite(x); assert.deepStrictEqual(calls[0], ["R2", "공유곡_F.json", { of: "F", edits: { 3: { ly: "y" } } }, undefined], "바뀐 값만·강사 곡서랍에");
    const n = { folder: "G", fileId: "S2", d: { a: 1 } }; await f.songWrite(n); assert.deepStrictEqual(calls[1], ["G", "song.json", { a: 1 }, "S2"], "내 곡은 그대로 song.json");
    const r = await f.songReadD(x); assert.deepStrictEqual(r.edits, { 3: { ly: "y" } }); console.log("staff-songlib share OK"); })().catch((e) => { console.error(e); process.exit(1); }); }
console.log("staff-songlib OK");
