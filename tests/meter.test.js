// (11/28 사용자 '박자는 4/4·3/4·6/8뿐 · 산골 소년 3/4 · End of the Road 6/8') 마디 계산이 서버 analysis.meter를 따름
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks("));
const f = new Function(src + "; return { songMeasures, songBeatPos, songBarStarts, songMeter, songSig, songChordBars };")();
const B = Array.from({ length: 30 }, (_, i) => i * 0.6);
const an3 = { beats: B, down: 0, meter: 3, chords: [[0, "C"], [1.8, "F"], [3.6, "G"]] };
const M = f.songMeasures(an3, 0, null);
assert.strictEqual(M.length, 10); assert.ok(M.every(m => m.beats === 3)); assert.strictEqual(M[1].chords[0].name, "F");
{ const q = f.songBeatPos(an3, 2.0); assert.ok(q.m === 1 && Math.abs(q.b - 1 / 3) < 1e-9); }
assert.strictEqual(f.songSig(an3), "3/4"); assert.strictEqual(f.songSig({ meter: 2 }), "6/8"); assert.strictEqual(f.songSig({}), "4/4");
assert.strictEqual(f.songChordBars(Object.assign({}, an3, { beats: Array.from({ length: 80 }, (_, i) => i * 0.6) })), null, "4/4 아닌 곡은 짧은 마디 끼우기 안 함");
const an4 = { beats: B, down: 0, chords: [[0, "C"]] }; assert.strictEqual(f.songMeasures(an4, 0, null).length, 7, "4/4는 그대로(30박 → 7마디 + 남은 2박 합침)");
console.log("meter OK");
// (11/28 사용자 '빗속에서는 6/8') ✏️ 고치기에서 박자(4/4·3/4·6/8)를 정해 song.json sig로 저장
assert.ok(T.includes('prompt("박자 (4/4 · 3/4 · 6/8 중 하나)", sg0)') && T.includes('"mr_vol", "sig"]'));
console.log("meter sig OK");
