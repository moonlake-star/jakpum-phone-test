// (10/29 11:36 사용자) 추천 곡 유튜브 주소: 유튜브만 허용·정리, 수강생은 '유튜브에서 듣기', 없으면 검색 링크
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const yt = new Function(t.match(/const svYt = [^\n]*\n/)[0] + "return svYt;")();
const W = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
for (const u of ["https://youtu.be/dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?si=abc", "https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=30", "https://m.youtube.com/watch?feature=x&v=dQw4w9WgXcQ", "https://music.youtube.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/shorts/dQw4w9WgXcQ"]) assert.strictEqual(yt(u), W, u);
for (const u of ["", "http://youtu.be/dQw4w9WgXcQ", "https://evil.com/?v=dQw4w9WgXcQ", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "javascript:alert(1)", "https://youtu.be/short", "https://www.youtube.com/watch?v=dQw4w9WgXcQ\"><script>"]) assert.strictEqual(yt(u), u.includes('"><script>') ? W : "", u);
assert.ok(s.includes(t.match(/const svYt = ([^\n]*?);\n/)[1].replace("svYt", "yt").slice(0, 60).replace("(u) =>", "(u) =>")) || s.includes("const yt = (u) =>"), "수강생도 같은 검사");
assert.ok(s.includes("▶ 유튜브에서 듣기") && s.includes("🔎 유튜브에서 찾아 듣기") && s.includes('rel="noopener noreferrer"'));
assert.ok(t.includes('id="pvSongU"') && t.includes("유튜브 주소가 아니에요") && t.includes("...(rv.song.url ? { url: rv.song.url } : {})"));
console.log("song-url ok");
