// (11/29 사용자 '버튼을 누르면 UI는 바로 반영, 실제 처리는 백그라운드로') 화면 먼저 · 저장은 뒤에서 · 실패하면 되돌림
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const bg = T.match(/function bgWrite\(fn\) \{[^]*?\n\}/)[0];
const f = new Function("globalThis", "let bgPending = 0;" + bg + "; return { bgWrite, n: () => bgPending };");
const g = {}; const B = f(g);
(async () => {
  const p = B.bgWrite(() => new Promise(r => setTimeout(() => r(7), 10)));
  assert.strictEqual(g.__quiet, 1, "저장 중엔 '불러오는 중' 안 띄움"); assert.strictEqual(B.n(), 1);
  assert.strictEqual(await p, 7); assert.strictEqual(g.__quiet, 0); assert.strictEqual(B.n(), 0);
  await B.bgWrite(() => { throw Error("x"); }).then(() => assert.fail(), (e) => assert.strictEqual(e.message, "x"));
  assert.strictEqual(g.__quiet, 0, "실패해도 원래대로");
  // 검수 저장: ✓를 쓰기 전에 · 공개는 기다리지 않음
  const sr = T.slice(T.indexOf("async function saveReview"), T.indexOf("// 검수 저장 눌림 표시"));
  assert.ok(sr.indexOf("paintSaved(new Date())") < sr.indexOf("bgWrite(() => writeJSON(me.folder.id, REVIEW"));
  assert.ok(!/await (autoRepublish|publishOnSave)\(me\)[^]*?return true/.test(sr.split("bgWrite(async () =>")[0]), "공개는 뒤에서");
  // 합주 가리기·지우기·테이크 지우기, 레슨 건너뛰기, 배치 알림
  assert.ok(T.includes("jamCtrlNow(") && !T.includes("jamCtrlOpt"), "합주는 같은 방식(jamCtrlNow) 하나만");
  assert.ok(T.includes("bgWrite(() => setLessonSkip(sid, i, on))") && T.includes("bgWrite(seen).catch"));
  console.log("optimistic-ui OK");
})().catch(e => { console.error(e); process.exit(1); });
