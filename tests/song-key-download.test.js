// (11/28 사용자 '이 버튼이 키 조정된 거 받을 수 있는 버튼이어야 해') 곡서랍 ⬇ 받기: 키·속도를 바꿨으면 그대로 다시 만들어 받음
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("async function songRenderKey(") && T.includes("async function songKeyFile("));
assert.strictEqual((T.match(/chg \? await songKeyFile\(k, blob, sm, rt/g) || []).length, 2, "곡서랍 화면 두 곳 모두");
assert.ok(T.includes('[{ buf: await dec("mr"), formant: false }, { buf: await dec("voc"), formant: true }]'), "원곡 = 반주(포먼트 X) + 보컬(포먼트 보정)");
assert.ok(T.includes('formant: k === "voc"'), "보컬만 포먼트 보정");
console.log("song-key-download OK");
