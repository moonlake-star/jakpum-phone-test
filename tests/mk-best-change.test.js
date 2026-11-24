// (11/24 사용자 '확인 대기를 누르면 메이크업 화면으로 오는데 뭘 확인해야 하는지 모르겠어') 바꾼 베스트 메이크업: 할 일 안내 + '확인 끝'으로 알림 끔
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes('j.req.notify === "best_change" && !j.req.sent_at && !j.req.checked_at &&'), "확인 끝이면 할 일·확인 대기에서 빠짐");
assert.ok(T.includes('const bcNeed = r.status === "done" && r.notify === "best_change" && !r.sent_at && !r.checked_at;') && T.includes("🔔 확인할 것"), "맨 위 안내");
assert.ok(T.includes('r.checked_at = new Date().toISOString(); await writeJSON(j.folder.id, MKREQ, r, j.reqId);'), "확인 끝 저장");
console.log("mk-best-change OK");
// (11/24 사용자 '확인하면 바로바로 리스트에서 사라지게') 저장한 목록 사본(vn_list)도 바로 고침
{ const T2 = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  require("assert").ok(T2.includes("function mkCachePatch(j, patch) {") && T2.includes("mkCachePatch(j, { checked_at: r.checked_at });") && T2.includes("mkCachePatch(j, { sent_at: r.sent_at });"));
  require("assert").ok(T2.includes("subs: subsCur.recs.map(r => ({ received_on: r.received_on, replied_at: r.replied_at, memo: r.memo }))"), "과제 답장도");
  // 사본 고치기 동작
  const fn = T2.match(/function mkCachePatch\(j, patch\) \{[\s\S]*?\n\}/)[0]; let store = { vn_list: [{ sid: "A", jobs: [{ reqId: "r1", folder: { id: "f1" }, req: { status: "done" } }, { reqId: "r2", folder: { id: "f2" }, req: {} }] }] };
  const LS = { get: (k) => store[k], set: (k, v) => { store[k] = v; } }; new Function("LS", fn + "; mkCachePatch({ sid: 'A', reqId: 'r1', folder: { id: 'f1' } }, { checked_at: 'T' });")(LS);
  require("assert").ok(store.vn_list[0].jobs[0].req.checked_at === "T" && store.vn_list[0].jobs[0].req.status === "done" && !store.vn_list[0].jobs[1].req.checked_at); }
console.log("mk-best-change cache OK");
