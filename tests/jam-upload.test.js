// (11/27 사용자) 연습/합주 페이지에서 녹음 직접 올리기 — 서버(jam_best.is_jam)가 집는 이름으로
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("const JAM_EXT ="), T.indexOf("async function jamUpload("));
const f = new Function(src + "; return { jamUpName, JAM_EXT };")();
assert.strictEqual(f.jamUpName("밴드 2026-11-27.m4a"), "합주 밴드 2026-11-27.m4a", "합주·연습이 없으면 앞에 '합주'");
assert.strictEqual(f.jamUpName("연습 3.mp3"), "연습 3.mp3");
assert.strictEqual(f.jamUpName("레슨 합주.m4a"), "합주.m4a", "'레슨'은 빼야 서버가 합주로 봄");
assert.ok(f.JAM_EXT.test("a.M4A") && !f.JAM_EXT.test("a.mp4"));
assert.ok(T.includes('id="jamUp"') && T.includes("await uploadFile(dest, nm, f,") && T.includes("dest = cfg?.inbox_recordings"), "녹음함에 올림");
console.log("jam-upload OK");
