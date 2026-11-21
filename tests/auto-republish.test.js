// (11/21 사용자 '수정하면 바로 업데이트') 공개 중인 노트는 저장할 때마다 같은 공개 규칙으로 다시 반영 · 숨긴 노트·예약·공개 전은 안 함
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.match(/async function autoRepublish\(me\) \{[\s\S]*?\n}\n/)[0];
const held = T.match(/const noteHeld = [^\n]*\n/)[0];
const mk = (env) => new Function("env", held + "let cur = env.cur; const SAVE_PUBLISH = true; const refreshSched = async (me) => { me.sched.caps = env.caps; me.sched.entry = env.entry; }; const publishOnSave = async () => { env.calls++; return ' · 수강생 노트에도 반영'; };\n" + src + "return autoRepublish;")(env);
const run = async (o) => { const me = { review: o.rv || {}, sched: o.sched }; const env = { cur: o.notCur ? {} : me, caps: true, entry: o.entry, calls: 0 }; const r = await mk(env)(me); return { r, calls: env.calls }; };
(async () => {
  let x = await run({ entry: { state: "published" } }); assert.equal(x.calls, 1, "공개 중 → 다시 반영"); assert.ok(/반영/.test(x.r));
  x = await run({ entry: { state: "scheduled" } }); assert.equal(x.calls, 0, "예약은 그대로");
  x = await run({ entry: { state: "held" } }); assert.equal(x.calls, 0, "숨김은 그대로");
  x = await run({ entry: null }); assert.equal(x.calls, 0, "공개 전은 선생님이 직접");
  x = await run({ entry: { state: "published" }, rv: { held_at: "2026-11-21T14:00:00Z", published_at: "2026-11-21T13:00:00Z" } }); assert.equal(x.calls, 0, "방금 숨긴 노트는 옛 상태여도 다시 공개 안 함");
  x = await run({ entry: { state: "published" }, notCur: true }); assert.equal(x.calls, 0, "다른 레슨이면 안 함");
  x = await run({ entry: { state: "published" }, sched: { busy: true, caps: true, entry: { state: "published" } } }); assert.equal(x.calls, 0, "공개 진행 중엔 안 겹침");
  assert.ok(/const pub = quiet \? \(typeof autoRepublish === "function" \? await autoRepublish\(me\) : ""\) : await publishOnSave\(me\);/.test(T), "임시저장·카드 저장(조용한 저장)도 공개 중이면 반영");
  assert.ok(/if \(me\.sched\?\.entry\?\.state === "published"\) \{ clearTimeout\(me\._v3Save\);/.test(T), "새 화면 고치기도 1.5초 뒤 저장·반영");
  assert.ok(/try \{ await refreshSched\(me\); \} catch \{\}   \/\/ 숨긴 상태를 새로 받아 둠/.test(T), "피드백 전으로 돌린 뒤 저장이 다시 공개하지 않게");
  console.log("auto-republish OK");
})().catch(e => { console.error(e); process.exit(1); });
