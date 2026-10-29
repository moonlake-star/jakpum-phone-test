// (10/29 11:28) 전체 다시 편집: 예상 완료 시간 + 기준 편집본은 서버가 비교하는 오늘의베스트 편집본 ID
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (n) => src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n"))[0];
const consts = src.match(/const RG_ETA_MIN[^\n]*\n/)[0];
const F = new Function("regenStateOf", consts + g("rgNextCron") + g("regenEta") + "return { rgNextCron, regenEta };")((it) => it.state?.state || "requested");
const T = Date.UTC(2026, 9, 29, 2, 26);   // KST 11:26
const rid = "r" + T.toString(36) + "abcdef";
const hm = (ms) => new Date(ms).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit" });   // 시험 컴퓨터 시간대와 상관없이
assert.strictEqual(F.regenEta({ rid }, T + 60000), `예상 완료 ${hm(T + 13 * 60000)} 전후 (보통 10~15분)`);
assert.ok(/약 \d+분 남음/.test(F.regenEta({ rid, state: { state: "processing", updated_at: new Date(T + 60000).toISOString() } }, T + 120000)));
assert.ok(F.regenEta({ rid, state: { state: "processing", updated_at: new Date(T).toISOString() } }, T + 25 * 60000).includes("늦어지고"));
assert.strictEqual(F.rgNextCron(Date.UTC(2026, 9, 29, 2, 40)), Date.UTC(2026, 9, 29, 7, 0), "다음 예약 확인(UTC 7:00 = 16:00)");
assert.ok(F.regenEta({ rid }, T + 5 * 60000).includes("다음 자동 확인"), "3분 넘게 안 가져가면 다음 예약 시각 기준");
assert.ok(src.includes("const bc = me.best?.composite, base = bc?.status === \"ok\" ? bc.file_id || null : null;") && src.includes("base_file_id: base"), "서버 비교 기준과 같은 ID");
console.log("regen-eta ok");
