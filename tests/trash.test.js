// (11/22 사용자 '지운 걸 휴지통에서 다시 가져올 수 있는 방법') 앱 안 휴지통 — 기록 + 드라이브 휴지통 찾기 · 되살리기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const X = new Function(T.match(/\/\/#trash-begin\n([\s\S]*?)\/\/#trash-end/)[1] + "return { trashDaysLeft, trashParseStudent, trashMerge };")();
const now = Date.parse("2026-11-22T00:00:00Z");
assert.equal(X.trashDaysLeft("2026-11-21T00:00:00Z", now), 29); assert.equal(X.trashDaysLeft("2026-10-01T00:00:00Z", now), 0); assert.equal(X.trashDaysLeft(null, now), null);
assert.deepEqual(X.trashParseStudent("홍길동_STU_0007"), { name: "홍길동", sid: "STU_0007" });
assert.deepEqual(X.trashParseStudent("연습_테스트_TST_012"), { name: "연습_테스트", sid: "TST_012" });
assert.equal(X.trashParseStudent("아무폴더"), null);
const found = [{ id: "M1", name: "곡폴더", parents: ["F7a"] }, { id: "S1", name: "연습생_STU_0009", parents: ["ROOT"] }, { id: "Z", name: "다른폴더", parents: ["ROOT"] }, { id: "Q", name: "x", parents: ["ELSE"] }];
const log = [{ kind: "mk", id: "M1", sid: "A", name: "라플람여인", at: "2026-11-21T10:00:00Z" }];
const out = X.trashMerge(found, log, { F7a: "A" }, new Set(["ROOT"]));
assert.deepEqual(out.map(x => [x.kind, x.id, x.name]), [["mk", "M1", "라플람여인"], ["student", "S1", "연습생"]], "곡·수강생 폴더만, 기록 이름 우선, 다른 폴더는 안 보임");
assert.equal(out[1].sid, "STU_0009", "기록 없이 지운 수강생도 폴더 이름으로");
// 연결: 지울 때 기록 · 되살리기는 trashed:false + 설정 복구 · 더보기 메뉴
assert.ok(/l\.trash_log = \[\.\.\.\(l\.trash_log \|\| \[\]\), \{ kind: "student", id: x\.folder, sid, name: x\.name, at: new Date\(\)\.toISOString\(\), snap:/.test(T), "수강생 지울 때 설정 그대로 남김");
assert.ok(/trashLogAdd\(\[\{ kind: "mk", id: j\.folder\.id, sid, name: title \}\]\)/.test(T) && /trashLogAdd\(ok\.filter/.test(T), "곡 지울 때(하나·일괄) 기록");
const rs = T.match(/async function trashRestore\(x\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/JSON\.stringify\(\{ trashed: false \}\)/.test(rs) && /if \(l\.students\[x\.sid\]\) \{ clash = true; return; \}/.test(rs), "되살리기 · 같은 번호 수강생이 있으면 덮지 않음");
assert.ok(/status: "test"/.test(rs), "기록 없는 수강생은 연습용으로 되살림");
assert.ok(/id="trashBtn" role="button"><div><b>🗑 휴지통/.test(T), "더보기 → 휴지통");
console.log("trash OK");
