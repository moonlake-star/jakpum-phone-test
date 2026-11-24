// (11/24 사용자 '확인 대기를 누르면 메이크업 화면으로 오는데 뭘 확인해야 하는지 모르겠어') 바꾼 베스트 메이크업: 할 일 안내 + '확인 끝'으로 알림 끔
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes('j.req.notify === "best_change" && !j.req.sent_at && !j.req.checked_at &&'), "확인 끝이면 할 일·확인 대기에서 빠짐");
assert.ok(T.includes('const bcNeed = r.status === "done" && r.notify === "best_change" && !r.sent_at && !r.checked_at;') && T.includes("🔔 확인할 것"), "맨 위 안내");
assert.ok(T.includes('r.checked_at = new Date().toISOString(); await writeJSON(j.folder.id, MKREQ, r, j.reqId);'), "확인 끝 저장");
console.log("mk-best-change OK");
