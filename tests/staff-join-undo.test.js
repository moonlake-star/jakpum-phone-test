// (11/02 19:06 사용자) 강사로 등록된 메일의 수강생 신청이 숨겨지던 문제 — 따로 보여 주고 강사 등록 취소로 되돌림
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(te.includes("const stWait = requests.filter(r => !linked.has(String(r.email).toLowerCase()) && stfBy[String(r.email).toLowerCase()]);"), "강사 메일 신청도 따로 모음");
assert.ok(te.includes("if (!wait.length && !managed.length && !stWait.length)"), "그것만 있어도 카드가 뜸");
assert.ok(te.includes("⚠ 강사로 등록된 계정이 수강생으로 신청함"));
const f = te.slice(te.indexOf("async function staffUndo(tid)"), te.indexOf("// ── 신규 수강생 등록·첫 레슨 배치"));
const order = ["permissions/${s.perm_id}", 'portal("t_staff", { email: s.email, tid: "", sids: [] })', "delete l.staff[tid]", "trashed: true"].map(x => f.indexOf(x));
assert.ok(order.every(i => i > 0) && order.every((v, i) => !i || v > order[i - 1]), "공유 해제 → 포털 권한 해제 → 설정에서 빼기 → 휴지통 순서");
assert.ok(te.includes("담당 수강생 ${n_}명이 있어 취소할 수 없어요"), "담당 수강생 있으면 막음");
console.log("staff-join-undo ok");
