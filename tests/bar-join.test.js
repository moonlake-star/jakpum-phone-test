// (11/27 사용자 '편지 77마디부터 느려지고 78마디가 사라져야') 느려진 곳에서 쪼개진 두 마디 합치기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks("));
const f = new Function(src + "; return { songMeasures, songBarStarts, songBeatPos };")();
const B = Array.from({ length: 40 }, (_, i) => i * 0.8), an = { beats: B, down: 0, chords: [[0, "C"], [8 * 0.8, "Dm"], [10 * 0.8, "G7"], [14 * 0.8, "Am"], [16 * 0.8, "F"]] };
an._bars = f.songBarStarts({ beats: B, down: 0 }).filter((_, k) => k !== 3);   // 3번째 마디(박 8~11)와 4번째(12~15) 합침
const M = f.songMeasures(an, 0, null);
assert.strictEqual(M.length, 9); assert.ok(M[2].rit && M[2].beats === 4, "합친 마디 = 4박 · rit.");
assert.deepStrictEqual(M[2].chords.map((c) => [c.b, c.name]), [[0, "Dm"], [1, "G7"], [3, "Am"]], "박 2개 = 1박");
const q = f.songBeatPos(an, 13 * 0.8); assert.strictEqual(q.m, 2); assert.ok(Math.abs(q.b - 2.5) < 1e-6, "재생 위치도 4박으로 줄여 셈");
assert.ok(T.includes('id="shMg"') && T.includes('id="shSp"') && T.includes("const joinBars = (i, join) =>"), "수정 창 합치기·나누기");
console.log("bar-join OK");
