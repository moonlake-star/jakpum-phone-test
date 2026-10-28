// 2단계 화면 간결화 시험 — index.html 안의 함수를 그대로 꺼내 실행(가짜 DOM)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => src.match(re)[0];
const code = [grab(/const FOLD_KEY[^\n]*\n/), grab(/function foldGet[^\n]*\n/), grab(/function foldSet[^\n]*\n/),
  grab(/function initFold[\s\S]*?\n}\n/), grab(/function tpHTML[\s\S]*?\n}\n/), grab(/function bestOptions[\s\S]*?\n}\n/), grab(/function bestPicked[^\n]*\n/), grab(/function bestSourceTakes[\s\S]*?\n}\n/),
  grab(/function bestMakeupAudio[\s\S]*?\n}\n/), grab(/function makeupState[\s\S]*?\n}\n/), grab(/function inclHTML[\s\S]*?\n}\n/), grab(/function makeupBoxHTML[\s\S]*?\n}\n/),
  grab(/function bestMakeupLabel[\s\S]*?\n}\n/), grab(/function renderBest[\s\S]*?\n}\n/),grab(/function wireIncl[\s\S]*?\n}\n/), grab(/function wireBest[\s\S]*?\n}\n/), grab(/function renderToday[\s\S]*?\n}\n/), grab(/function speakerIssues[\s\S]*?\n}\n/),
  grab(/function paintSpkState[\s\S]*?\n}\n/)].join("\n");
function env() {
  const store = {}, els = {};
  const el = (id) => (els[id] ??= { id, innerHTML: "", style: {}, dataset: {}, classList: { toggle() {} }, querySelector: () => null });
  const LS = { get: (k) => store[k] ?? null, set: (k, v) => { store[k] = v; } };
  const esc = (x) => String(x).replace(/[&<>]/g, "");
  const fmt = (t) => String(Math.round(t)), playShared = () => {}, tpWire = () => {}, tpDetach = () => {}, document = { querySelectorAll: () => [] }, bestMakeupJob = () => null;
  const f = new Function("$", "LS", "esc", "cur", "fmt", "playShared", "tpWire", "tpDetach", "document", "bestMakeupJob",
    code + "; return {renderToday, speakerIssues, paintSpkState, initFold, foldSet, foldGet, bestPicked};");
  return { els, store, mk: (cur) => f(el, LS, esc, cur, fmt, playShared, tpWire, tpDetach, document, bestMakeupJob) };
}
const base = () => ({ st: { name: "홍길동" }, segs: [{ speaker: "A" }, { speaker: "B" }], summary: { speakers_talk_sec: { A: 60, B: 50 } },
  review: { speakers: { A: "teacher", B: "student" }, points: ["AI포인트"], practice: ["하루 5분", "", "x"] }, spkSaved: true, teacherPts: false, ana: { next_goal: "후렴 첫음" }, ai: {} });

// 1) 오늘 핵심·이번 주 연습은 전달 패키지에서 뺌(아래 카톡 문구·수강생 미리보기와 중복, 2026-10-27 사용자 '정보가 너무 많음')
let e = env(), cur = base(), m = e.mk(cur);
m.renderToday(); let h = e.els.todayCard.innerHTML;
assert(!h.includes("오늘 핵심") && !h.includes("이번 주 연습") && !h.includes("하루 5분") && h.includes("🎵 오늘의 베스트"));

cur = base(); cur.best = { status: "ok", best: { file_id: "b1", kind_ko: "연속 테이크(약 1절)", len: 28, praise: { t: 968, text: "오, 잘했어요" } },
  alternatives: [{ file_id: "b2", kind_ko: "짧은 연속 테이크", len: 14, praise: { t: 805 } }] };
e = env(); m = e.mk(cur); m.renderToday(); h = e.els.todayCard.innerHTML;
// 단일 테이크(후보 1·2)만 있고 편집본이 없으면: 후보로 노출·대체하지 않고 '편집본 없음' 상태만 (2026-10-28)
assert(h.includes("🎵 오늘의 베스트") && h.includes("오늘의 베스트 편집본") && h.includes("편집본 없음") && !h.includes("후보"));
assert(m.bestPicked() === null && !h.includes("data-tp="));
cur.best.composite = { status: "ok", file_id: "c1", kind_ko: "여러 테이크 이어 붙인 1절(편집본)", len: 41, lines: [1, 2, 3, 4], takes_used: 2 };
m.renderToday(); h = e.els.todayCard.innerHTML;
assert(m.bestPicked().isComposite && m.bestPicked().file_id === "c1" && h.includes("편집본") && !h.includes("후보"));
assert(!/data-incl="[a-z]+" checked/.test(h), "기본은 보내기 해제");
cur.best.composite = { status: "none", why: "x" };
cur.best = { status: "none", why: "노래 구간 없음" }; m.renderToday(); h = e.els.todayCard.innerHTML;
assert(h.includes("노래 구간 없음") && !h.includes("bestPlay") && m.bestPicked() === null);
cur.best = null; m.renderToday(); assert(e.els.todayCard.innerHTML.includes("준비 중"));
console.log("lesson2 ok");
