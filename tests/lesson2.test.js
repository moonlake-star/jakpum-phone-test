// 2단계 화면 간결화 시험 — index.html 안의 함수를 그대로 꺼내 실행(가짜 DOM)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => src.match(re)[0];
const code = [grab(/const FOLD_KEY[^\n]*\n/), grab(/function foldGet[^\n]*\n/), grab(/function foldSet[^\n]*\n/),
  grab(/function initFold[\s\S]*?\n}\n/), grab(/function renderToday[\s\S]*?\n}\n/), grab(/function speakerIssues[\s\S]*?\n}\n/),
  grab(/function paintSpkState[\s\S]*?\n}\n/)].join("\n");
function env() {
  const store = {}, els = {};
  const el = (id) => (els[id] ??= { id, innerHTML: "", style: {}, dataset: {}, classList: { toggle() {} } });
  const LS = { get: (k) => store[k] ?? null, set: (k, v) => { store[k] = v; } };
  const esc = (x) => String(x).replace(/[&<>]/g, "");
  const f = new Function("$", "LS", "esc", "cur", code + "; return {renderToday, speakerIssues, paintSpkState, initFold, foldSet, foldGet};");
  return { els, store, mk: (cur) => f(el, LS, esc, cur) };
}
const base = () => ({ st: { name: "홍길동" }, segs: [{ speaker: "A" }, { speaker: "B" }], summary: { speakers_talk_sec: { A: 60, B: 50 } },
  review: { speakers: { A: "teacher", B: "student" }, points: ["AI포인트"], practice: ["하루 5분", "", "x"] }, spkSaved: true, teacherPts: false, ana: { next_goal: "후렴 첫음" }, ai: {} });

// 1) 오늘 핵심: 검수 전에는 next_goal(AI 초안), 선생님이 고르면 그 1번, 데이터 없으면 허위 문장 없이 안내
let e = env(), cur = base(), m = e.mk(cur);
m.renderToday(); let h = e.els.todayCard.innerHTML;
assert(h.includes("AI 초안") && h.includes("후렴 첫음") && !h.includes("AI포인트"));
assert(h.includes("하루 5분") && h.includes("· x") && !h.includes("<div>· </div>"));
cur.teacherPts = true; m.renderToday(); h = e.els.todayCard.innerHTML;
assert(h.includes("AI포인트") && !h.includes("AI 초안"));
cur.teacherPts = false; cur.ana = null; cur.ai = {}; cur.review.practice = []; m.renderToday(); h = e.els.todayCard.innerHTML;
assert(h.includes("AI 초안 없음") && !h.includes("이번 주 연습"));

// 2) 화자 경고: 미확인 / AI 불확실 / 3명 이상 → 경고, 확정·2명이면 없음
assert.deepStrictEqual(m.speakerIssues({}), []);
cur.spkSaved = false; assert.strictEqual(m.speakerIssues({}).length, 1);
cur.spkSaved = true; cur.review.speakers.B = ""; assert(m.speakerIssues({}).length >= 1);
cur.review.speakers.B = "student"; cur.spkSaved = false;
assert(m.speakerIssues({ speaker_roles: { A: "teacher", B: "unknown" } }).some((x) => x.includes("확신")));
cur.spkSaved = true; cur.summary.speakers_talk_sec.C = 5; cur.review.speakers.C = "";
assert(m.speakerIssues({}).some((x) => x.includes("3명")));
cur.review.speakers.C = "singing"; assert.deepStrictEqual(m.speakerIssues({}), []);   // 노래·음원은 사람 수에서 제외

// 3) 접기 상태: 저장값 사용, 경고(forceOpen)는 저장값보다 우선하고 저장값을 덮어쓰지 않음
const d = { dataset: { fold: "spk" }, open: false, addEventListener(t, f) { this._h = f; } };
m.foldSet("spk", true); m.initFold(d, false); assert.strictEqual(d.open, true);
m.foldSet("spk", false); m.initFold(d, true); assert.strictEqual(d.open, true);
d._h(); assert.strictEqual(m.foldGet("spk"), false);             // 경고로 강제 펼침은 저장 안 됨
m.initFold(d, false); assert.strictEqual(d.open, false); d.open = true; d._h(); assert.strictEqual(m.foldGet("spk"), true);

// 4) 조작 중(live)에는 카드 위치를 옮기지 않음
cur = base(); cur.spkSaved = false; cur.aiSpkIssues = ["x"]; e = env(); m = e.mk(cur);
e.els.spkCard = { style: { order: 3 }, classList: { toggle() {} } }; e.els.spkSum = { innerHTML: "" };
m.paintSpkState(true); assert.strictEqual(e.els.spkCard.style.order, 3); assert(e.els.spkSum.innerHTML.includes("화자 확인 필요"));

// 5) 구조: 편집 카드(피드백)·클립·저장 버튼은 접힘 밖, 접힘 영역과 화자 경고 진입점이 존재
const start = src.indexOf('<section id="vLesson"'), html = src.slice(start, src.indexOf("</section>", start));
for (const id of ["spkWrap", "ckWrap", "segWrap"]) assert(html.includes(`id="${id}"`), id);
assert(src.includes('id="anaWrap"'));
const inDetails = (id) => { const i = html.indexOf(`id="${id}"`); assert(i > 0, id); return html.lastIndexOf("<details", i) > html.lastIndexOf("</details>", i); };
assert(!inDetails("fb") && !inDetails("cands") && !inDetails("btnSave") && !inDetails("todayCard"));
assert(inDetails("segs") && inDetails("spk") && inDetails("ck"));
console.log("lesson2 ok");
