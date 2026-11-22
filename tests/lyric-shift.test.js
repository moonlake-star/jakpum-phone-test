// (11/22 사용자 '가사 마디 경계 좌우 이동' · 에이 검토) 한글·일본어 한 글자, 영어 등 한 낱말 · 띄어쓰기 보존 · 왕복 원문 일치
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const src = T.slice(T.indexOf("function songLyUnits("), T.indexOf("function songBarStarts("));
const f = new Function(src + "; return { songLyUnits, songLyJoin, songLyShift };")();
const U = (s) => f.songLyUnits(s).map((x) => x.u);
assert.deepStrictEqual(U("많은 사랑"), ["많", "은", "사", "랑"]);
assert.deepStrictEqual(U("I can't believe it's you,"), ["I", "can't", "believe", "it's", "you,"]);
assert.deepStrictEqual(U("きょうは(oh) ラーメン"), ["きょ", "う", "は", "(oh)", "ラー", "メ", "ン"]);
assert.deepStrictEqual(U("사랑해 my love"), ["사", "랑", "해", "my", "love"]);
// 많|은: 낱말 중간에서 나뉜 경계(jA=true) → 끝 글자를 뒤로 보내면 다시 붙음
let r = f.songLyShift("너무나 많", true, "은 날들", "R"); assert.deepStrictEqual(r, { A: "너무나", jA: false, B: "많은 날들" });
r = f.songLyShift(r.A, r.jA, r.B, "L"); assert.deepStrictEqual(r, { A: "너무나 많", jA: true, B: "은 날들" }, "왕복하면 원래대로");
// 낱말 끝 경계(jA=false) → 띄어서 붙음
r = f.songLyShift("노래를", false, "불러요", "R"); assert.deepStrictEqual(r, { A: "노래", jA: true, B: "를 불러요" });
r = f.songLyShift(r.A, r.jA, r.B, "L"); assert.deepStrictEqual(r, { A: "노래를", jA: false, B: "불러요" });
// 영어는 낱말 단위
r = f.songLyShift("You put me", false, "high, upon a pedestal", "L"); assert.deepStrictEqual(r, { A: "You put me high,", jA: false, B: "upon a pedestal" });
r = f.songLyShift(r.A, r.jA, r.B, "R"); assert.deepStrictEqual(r, { A: "You put me", jA: false, B: "high, upon a pedestal" });
// 빈 마디
assert.strictEqual(f.songLyShift("", false, "abc", "R"), null); assert.strictEqual(f.songLyShift("abc", false, "", "L"), null);
assert.deepStrictEqual(f.songLyShift("So", false, "", "R"), { A: "", jA: false, B: "So" });
console.log("lyric shift ok");
