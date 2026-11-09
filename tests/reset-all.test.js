// (11/09 01:47 사용자 고) 되돌리기 버튼 2개로 정리: 음표 창 '↺ 이 음' · 일괄 보정 '↺ 곡 전체 처음으로'(확인 창 + 작업 기록 한 칸 → ↶로 복구)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8"), H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(T.includes('class="tfOrg" data-r') && T.includes(">↺ 자동</button>") && T.includes(">🎤 원음</button>") && !T.includes(">↺ 이 음"), "음표 창 버튼 이름(11/09 11:14 \'이 음\'→\'원본\')");
assert.ok(T.includes("st.resetAll = () =>") && T.includes('hist.S.push(o.histEmpty); hist.L.push("↺ 곡 전체 원본으로")') && T.includes("await step(hist.S.length - 1)"), "기록 한 칸 + 같은 되돌리기 길로 적용");
assert.ok(T.includes("<b>곡 전체를 원본으로 되돌릴까요?</b>") && T.includes('if (now_ === o.histEmpty) { tip("이미 처음 상태예요")'), "확인 창 · 이미 처음이면 안 쌓음");
// histEmpty는 앱 histGet이 아무 고침 없을 때 내는 글자와 같아야 함(같아야 '이미 처음' 판단·↶ 복구가 맞음)
const r = {}; const histGet = () => JSON.stringify({ fx: r.target_fixes || [], te: r.time_edits || [], ne: r.note_edits || null });
assert.ok(H.includes("const histGet = () => JSON.stringify({ fx: r.target_fixes || [], te: r.time_edits || [], ne: r.note_edits || null });"));
assert.strictEqual(histGet(), JSON.stringify({ fx: [], te: [], ne: null })); assert.ok(H.includes("histEmpty: JSON.stringify({ fx: [], te: [], ne: null })"));
assert.ok(A.includes('if (x.dataset.g === "reset") { if (!(typeof st.resetAll === "function" && st.resetAll()))'));
assert.ok(T.includes('if (typeof o.remake === "function") { try { close(); } catch {} setTimeout(() => { try { o.remake(); }'), "처음으로 뒤 완성본 다시 만들기 자동 시작");
console.log("reset-all ok");
