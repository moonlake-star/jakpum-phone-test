// (11/27 사용자 '곡 끝 남은 구간을 늘임 마디로') 마지막 박 뒤 남은 소리 → 늘임 마디
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks("));
const f = new Function(src + "; return { songMeasures, songSoundEnd, songBeatPos };")();
const B = Array.from({ length: 16 }, (_, i) => i * 0.8);   // 박 16개 = 4마디, 마지막 박 12초
const wave = { s: 0.1, mr: "5".repeat(170) + "0".repeat(30), voc: "0".repeat(200) };   // 소리는 17초까지
assert.strictEqual(f.songSoundEnd(wave, 20), 17);
const an = { beats: B, down: 0, chords: [[0, "C"], [12, "F"]], _sndEnd: f.songSoundEnd(wave, 20) };
const M = f.songMeasures(an, 0, null);
assert.strictEqual(M.length, 5); assert.ok(M[4].hold && M[4].chords[0].name === "F", "늘임 마디 + 끝 화음");
assert.strictEqual(f.songBeatPos(an, 15).m, 4, "재생 위치도 늘임 마디");
const an2 = { beats: B, down: 0, chords: [[0, "C"]], _sndEnd: 12.9 };
assert.strictEqual(f.songMeasures(an2, 0, null).length, 4, "1.5박 안쪽이면 안 붙임");
console.log("hold-bar OK");
