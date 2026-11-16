// (11/16) 하단 탭: 칸 4개 구성 · 모든 기존 연결 id가 어느 한 칸에 있음 · 탭 전환 함수 · 로그아웃은 더보기에서만
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const i = T.indexOf('const tab0 = LS.get("vn_tab")'), j = T.indexOf("ensureBotNav(tabNow, bells);", i); const blk = T.slice(i, j);
const panes = blk.split('<div class="pane" data-p="').slice(1).map((x) => ({ name: x.slice(0, x.indexOf('"')), html: x }));
assert.deepStrictEqual(panes.map((p) => p.name), ["today", "stu", "songs", "more"], "칸 4개 순서");
const where = (id) => panes.filter((p) => p.html.includes(`id="${id}"`)).map((p) => p.name);
const must = { calBtn: "today", oneLine: null, todoCard: null, careBox: "today", nsBtn: "stu", joinReq: "stu", retBox: "stu", practiceBox: "songs", pitchAll: "songs", pitchRec: "songs", calBtn2: "more", prefsBox: "more", advPermBox: "more", laBox: "more", reload: "more" };
for (const [id, p] of Object.entries(must)) if (p) assert.deepStrictEqual(where(id), [p], id + " 위치"); 
assert.ok(blk.includes('id="songBtn"') && blk.includes('id="jamBtn"') && panes[2].html.includes("${songRows ?"), "곡 서랍·합주는 곡·연습 칸");
assert.ok(blk.includes("oneLine + segHtml + todoHtml") && blk.includes("blocks.join"), "오늘 할 일·수강생 카드 배치");
assert.ok(blk.split("segHtml").length - 1 === 2, "강사 필터는 오늘·수강생 양쪽");
for (const id of ["calBtn", "calBtn2", "songBtn", "jamBtn", "nsBtn", "reload"]) assert.ok(T.includes(`$("${id}").onclick`), id + " 연결 유지");
assert.ok(T.includes("function setBotTab") && T.includes("function ensureBotNav") && /BOT_TABS = \[\["today"[^\]]*\], \["stu"[^\]]*\], \["songs"[^\]]*\], \["more"/.test(T), "탭 함수");
assert.ok(T.includes('#vList:not(.hidden)[data-tab="more"] ~ #lgFoot{display:block}'), "로그아웃은 더보기에서만");
assert.ok(T.includes("#vList:not(.hidden) ~ #botNav { display:flex; }") && T.includes('#vList .pane { display:none; }'), "목록 화면에서만 하단 바");
// setBotTab 실제 실행
const vm = require("vm"); const a = T.indexOf("const BOT_TABS"), b = T.indexOf("function ensureBotNav");
const store = {}, list = { dataset: {} }, btns = ["today", "stu", "songs", "more"].map((k) => ({ dataset: { bt: k }, on: null, classList: { toggle(c, v) { this.p.on = v; }, p: null }, setAttribute() {} })); btns.forEach((x) => (x.classList.p = x));
let scrolled = 0; const ctx = { LS: { set: (k, v) => (store[k] = v) }, $: () => list, document: { querySelectorAll: () => btns }, window: { scrollTo: () => scrolled++ } }; vm.createContext(ctx);
vm.runInContext(T.slice(a, b).replace(/const /g, "var "), ctx);
ctx.setBotTab("songs"); assert.strictEqual(store.vn_tab, "songs"); assert.strictEqual(list.dataset.tab, "songs"); assert.deepStrictEqual(btns.map((x) => x.on), [false, false, true, false]); assert.strictEqual(scrolled, 1);
ctx.setBotTab("bogus"); assert.strictEqual(list.dataset.tab, "today", "모르는 값은 오늘로");
console.log("bottom-tabs OK");
