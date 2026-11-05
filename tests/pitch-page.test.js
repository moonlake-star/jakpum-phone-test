// 발성 연습 페이지(pitch/index.html): 공개 저장소 안전 규칙 + 핵심 계산이 깨지지 않았는지
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
// 1) 외부로 나가는 코드 없음(스크립트·이미지·통신) — 데이터는 이 폰의 localStorage에만
assert.ok(!/<script[^>]+src=/i.test(src), "외부 스크립트 금지");
assert.ok(!/XMLHttpRequest|sendBeacon|WebSocket|createMediaStreamDestination/.test(src), "다른 전송 방식 금지");
// 녹음은 '기록 도전'만, 폰 안에만 쌓고 사용자가 고른 것만 제출(자동 전송 없음)
assert.ok(src.includes("MediaRecorder") && src.includes("function recSubmit(") && src.includes("pitch_rec_put") && src.includes("openModal(`<h3 style=\"margin-top:0\">선생님께 녹음을 제출할까요?"), "녹음 제출은 확인 팝업 뒤에만");
// 네트워크 전송은 '수강생 앱에서 연 내 계정 모드'의 날짜별 요약 한 곳뿐
assert.strictEqual((src.match(/\bfetch\(/g) || []).length, 2, "fetch는 요약 전송·녹음 제출 두 곳만");
assert.ok(src.includes("fetch(PORTAL_URL, { method: 'POST'") && src.includes("action: 'pitch_save'") && src.includes("if (!SN || P.syncing) return;"), "요약 전송은 내 계정 모드에서만");
assert.ok(src.includes("const PORTAL_URL = 'https://script.google.com/macros/s/") && require("fs").readFileSync(__dirname + "/../student/index.html", "utf8").includes(src.match(/const PORTAL_URL = '([^']+)'/)[1]), "전송 주소는 수강생 앱과 같은 노트 서버");
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
  assert.ok(src.includes("setMode('free'); voiceChanged(); sayHello();") && src.includes("function micPop("), "성별 선택 후 자유 화면 + 안내 팝업");
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
  assert.ok(src.includes("const PING = .14, PING_MUTE = .2;") && src.includes("guideTone(n.m, pd, n.pre, true, true, .9); P.toneUntil = Math.max(P.toneUntil, now0 + (n.pre + PING_MUTE) * 1000); n.mute = PING_MUTE; return; }") && src.includes("guideTone(n.m, pd, 0, true, true, .9); n.mute = 0; return;") && !src.includes("if (P.earphone) guideTone(n.m, n.d, 0, true);"), "스케일: 코드 1회 + 음마다 짧은 피아노(스피커). 이어폰이면 막대 길이만큼 이어짐(11/05 사용자 승인), 스피커 구간은 마이크·점수 제외");
  assert.ok(src.includes("const COUNT_IN = 1.5;") && src.includes("C.t = loop === true ? -.8 : -COUNT_IN;"), "시작 대기 1.5초");
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
  assert.ok(src.includes("iv: [0, 4, 7, 12, 12, 12, 12, 7, 4, 0]") && src.includes("? o.k : 'tri'"), "기본 스케일 = 3음(11/05 사용자)");
  assert.ok(src.includes("n.gr != null ? n.gr : D().grace") && src.includes("Math.max(n.gr != null ? .12 : .25"), "음별 여유 시간");
  assert.ok(src.includes("#v-practice.scaleView #segMode{order:-1}") && src.includes("id=\"scHead\"") && src.includes("classList.toggle('scaleView', sv)"), "스케일 전용 화면");
  assert.ok(src.includes('<button data-v="free">자유</button><button data-v="course">코스</button><button data-v="vib">비브라토</button><button data-v="scale">발성</button>') && src.includes("const scv = v === 'scale'; if (scv) v = 'course';") && src.includes("student: [['practice','연습'],['progress','기록']") && !src.includes("['scale','발성']") && src.includes("b.onclick = () => go(b.dataset.t)"), "발성은 자유·코스·비브라토·발성 줄 맨 오른쪽 버튼(하단 발성 탭은 삭제, 하단 탭 이름 연습)");
  console.log("pitch-page: 영상 박자 스케일·전용 화면 ok");
}

// 비브라토 예시(도-레), 코스 일시정지, 3초 단위 유지 성공 + 피아노 안내
{
  assert.ok(src.includes("function renderVwEx(") && src.includes('id="vwEx"') && src.includes("const SOLFA") && src.includes(".vm .meter,.vm #note{display:none}") && src.includes("el.hidden = true") && !src.includes("// top-left holds the 기준음 button") && src.includes("g2.fillText(midiName(nn), L / 2, by + 1)") && src.includes("if (C.mode === 'vib' || voMode()) P.hist.length = 0; else P.hist.push(") && src.includes("vibReset(); P.hist.length = 0;") && src.includes("const VIB_LW = 40") && src.includes("p.x <= lw()"), "비브라토: 안내줄·스피커·눈금 숫자·위 미터 삭제, 음 이름은 그래프 왼쪽 칸, 폭 넓어도 기준음에서 시작하면 하단 기준");
  assert.ok(src.includes("function setPause(") && src.includes('id="pauseOv"') && src.includes("PTAP"), "코스 일시정지");
  assert.ok(src.includes("const MILE = [3, 6, 9, 12, 15, 18, 21];") && src.includes("const thrAt = i => 3 * (i + 1);") && src.includes("HOLD_KEYS"), "3초 단위 성공 시간");
  console.log("pitch-page: 비브라토 예시·일시정지·3초 단위 ok");
}

// 수강생 앱 연결: ?from=student + 로그인 기록 → 내 계정 모드(샘플 없음·별도 저장소·요약만 전송)
{
  assert.ok(src.includes("FROM_STUDENT = new URLSearchParams(location.search).get('from') === 'student', SN = FROM_STUDENT ? snToken() : null"), "내 계정 모드 조건");
  assert.ok(src.includes("const KEY = SN ? 'vn_pitch_me' : TM ? 'vn_pitch_teacher' : 'vn_pitch_v1';"), "별도 저장소");
  assert.ok(src.includes("if (FROM_STUDENT && !SN) {") && src.includes("먼저 내 노트에서 로그인해 주세요"), "로그인 안 됐으면 안내");
  assert.ok(src.includes("users: [{ id: 'me', name: SN.name || '나', role: 'student' }]") && src.includes("else if (!DB || !DB.users || !user(DB.me)) seedDemo();"), "샘플 없이 본인 한 명");
  assert.ok(src.includes("'← 내 노트'") && src.includes("location.href = '../student/'"), "내 노트로 돌아가기");
  assert.ok(src.includes("function snNotice()") && src.includes("미션 제출\\'로 담당 강사님에게 제출이 가능해요") && !src.includes("연습 기록은 선생님께 전달돼요"), "처음 한 번 안내");
  assert.ok(src.includes("function pitchSum(day)") && src.includes("co: co.slice(-30)") && !/body: JSON\.stringify\(\{ action: 'pitch_save'[^}]*(audio|wav|pcm)/i.test(src), "날짜별 숫자 요약만");
  assert.ok(src.includes("DB.sync = DB.sync || []") && src.includes("q.splice(q.indexOf(day), 1)"), "실패하면 큐에 남겨 다시 시도");
  console.log("pitch-page: 수강생 앱 연결(내 계정 모드) ok");
  // (11/05) 비브라토 기준음 '따당' · 기록 도전 랜덤 기준음 · 주변 소리 확인 1번
  assert.ok(src.includes("pianoVoice(ctx, mFreq(r + w), t0 + .55"), "기준음 → 폭만큼 위 음을 차례로");
  assert.ok(src.includes("if (v === 'vib') vibEnter();") && src.includes("if (C.mode === 'vib') vibEnter(); }") && src.includes("if (w === CFG.vw) { vibCue(); return; }") && src.includes("renderCourseUI(); vibCue(); }"), "처음 들어올 때·폭 버튼 누를 때 들려줌");
  assert.ok(src.includes("V.silMs >= 1600 && P.mon") && src.includes("V.voicedMs >= 1000"), "숨 쉬려고 멈추면 기준음 다시");
  assert.ok(src.includes("if (C.mode === 'vib') { vibPickRoot(); vibCue(); }") && src.includes("const vibRange = () => { const rc = VOICE_RC[vibVoiceG()]; return [rc - 7, rc + 2]; }"), "기록 도전은 성별 음역 안에서 랜덤");
  assert.ok(src.includes("if (!P.calOnce) { P.calOnce = true; startCal(); }") && src.includes("if (now - c.t0 >= 750) finishCal();"), "주변 소리 확인은 창을 열 때 한 번, 시간 절반");
  console.log("pitch-page: 비브라토 기준음·마이크 확인 1회 ok");
}

// (11/05 사용자) 스케일 버튼 순서 3음→5음→아르페지오 / 속도 기본 70% + −＋ / 연습 화면에서 스케일 바로 바꾸기 / 탭·⏸ 일시정지
{
  const fs = require("fs"), assert = require("assert"), src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  const ks = [...src.slice(src.indexOf("const SCALES = ["), src.indexOf("STAGES.push(['발성 스케일'")).matchAll(/k: '(\w+)'/g)].map(m => m[1]);
  assert.deepStrictEqual(ks, ["tri", "five", "arp"], "스케일 버튼 순서");
  assert.ok(src.includes("(isFinite(v) && v > 0 ? v : .55)") && src.includes("SPD_MIN = .4, SPD_MAX = 1.2") && src.includes("F = 1 / spdNow()"), "속도 기본 55%(70%의 80%), 40~120%, 음 길이·간격에 반영");
  assert.ok(src.includes("function qkHtml()") && src.includes("L.scale ? qkHtml() : ''") && src.includes("id=\"pqk\""), "일시정지 화면엔 스케일·속도 UI(대기 화면은 위쪽 버튼으로 옮김)");
  assert.ok(src.includes('id="pauseBtn"') && src.includes("performance.now() - (P.pauseAt || 0) < 600"), "⏸ 버튼 + 탭 직후 click 으로 곧바로 풀리지 않게");
  console.log("pitch-page: 속도·스케일 빠른 전환·일시정지 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes("function refStep(now, rms)") && src.includes("comp.connect(ra); P.refAn = ra") && src.includes("ec.on && (ec.E === Infinity || rms <= ec.E * ECHO_X + ECHO_ADD)") && src.includes("P.chordM = { t:"), "피아노 출력을 재서 스피커→마이크 되돌림은 목소리로 치지 않기(코드 때 비율 k 학습)");
  assert.ok(src.includes("pop: [[988, 0], [1480, .075]]") && src.includes("sfx('pop', true)") && src.includes("if (P.rep) {") && src.includes("if (repOpen()) return;"), "리포트 화면: 비브라토 뾰롱, 뒤 화면 정지, 기준음 차단");
  console.log("pitch-page: 피아노 되돌림 분리·리포트 화면 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes("본인이 편한 음정으로<br>자유롭게 시작해 보아요") && src.includes("function freeHint()") && src.includes("CFG.freeHint = 1") && src.includes("if (v === 'free') setTimeout(freeHint, 0)"), "자유 연습 처음 들어가면 안내 팝업(한 번)");
  assert.ok(src.includes("C.mode === 'free' && P.hd.note != null && P.lastM != null") && src.includes("guideTone(gm, .45, 0, false, P.k != null)") && src.includes("now < P.toneUntil || P.echoNow"), "3초 성공 피아노 음이 나도 목소리 선이 끊기지 않게");
  console.log("pitch-page: 자유 연습 안내·선 이어짐 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes("yin(P.buf, sr, vbm ? .24 : .22)") && src.includes("yin(P.buf, sr, .38)") && src.includes("r.clarity > (vbm ? .68 : .55)"), "기식음 섞인 목소리: 기본 기준을 넓히고, 방금 잡히던 음 근처(±150센트)면 더 후하게");
  console.log("pitch-page: 기식음 후하게 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes("else calDone(null);") && !src.includes("주변이 조용해요 · 준비됐어요") && !src.includes("주변 소리를 확인하고 있어요") && src.includes("function calDone(status, ms) { if (status && ms > 2000) toast(status, ms); }"), "주변 소리 확인 팝업 없이 속으로만 측정(아주 시끄러울 때만 작은 알림)");
  console.log("pitch-page: 준비됐어요 창 없음 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes("const SLOW_LO = .2, SLOW_Q = .5, SLOW_WIN = 1900, ULTRA_WIN = 3400, CRAWL_WIN = 5200, LONG_WIN = 9000;") && src.includes("V.slow = slowOk;") && src.includes("okslow: '궤적 좋아요 · 조금 더 빠르게 도전!'") && src.includes("Math.min(RW.lo, SLOW_LO)"), "느려도 궤적이 깨끗하면 성공 인정(+ 더 빠르게 안내)");
  console.log("pitch-page: 느린 비브라토 인정 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes('id="vLad"') && src.includes("const VST_N = 5, VST_NEED = 3;") && src.includes("if (V.streak % 5 === 0) vibPass(V.rate);") && src.includes("function vibPass(rate)"), "속도 사다리: 5연속 3번이면 다음 칸");
  assert.ok(src.includes("const vibFrac = () => vibGuideOn() ? .5 : .8;") && src.includes("가이드 사인파") && src.includes("function vibBeat()") && src.includes('id="vgT"') && src.includes('id="vgB"'), "가이드 사인파(앞날 공간) + 켜기/끄기·−/＋·박자 버튼");
  console.log("pitch-page: 속도 사다리·가이드 사인파 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(!src.includes("function waitVoice()") && src.includes("let wvT0 = 0, wvShown = false, wvDone = false;") && src.includes("now - wvT0 > 3000") && src.includes("const done = () => d.remove();"), "(11/05) 팝업을 모두 닫고 3초 소리가 없을 때만 '소리를 내 보세요'(겹치지 않음)");
  console.log("pitch-page: 소리 안 내면 안내 ok");
}
{
  const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
  assert.ok(src.includes("lo = SLOW_LO, hi = R.rate[1]") && src.includes("B.e(S.cur) * 1.12") && src.includes("vibAnalyze(ULTRA_WIN)") && src.includes("vibAnalyze(SLOW_WIN)") && src.includes("for (let f = .15; f <= 20.001; f += .125)") && src.includes("CFG.vstv !== 3"), "가이드는 아주 느린(2Hz대)부터 시작, 느린 비브라토는 긴 창으로 인식");
  assert.ok(src.includes("function vibGuideStep(now)") && src.includes("tgt = clamp(mir, B.lo, B.hi);") && src.includes("function vibQuick(now)") && src.includes("V.qS < 1.5") && src.includes("V.rate != null || V.qS != null") && src.includes("clamp(tgt - V.gRate, -.06, .06)") && src.includes("createLinearGradient(nowX, 0, W, 0)") && !src.includes("지나간 가이드는 옅게"), "가이드는 지금 내 목소리 주기와 똑같이 따라가고(느린 흔들림은 봉우리 간격 어림 포함), 앞쪽 선은 옅어지는 실선 하나");
  console.log("pitch-page: 가이드 자동 속도·차분한 선 ok");
  assert.ok(src.includes("const pps = (W - L) * V.ppsF") && src.includes("clamp(.2 * (vibGuideOn() ? vibGuideRate()") && src.includes("소리를 기다리는 중: 깜빡이는 마이크 아이콘") && src.includes("sw = clamp(.22 / Math.max(fS, .3), .04, .6)") && src.includes("g2.quadraticCurveTo"), "느린 가이드는 그래프도 천천히 흐름, 대기 중 깜빡이는 마이크, 느릴수록 선을 부드럽게");
  console.log("pitch-page: 느린 시작·대기 아이콘·부드러운 선 ok");
  assert.ok(src.includes("소리 내기 전에도 도전할 가이드 파형은 옅게 계속 보여요"), "소리 내기 전에도 가이드 파형이 옅게 보임");
  assert.ok(src.includes("const ctx = actx(), out = pianoOut(ctx), rate = vibGuideRate(), n = 8,") && src.includes("btn.classList.add(i % 4 ? 'bp' : 'bp1')") && src.includes("@keyframes bpop1") && src.includes("<small>연습 천재</small>"), "박자 버튼: 2마디(8박), 박마다 버튼 튕김, 이름은 연습 천재");
  console.log("pitch-page: 박자 8박·발성 연습 ok");
  assert.ok(src.includes("vibGuideOn() ? .5 : .8") && src.includes("my = cy + 6") && src.includes("(V.gA == null ? .75 : V.gA)"), "지금 선은 가운데, 대기 중 가이드는 또렷하게, 마이크 아이콘은 아래쪽");
  assert.ok(src.includes("function renderScBar()") && src.includes("function scIcon(S)") && src.includes("if (scv) C.stage = 3;") && !src.includes('id="scBack"') && !src.includes("${qkHtml()}`;\n    el.querySelector('#cGo').onclick = startStage; qkWire"), "발성 버튼은 바로 스케일 연습 화면, 스케일·속도는 위쪽 버튼(음 모양 막대 아이콘)");
  console.log("pitch-page: 발성 탭 바로 진입·위쪽 버튼 ok");
  assert.ok(src.includes(".vstreak{height:34px;box-sizing:border-box}") && src.includes("-webkit-line-clamp:2"), "안내 한 줄이 두 줄로 바뀌어도 화면이 흔들리지 않게 높이 고정");
  assert.ok(src.includes("vibAnalyze(LONG_WIN)") && src.includes("const bw = rate < .6 ? .15") && src.includes("student: [['practice','연습'],['progress','기록']"), "초보자 시작 약 0.22Hz(9초 창) + 하단 탭 이름 연습(발성은 연습 화면 버튼으로 이동)");
  assert.ok(src.includes("function vibFit(now, f)") && src.includes("const fit = vibFit(now, f)") && src.includes("V.anch = Math.abs(mean - fold) <= CFG.vw / 2 + 1.5") && src.includes("const anc = vibRoot() + CFG.vw / 2"), "가이드 파형은 내 파형에 최소제곱으로 맞춰 이어지고, 가운데 점선은 기준음~위 음의 한가운데(아래 기준음에서 시작)");
  assert.ok(src.includes("연습 중에도 계속: 소리가 안 잡힌 조용한 순간들의 크기") && src.includes("P.gate = clamp(want, (P.gate || 0) * .75, Math.max((P.gate || 0) * 1.25, .004))"), "배경 소음 기준을 연습 중에도 천천히 갱신");
}

/* (11/05 사용자) 스케일 연습: 피아노는 시작 신호 — 막대 차오름·끝 표시, 이어폰이면 막대 길이만큼 피아노, 짧게만 부르면 안내, 이어폰 권장 팝업 */
{
  const fs = require('fs'), path = require('path'), assert2 = require('assert');
  const src2 = fs.readFileSync(path.join(__dirname, '..', 'pitch', 'index.html'), 'utf8');
  assert2.ok(src2.includes("const pd = n.d + .08;") && src2.includes("guideTone(n.m, pd, 0, true, true, .9); n.mute = 0; return;") && src2.includes("vol: vol || (keepMic ? .4 : .6)"), "발성 피아노는 더 크게(.9), 음 사이를 이어서(레가토)");
  assert2.ok(src2.includes("rr(x0, y, ex - x0, h, 5)") && src2.includes("rgba(255,255,255,.95)' : 'rgba(255,255,255,.5)'; g2.fillRect(x0 + w - 3"), "막대가 시간 따라 차오르고 끝 표시가 있어요");
  assert2.ok(src2.includes("n.vm < n.d * .5 && ratio < .6") && src2.includes("P.shortRun >= 3") && src2.includes("피아노는 시작 신호예요. 막대 끝까지 이어서 불러 보세요"), "짧게만 부르는 판이 3번 이어지면 안내");
  assert2.ok(!src2.includes("function scaleEarTip()") && !src2.includes("setTimeout(scaleEarTip") && !src2.includes("이어폰 착용을 권장합니다"), "발성 진입 시 이어폰 권장 팝업 없음(11/05 사용자 삭제)");
}

/* (11/05 사용자) 발성 = 시간만 기록: 점수·기록 도전·결과 화면·목소리 그래프 없음, 소리 감지 큰 아이콘 */
{
  const fs = require('fs'), path = require('path'), assert3 = require('assert');
  const src3 = fs.readFileSync(path.join(__dirname, '..', 'pitch', 'index.html'), 'utf8');
  assert3.ok(src3.includes('id="voAlive"') && src3.includes('id="voSt"') && src3.includes('id="voTm"') && src3.includes("#v-practice.scaleView #voAlive{display:flex}"), "소리 감지 큰 아이콘 + 이번/오늘 시간");
  assert3.ok(src3.includes("const voMode = () => C.mode === 'course' && C.stage === 3;") && src3.includes("function voStep(") && src3.includes("function voFlush(") && src3.includes("vocal: 1"), "발성 시간 기록(소리 낸 시간만, 세션에 vocal 표시)");
  assert3.ok(src3.includes("const h = voMode() ? [] : P.hist;") && src3.includes("&& !voMode()"), "발성에서는 목소리 그래프를 그리지 않아요");
  assert3.ok(src3.includes("const kk = P.earphone ? 0 :"), "이어폰이면 되돌림 보정 없음(내 목소리를 되돌림으로 배우지 않음)");
  console.log('pitch-page: 발성 시간 기록 ok');
}
