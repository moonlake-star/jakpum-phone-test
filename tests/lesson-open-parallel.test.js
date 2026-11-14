// 레슨 열기 빠르게 — 검수 파일 목록 요청을 레슨 자료 읽기와 동시에 시작(순서 대기 없음), 실패하면 예전처럼 files에서 찾음
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = src.indexOf("const revListP = list(l.id)"), b = src.indexOf("const d = await lessonData(l.id, files);", a), c = src.indexOf("let revFs = []; { const lst = await revListP;");
assert.ok(a > 0 && b > a && c > b, "병렬 요청 순서가 아님(목록 요청이 자료 읽기보다 앞이어야 함)");
assert.ok(!src.includes("revFs = (await list(l.id)).filter"), "예전의 순차 요청이 남아 있음");
const line = src.slice(c, src.indexOf("\n", c));
// 실행 시험(비동기 대기가 필요하므로 async 함수로 감싸 검증)
(async () => {
  const REVf = { id: "r1", name: "검수.json" }, other = { id: "x", name: "a.json" }, old = { id: "o", name: "검수.json" };
  const mk = (p, files) => new Function("revListP", "REVIEW", "files", `return (async () => { ${line}; return revFs; })();`)(p, "검수.json", files);
  assert.deepStrictEqual(await mk(Promise.resolve([other, REVf]), []), [REVf]);          // 목록 성공: 검수 파일만
  assert.deepStrictEqual(await mk(Promise.resolve(null), [other, old]), [old]);          // 목록 실패(null): 예전 files에서
  assert.deepStrictEqual(await mk(Promise.resolve([]), [old]), []);                      // 성공했는데 검수 없음: 빈 목록
  console.log("lesson-open-parallel OK");
})();
