// (11/24 사용자 '로딩을 빠르게' · 로딩 감사) 곡 반주·보컬 동시 받기 · 메이크업 음원 저장소 · 홈 둘러보기 복귀 때 다시 받지 않기 · 미리 받기 줄이기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
for (const src of [T, S]) assert.ok(src.includes('const [a, b] = await Promise.all([d.fetchBuf("mr"), d.fetchBuf("voc")]);') && !src.includes('const a = await d.fetchBuf("mr"), b = await d.fetchBuf("voc");'), "반주·보컬 동시에");
assert.ok(T.includes("t.buf = await mkDecode(name, await (await readBlob(fileId)).arrayBuffer());") && T.includes("R.buf = await mkCtx.decodeAudioData(await (await readBlob(fileId)).arrayBuffer());"), "메이크업 음원 저장소");
assert.ok(T.includes("mixP = readBlob(id, false, true).then("), "완성본 미리 받기는 저장소·팝업 없이");
assert.ok(T.includes("if (cached && force !== true && listDirtyAt < listFreshAt && Date.now() - listFreshAt < LIST_FRESH_MS) { paintList(cached, false); return; }"), "둘러보기 복귀는 저장본으로");
assert.ok(T.includes("if (!idem) listDirtyAt = Date.now();") && T.includes('renderList(true); };'), "저장했거나 새로고침이면 새로 받음");
assert.ok(T.includes(".filter(r => !PREF_DONE.has(r.l.id)).slice(0, 3);"), "미리 받기 3개·한 번만");
console.log("load-speed OK");
// (11/24 로딩 감사 3) 레슨 화면: 검수.json을 자료 읽기와 동시에
{ const T2 = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8"), a = T2.indexOf("const revFirstP = revListP.then("), b = T2.indexOf("const d = await lessonData(l.id, files);");
  require("assert").ok(a > 0 && b > a && T2.includes("(pre && pre.id === reviewF.id ? pre.j : await readJSON(reviewF.id))"), "검수.json 미리 받기(같은 파일이면 그대로 씀)"); }
console.log("load-speed 3 OK");
// (11/24 로딩 감사 4) 수강생 화면 방금 받은 자료 재조회 생략 · 메이크업 울림·트랙 동시 · 곡 서랍 수정 시각 동시 · lesson-replies 버전 표시
{ const T3 = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8"), A = require("assert");
  A.ok(T3.includes("if (!(listDirtyAt < listFreshAt && Date.now() - listFreshAt < LIST_FRESH_MS))   // (11/24 로딩 감사) 홈에서 방금"));
  A.ok(T3.includes('await Promise.all([irF ? mkIrLoad(irF.id).catch((e) => { console.warn("울림 IR", e); mkRev = null; }) : null, ensure(base())]);'));
  const sl = T3.slice(T3.indexOf("async function songLoad"), T3.indexOf("const old = new Map((prev || []).map(x => [x.folder, x]));", T3.indexOf("async function songLoad")));
  A.ok(sl.indexOf("const stampP = (async () => {") < sl.indexOf("let kids = []") && sl.includes("await stampP;"));
  A.ok(/lesson-replies\.js\?v=[0-9a-f]{10}/.test(T3)); }
console.log("load-speed 4 OK");
