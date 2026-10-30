// (10/30) 이어 붙일 구간이 없을 때: 선생님이 고른 '가장 좋았던 한 번'만 오늘의 베스트
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const g = (n) => t.match(new RegExp("function " + n + "\\(\\) \\{[^]*?\\n\\}\\n"))[0];
const mk = (cur) => new Function("cur", "regenAdopted", g("bestOptions") + g("bestSingles") + "return { bestOptions, bestSingles };")(cur, () => null);
const best = { status: "ok", best: { file_id: "S1", len: 45, kind_ko: "연속 테이크" }, alternatives: [{ file_id: "S2", len: 44 }], composite: { status: "none", why: "같은 부분을 두 번 이상 부른 테이크가 없음" } };
let f = mk({ best, review: {} });
assert.deepStrictEqual(f.bestOptions(), [], "고르기 전엔 없음(자동 대체 금지)");
assert.deepStrictEqual(f.bestSingles().map(x => x.file_id), ["S1", "S2"]);
f = mk({ best, review: { bestSingle: { file_id: "S2" } } });
const o = f.bestOptions()[0];
assert.ok(o.file_id === "S2" && o.singlePicked && o.isComposite === false);
f = mk({ best: { ...best, composite: { status: "ok", file_id: "C1" } }, review: { bestSingle: { file_id: "S2" } } });
assert.strictEqual(f.bestOptions()[0].file_id, "C1", "편집본이 생기면 편집본이 우선");
f = mk({ best: { ...best, alternatives: [{ file_id: "S2" }, { file_id: "S3" }, { file_id: "S4" }, { file_id: "S1" }] }, review: {} });
assert.deepStrictEqual(f.bestSingles().map(x => x.file_id), ["S1", "S2", "S3"], "후보 최대 3개, 중복 없음");
console.log("best-single-pick ok");
