// (11/09 12:30 사용자 시안 승인) 메이크업 진행 막대: 팁 박스 위 · 곡 이름·%·단계·남은 시간 · 완성 10초 · 실패는 남음 · 그 곡 진행 화면에선 안 띄움
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(T.includes('stopProg(); show("vMkJob"); paintProg(job.req, clientStage); if (job.reqId) { progJobId = job.reqId; try { mkWatch(job); } catch {} }'), "진행 화면을 열면 목록에 올림");
assert.ok(T.includes("try { mkwDrop(job.reqId); } catch {} job.files = await list(job.folder.id);"), "진행 화면에서 끝나면 목록에서 뺌");
assert.ok(T.includes("#mkBar.tip{bottom:calc(48px + env(safe-area-inset-bottom))}") && T.includes("mkwTimer = setInterval(mkwPoll, 30000)"), "팁 박스 위 · 30초마다");
assert.ok(T.includes("if (d && d.doneAt && now - d.doneAt > 10000) { mkwDrop(x.reqId); return; }") && T.includes("const vis = L.filter(x => !(onProg && x.reqId === progJobId));"));
const pct = new Function("mkEstimate", "STAGE_CAP", T.match(/function mkwPct\(r\) \{[\s\S]*?\n  return Math\.max\(sp, Math\.min\(Math\.round\(el \/ est \* 100\), cap\)\); \}/)[0] + " return mkwPct;")(() => 100, [[0, 5], [6, 11], [12, 19], [20, 75], [76, 79], [80, 91], [92, 99], [100, 100]]);
assert.strictEqual(pct({ status: "done" }), 100); assert.strictEqual(pct(null), 0);
assert.strictEqual(pct({ status: "working", requested_at: new Date(Date.now() - 50000).toISOString(), progress: { pct: 38 } }), 50, "서버 % 와 시간 추정 중 큰 값(단계 상한 안)");
console.log("mk-bar ok");
