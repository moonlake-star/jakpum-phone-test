// (11/16) 입학 설문: 요약 문장 · 시트 연결 · 수강생 화면 카드 — 실제 코드 조각 실행
const assert = require("assert"), fs = require("fs"), vm = require("vm"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "../teacher/index.html"), "utf8");
const a = T.indexOf("const INTAKE = ["), b = T.indexOf("const intakeLine = "), e = T.indexOf("\n", b);
const c = T.indexOf("function intakeCard"), d = T.indexOf("function paintLessonsTab");
const ctx = { esc: (x) => String(x).replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m])) }; vm.createContext(ctx);
vm.runInContext((T.slice(a, e) + "\n" + T.slice(c, d)).replace(/const /g, "var "), ctx);
const ks = vm.runInContext("INTAKE.map(q=>q.k)", ctx); assert.strictEqual(new Set(ks).size, ks.length, "키 중복 없음");
assert.ok(vm.runInContext("INTAKE.every(q=>q.text||q.o.length>=3)", ctx));
assert.strictEqual(ctx.intakeLine({}), ""); assert.strictEqual(ctx.intakeLine(null), "");
const line = ctx.intakeLine({ path: "유튜브", genre: ["락", "발라드"], worry: ["고음이 힘들다"], why: "그냥 좋아서" });
assert.ok(line.includes("방문 경로: 유튜브") && line.includes("선호 장르: 락, 발라드") && line.includes("그냥 좋아서"), line);
assert.strictEqual(ctx.intakeCard(null), ""); assert.strictEqual(ctx.intakeCard({}), ""); assert.strictEqual(ctx.intakeCard({ intake: { a: {} } }), "");
const h = ctx.intakeCard({ intake: { a: { path: "<b>x" }, rules_ack: true, at: "2026-11-16T01:00:00Z" } });
assert.ok(h.includes("&lt;b&gt;x") && h.includes("수업 규정 안내 확인 ✓") && h.includes("사진 촬영: 동의 기록 없음") && h.includes("2026-11-16"), "이스케이프·동의 표시");
assert.ok(!/연락처|생년월일|성별/.test(T.slice(a, e)), "개인정보 항목은 묻지 않음");
assert.ok(T.includes('id="nsIn"') && T.includes("x.intake = { a: intake") && T.includes("${intakeCard(cfg.students[sid])}"), "시트·저장·화면 연결");
console.log("intake-survey OK");
