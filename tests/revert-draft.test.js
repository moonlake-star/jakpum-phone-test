// (11/21 사용자) 공개했던 노트를 다시 숨기고 '피드백 전'으로 돌리기 — 숨긴 노트는 목록에서 공개로 안 셈 · 버튼 연결
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (re) => { const m = T.match(re); assert.ok(m, String(re)); return m[0]; };
const F = new Function(g(/const noteHeld = [^\n]*\n/) + g(/const fbSentOrPub = [^\n]*\n/) + "return { noteHeld, fbSentOrPub };")();
assert.equal(F.noteHeld({ held_at: "2026-11-21T13:00:00Z", published_at: null }), true, "숨김");
assert.equal(F.noteHeld({ held_at: "2026-11-21T13:00:00Z", published_at: "2026-11-21T14:00:00Z" }), false, "숨긴 뒤 다시 공개");
assert.equal(F.noteHeld({ published_at: "2026-11-21T14:00:00Z" }), false); assert.equal(F.noteHeld({}), false);
assert.equal(F.fbSentOrPub({ sent: { feedback: "x" } }), true); assert.equal(F.fbSentOrPub({ kakao_sent_at: "x" }), true);
assert.equal(F.fbSentOrPub({ published_at: "x" }), true); assert.equal(F.fbSentOrPub({}), false, "보낸·공개 기록 없으면 버튼 안 보임");
assert.ok(/pub: files\.some\(f => f\.name === NOTE\) && !noteHeld\(rv\)/.test(T), "목록: 숨긴 노트는 공개 아님");
const rd = g(/async function revertToDraft\(me\) \{[\s\S]*?\n}\n/);
assert.ok(/msg = await schedAct\("cancel"\)/.test(rd), "서버 공개 숨기기(녹음 링크 닫기)는 기존 취소 경로");
assert.ok(/delete rv\.kakao_sent_at; if \(rv\.sent\) delete rv\.sent\.feedback;/.test(rd), "보냄 표시 지움");
assert.ok(!/rv\.feedback\s*=|rv\.points\s*=|rv\.practice\s*=/.test(rd), "글·포인트·미션은 그대로");
assert.ok(/if \(!confirm\(/.test(rd), "한 번 확인");
assert.ok(/id="btnRevert" type="button">↩ 피드백 취소/.test(T) && /id="v3Revert"/.test(T), "옛 화면 머리·새 화면 모두 버튼");
console.log("revert-draft OK");
