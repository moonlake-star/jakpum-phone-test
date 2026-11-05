// (11/05 사용자) 전체화면 ↶ ↷ 되돌리기·다시하기 + 길게 누르면 작업 기록 창
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../tune.js", "utf8"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
// mkHist 동작(고침 함수를 감싸 기록 · 되돌리기/다시하기 · 0.5초 안 이어지면 한 칸)
const a = T.indexOf("  function mkHist("), b = T.indexOf("  function openFull(");
assert.ok(a > 0 && b > a, "mkHist 위치");
let state = { v: 0 }; const applied = [];
const o = { histGet: () => JSON.stringify(state), histSet: async (js) => { state = JSON.parse(js); applied.push(js); }, onFix: (f) => { state = { v: f.midi }; }, onFixMany: (l) => { state = { v: l.length }; }, onTime: () => { state = { v: "t" }; }, onAdv: () => { state = { v: "adv" }; }, onResetRange: async () => { state = { v: 0 }; return 1; } };
let changed = 0; let now = 1000; const perf = { now: () => now };
const mkHist = new Function("noteName", "performance", T.slice(a, b) + "; return mkHist;")((m) => "N" + m, perf);
const h = mkHist(o, () => changed++);
assert.deepStrictEqual([h.canU(), h.canR(), h.L.length], [false, false, 1]);
h.o.onFix({ t0: 12, t1: 13, midi: 60 }); now += 2000; h.o.onFix({ t0: 12, t1: 13, midi: 62 }); now += 2000; h.o.onFixMany([{ t0: 1, t1: 2 }, { t0: 3, t1: 4 }]);
assert.strictEqual(h.S.length, 4, "세 번 고침 = 세 칸"); assert.ok(h.L[1].includes("0:12") && h.L[1].includes("N60") && h.L[3].includes("2음"), "이름표: 시각·음·개수");
// 0.5초 안에 이어진 호출(나누기가 두 번 저장하는 경우 등)은 한 칸
now += 100; h.o.onTime({ t0: 5 }); now += 100; h.o.onAdv(); assert.strictEqual(h.S.length, 4, "0.5초 안에 이어진 건 앞 칸에 합침"); assert.ok(h.L[3].includes("디테일"), "합친 칸 이름표는 마지막 고침");
// 되돌리기 → 다시하기 → 기록 창으로 점프
(async () => { assert.ok(await h.go(h.ptr - 1)); assert.deepStrictEqual(state, { v: 62 }, "한 단계 되돌림"); assert.ok(h.canR());
  assert.ok(await h.go(h.ptr + 1)); assert.deepStrictEqual(state, { v: "adv" }); assert.ok(await h.go(0)); assert.deepStrictEqual(state, { v: 0 }, "맨 처음으로 점프");
  // 되돌린 뒤 새로 고치면 뒤쪽(다시하기) 기록은 버림
  now += 5000; h.o.onFix({ t0: 1, t1: 2, midi: 70 }); assert.deepStrictEqual([h.S.length, h.canR()], [2, false], "새 고침 = 다시하기 기록 버림");
  // 같은 상태면 기록 안 함
  now += 5000; h.o.onFix({ t0: 1, t1: 2, midi: 70 }); assert.strictEqual(h.S.length, 2);
  // 코드 연결
  assert.ok(T.includes('data-ur="-1"') && T.includes('data-ur="1"') && T.includes("openHist();") && T.includes("}, 500); });"), "↶ ↷ + 길게 = 기록 창");
  assert.ok(T.includes('if (hist) o = hist.o;') && T.includes("typeof o.histGet === \"function\" && typeof o.histSet === \"function\""), "앱이 histGet/histSet을 줄 때만 켜짐");
  assert.ok(H.includes("const histGet = () => JSON.stringify({ fx: r.target_fixes") && H.includes("await applyAll(h.fx || [], h.te || [])") && H.includes("onFixMany, histGet, histSet, onTime"), "선생님 앱 연결");
  // (11/05 사용자) ↶ 원음|보정본 ↷ 한 줄 — 스위치는 붙은 채, 좌우에 버튼
  assert.ok(T.includes('row.className = "tfAbRow"') && T.includes("row.append(ub, abw, rb)"), "↶ [원음|보정본] ↷ 한 줄");
  // 높이만 바뀌어도 캔버스 그림 크기를 다시 맞춤(터치가 위로 어긋나던 버그)
  assert.ok(T.includes("el.width !== Math.round(w * r) || el.height !== Math.round(h * r)"), "캔버스 높이 변화도 다시 맞춤");
  // (11/05 사용자) 폰 세로 + 보정 모드 진입 시 가로 모드 안내 팝업
  assert.ok(T.includes("const landTip = ()") && T.includes("폰에선 가로 모드가 보정 시 더 편리할 수 있어요") && T.includes("if (v) { landTip(); st.dock && st.dock(); }") && T.includes("tune_land_tip_off"), "보정 진입 시 가로 모드 안내 + 다시 보지 않기");
  // (11/05 사용자) 가로 + 🎛 고급 창 = 오른쪽 전체 높이 패널(그래프가 얇은 띠로 눌리지 않게)
  assert.ok(T.includes(".tfBox:not(.port):has(.tfFix.inBot.tfUni){display:grid") && T.includes(".tfBox:not(.port) .tfFix.inBot.tfUni{grid-column:2;grid-row:2/4"), "가로 고급 창 = 오른쪽 패널");
  // (11/05 사용자 시안 승인) 보정 모드 = 탭 없는 한 창(음정·타이밍·고급) · 빈 곳·다른 음을 눌러도 안 닫힘 · 안 골랐을 때는 안내 창
  assert.ok(T.includes("const uni = !!(tOn && st.advOn && st.onAdv && G.TuneAdv && G.TuneAdv.panel)") && T.includes('d.classList.add("tfUni")') && T.includes('class="tfUniAdv"'), "한 창(tfUni)");
  assert.ok(T.includes('!st.advOn && wrap.querySelector(".tfFix") && sheetClose && sheetClose._fix'), "보정 모드는 빈 곳 톡으로 창을 안 닫음");
  assert.ok(T.includes("st.dock = () =>") && T.includes('"tfFix inBot tfUni tfDock"') && T.includes("if (st && st.dock) st.dock();"), "창이 닫히면 안내 창으로 다시 붙음");
  assert.ok(T.includes("G.TuneAdv.resetNote(st, cv, b)"), "↺ 원본 = 고급 고침도 같이");
  assert.ok(T.includes('d.className = "tfFix tfMulti" + (st.advOn ? " tfUni" : "")'), "여러 음 고르기 창도 같은 자리·크기(끌 때 그래프가 안 들썩임)");
  assert.ok(T.includes('<div class="rpPh" aria-hidden="true">') && T.includes("@keyframes rpTurn{") && T.includes("prefers-reduced-motion:reduce){#tuneFs .rpPh b"), "가로 모드 안내: 폰이 돌아가는 움직임");
  // (11/05 사용자) 소리 켬/끄기 없앰 → 볼륨 맨 아래 = 무음 · 새 떨림 시작·커지는 시간은 음 길이에 맞춤
  const A = fs.readFileSync(__dirname + "/../adv.js", "utf8");
  assert.ok(!A.includes('chips("소리"') && A.includes("const MUTE_DB = -25;") && A.includes('v <= MUTE_DB ? "무음"') && A.includes("n.mute = true; delete n.gain_db;"), "볼륨 맨 아래 = 무음");
  assert.ok(A.includes("delay: Math.min(0.3, r2(dur_ * 0.25))") && A.includes("fade: Math.min(0.4, r2(dur_ * 0.35))"), "짧은 음 새 떨림 기본값");
  // (11/05 사용자) 한 창 정리: 시간 표시 삭제 · ✂는 음정 줄 옆 · ↺(↶와 겹침) 대신 '원본' = 확인 창으로 이 음 전부 원본
  assert.ok(!T.includes('<span class="tfFixTm">${mm(b.t0)}~${mm(b.t1)}</span><span class="tfFixSt"></span><span class="tfUniIc">') && T.includes('class="tfOrgRow"') && T.includes('class="tfOrg" data-r') && T.includes("if (uni) askOrig(); else undo();"), "한 창: 시간 삭제 · 원본 버튼");
  console.log("undo-redo ok"); })().catch((e) => { console.error(e); process.exit(1); });

// 고급 흐름: 앞·뒤 기울기는 한 줄(advDuo)
{ const A = fs.readFileSync(__dirname + "/../adv.js", "utf8");
  assert.ok(A.includes("function duo(") && A.includes('"앞", "뒤"') && A.includes(".advDuo .advRow .advB{width:32px!important;min-width:0!important"), "기울기 한 줄"); }

// 세로 화면: 보정창 높이는 화면 높이에 맞춰 214~300px(그래프가 그만큼 줄어 창이 위로 올라옴)
assert.ok(T.includes("height:clamp(190px,36vh,260px)"), "보정창 높이 clamp");

// 보정 모드 한 줄: ▼ ◀ 음 ▶ ▲ ✂ 길− 길+ (타이밍 줄·'길이 그대로' 칸 없음)
assert.ok(T.includes('class="tfIc tfTm" data-tm="-1"') && T.includes('class="tfIc tfLen" data-tl="1"') && T.includes("tInfo = () =>"), "한 줄 편집");
