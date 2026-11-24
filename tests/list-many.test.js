// (11/24 로딩 감사 2단계) 여러 폴더 파일 목록을 묶어서 한 번에 — 폴더별로 정확히 나누고, 실패한 묶음만 하나씩 다시
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("async function listMany(ids, gate) {"), T.indexOf("const readJSON = (id) =>"));
(async () => {
  const calls = []; const DRIVE = "D", q = (x) => x;
  const files = { L1: [{ id: "a", name: "검수.json" }], L2: [{ id: "b", name: "AI초안.json" }, { id: "c", name: "x" }], L3: [] };
  for (let i = 4; i <= 45; i++) files["L" + i] = [{ id: "f" + i, name: "n" }];
  const api = async (url) => { calls.push(url); const ids = [...url.matchAll(/'(L\d+)' in parents/g)].map(m => m[1]);
    if (ids.includes("L30")) throw new Error("boom");   // 두 번째 묶음 실패 → 하나씩
    return { json: async () => ({ files: ids.flatMap(id => files[id].map(f => ({ ...f, parents: [id] }))) }) }; };
  const list = async (id) => { calls.push("list:" + id); if (id === "L30") throw new Error("only this"); return files[id]; };
  const listMany = new Function("api", "list", "DRIVE", "q", src + "; return listMany;")(api, list, DRIVE, q);
  const ids = Object.keys(files), m = await listMany(ids);
  assert.deepStrictEqual(m.get("L2").map(f => f.id), ["b", "c"]); assert.deepStrictEqual(m.get("L3"), []);
  assert.ok(!("parents" in m.get("L1")[0]), "parents 필드는 지움(예전 list와 같은 모양)");
  assert.ok(m.get("L30") instanceof Error && m.get("L25").length === 1, "실패한 묶음은 하나씩 다시, 그 폴더만 실패");
  assert.strictEqual(calls.filter(c => !c.startsWith("list:")).length, 3, "45개 폴더 → 3번 묶음 요청");
  assert.ok(T.includes("lessons.length > 1 ? await listMany(lessons.map(l => l.id), listGate) : null;") && T.includes("folders.length > 1 ? await listMany(folders.map(f => f.id), listGate) : null;"));
  console.log("list-many OK");
})().catch(e => { console.error(e); process.exit(1); });
