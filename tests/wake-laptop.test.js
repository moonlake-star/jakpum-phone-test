// (11/20) 바로 처리 → 집 노트북 깨우기: 가짜 Drive 로만 검증.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#kick-begin\n([\s\S]*?)\/\/#kick-end/)[1];
const M = new Function(code + "return {wakeLaptop, WAKE_NAME, WSTAT_NAME, WORKER_FRESH_MS};")();
const NOW = Date.parse("2026-11-20T12:00:00Z");
function io(files, opt = {}) {
  const d = { files: { ...files }, writes: [] };
  d.find = async (n) => d.files[n] || null;
  d.write = async (folder, name, obj, id) => { if (opt.fail) throw new Error("503"); d.writes.push({ folder, name, obj, id }); d.files[name] = { id: id || "new", parent: folder }; return id || "new"; };
  return d;
}
(async () => {
  // 1) 노트북 켜짐(상태 1분 전) → 같은 폴더에 깨우기 파일 새로 씀
  { const d = io({ [M.WSTAT_NAME]: { id: "S", parent: "SYS", modifiedTime: new Date(NOW - 60000).toISOString() } });
    const r = await M.wakeLaptop(d, NOW);
    assert.deepEqual(r, { ok: true, why: "on" });
    assert.equal(d.writes.length, 1); assert.equal(d.writes[0].folder, "SYS"); assert.equal(d.writes[0].name, M.WAKE_NAME); assert.equal(d.writes[0].id, undefined);
    assert.equal(d.writes[0].obj.at, new Date(NOW).toISOString()); }
  // 2) 이미 있으면 같은 파일을 고쳐 씀(파일이 늘지 않음)
  { const d = io({ [M.WSTAT_NAME]: { id: "S", parent: "SYS", modifiedTime: new Date(NOW - 1000).toISOString() }, [M.WAKE_NAME]: { id: "W", parent: "SYS" } });
    await M.wakeLaptop(d, NOW); assert.equal(d.writes[0].id, "W"); }
  // 3) 노트북 꺼짐(상태 10분 전) → ok 아님·이유 off(그래도 깨우기는 남겨 켜지면 바로)
  { const d = io({ [M.WSTAT_NAME]: { id: "S", parent: "SYS", modifiedTime: new Date(NOW - 10 * 60000).toISOString() } });
    assert.deepEqual(await M.wakeLaptop(d, NOW), { ok: false, why: "off" }); assert.equal(d.writes.length, 1); }
  // 4) 상태 파일이 안 보이는 계정(강사) → none(예전 연결로)
  { const d = io({}); assert.deepEqual(await M.wakeLaptop(d, NOW), { ok: false, why: "none" }); assert.equal(d.writes.length, 0); }
  // 5) 쓰기 실패
  { const d = io({ [M.WSTAT_NAME]: { id: "S", parent: "SYS", modifiedTime: new Date(NOW).toISOString() } }, { fail: true });
    assert.equal((await M.wakeLaptop(d, NOW)).ok, false); }
  // 6) 꺼져 있을 때 GitHub(kick_url)로 넘기지 않음 · 안내 문구
  assert.ok(/if \(w\.why !== "none" \|\| !cfg\?\.kick_url\) return false;/.test(src));
  assert.ok(src.includes("집 노트북 서버가 꺼져 있어요"));
  console.log("wake-laptop OK");
})().catch(e => { console.error(e); process.exit(1); });
