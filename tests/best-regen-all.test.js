// 베스트 편집본 '전체 다시 편집'(이슈 #153) UI·상태·유출 방지. 가짜 Drive/DOM만 사용(운영 API·실음원 없음).
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "못 찾음 " + re); return m[0]; };
const fnNames = ["regenNewId", "regenItems", "regenActive", "regenDecision", "regenCandOk", "regenAdopted", "regenPending", "regenLastFailed",
  "regenRefresh", "regenSeamCount", "regenBoxHTML", "regenStart", "regenDecide", "wireRegen"];
const code = [grab(/const RG_REQ[^\n]*\n/), grab(/const RG_LABEL[^\n]*\n/), grab(/const RG_ACTIVE[^\n]*\n/), "let regenBusy = false, regenTimer = null;",
  grab(/const regenStateOf[^\n]*\n/),
  ...fnNames.map(n => { const one = src.match(new RegExp("^function " + n + "\\([^)]*\\) \\{[^\\n]*\\}$", "m"));   // 한 줄짜리 함수
    return one ? one[0] : grab(new RegExp("(async )?function " + n + "\\([^)]*\\) \\{[^\\n]*\\n[\\s\\S]*?\\n\\}\\n")); }),
  grab(/function bestOptions\(\) \{[\s\S]*?\n\}\n/), grab(/function bestPicked\(\)[^\n]*\n/)].join("\n");

const OLDC = { status: "ok", file_id: "OLD", len: 30, method: "v7.5-live", seams: [{ out_t: 1, ref_t: 1, end_t: 2 }] };
const CAND = (rid, over = {}) => ({ schema: "best-regen-1", req_id: rid, student_id: "s1", lesson_folder: "L1", base_file_id: "OLD",
  composite: { status: "ok", file_id: "NEW_" + rid, method: "v7.5-live", seams: [{ out_t: 2 }, { out_t: 5 }], len: 31 },
  rhythm: { state: "mr_aligned", needs_listen: true, note: "반주 위치로 맞춤 · 박자 정렬 확인 필요" }, adopted: null, student_visible: false, ...over });

function setup({ files = [], blobs = {}, review = {}, confirmAns = true } = {}) {
  const els = {}, writes = [], toasts = [], confirms = [];
  const cur = { sid: "s1", folder: { id: "L1" }, review, best: { status: "ok", composite: OLDC } };
  const $ = (id) => (els[id] ??= { id, innerHTML: "", onclick: null, querySelector: () => ({}) });
  const tpWired = [];
  const env = {
    cur, $, esc: (x) => String(x ?? "").replaceAll("<", "&lt;"), toast: (m) => toasts.push(m), confirm: (m) => (confirms.push(m), confirmAns),
    list: async () => files, readJSON: async (id) => { if (!(id in blobs)) throw new Error("no " + id); return blobs[id]; },
    writeJSON: async (folder, name, body) => { writes.push({ folder, name, body }); files.push({ id: "W" + writes.length, name }); return "W" + writes.length; },
    tpDetach: () => {}, tpHTML: () => '<div class="tp"></div>', tpWire: (root, fid) => tpWired.push(fid),
    renderToday: () => { els.rendered = (els.rendered || 0) + 1; }, saveReview: async () => true, markDirty: () => {},
  };
  const names = Object.keys(env);
  const api = new Function(...names, "setTimeout", "clearTimeout", "document", code +
    "; return { regenBoxHTML, regenStart, regenRefresh, regenAdopted, regenPending, regenDecide, bestOptions, bestPicked, wireRegen, regenActive };")(
    ...names.map(n => env[n]), () => 0, () => {}, { hidden: false });
  return { cur, api, writes, toasts, confirms, files, tpWired, els, $ };
}
const F = (name, id) => ({ id: id || name, name });

(async () => {
  // 1) 클릭 전: 요청 0건, 버튼만 보임
  let t = setup();
  let h = t.api.regenBoxHTML();
  assert.ok(h.includes("전체 다시 편집") && h.includes('id="regenStart"') && !h.includes("채택") && !h.includes("부분"));
  assert.strictEqual(t.writes.length, 0);
  assert.strictEqual(t.api.bestOptions().length, 1, "원래 편집본 그대로");

  // 2) 베스트 자료 없음 → 칸 없음
  t.cur.best = { status: "none" }; assert.strictEqual(t.api.regenBoxHTML(), ""); t.cur.best = { status: "ok", composite: OLDC };

  // 3) 확인창 문구 + 클릭 1번 = 요청 1건. 취소하면 0건
  t = setup({ confirmAns: false }); await t.api.regenStart();
  assert.strictEqual(t.writes.length, 0); assert.ok(t.confirms[0].includes("기존 편집본은 보존하고 새 편집본을 만듭니다. 완료 후 듣고 채택하세요"));
  t = setup(); await t.api.regenStart();
  assert.strictEqual(t.writes.length, 1);
  const w = t.writes[0];
  assert.ok(/^전체재편집_요청_r[0-9a-z]{6,}\.json$/.test(w.name) && w.folder === "L1");
  assert.deepStrictEqual([w.body.schema, w.body.student_id, w.body.lesson_folder, w.body.base_file_id], ["best-regen-1", "s1", "L1", "OLD"]);
  assert.strictEqual(w.body.req_id, w.name.slice("전체재편집_요청_".length, -5));

  // 4) 요청됨 상태: 가짜 진행률 없음, 시작 버튼 비활성, 중복 클릭 차단
  const rid = "rabc123";
  const reqF = F("전체재편집_요청_" + rid + ".json", "RQ");
  t = setup({ files: [reqF] });
  await t.api.regenRefresh(t.cur);
  h = t.api.regenBoxHTML();
  assert.ok(h.includes("요청됨") && !/%/.test(h) && /id="regenStart"[^>]*disabled/.test(h));
  await t.api.regenStart(); await t.api.regenStart();
  assert.strictEqual(t.writes.length, 0, "진행 중이면 새 요청 0건");

  // 5) 처리 중/대기/실패 표시, 실패 사유 + 재시도, 기존 편집본 불변
  for (const [st, label] of [["queued", "대기 중"], ["processing", "처리 중"]]) {
    t = setup({ files: [reqF, F("전체재편집_상태_" + rid + ".json", "ST")], blobs: { ST: { state: st, req_id: rid, reason: "" } } });
    await t.api.regenRefresh(t.cur); assert.ok(t.api.regenBoxHTML().includes(label));
  }
  t = setup({ files: [reqF, F("전체재편집_상태_" + rid + ".json", "ST")], blobs: { ST: { state: "failed", reason: "박자·반주 검증을 통과하지 못해 후보를 만들지 않았어요" } } });
  await t.api.regenRefresh(t.cur); h = t.api.regenBoxHTML();
  assert.ok(h.includes("실패") && h.includes("박자·반주 검증") && h.includes("기존 편집본은 그대로") && h.includes("재시도") && !/id="regenStart"[^>]*disabled/.test(h));
  assert.strictEqual(t.api.bestOptions()[0].file_id, "OLD");
  await t.api.regenStart();   // 재시도 = 새 요청 1건
  assert.strictEqual(t.writes.length, 1); assert.notStrictEqual(t.writes[0].name, "전체재편집_요청_" + rid + ".json");

  // 6) 성공: 비교 UI(기존/새 재생바 2개), 경고, 채택/유지 버튼. 아직 미선택 → 편집본 목록은 기존 그대로, 학생 공개 상태 불변
  const okFiles = [reqF, F("전체재편집_상태_" + rid + ".json", "ST"), F("전체재편집_후보_" + rid + ".json", "CD")];
  const okBlobs = { ST: { state: "succeeded", file_id: "NEW_" + rid }, CD: CAND(rid) };
  t = setup({ files: okFiles, blobs: okBlobs, review: { bestInclude: true, bestIncludeId: "OLD" } });
  await t.api.regenRefresh(t.cur); h = t.api.regenBoxHTML();
  assert.strictEqual((h.match(/class="tp"/g) || []).length, 2);
  assert.ok(h.includes("새 편집본 채택") && h.includes("기존 편집본 유지") && h.includes("박자 정렬 확인 필요") && h.includes("청감은 아직 검증 전"));
  assert.ok(h.includes("학생·카톡에 아무것도 가지 않아요") && h.includes("이어 붙인 곳 2곳") && !/id="regenStart"/.test(h));
  assert.strictEqual(t.api.regenAdopted(), null);
  assert.strictEqual(t.api.bestOptions()[0].file_id, "OLD", "채택 전 후보는 편집본 목록에 들어오지 않음");
  assert.deepStrictEqual([t.cur.review.bestInclude, t.cur.review.bestIncludeId], [true, "OLD"]);
  t.api.wireRegen(); assert.deepStrictEqual(t.tpWired, ["OLD", "NEW_" + rid]);

  // 7) 유지: 기존 그대로, 포함 상태 불변, 후보는 더 이상 대기 아님
  t.els.regenKeep.onclick(); await new Promise(r => setImmediate(r));
  assert.strictEqual(t.cur.review.bestRegen[rid].decision, "keep");
  assert.strictEqual(t.api.bestOptions()[0].file_id, "OLD"); assert.strictEqual(t.api.regenPending(), null);
  assert.deepStrictEqual([t.cur.review.bestInclude, t.cur.review.bestIncludeId], [true, "OLD"]);

  // 8) 채택: 새 파일이 '지금 편집본'. 포함 의사는 자동 승계 안 됨(파일 ID 다름), 확인창 거절 시 변화 없음
  t = setup({ files: okFiles, blobs: okBlobs, review: { bestInclude: true, bestIncludeId: "OLD" }, confirmAns: false });
  await t.api.regenRefresh(t.cur); t.api.wireRegen(); t.els.regenAdopt.onclick();
  assert.strictEqual(t.cur.review.bestRegen, undefined, "확인 거절 시 채택 안 됨");
  t = setup({ files: okFiles, blobs: okBlobs, review: { bestInclude: true, bestIncludeId: "OLD" } });
  await t.api.regenRefresh(t.cur); t.api.wireRegen(); t.els.regenAdopt.onclick(); await new Promise(r => setImmediate(r));
  assert.strictEqual(t.api.bestOptions()[0].file_id, "NEW_" + rid);
  const inclOk = new Function(src.match(/const inclOk = [^\n]*\n/)[0] + "; return inclOk;")();   // teacher/index.html 규칙 그대로
  // (2026-10-29 사용자) 베스트는 기본 포함: 채택한 새 편집본도 기본 포함, 예전 파일을 '뺀' 기록은 새 파일에 안 옮겨감
  assert.strictEqual(inclOk(t.cur.review, "best", t.api.bestOptions()[0].file_id), true, "채택한 새 편집본은 기본 포함");
  assert.strictEqual(inclOk({ bestInclude: false, bestIncludeId: "OLD" }, "best", t.api.bestOptions()[0].file_id), true);
  assert.strictEqual(inclOk({ bestInclude: false, bestIncludeId: t.api.bestOptions()[0].file_id }, "best", t.api.bestOptions()[0].file_id), false, "지금 파일을 끄면 뺌");
  assert.strictEqual(inclOk({}, "makeup", "M1"), false, "메이크업은 기본 미포함");

  // 9) 유효성: 다른 수강생/레슨/요청번호의 후보·상태 불일치는 채택 불가(기본 미선택 유지)
  for (const bad of [{ student_id: "s2" }, { lesson_folder: "L9" }, { req_id: "rzzz999" }]) {
    t = setup({ files: okFiles, blobs: { ...okBlobs, CD: CAND(rid, bad) } });
    await t.api.regenRefresh(t.cur);
    assert.strictEqual(t.api.regenPending(), null, JSON.stringify(bad)); assert.strictEqual(t.api.bestOptions()[0].file_id, "OLD");
  }
  t = setup({ files: okFiles, blobs: { ...okBlobs, ST: { state: "succeeded", file_id: "OTHER" } } });
  await t.api.regenRefresh(t.cur); assert.strictEqual(t.api.regenPending(), null, "상태의 file_id 와 후보가 다르면 거부");
  t = setup({ files: okFiles, blobs: { ...okBlobs, CD: CAND(rid, { composite: { status: "none", file_id: "NEW_" + rid } }) } });
  await t.api.regenRefresh(t.cur); assert.strictEqual(t.api.regenPending(), null, "fail-closed 후보는 채택 불가");

  // 10) 코드 경로 정적 점검: 학생 노트·카톡 경로는 후보를 직접 읽지 않고 bestForNote(포함 ID 일치)만 통과
  assert.ok(/function bestForNote\(\) \{ const o = bestPicked\(\); return o && inclOk\(cur\.review, "best", o\.file_id\) \? o : null; \}/.test(src));
  const regenSrc = src.slice(src.indexOf("const RG_REQ"), src.indexOf("const SHOW_TRIAL"));
  assert.ok(!/buildNote|kakaoText|publish|navigator\.share|clipboard/.test(regenSrc), "재편집 코드는 학생 공개·카톡을 하지 않음"); assert.ok(/kick\(\)/.test(regenSrc), "요청 저장 뒤 서버를 바로 시작(10/28 사용자: 다 적용)");
  assert.ok(!/오늘의베스트\.json|MKREQ|trashed|DELETE/.test(regenSrc), "기존 편집본 파일·메타를 쓰거나 지우지 않음");
  console.log("best-regen-all OK");
})().catch(e => { console.error(e); process.exit(1); });
