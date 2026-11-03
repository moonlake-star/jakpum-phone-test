// (11/02 15:48 사용자) 전체화면 건반(누르면 소리) + 멈춘 뒤 초록 정음 막대 톡 = 정음 고치기 → 요청에 target_fixes 저장 → 다시 만들기 때 서버가 그 음으로
const fs = require("fs"), assert = require("assert");
const tune = fs.readFileSync(__dirname + "/../tune.js", "utf8"), src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(tune.includes("function tone(m)") && tune.includes("st.kbDown = m; tone(m)") && tune.includes("if (d.kb) { toneOff();"), "건반 소리");
assert.ok(tune.includes("function fixSheet(") && tune.includes("typeof o.onFix === \"function\" && isPaused() && st.tbars"), "정음 고치기");
assert.ok(tune.includes("noteName,") && tune.includes("cv._fixes"), "고친 곳 표시");
assert.ok(src.includes("cv._fixes = (r.target_fixes || []).slice();") && src.includes("onFix, wave: () => mkTracks.mr?.buf") && src.includes('id="mkFixN"'));
// 같은 구간은 바꿔 끼움
const onFixBody = src.match(/const onFix = async \(f\) => \{ const cur = [^\n]*\n/)[0];
assert.ok(/filter\(x => !\(x\.t0 < f\.t1 && x\.t1 > f\.t0\)\)/.test(onFixBody) && onFixBody.includes("if (f.midi != null) cur.push(f)"));
console.log("target-fix ok");
assert.ok(tune.includes("data-cut") && tune.includes("fxOf(q[0]) === fxOf(p[0])"), "세로줄 자리에서 나누기 + 막대가 나눈 경계에서 끊김");
assert.ok(!tune.includes('aria-label="이 음 듣기">♪') && tune.includes('nb.addEventListener("pointerdown"'), "음 이름 누르는 동안 소리");
assert.ok(tune.includes("<small>← ${noteName(mO)}</small>") && tune.includes("white-space:nowrap"), "한 줄");
console.log("target-fix split ok");
assert.ok(tune.includes("function introDraw(") && tune.includes("function waveOf(") && !tune.includes("초 뒤 노래 시작") && !tune.includes("다가오는 멜로디 미리보기(오른쪽") && tune.includes('class="tfSkip"'), "전주 화면");
assert.ok(/#tuneFs \.tfMid\{position:absolute;left:50%;top:9%;width:48px/.test(tune), "일시정지 표시는 작게 위로(그래프 안 가림)");
assert.ok(src.includes("wave: () => mkTracks.mr?.buf"));
assert.ok(tune.includes("g.globalAlpha = Math.max(0, Math.min(1, (left - 0.4) / 2.6))"), "3초 전 페이드");
assert.ok(tune.includes("paint(); preview(); persist(); tone(m)") && tune.includes("st.sel = { t0: b.t0, t1: b.t1 }") && tune.includes("if (f && !f.cut)") && tune.includes('class="tfCut tfIc" data-cut'), "바로 저장·선택 표시·나눈 조각 테두리 없음·✂ 아이콘");
console.log("intro ok");
// (11/02 19:28·19:30 사용자 시안 승인) 고치기 창은 아래 이동 버튼·안내 자리에, 원음/보정본은 큰 스위치(B안) 그대로
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes('d.classList.add("inBot"); bot.appendChild(d);') && t.includes('if (gap > 0) d.style.minHeight = (d.offsetHeight + gap) + "px";'), "(11/03 02:02) 이동 버튼·안내 칸과 같은 높이");
  assert.ok(t.includes("#tuneFs:has(.tfFix) .tfNav,#tuneFs:has(.tfFix) .tfAbH,#tuneFs:has(.tfFix) .tfHint,#tuneFs:has(.tfFix) .tfNote"), "큰 스위치는 그대로, 이동 버튼·안내만 숨김");
  assert.ok(!t.includes("#tuneFs:has(.tfFix) .tfBot,"), "원음/보정본은 숨기지 않음");
  assert.ok(t.includes('<span class="tfAbL">듣는 소리</span>') && !t.includes("⇆ 톡 하면 바뀌어요") && t.includes('<i class="tfSwap" aria-hidden="true">⇄</i>') && t.includes('.tfAb:has([data-m="p"].on)::before{left:50%'), "미끄러지는 손잡이 스위치");
  assert.ok(t.includes('want = b.dataset.m === cur ? (cur === "o" ? "p" : "o") : b.dataset.m'), "켜진 쪽을 눌러도 바뀜");
  assert.ok(!t.includes('<span class="tfFixAb" role="group"') && t.includes('data-r aria-label="처음 음으로">↺</button>') && !t.includes('data-ok aria-label="닫기"') && t.includes('<span class="i">처음 음</span>'), "(11/03) 창 안 스위치·✓ 없음, 빈 곳 톡으로 닫기"); assert.ok(t.includes("if (!onBar) { sheetClose(); lastTap = 0; return; }") && t.includes("#tuneFs .tfTitle{display:none}"), "한 줄 버튼 + 이름표");
  assert.ok(t.includes("mO = ov.length ? Math.round(ov[ov.length >> 1] / 100) : m0") && t.includes("const f = { t0: T0, t1: T1, midi: isCut ? mO : null")); }
// (11/02 19:48 사용자) 고치기 창이 뜨면 고른 막대가 보이게 그래프를 옮김 · 확대 안 해도 위아래로 밀어 보기
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("st.sel = { t0: b.t0, t1: b.t1 }; st.focusC = b.c;") && t.includes("if (full && st.focusC != null)"), "창이 뜨면 고른 막대 쪽으로");
  assert.ok(t.includes("} else if (full && st.yo) { lo += st.yo; hi += st.yo; }") && t.includes("drag.yo + dB * per * (rot ? -1 : 1)"), "1배에서도 위아래 밀기");
  assert.ok(t.includes("st.yc = null; st.yo = 0; st.panAt = 0;"), "두 번 톡 = 원래대로"); }
// (11/02 20:26 사용자) '듣는 소리' 빼고 아래 버튼 높이 70% · 폰 뒤로 = 고치기 창만 닫기
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("#tuneFs .tfAbL{display:none}") && t.includes("#tuneFs .port .tfCtl .tfAb button{min-height:32px}#tuneFs .port .tfNav button{height:32px}"));
  assert.ok(!t.includes('<details class="tfHint">'), "사용법 문구는 그대로 보임");
  assert.ok(t.includes("if (!had && !sheetClose) try { history.pushState(") && t.includes("sheetClose = close_;"), "고치기 창도 뒤로 가기 기록 한 칸"); }
// (11/02 20:31 사용자) 재생을 눌렀는데 아직 소리가 안 나오면 '소리 불러오는 중' 표시
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("st.waitAt = performance.now()") && t.includes("<b>소리 불러오는 중…</b>") && t.includes('ppB.classList.contains("ld") ? "⏳"')); }
// (11/03 02:13 사용자) 앱 전체 button 최소 높이를 이기게 높이 고정: 닫기 28 · 스위치 46 · 재생 버튼 40
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("#tuneFs .port .tfXp{height:28px!important;min-height:0!important") && t.includes("#tuneFs .port .tfCtl .tfAb{height:46px") && t.includes("#tuneFs .port .tfNav button{min-height:0!important;height:40px!important}")); }
// (11/03 02:20 사용자) ✂ 늘 보이게(세로줄이 막대 밖이면 가운데에서 나눔) · 음 이름 길게 눌러도 진동 없게
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("canCut = atHead || b.t1 - b.t0 >= 0.3") && t.includes("const ts = +(atHead ? tNow : (b.t0 + b.t1) / 2).toFixed(2)"));
  assert.ok(t.includes('nb.addEventListener("touchstart", (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });')); }
// (11/03 02:54 사용자) 창을 빠져나올 때 '저장 중…' → '✓ 저장됨'
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("function fxSave(fn, f)") && t.includes("const close_ = (fromPop) => { core(); saveToast();") && t.includes('const done = () => { saveToast();') && t.includes('saveEl.textContent = "✓ 저장됨"'));
  assert.ok(!/[^.\w]onFix\(\{/.test(t.slice(t.indexOf("function fixSheet("), t.indexOf("function fixSheet(") + 6000)), "고치기 창의 저장은 전부 fxSave로"); }
// (11/03 08:14 사용자) 나누면 오른쪽 조각이 바로 골라진 채로
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("fixSheet(host, cv, { t0: ts, t1: T1, c: m * 100 }, onFix, getT, st); };")); }
// (11/03 08:39 사용자) 기준선 왼쪽 두 번 톡 = 5초 뒤로, 오른쪽 = 5초 앞으로
{ const t = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
  assert.ok(t.includes("const DT_JUMP = 2;") && t.includes("const j = le.x < hx ? -DT_JUMP : DT_JUMP") && t.includes("기준선 왼쪽·오른쪽 두 번 톡 = 2초 뒤로·앞으로")); }
