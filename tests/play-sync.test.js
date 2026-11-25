// (11/25 사용자) ① 폰 스피커인데 화면이 소리보다 빠름 ② 보컬 6초↑ 남았을 때 '노래 시작 1초 전으로' 버튼이 사라짐 ③ 재생 중 밀면 다 밀고 나서 이어서 재생
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("getT = latWrap(getT, !!(opts && opts.webAudio), opts && opts.latency);") && T.includes('typeof latFn === "function" ? (+latFn() || 0)'), "① 화면 오디오의 실제 출력 지연");
assert.ok(H.includes("function mkLat()") && H.includes("mkCtx.getOutputTimestamp") && H.includes("webAudio: true, latency: mkLat,"), "① 메이크업 화면이 지연을 알려 줌");
assert.ok(T.includes("const kt_ = tgCol(cv), sung_ = (p) => p && (kt_ ? p[kt_] != null") && T.includes("if (!vis.some(sung_) && (cv.pts || []).length)"), "② 정음 없는 점(무음·잡음)은 노래가 아님");
assert.ok(T.includes('if (drag.mode === "time") pauseNow(); }') && !T.includes("d.wasPlay"), "③ 밀면 일시정지(11/26 되돌림)");
console.log("play-sync ok");
