// 같은 이름의 최상위 함수가 두 번 있으면 브라우저는 오류 없이 뒤의 것으로 덮어쓴다(tpLoad 사고, 2026-10-27) → 미리 막는다
const fs = require("fs"), assert = require("assert");
for (const page of ["teacher/index.html", "student/index.html"]) {
  const src = fs.readFileSync(__dirname + "/../" + page, "utf8");
  const names = [...src.matchAll(/^(?:async )?function ([A-Za-z0-9_$]+)/gm)].map(m => m[1]);
  const dup = names.filter((n, i) => names.indexOf(n) !== i);
  assert.deepStrictEqual(dup, [], `${page}: 이름이 겹치는 함수 ${dup.join(", ")}`);
}
console.log("no-duplicate-functions ok");
