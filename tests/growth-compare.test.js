// (11/04 17:49 사용자 시안 승인) 같은 구절, 그때와 지금: 선생님이 '넣기'를 켠 것만 노트에, 수강생 카드는 원음 두 개 + 번갈아 듣기 + 숫자
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const g = (src, re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
// 선생님 쪽: gcForNote는 send가 꺼져 있으면 null
const tsrc = [/function gcPairs\(\)[^\n]*\n/, /function gcPicked\(\)[^\n]*\n/, /function gcForNote\(\) \{[\s\S]*?\n\}\n/].map(r => g(t, r)).join("");
const mk = new Function("cur", tsrc + "return gcForNote;");
const side = (d, f, acc) => ({ date: d, file_id: f, acc, wobble: 20, top: 67, pts: [[0, 60], [1, 61]], bars: [[0, 1, 60, 60]] });
const growth = { status: "ok", pick: "gc1", pairs: [{ id: "gc0", lyric: "a", days: 9, delta: {}, then: side("2026-10-20", "A0", .4), now: side("2026-11-03", "B0", .5) },
  { id: "gc1", lyric: "사랑해 그대를", days: 14, delta: { acc_pp: 20 }, then: side("2026-10-20", "A1", .4), now: side("2026-11-03", "B1", .6) }] };
assert.strictEqual(mk({ growth, review: {} })(), null, "기본은 안 보냄(선생님 확인 전)");
const n = mk({ growth, review: { gc: { send: true, say: " 좋아졌어요 " } } })();
assert.strictEqual(n.then.file_id, "A1", "선택 없으면 서버 추천(pick)");
assert.strictEqual(n.say, "좋아졌어요"); assert.ok(!("bars" in n.then), "학생 노트엔 필요한 것만");
assert.strictEqual(mk({ growth, review: { gc: { send: true, id: "gc0" } } })().now.file_id, "B0", "선생님이 고른 구절");
assert.strictEqual(mk({ growth: { status: "none" }, review: { gc: { send: true } } })(), null);
// 공개할 때 링크 열 파일에 비교 소리 포함
assert.ok(/n\.compare\?\.then\?\.file_id, n\.compare\?\.now\?\.file_id/.test(t), "noteFileIds에 비교 소리");
assert.ok(t.includes('j("성장비교.json", null)') && t.includes("compare: gcForNote()"));
// 수강생 쪽 카드
const pill = (id, label) => `<button data-lp="${id}">${label}</button><audio id="au_${id}"></audio>`;
const h = new Function("esc", "pill", g(s, /const GCN = [^\n]*\n/) + g(s, /function gcHtml\(c\) \{[\s\S]*?\n\}\n/) + "return gcHtml;")((x) => String(x), pill);
const out = h({ lyric: "사랑해 그대를", days: 14, delta: { acc_pp: 20, wobble: "좋아짐", top_semis: 2 }, say: "끝음이 안정됐어요", then: { date: "2026-10-20", file_id: "A1", acc: .4, wobble: 30, top: 65, pts: [[0, 60], [1, 62], [2, 61], [3, 60]] }, now: { date: "2026-11-03", file_id: "B1", acc: .6, wobble: 10, top: 67, pts: [[5, 60], [6, 62], [7, 61], [8, 60]] } });
assert.ok(out.includes('data-lp="A1"') && out.includes('data-lp="B1"') && out.includes('data-gcalt="A1|B1"'), "두 소리 + 번갈아 듣기");
assert.ok(out.includes("40%") && out.includes("60%") && out.includes("↑") && out.includes("솔") && out.includes("끝음이 안정됐어요") && out.includes("원음 그대로"));
assert.ok(out.includes("<svg"), "음높이 선");
assert.ok(!/AI|자동 분석|센트/.test(out), "수강생 화면에 AI·센트 표기 없음");
assert.strictEqual(h(null), ""); assert.strictEqual(h({ then: { file_id: "x" } }), "", "한쪽 소리 없으면 안 보임");
assert.ok(s.includes("gcHtml(l.compare)") && s.includes("wirePlayers(); wireCompare();"));
console.log("growth-compare ok");
