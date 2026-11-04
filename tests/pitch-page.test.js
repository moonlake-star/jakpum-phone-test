// 음정 연습 페이지(pitch/index.html): 공개 저장소 안전 규칙 + 핵심 계산이 깨지지 않았는지
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
// 1) 외부로 나가는 코드 없음(스크립트·이미지·통신) — 데이터는 이 폰의 localStorage에만
assert.ok(!/<script[^>]+src=/i.test(src), "외부 스크립트 금지");
assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(src), "네트워크 전송 금지");
assert.ok(/name="robots" content="noindex"/.test(src), "검색 노출 금지");
// 2) 공개 저장소: 데모 이름은 가명만
for (const real of ["김하늘", "정우진", "최예린", "한도윤", "송지아", "이서연", "박민준"]) assert.ok(!src.includes(real), "실명 의심: " + real);
// 3) 스크립트 문법
const js = src.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(js);
// 4) 핵심 함수 존재(마이크·피치·코스·비브라토)
for (const k of ["getUserMedia", "function yin(", "function genLine(", "function vibTick(", "function stopSession("]) assert.ok(js.includes(k), "누락: " + k);
// 5) 코스 라인 생성: 같은 씨앗이면 같은 라인, 난이도·스테이지마다 음이 있고 음역이 합리적
const body = js.slice(js.indexOf("const LM ="), js.indexOf("/* ============ course state + UI"));
const prelude = "const CFG={sc:{}};const saveCfg=()=>{};const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const mod=(a,n)=>((a%n)+n)%n;" + js.match(/function rng\(seed\)[^\n]*\n/)[0] +
  js.match(/const DF = \{[\s\S]*?\n\};\n/)[0];
const genLine = new Function(prelude + body + "\nreturn genLine;")();
for (const diff of ["normal"]) for (const st of [0, 1, 2]) for (const seed of [11, 23, 37, 4242]) {
  const a = genLine(st, seed, diff, 55), b = genLine(st, seed, diff, 55);
  assert.deepStrictEqual(a.notes, b.notes, "같은 씨앗 → 같은 라인");
  assert.ok(a.notes.length >= 3, "음 개수");
  assert.ok(a.minM >= 36 && a.maxM <= 84, `음역 ${diff} s${st} ${seed}: ${a.minM}-${a.maxM}`);
  for (let i = 1; i < a.notes.length; i++) assert.ok(a.notes[i].t0 >= a.notes[i - 1].t0 + a.notes[i - 1].d - 1e-9, "음이 겹치지 않음");
}

// 6) 발성 스케일(믹스보이스): 성별·스케일·난이도 조합마다 겹치지 않고, 음역이 코스 레인(28음) 안이며, 같은 설정이면 같은 라인
const genScale = new Function(prelude + body + "\nreturn genScaleLine;")();
for (const g of ["m", "f"]) for (const k of ["five", "tri", "arp"]) for (const off of [-4, 0, 4]) for (const diff of ["normal"]) {
  const a = genScale({ g, k, off }, diff), b = genScale({ g, k, off }, diff);
  assert.deepStrictEqual(a.notes, b.notes, "스케일: 같은 설정 → 같은 라인");
  assert.ok(a.reps >= 1 && a.end < 330, `스케일 길이 ${g}${k}${off}${diff}`);
  assert.ok(a.maxM - a.minM <= 26, `스케일 음역 ${g}${k}${off}${diff}: ${a.maxM - a.minM}`);
  for (let i = 1; i < a.notes.length; i++) assert.ok(a.notes[i].t0 >= a.notes[i - 1].t0 + a.notes[i - 1].d - 1e-9, "스케일: 음이 겹치지 않음");
  assert.ok(a.notes.every(n => n.m >= 36 && n.m <= 84), "스케일: 음역 범위");
}
assert.ok(js.includes("id=\"v-scale\"") || src.includes('id="v-scale"'), "발성 탭 화면 누락");
console.log("pitch-page ok");

// 연습(기록 안 됨) / 기록 도전(기록됨) 구분, 옥타브 버튼 제거(자동 스크롤), 미리 듣기·새 라인 버튼 제거
{
  assert.ok(src.includes('id="startBtn" class="cta">기록 도전<') && src.includes("'연습'") && src.includes("'도전'") && src.includes('<span class="ic">▶</span>'), "연습/기록 도전 버튼");
  assert.ok(!src.includes("'오늘 연습 시작'") && !src.includes('연습 끝내기"를'), "옛 문구 제거");
  assert.ok(src.includes("C.warm = !P.running") && src.includes("!c.warm && stars === 3"), "연습은 기록·새 라인 갱신 안 함");
  assert.ok(!src.includes('id="octUp"') && !src.includes('id="octDn"') && src.includes("function courseFollow("), "옥타브 버튼 제거 + 자동 스크롤");
  console.log("pitch-page: 연습/기록 도전 ok");
}

// 난이도는 한 가지(쉬움/어려움 선택 제거). 예전 기록(diff:'easy')이 남아 있어도 화면이 깨지지 않아야 함
{
  assert.ok(!src.includes('id="segDiff"') && !src.includes('id="cDiff"') && !src.includes("name: '쉬움'") && !src.includes("name: '어려움'"), "난이도 선택 제거");
  assert.ok(!/DF\[c\.diff\]/.test(src) && src.includes("CFG.diff = 'normal'"), "옛 난이도 기록 대응");
  console.log("pitch-page: 난이도 단일화 ok");
}

// 설정 단순화: 안내음 항상 켬 · 비브라토 항상 열림 · 코스 음역은 남/여만 · 주변 소리 자동 맞춤
{
  for (const id of ["segGuide", "segVib", "segRange"]) assert.ok(!src.includes('id="' + id + '"'), id + " 제거");
  assert.ok(src.includes("function vibUnlocked() { return true; }") && src.includes("CFG.guide = 'on'"), "안내음·비브라토 고정");
  assert.ok(src.includes("const VOICE_RC = { m: 55, f: 62 }") && src.includes('id="segVoice"') && src.includes("function askVoice()") && !src.includes('id="cVoice"'), "남/여는 첫 진입 팝업 + 설정에서만 선택");
  assert.ok(src.includes("function startCal()") && src.includes("Math.min(want, .04)") && src.includes("Math.max(P.sens, P.gate)"), "주변 소리 자동 맞춤");
  assert.equal((src.match(/<div/g) || []).length, (src.match(/<\/div>/g) || []).length, "div 짝 안 맞음(설정 패널 깨짐 방지)");
  console.log("pitch-page: 설정 단순화·소음 맞춤 ok");
}

// 모드 버튼(자유/코스/비브라토)은 캔버스 밖 가운데에 크게, 비브라토는 폭 4단계(반음~4반음)
{
  assert.ok(src.indexOf('id="cbar"') < src.indexOf('id="stage"') && src.includes('class="seg big" id="segMode"') && src.includes('id="segVW"'), "모드 바 위치/폭 선택");
  const lv = new Function("const CFG={};" + js.match(/const VLV = \{[\s\S]*?\n\};/)[0] + "return VLV;")();
  assert.deepStrictEqual(Object.keys(lv), ["1", "2", "3", "4"]); assert.deepStrictEqual(Object.values(lv).map(v => v.name), ["반음", "2반음", "3반음", "4반음"]);
  Object.values(lv).forEach((v, i, a) => { assert.ok(v.ext[0] < v.ext[1] && v.rate[0] < v.rate[1] && v.ext[1] < v.max, "폭 단계 범위 " + v.name); if (i) { assert.ok(v.ext[0] > a[i - 1].ext[0] && v.rate[1] <= a[i - 1].rate[1], "단계가 커질수록 폭↑ 속도↓: " + v.name); } });
  console.log("pitch-page: 비브라토 폭 단계·모드 바 ok");
}

// 화면 정리: 코스 시작 카드는 버튼 중심(설명·중복 안내 문구 없음), 안내는 상단 한 줄에만
{
  assert.ok(!src.includes("별 3개면 새 라인</div>") && !src.includes('지금은 목풀기 · 기록되지 않아요'), "카드 안 중복 문구 제거");
  assert.ok(src.includes("const HINT_MON = \"연습 중"), "하단 안내 한 줄");
  console.log("pitch-page: 화면 정리·성별 팝업 ok");
}

// 성별 선택 직후 자유 화면 + 한 개의 팝업('주변 소리 확인 중' → '소리를 내 보세요')
{
  assert.ok(src.includes("setMode('free'); voiceChanged(); sayHello();") && src.includes("function micPop(") && src.includes("🎤 소리를 내 보세요"), "성별 선택 후 자유 화면 + 안내 팝업");
  assert.ok(!/toast\('주변/.test(src), "주변 소리 안내는 팝업 하나로 통합");
  console.log("pitch-page: 첫 진입 안내 팝업 ok");
}

// 음 검출 안정화(옥타브 튐 방지) · 그래프 둔감화 · 상하 드래그 스크롤 · 프리뷰 구간 색
{
  assert.ok(src.includes("function octFix(") && src.includes("m = octFix(m, now);") && src.includes("OCT_MS = 320"), "옥타브 점프 필터");
  assert.ok(src.includes("function calm(") && src.includes("sm = calm(sm, now, dt)"), "표시 피치 완화");
  assert.ok(src.includes("const canScroll =") && src.includes("SCR.id == null && now > SCR.hold"), "드래그 스크롤 + 자동 따라가기 보류");
  assert.ok(src.includes("function pvOf(") && src.includes("rgba(176,150,255"), "프리뷰 구간 색");
  assert.ok(src.includes("function clearDemo()") && src.includes('id="demoClr"'), "샘플 기록 지우기 버튼");
  // 옥타브 필터 동작(순수 함수만 잘라서 확인)
  const f = src.slice(src.indexOf("const OCT ="), src.indexOf("function octReset()"));
  const mk = () => new Function(f + "; return octFix;")();
  let octFix = mk(), t = 0, out = [];
  for (let i = 0; i < 20; i++) out.push(octFix(45, t += 16));
  for (let i = 0; i < 12; i++) out.push(octFix(57, t += 16));       // 약 0.2초 옥타브 튐 → 원래 옥타브로 접힘
  for (let i = 0; i < 6; i++) out.push(octFix(45, t += 16));
  assert.ok(out.filter(v => v != null).every(v => Math.abs(v - 45) < .5), "0.3초 미만 옥타브 튐은 접힘");
  let last; for (let i = 0; i < 30; i++) last = octFix(57, t += 16);   // 0.3초 넘게 지속되면 실제 이동
  assert.ok(Math.abs(last - 57) < .01, "지속되는 옥타브 이동은 인정");
  octFix = mk(); t = 0; const on = [octFix(57, t += 16), octFix(45, t += 16), octFix(45, t += 16)];   // 온셋 첫 프레임 오검출은 버림
  assert.ok(on[0] === null && on[1] === null && Math.abs(on[2] - 45) < .01, "온셋은 두 프레임이 맞아야 시작");
  console.log("pitch-page: 음 검출 안정화·스크롤 ok");
}

// 발성 탭 다이어트: 스케일 고르기 → 회차 차트 → (접힌) 시작음·브릿지 구간 → 고정된 시작 버튼
{
  assert.ok(src.includes('class="goBar"') && src.includes("position:sticky;bottom:-14px") && src.includes('<details id="scAdv"'), "발성 탭 시작 버튼 고정 + 고급 설정 접기");
  assert.ok(!src.includes('id="scG"') && !src.includes("<h2>발성 스케일</h2>"), "발성 탭 중복 성별 카드·제목 제거");
  console.log("pitch-page: 발성 탭 다이어트 ok");
}

// 피아노 음색(저음 보강·컴프레서) + 발성 스케일: 사이클 전 도미솔 코드, 음마다 피아노 안내
{
  assert.ok(src.includes("function pianoVoice(") && src.includes("createPeriodicWave") && src.includes("createDynamicsCompressor"), "피아노 음색 + 컴프레서");
  assert.ok(!src.includes("o.type = 'sine'; o.frequency.value = mFreq(m)"), "사인파 안내음 제거");
  assert.ok(src.includes("function guideChord(") && src.includes("[0, 4, 7].forEach(d => pianoVoice("), "도미솔 코드");
  assert.ok(src.includes("if (n.pre) { guideChord(n.m, .48); n.mute = P.earphone ? 0 : Math.max(0, .6 - n.pre); if (P.earphone) guideTone(n.m, n.d, n.pre, true); return; }") && src.includes("if (P.earphone) guideTone(n.m, n.d, 0, true);"), "스케일: 회차 첫머리 코드 1회, 이어폰이면 음마다 피아노");
  console.log("pitch-page: 피아노 음색·스케일 안내 ok");
}

// 코스 모드: 연습 버튼은 레인 중앙의 동그란 버튼, '전환 구간' → '브릿지 구간'
{
  assert.ok(src.includes("#cOv.mid{left:0;right:0;") && src.includes("el.classList.add('mid')") && src.includes("border-radius:50%"), "연습 버튼: 화면 가로 중앙 원형");
  assert.ok(src.includes("브릿지 구간") && !src.includes("전환 구간"), "전환 구간 → 브릿지 구간");
  console.log("pitch-page: 중앙 원형 연습 버튼·브릿지 용어 ok");
}

// 영상 박자 스케일(코드 1회 → 0.465초 간격 1-3-5-8-8-8-8-5-3-1 → 약 5.6초마다 +1반음) + 스케일 전용 화면
{
  assert.ok(src.includes("const SC_PRE = .53, SC_STEP = .465, SC_LAST = .8, SC_NEXT = .885;"), "영상 박자 상수");
  assert.ok(src.includes("iv: [0, 4, 7, 12, 12, 12, 12, 7, 4, 0]") && src.includes("? o.k : 'arp'"), "기본 스케일 = 아르페지오(영상)");
  assert.ok(src.includes("n.gr != null ? n.gr : D().grace"), "음별 여유 시간");
  assert.ok(src.includes("#v-practice.scaleView #segMode") && src.includes("id=\"scHead\"") && src.includes("classList.toggle('scaleView', sv)"), "스케일 전용 화면");
  assert.ok(src.includes("b.dataset.t === 'practice' && cur !== 'practice' && C.stage === 3"), "연습 탭은 일반 화면으로");
  console.log("pitch-page: 영상 박자 스케일·전용 화면 ok");
}

// 비브라토 예시(도-레), 코스 일시정지, 3초 단위 유지 성공 + 피아노 안내
{
  assert.ok(src.includes("function renderVwEx(") && src.includes('id="vwEx"') && src.includes("const SOLFA"), "비브라토 두 음 예시");
  assert.ok(src.includes("function setPause(") && src.includes('id="pauseOv"') && src.includes("PTAP"), "코스 일시정지");
  assert.ok(src.includes("const MILE = [3, 6, 9, 12, 15, 18, 21];") && src.includes("const thrAt = i => 3 * (i + 1);") && src.includes("HOLD_KEYS"), "3초 단위 성공 시간");
  console.log("pitch-page: 비브라토 예시·일시정지·3초 단위 ok");
}
