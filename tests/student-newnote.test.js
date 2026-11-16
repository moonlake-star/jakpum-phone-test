// (11/16 S1·S3) 새 노트 한 줄 · 가장 최근 안 본 노트 강조 · 이전 안 본 노트 유지 — timeline() 실제 코드 실행
const fs = require("fs"), vm = require("vm"), assert = require("assert");
const S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const a = S.indexOf("function timeline() {"), b = S.indexOf("\n}\n", a) + 3;
const view = { innerHTML: "" };
const ctx = { Brand: { bar() {} }, history: { replaceState() {}, state: null }, location: { pathname: "/x" }, seenLocal: () => ctx.__seen, esc: (x) => String(x), md: (x) => String(x || ""),
  statusHtml: () => "<S>", goalHtml: () => "<G>", monthHtml: () => "<M>", growthHtml: () => "<R>", pitchLinkHtml: () => "<P>", albumHtml: () => "", albumTracks: () => [], fullSongsHtml: () => "", storyHtml: () => "", wirePlayers() {}, wireAlbum() {}, openLesson() {}, myLessons() {}, playSeries() {},
  $: (id) => (id === "view" ? view : null), document: { querySelectorAll: () => [] }, PitchEmbed: { hasRecord: () => ctx.__prac }, data: null };
vm.createContext(ctx); vm.runInContext(S.slice(a, b), ctx);
const L = (id, date, extra = {}) => ({ id, date, highlight: "h" + id, ...extra });
const run = (ls, seen, prac) => { ctx.data = { name: "하나", lessons: ls, status: {}, growth: {}, months: [], goal: null }; ctx.__seen = seen; ctx.__prac = prac; view.innerHTML = ""; vm.runInContext("timeline()", ctx); return view.innerHTML; };
// 새 노트 3개(최근 → 오래된 순): 한 줄은 가장 최근 것, 목록에는 3개 모두 '● 새 노트'
let h = run([L("c", "11/15"), L("b", "11/08"), L("a", "11/01")], {}, false);
assert.ok(h.startsWith('<button class="card newBar" data-l="c">') && h.includes("새 레슨 노트 3개") && h.includes("11/15 레슨 보기"), "최상단 한 줄: 가장 최근 + 개수");
assert.strictEqual((h.match(/● 새 노트/g) || []).length, 3, "이전 안 본 노트도 목록에 남음");
assert.ok(h.includes('class="lesson latestNew" data-l="c"') && !h.includes('class="lesson latestNew" data-l="b"'), "강조는 가장 최근 하나만");
// 최근 것을 열어 봤으면: 가장 최근 '안 본' 노트(b)가 강조, 한 줄도 b
h = run([L("c", "11/15", { seen_at: "x" }), L("b", "11/08"), L("a", "11/01")], {}, false);
assert.ok(h.includes('data-l="b"><b>🆕 새 레슨 노트 2개') && h.includes('class="lesson latestNew" data-l="b"'), "읽음 처리 반영");
assert.strictEqual((h.match(/● 새 노트/g) || []).length, 2);
// 로컬 읽음 기록도 반영 / 전부 봤으면 한 줄 없음
h = run([L("c", "11/15"), L("b", "11/08")], { c: 1, b: 1 }, false); assert.ok(!h.includes("newBar") && !h.includes("latestNew") && !h.includes("● 새 노트"), "다 봤으면 표시 없음");
// S2: 연습 기록 있으면 목표곡(<G>)보다 위, 없으면 성장(<R>) 아래
h = run([L("a", "11/01", { seen_at: "x" })], {}, true); assert.ok(h.indexOf("<P>") < h.indexOf("<G>") && h.split("<P>").length === 2, "기록 있음: 연습 카드 위(한 번만)");
h = run([L("a", "11/01", { seen_at: "x" })], {}, false); assert.ok(h.indexOf("<P>") > h.indexOf("<R>") && h.split("<P>").length === 2, "기록 없음: 성장 아래(한 번만)");
h = run([], {}, false); assert.ok(h.includes("아직 올라온 노트가 없어요") && !h.includes("newBar"), "노트 없을 때");
console.log("student-newnote OK");
