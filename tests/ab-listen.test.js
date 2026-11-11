// A/B 듣기 페이지: 목록·음원이 모두 있고, 섞인 선택지가 정답표(key)와 맞는지
const fs = require("fs"), assert = require("assert"), D = __dirname + "/../bench/ab/";
const M = JSON.parse(fs.readFileSync(D + "manifest.json", "utf8")), h = fs.readFileSync(D + "index.html", "utf8");
assert.ok(M.cases.length >= 10 && M.made === "synthetic", "합성 샘플만");
for (const c of M.cases) { for (const f of [c.orig, c.a, c.b]) assert.ok(fs.existsSync(D + f), f); assert.notStrictEqual(c.a, c.b); assert.ok(c.a.includes(c.key.a) && c.b.includes(c.key.b), c.id); }
assert.ok(h.includes("결과 복사") && h.includes("localStorage") && h.includes("A가 낫다"), "페이지 기능");
console.log("ab-listen ok");
