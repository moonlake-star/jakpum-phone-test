// (11/09 블루투스 볼륨 조절 시험) 재생용 소리 장치는 latencyHint:"playback"(일반 미디어 출력 경로)로 만든다. 효과는 실기기 확인 필요.
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
assert.ok(!/mkCtx \?\?= new AudioContext\(\);/.test(T), "메이크업 재생 장치 기본값 금지");
assert.strictEqual((T.match(/mkCtx \?\?= new AudioContext\(\{ latencyHint: "playback" \}\)/g) || []).length, 2);
assert.ok(T.includes('loudCtx = new AC({ latencyHint: "playback" })'));
for (const [n, src] of [["선생님", T], ["수강생", S]]) { assert.strictEqual((src.match(/new AC\(\{ latencyHint: "playback" \}\)/g) || []).length >= 2, true, n + " 원곡 플레이어"); }
console.log("latency-playback ok");
