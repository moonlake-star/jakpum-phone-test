// (11/28 사용자 '편지 77마디부터 느려지고 78마디가 사라져야, 79마디부터 후주') 늘임표 뒤 첫 박 다시 맞추기 + 끝의 남은 1~2박 합치기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks("));
const f = new Function(src + "; return { songMeasures, songChordBars, songBeatPos, songBarStarts };")();
// 박 0.8초 · 30마디 동안 코드는 마디 첫 박(0)과 3박(2)에 바뀜 · 120번째 박에서 늘임표로 2박을 더 끈 뒤(박 추적은 계속 찍음) 다시 들어와 2박 밀림
const N = 136, B = Array.from({ length: N }, (_, i) => +(i * 0.8).toFixed(2)), names = ["F", "Em7", "A7", "Dm", "C", "G", "Am", "Bb"], ch = [];
let k = 0; for (let b = 0; b < 118; b += 2) ch.push([B[b], names[k++ % 8]]);
ch.push([B[118], "C7"]); for (let b = 122; b < N; b += 2) ch.push([B[b], names[k++ % 8]]);
const an = { beats: B, down: 0, chords: ch, holds: [122] };
const bs = f.songChordBars(an); assert.ok(bs, "늘임표 자리에서 바로잡음");
const i = bs.indexOf(122); assert.ok(i > 0 && bs[i - 1] === 116, "앞 마디(116~)가 다시 들어온 박(122)까지 6박으로 늘어남");
const M = f.songMeasures(Object.assign({}, an, { _bars: bs }), 0, null);
assert.ok(M[i - 1].rit && M[i - 1].beats === 4, "6박 마디 = '느려짐' 4박 마디");
assert.ok(M.slice(i).every((m) => !m.chords.length || m.chords[0].b === 0), "늘임표 뒤 코드가 다시 마디 첫 박");
assert.strictEqual(f.songChordBars(Object.assign({}, an, { holds: [] })), null, "늘임표 정보가 없으면 2박마다 바뀌는 코드만으론 안 바꿈");
console.log("hold-rephase OK");
