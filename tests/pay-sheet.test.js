// (11/21 사용자 '결제 회차 정보를 기입하는 부분') 결제 기록 넣기·지우기 — 입력 검사·정렬·새 결제 표시
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = T.match(/\/\/#pay-begin\n([\s\S]*?)\/\/#pay-end/)[1];
const P = new Function(code + "return { payClean, paySort, payNewer, PAY_PRESETS };")();
const today = "2026-11-21";
assert.deepEqual(P.payClean({ date: "2026-11-19", sessions: "8" }, today).pay, { date: "2026-11-19", sessions: 8 });
assert.deepEqual(P.payClean({ date: "2026-11-19", sessions: 4, start: "2026-11-12", amount: "400,000원" }, today).pay, { date: "2026-11-19", sessions: 4, start: "2026-11-12", amount: 400000 });
assert.equal(P.payClean({ date: "2026-11-19", sessions: 4, start: "2026-11-19" }, today).pay.start, undefined, "첫 레슨 = 결제일이면 안 씀");
assert.ok(P.payClean({ date: "", sessions: 4 }, "").err); assert.ok(P.payClean({ date: today, sessions: 0 }).err); assert.ok(P.payClean({ date: today, sessions: 99 }).err);
assert.ok(P.payClean({ date: today, sessions: 4, start: "11/12" }).err);
assert.deepEqual(P.paySort([{ date: "2026-11-19" }, { date: "2026-09-08" }]).map(x => x.date), ["2026-09-08", "2026-11-19"]);
// 레슨 처리(package_paid_on 09-08) 뒤에 넣은 11/19 결제가 그 레슨(11/19)을 덮으면 '새 결제 등록됨'
const st = { payments: [{ date: "2026-09-08", sessions: 4 }, { date: "2026-11-19", sessions: 8 }] };
assert.equal(P.payNewer(st, { package_paid_on: "2026-09-08" }, "2026-11-19_06회차").date, "2026-11-19");
assert.equal(P.payNewer(st, { package_paid_on: "2026-09-08" }, "2026-11-12_05회차"), null, "그 레슨보다 뒤 결제는 해당 없음");
assert.equal(P.payNewer({ payments: [{ date: "2026-11-25", sessions: 8, start: "2026-11-19" }] }, { package_paid_on: "2026-09-08" }, "2026-11-19_레슨").sessions, 8, "늦게 결제해도 첫 레슨 날짜로 덮음");
assert.equal(P.payNewer(st, { package_paid_on: "2026-11-19" }, "2026-11-19_레슨"), null, "이미 반영된 결제");
// 연결: 수강생 화면 버튼·레슨 머리 버튼·원장만·config에 저장
assert.ok(/id="payBtn">💳 결제 기록/.test(T) && /id="btnPayAdd" type="button">💳 결제 기록/.test(T));
assert.ok(/const payCanEdit = \(\) => !\(typeof cfg !== "undefined" && cfg\?\.role === "teacher"\)/.test(T), "강사 계정은 못 고침");
assert.ok(/x\.payments = paySort\(fn\(/.test(T), "config students[sid].payments에 날짜순으로");
console.log("pay-sheet OK");
