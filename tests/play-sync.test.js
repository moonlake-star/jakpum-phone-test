// (11/25 사용자) ① 폰 스피커인데 화면이 소리보다 빠름 ② 보컬 6초↑ 남았을 때 '노래 시작 1초 전으로' 버튼이 사라짐 ③ 재생 중 밀면 다 밀고 나서 이어서 재생
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("getT = latWrap(getT, !!(opts && opts.webAudio), opts && opts.latency);") && T.includes('typeof latFn === "function" ? (+latFn() || 0)'), "① 화면 오디오의 실제 출력 지연");
assert.ok(H.includes("function mkLat()") && H.includes("mkCtx.getOutputTimestamp") && H.includes("webAudio: true, latency: mkLat,"), "① 메이크업 화면이 지연을 알려 줌");
assert.ok(T.includes("const sung_ = (p) => p && (p[1] != null || p.slice(2).some(v => v != null));") && T.includes("if (!vis.some(sung_) && (cv.pts || []).length)"), "② 무음 칸은 노래가 아님");
assert.ok(T.includes('if (drag.mode === "time") { drag.wasPlay = !isPaused(); pauseNow(); }') && (T.match(/seek\(t, !d\.wasPlay\)/g) || []).length === 2, "③ 밀고 나서 이어서 재생");
console.log("play-sync ok");
