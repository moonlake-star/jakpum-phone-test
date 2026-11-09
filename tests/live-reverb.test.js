// (11/09 15:25 사용자 '리버브를 앱에서 실시간으로') 서버 울림 IR이 있으면: 보정본(p·q) → 울림 보내기(울림 %) → 합성곱 → 출력 · 울림 파일은 안 받음 · 폰 mp3에도 울림
const assert = require("assert"), fs = require("fs"), path = require("path");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(H.includes("R.conv.normalize = false; R.send.connect(R.conv); R.conv.connect(mkBus());"), "합성곱 → 최종단");
assert.ok(H.includes('if (/^[pq][0-3]$/.test(name) && mkRev && mkRev.ctx === mkCtx) g.connect(mkRev.send);'), "보정본 트랙만 울림으로");
assert.ok(H.includes('const irF = hasP ? by("reverb_ir.wav") : null;') && H.includes('...(perW && !irF ? [["w" + k, `vocal_wet_p${k}.mp3`]] : [])'), "IR 있으면 울림 파일 안 받음");
assert.ok(H.includes("mkLastGain.__rev = raw ? 0 : W;") && H.includes("for (const n of Object.keys(mkTracks)) if (/^(w|x)[0-3]$|^wet$/.test(n)) set(n, 0);"), "울림 % = 보내기 크기 · 예전 울림 파일 끔");
assert.ok(H.includes("parts.push({ ch: ch(w), gain: g * mkLastGain.__rev });"), "폰에서 바로 mp3에도 울림");
console.log("live-reverb ok");
