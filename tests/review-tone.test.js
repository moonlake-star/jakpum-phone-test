// (11/03 02:45 사용자) 음정 판단 확인에서 음 이름을 누르면 그 음 소리
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), tu = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(tu.includes("G.Tune = { tone, toneOff,"));
const i = te.indexOf("const nmMidi"); const f = eval("(" + te.slice(i + 15, te.indexOf(";\n", i)) + ")");
assert.deepStrictEqual([f("F#4"), f("G4"), f("A3"), f("Bb3"), f("모름")], [66, 67, 57, 58, null]);
assert.ok(te.includes('b.dataset.v === "skip" ? null : nmMidi(b.textContent)') && te.includes("Tune.tone(md); rvTm = setTimeout(() => Tune.toneOff(), 700);"));
console.log("review-tone ok");
