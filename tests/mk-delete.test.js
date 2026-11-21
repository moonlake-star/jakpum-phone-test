// (11/21 사용자) 커버·메이크업 곡: 목록에서만 숨기기 / 모든 파일 삭제(휴지통) — 버튼 또는 왼쪽으로 밀기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const M = new Function(T.match(/\/\/#mkdel-begin\n([\s\S]*?)\/\/#mkdel-end/)[1] + "return { mkVisible, mkCanDelete };")();
const jobs = [{ req: { status: "done" } }, { req: { status: "done", hidden_at: "x" } }, { req: { status: "working" } }];
assert.deepEqual(M.mkVisible(jobs, false).map(x => x.i), [0, 2], "숨긴 곡은 기본 목록에서 빠짐(원래 순번 유지)");
assert.deepEqual(M.mkVisible(jobs, true).map(x => x.i), [1], "'숨긴 곡 보기'");
assert.equal(M.mkCanDelete(jobs[0]), true); assert.equal(M.mkCanDelete(jobs[2]), false, "만드는 중엔 숨기기·삭제 막음");
const sh = T.match(/function mkDelSheet\(sid, j\) \{[\s\S]*?\n}\n/)[0];
assert.ok(/body: JSON\.stringify\(\{ trashed: true \}\)/.test(sh) && !/method: "DELETE"/.test(sh), "삭제는 휴지통(30일 복구) — 영구 삭제 안 함");
assert.ok(/if \(!confirm\(/.test(sh), "삭제는 한 번 더 확인");
assert.ok(/r\.hidden_at = new Date\(\)\.toISOString\(\)/.test(sh) && /await writeJSON\(j\.folder\.id, MKREQ, r, j\.reqId\)/.test(sh), "숨기기는 요청 기록에 표시만");
assert.ok(/if \(dx < -60 && Math\.abs\(dx\) > Math\.abs\(dy\) \* 1\.5\) \{ el\._swiped = true; mkDelSheet/.test(T), "왼쪽으로 밀면 정리 창");
assert.ok(/class="small ghost mkMore" data-mkm=/.test(T), "⋯ 버튼");
assert.ok(/if \(j\.req\.hidden_at\) \{ \/\* \(11\/21\) 숨긴 곡은 할 일에 안 띄움/.test(T), "홈 할 일에서도 숨김");
console.log("mk-delete OK");
