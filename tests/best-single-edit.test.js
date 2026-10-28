// 오늘의 베스트 편집본 단일화 UI(#83): 후보 탭 없음, 편집 상태, 포함/제외 독립 버튼, 메이크업 상태, 음원 겹침 방지
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "못 찾음 " + re); return m[0]; };
const code = [grab(/function bestOptions\(\) \{[\s\S]*?\n\}\n/), grab(/function bestPicked\(\)[^\n]*\n/), grab(/function bestMakeupJob\(o\) \{[\s\S]*?\n\}\n/),
  grab(/function bestMakeupLabel\(o\) \{[\s\S]*?\n\}\n/), grab(/function bestMakeupAudio\(o\) \{[\s\S]*?\n\}\n/), grab(/function makeupState\(o\) \{[\s\S]*?\n\}\n/),
  grab(/function inclChk\(key, o\) \{[\s\S]*?\n\}\n/), grab(/function inclHTML\(o\) \{[\s\S]*?\n\}\n/), grab(/function makeupBoxHTML\(o\) \{[\s\S]*?\n\}\n/), grab(/function renderBest\(\) \{[\s\S]*?\n\}\n/),
  grab(/function wireIncl\(o\) \{[\s\S]*?\n\}\n/)].join("\n");
const COMP = { status: "ok", file_id: "C1", len: 32, lines: [1], method: "v7.2-live", mr_aligned: true, takes_used: 2, seams: [{ ref_t: 5, out_t: 10, end_t: 15 }], segments: [{ start: 100, end: 120 }, { start: 300, end: 330 }] };
const JOB = (over = {}, files = [{ id: "M1", name: "mix.mp3" }]) => ({ req: { lesson_folder: "L1", source_id: "C1", best_file_id: "C1", status: "done", ...over }, files });
function setup(review, comp = COMP, jobs = []) {
  const els = {};
  const cur = { review, folder: { id: "L1" }, best: { status: "ok", best: { file_id: "B1", len: 30 }, alternatives: [{ file_id: "B2", len: 20 }], composite: comp }, st: { _jobs: jobs } };
  const btns = [];
  const doc = { querySelectorAll: () => btns };
  const $ = (id) => (els[id] ??= { id, innerHTML: "" });
  let dirty = 0, delivered = 0;
  const api = new Function("cur", "$", "esc", "fmt", "tpHTML", "document", "toast", "markDirty", "paintDeliver",
    code + "; return { renderBest, wireIncl, bestOptions, inclHTML, makeupState, bestMakeupAudio };")(
    cur, $, (x) => String(x ?? ""), (t) => String(Math.round(t)), () => '<div class="tp"><input class="tpSeek" aria-label="재생 위치" style="width:100%"></div>', doc, () => {}, () => { dirty++; }, () => { delivered++; });
  return { cur, api, btns, $, counts: () => ({ dirty, delivered }) };
}
const pressed = (h) => (h.match(/data-incl="[a-z]+" checked/g) || []).length;   // 10/28: 포함/제외 버튼 → 제목 옆 '보내기' 체크박스
// 1) 편집본 하나만 보임: 후보 1/2/탭 없음, 기본은 아무것도 눌리지 않음(null)
let t = setup({}), h = t.api.renderBest();
assert.ok(h.includes("오늘의 베스트") && h.includes("원본 편집본") && h.includes("원본 레슨에서 가져온 구간 2곳") && h.includes("100~120"));
assert.ok(!/후보|bestAlt|data-k="\d"/.test(h) && !h.includes("B1") && !h.includes("B2"), "단일 테이크 후보 노출 금지");
assert.strictEqual(pressed(h), 0);
assert.ok(h.includes('data-incl="best"') && h.includes("피드백에 포함"), "편집본 제목 옆 체크박스(기본 해제)");
assert.ok(h.includes("메이크업본 만들기") && !h.includes('data-incl="makeup"') && !h.includes('data-abrow="mk"'), "메이크업 음원 없으면 보내기 체크박스 없음");
// 2) 이어 붙인 자리 정보가 없는데 '한 테이크 그대로'라고 하지 않음
h = setup({}, { ...COMP, seams: [], takes_used: 3, method: "v5-mrabs" }).api.renderBest();
assert.ok(h.includes("한 테이크 그대로라는 뜻이 아니에요") && !h.includes("(한 테이크 그대로)"));
h = setup({}, { ...COMP, seams: [], takes_used: 3 }).api.renderBest();
assert.ok(h.includes("이어 붙인 자리 기록이 없어요") && !h.includes("사실상 단일 테이크"));
// 3) 편집 실패/불가/대기: 단일 테이크로 대체·공유하지 않고 상태/재시도 안내, 포함 버튼도 없음
for (const [c, msg] of [[{ status: "error", why: "x" }, "편집본 생성 실패"], [{ status: "none", fallback: "best_take" }, "편집본 생성 보류"], [null, "만들어지는 중"], [{ status: "none" }, "못 찾았어요"]]) {
  t = setup({ bestInclude: true, bestIncludeId: "B1" }, c); h = t.api.renderBest();
  assert.ok(h.includes(msg) && h.includes("다음 자동 처리 때 다시 시도") && h.includes("자동으로 보내지 않아요"), msg);
  assert.ok(!h.includes('class="tp"') && !h.includes("incl") && !h.includes("B1"), "대체 재생바·포함 버튼·단일 테이크 노출 금지");
}
// 4) 메이크업 상태: 처리 중/실패/완료인데 파일 없음/완료
for (const [job, msg] of [[JOB({ status: "running", progress: { pct: 40 } }), "만드는 중이에요(40%)"], [JOB({ status: "error" }), "처리에 실패했어요"], [JOB({}, []), "음원 파일을 확인하지 못했어요"]]) {
  t = setup({}, COMP, [job]); h = t.api.renderBest();
  assert.ok(h.includes(msg), msg); assert.ok(!h.includes('data-abrow="mk"'), "음원 없으면 메이크업 파형 없음");
  assert.ok(!h.includes('data-incl="makeup"'));
}
// 5) 완료된 메이크업: 비교 재생바(편집본 + 메이크업본 = .tp 2개) 와 활성 포함 버튼
t = setup({}, COMP, [JOB()]); h = t.api.renderBest();
assert.strictEqual((h.match(/class="tp"/g) || []).length, 2, "B안: 파형 2개"); assert.strictEqual((h.match(/data-abp="play"/g) || []).length, 1, "재생 줄은 하나"); assert.ok(h.includes('data-abrow="mk"') && h.includes('data-abp="swap"') && h.includes('data-incl="makeup"') && !/data-incl="makeup"[^>]*disabled/.test(h));
// 6) 보내기 체크: 독립 저장, 파일 ID 기록, 승인 상태 갱신(paintDeliver), 메이크업 없으면 거부, 해제하면 미선택(null)
const tick = (t, k, on) => { t.btns.length = 0; const mk = (kk) => ({ dataset: { incl: kk }, checked: false, onchange: null, closest: () => null });
  const bs = [mk("best"), mk("makeup")]; t.btns.push(...bs);
  t.api.wireIncl(t.api.bestOptions()[0]); const b = bs.find(x => x.dataset.incl === k); b.checked = on; b.onchange(); return b; };
t = setup({}, COMP, [JOB()]);
{
  tick(t, "best", true);
  assert.strictEqual(t.cur.review.bestInclude, true); assert.strictEqual(t.cur.review.bestIncludeId, "C1");
  assert.strictEqual(t.cur.review.makeupInclude, undefined, "편집본 선택이 메이크업 선택을 바꾸지 않음");
  tick(t, "makeup", true); assert.strictEqual(t.cur.review.makeupInclude, true); assert.strictEqual(t.cur.review.makeupIncludeId, "M1");
  tick(t, "makeup", false); assert.strictEqual(t.cur.review.makeupInclude, null); assert.strictEqual(t.cur.review.makeupIncludeId, undefined); assert.strictEqual(t.cur.review.bestInclude, true);
  assert.ok(t.counts().dirty >= 3 && t.counts().delivered >= 3);
  const t2 = setup({}, COMP, []); const b2 = tick(t2, "makeup", true);
  assert.strictEqual(t2.cur.review.makeupInclude, undefined, "메이크업 음원이 없으면 포함 불가"); assert.strictEqual(b2.checked, false);
  assert.strictEqual(pressed(setup({ bestInclude: true, bestIncludeId: "C1" }, COMP, [JOB()]).api.renderBest()), 1, "다시 열면 체크 유지");
  assert.strictEqual(pressed(setup({ bestInclude: true, bestIncludeId: "OLD" }, COMP, [JOB()]).api.renderBest()), 0, "파일이 바뀌면 체크 풀림");
}
// 7) 두 음원 동시 재생 방지: 편집본·메이크업본 재생바는 같은 단일 player 에 연결되고 별도 Audio 를 만들지 않음
const wb = grab(/function wireBest\(\) \{[\s\S]*?\n\}\n/);
assert.ok(/tpWire\(broot, o\.file_id, false, timeEl\)/.test(wb) && /tpWire\(mroot, m\.file_id, false, timeEl\)/.test(wb) && /player\.currentTime = Math\.min\(t,/.test(wb), "B안: 같은 player, ⇄는 같은 위치 유지");
assert.ok(!/new Audio|<audio/.test(wb + grab(/function makeupBoxHTML\(o\) \{[\s\S]*?\n\}\n/)), "메이크업 비교용 별도 오디오 금지");
assert.ok(/const player = new Audio\(\)/.test(src) && (src.match(/const player = new Audio\(\)/g) || []).length === 1);
assert.ok(/function tpLoad[\s\S]*?player\.pause\(\); tpRoot = root/.test(src), "다른 재생바로 바꾸면 이전 음원을 멈춤");
console.log("best-single-edit OK");
