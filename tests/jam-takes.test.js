// (11/27 사용자 '합주·연습 녹음에서 대화는 빼고 연주·노래만 Take01, Take02로') 합주 카드의 테이크 바로 듣기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("const tf = s.take_files || [], takes = tf.length ?") && T.includes("🎙 테이크 바로 듣기 · 대화는 빼고 연주·노래만"), "테이크 줄");
assert.ok(T.includes('<span class="jtkI">▶</span> Take${String(t.no).padStart(2, "0")}'), "Take01 형식");
assert.ok(T.includes("${st}</p>${takes}${body}</div>"), "곡별 베스트 위에");
assert.ok(T.includes("const bl = await readBlob(id, false, true);") && T.includes("if (jam.takeId === id && !au.paused) { au.pause(); reset(); return; }"), "누르면 재생·다시 누르면 멈춤");
assert.ok(T.includes("function jamStop() { try { jam.takeAu?.pause(); } catch {}"), "나가면 멈춤");
console.log("jam-takes OK");
