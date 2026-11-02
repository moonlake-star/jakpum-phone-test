// (11/02 15:48 사용자) 전체화면 건반(누르면 소리) + 멈춘 뒤 초록 정음 막대 톡 = 정음 고치기 → 요청에 target_fixes 저장 → 다시 만들기 때 서버가 그 음으로
const fs = require("fs"), assert = require("assert");
const tune = fs.readFileSync(__dirname + "/../tune.js", "utf8"), src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(tune.includes("function tone(m)") && tune.includes("st.kbDown = m; tone(m)") && tune.includes("if (d.kb) { toneOff();"), "건반 소리");
assert.ok(tune.includes("function fixSheet(") && tune.includes("typeof o.onFix === \"function\" && isPaused() && st.tbars"), "정음 고치기");
assert.ok(tune.includes("noteName,") && tune.includes("cv._fixes"), "고친 곳 표시");
assert.ok(src.includes("cv._fixes = (r.target_fixes || []).slice();") && src.includes("onFix, wave: () => mkTracks.mr?.buf") && src.includes('id="mkFixN"'));
// 같은 구간은 바꿔 끼움
const onFixBody = src.match(/const onFix = async \(f\) => \{ const cur = [^\n]*\n/)[0];
assert.ok(/filter\(x => !\(x\.t0 < f\.t1 && x\.t1 > f\.t0\)\)/.test(onFixBody) && onFixBody.includes("if (f.midi != null) cur.push(f)"));
console.log("target-fix ok");
assert.ok(tune.includes("data-cut") && tune.includes("두 음으로 나누기") && tune.includes("fxOf(q[0]) === fxOf(p[0])"), "세로줄 자리에서 나누기 + 막대가 나눈 경계에서 끊김");
assert.ok(!tune.includes('aria-label="이 음 듣기">♪') && tune.includes('nb.addEventListener("pointerdown"'), "음 이름 누르는 동안 소리");
assert.ok(tune.includes("<small>← ${noteName(m0)}</small>") && tune.includes("white-space:nowrap"), "한 줄");
console.log("target-fix split ok");
assert.ok(tune.includes("function introDraw(") && tune.includes("function waveOf(") && tune.includes("초 뒤 노래 시작") && tune.includes("첫 음 ${noteName(fm)}") && tune.includes('class="tfSkip"'), "전주 화면");
assert.ok(/#tuneFs \.tfMid\{position:absolute;left:50%;top:9%;width:48px/.test(tune), "일시정지 표시는 작게 위로(그래프 안 가림)");
assert.ok(src.includes("wave: () => mkTracks.mr?.buf"));
console.log("intro ok");
