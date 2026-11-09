// (11/04 17:27·17:41 사용자) 고급 보정 모드(원장 + 원장이 허용한 강사) — 음정선 미리보기는 서버 note_edits.shape_pitch와 같은 값
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const src = fs.readFileSync(__dirname + "/../adv.js", "utf8");
const ctx = { document: { createElement: () => ({ style: {} }), head: { appendChild() {} } }, JSON, Math, Object, Array, String, Number, Float64Array, Uint8Array, console };
ctx.window = ctx; vm.createContext(ctx); vm.runInContext(src, ctx);
const A = ctx.TuneAdv; assert.ok(A && A._t);
// ① 서버와 같은 곡선(같은 입력 → 0.01센트 안)
const ref = JSON.parse(fs.readFileSync(__dirname + "/adv-parity.json", "utf8"));
const js = A._t.shapeNote(ref.n, ref.t, ref.c);
const md = Math.max(...js.map((v, i) => Math.abs(v - ref.out[i])));
assert.ok(md < 0.01, "서버와 다름: " + md);
// ② 기본값과 같은 칸은 저장 안 함
const S = { ne: { notes: [{ t0: 1, t1: 2, drift: 1, vib: 1, gain_db: 0 }, { t0: 3, t1: 4, tr_shape: "lin" }, { t0: 5, t1: 6, gain_db: -3 }], global: { ref_hz: 440, strength: 1, level: { quiet: 0, loud: 0 } } } };
A._t.clean(S); assert.deepStrictEqual(JSON.parse(JSON.stringify(S.ne)), { notes: [{ t0: 5, t1: 6, gain_db: -3 }], global: {} });
// ③ MIDI: 정음 덩어리 → 음, 표준 파일 머리
const cv = { levels: [3], target: true, pts: [] }; for (let i = 0; i < 100; i++) cv.pts.push([i / 50, 0, 0, i < 50 ? 6900 : 7200]);
const ns = A._t.notesFromCurve(cv); assert.strictEqual(JSON.stringify(ns.map(n => n.m)), "[69,72]");
const mb = A._t.midiBytes(ns); assert.strictEqual(String.fromCharCode(...mb.slice(0, 4)), "MThd"); assert.strictEqual(String.fromCharCode(...mb.slice(14, 18)), "MTrk");
// ④ 연결: tune.js는 onAdv가 있을 때만 버튼·'🎛 고급' 칸, 기본은 꺼짐(기본 보정 모드)
const tu = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(tu.includes('st.onAdv = typeof o.onAdv === "function" && G.TuneAdv ? o.onAdv : null;') && tu.includes("st.advOn = false;"));
assert.ok(tu.includes('${st && st.onAdv && st.advOn ? `<button type="button" data-md="a">🎛 고급</button>` : ""}'));
assert.ok(!/\/\/[^\n]*d\.querySelectorAll\("\[data-md\]"\)\.forEach\(x => \{ const on/.test(tu), "모드 바꾸는 코드가 주석에 묻히지 않음");
// ⑤ 선생님 앱: 원장 + 허용한 강사만, 원래 녹음 시간으로 저장, 강사 설정에 adv_mode
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("const canAdv = () => true;") && T.includes("...(canAdv() ? { onAdv, advGet, engGet, engSet, engPlay } : {})"));
assert.ok(T.includes("adv_mode: !!s.adv,") && T.includes("function paintAdvPerm()") && T.includes('<script src="../adv.js?v='));
assert.ok(T.includes("t0: r4(toO(n.t0)), t1: r4(toO(n.t1))") && T.includes("r.note_edits = { notes, global: g }"));
console.log("adv-mode ok", md.toFixed(4));
// (11/05 00:06 사용자) 고급 보정을 켜도 음표를 누르면 🎵 음정(기본: 위아래·나누기)부터
{ const tj = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  require("assert").ok(tj.includes('setMd(bu ? "p" : tMode ? "t" : "p")') && !tj.includes('st.advOn = true; st.fixMode = "a"'), "고급 켜도 기본 탭부터"); }
// (11/05 00:14) 오늘의 베스트 전체화면 → ✏️ 음표 고치기(메이크업 화면 전체화면으로)
{ const fs_ = require("fs"), tj = fs_.readFileSync(__dirname + "/../tune.js", "utf8"), th = fs_.readFileSync(__dirname + "/../teacher/index.html", "utf8"), A = require("assert");
  A.ok(tj.includes("el._openFull = () =>") && tj.includes('"✏️ 음표 고치기"') && tj.includes('typeof o.onFix !== "function" && typeof o.onEdit === "function"'));
  A.ok(th.includes("onEdit: (t) => { try { player.pause(); } catch {} editFromBest(job, t); }") && th.includes("async function editFromBest(job, t)")); }

/* (11/05 사용자) 곡 전체: 기준음 A4 줄 삭제 · 가까운 음/느린 흐름/목소리 결 설명 한 줄씩 */
{ const A = require("fs").readFileSync(__dirname + "/../adv.js", "utf8");
  require("assert").ok(!A.includes('stepper("기준음 A4"'), "기준음 A4 줄 삭제");
  for (const l of ["가까운 음은 그대로", "느린 흐름(전체)", "포먼트(목소리 결)"]) require("assert").ok(A.includes(`D(stepper("${l}"`), l + " 설명");
  require("assert").ok(A.includes('p.className = "advD"') && A.includes("w.appendChild(r); w.appendChild(p)"), "설명 줄 표시(줄 바로 아래)"); }

{ const A2 = require("fs").readFileSync(__dirname + "/../adv.js", "utf8");
  require("assert").ok(A2.includes('fmt: (v) => (v > 0 ? "−" : "") + pct(v)') && A2.includes('fmt: (v) => (v > 0 ? "+" : "") + pct(v)'), "큰 음 줄이기는 −값, 작은 음 키우기는 +값으로 표시"); }

/* (11/05 사용자) 이름 정리: 고급 보정 → 디테일 보정, 곡 전체(일괄) → 일괄 보정, 기본으로 → 심플로 */
{ const T1 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), A3 = require("fs").readFileSync(__dirname + "/../adv.js", "utf8"), as = require("assert");
  as.ok(T1.includes('mk("advGlB", "🎛 일괄 보정")') && T1.includes('<button type="button" data-md2="1" class="tfAdvOne" aria-label="고급 보정 켜기·끄기">🎛 고급</button>'), "버튼 이름: [🎛 고급] 한 개 + 일괄 보정");
  as.ok(A3.includes("<b>🎛 일괄 보정</b>"), "일괄 보정 시트 제목"); }

/* (11/05 사용자) 음별 포먼트: 음 고치기 창 '음색' 탭 · 설명 줄은 일괄 보정 시트·음색 탭에 · 서버 note_edits formant */
{ const A4 = require("fs").readFileSync(__dirname + "/../adv.js", "utf8"), as = require("assert");
  as.ok(A4.includes('const tabs = [["f", "흐름"], ["v", "비브라토"]];') && !A4.includes('if (k === "m") rows.push(') && A4.includes('put("formant", v)'), "탭 2개 · 음별 포먼트 탭 뺌 · 곡 전체 포먼트는 일괄 보정에");
  as.ok(A4.includes("fade_out: 0, formant: 0 }"), "음별 포먼트 기본값(0은 저장 안 함)");
  as.ok((A4.match(/p\.className = "advD"/g) || []).length === 2, "설명 줄 표시: 음 창·일괄 시트 두 곳");
  as.ok(A4.includes("🗑 모든 고침 지우고 처음 상태로") && !A4.includes('data-g="undo">') && !A4.includes("디테일 보정 전부 원래대로"), "초기화 버튼 이름(11/09: 곡 전체 처음으로 하나로)"); }

/* (11/05 사용자) 합치기: 나눈 조각 옆에 붙은 조각이 있을 때만 ⇔ 버튼 · 둘 다 안 고친 조각이면 고침 기록을 지워 서버가 고른 한 음으로, 아니면 지금 음으로 한 덩어리 */
{ const T5 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), as = require("assert");
  as.ok(T5.includes("mgNb = fixed ?") && T5.includes("data-merge") && T5.includes('<span class="i">합치기</span>'), "옆 조각이 있을 때만 ⇔ 버튼");
  as.ok(T5.includes("plain = isCut && !!o.cut && same()") && T5.includes("midi: plain ? null : rnd(m)"), "안 고친 조각끼리면 기록 삭제");
  as.ok(T5.includes("cv._fixes = prior.filter(x => !(x.t0 < a1 && x.t1 > a0)).concat(plain ? [] : [f]);"), "두 조각 기록을 하나로 바꿔 끼움"); }
// (11/05 사용자) 큰 음 줄이기: − 를 누르면 숫자가 더 마이너스로(−20% → −30%), + 는 0쪽으로
{ const A3 = require("fs").readFileSync(__dirname + "/../adv.js", "utf8");
  require("assert").ok(A3.includes("const sgn = o.inv ? -1 : 1;") && A3.includes('def: 0, inv: true, fmt: (v) => (v > 0 ? "−" : "") + pct(v)'), "큰 음 줄이기 − = 더 마이너스"); }

/* (11/05 사용자 '추천모드로 진행') [확인|보정] 토글: 보정 모드 = 고친 양 줄·주석 접음, 도구(일괄·치찰음)는 보정 모드에서만, 원음/보정본은 그대로 */
{ const T2 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), as = require("assert");
  as.ok(T2.includes("lane = k && h > 110 && !(st && st.advOn) ?"), "보정 모드: 고친 양 줄 없음");
  as.ok(T2.includes("st.notesHidden = (pm && !st.noteShow) || (!!st.advOn && ns.length > 0)") && T2.includes("const chipOn = pm && !st.advOn"), "보정 모드: 주석·💬 칩 숨김(삭제 아님)");
  as.ok(T2.includes("gl.hidden = !st.advOn") && T2.includes("const uvOn = !!(st.advOn && st.onAdv"), "일괄 보정·치찰음(🌬)은 보정 모드에서만");
  as.ok(!T2.includes('mk("advOnB"') && !T2.includes('mk("advOffB"'), "예전 디테일 보정/심플로 버튼 없음");
  as.ok(T2.includes("#tuneFs.advOn .tfHint,#tuneFs.advOn .tfNote{display:none}"), "보정 모드: 안내 글 접음");
  as.ok(!T2.includes("advOn .tfAbW") && !T2.includes("advOn .tfAb{display:none"), "원음/보정본 스위치는 숨기지 않음"); }

/* (11/05 사용자) 닫기 버튼: 가로 = 토글과 같은 높이로 줄임 · 세로(보정 모드) = 맨 오른쪽 위에 고정 */
{ const T3 = require("fs").readFileSync(__dirname + "/../tune.js", "utf8"), as = require("assert");
  as.ok(T3.includes("#tuneFs .tfBox:not(.port) .tfTop .tfX{height:36px!important") && T3.includes("#tuneFs.advOn .port .tfTop .tfX{position:absolute;right:0;top:4px;margin:0}"), "닫기 버튼 가로 크기·세로 위치"); }

// (11/09 사용자) 고급 버튼은 아래 줄 · 박자 줄은 늘 켜짐/맞춤은 스위치 · 팝업 '다음부터 고급으로' 체크 → 열 때 바로 고급
{ const T9 = require("fs").readFileSync(require("path").join(__dirname, "..", "tune.js"), "utf8");
  assert.ok(T9.includes('advRow.appendChild(seg)') && T9.includes('st.placeAdv = ()') && T9.includes('class="rpAdvCk"') && T9.includes('localStorage.setItem("tune_adv_default", "1")') && T9.includes('localStorage.getItem("tune_adv_default") === "1") setTimeout('), "아래 줄 고급 버튼 · 기본 고급 체크");
  assert.ok(T9.includes('mk("advBeatB", "🥁 박자 맞춤")') && !T9.includes("st.advOn && st.beatOn && cv.beats"), "박자 줄 항상 · 맞춤 스위치");
  console.log("adv-default ok"); }
