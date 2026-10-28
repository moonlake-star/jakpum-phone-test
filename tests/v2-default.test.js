// V2 기본 화면(2026-10-29): 규칙 보존(임시저장≠공개, 공개는 V1 publishOnSave 경유, 복사≠보냄), 베스트 꼬리표, 메이크업 문구·위치, AI 작성 비율, V1 보관본
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const grab = (s, name) => { const m = s.match(new RegExp("function " + name + "\\([\\s\\S]*?\\n}\\n")); assert.ok(m, "함수 없음: " + name); return m[0]; };

// 1) 기본은 V2, 'V1 화면' 버튼으로 전환(기기 저장값 vn_ui=v1 일 때만 V1)
const v2On = (LS) => new Function("LS", "V2_KEY", grab(src, "v2On") + "; return v2On;")(LS, "vn_ui");
assert.strictEqual(v2On({ get: () => null })(), true);
assert.strictEqual(v2On({ get: () => "v1" })(), false);
assert.ok(src.includes('id="btnUi"'));

// 2) 임시저장 = 저장만(공개 안 함), 공개 = saveReview(false) → publishOnSave(승인 전 확인 목록·동의 철회 제외 그대로)
assert.ok(/\$\("v2Save"\)\.onclick = async \(\) => \{[^\n]*saveReview\(true\)/.test(src), "임시저장은 quiet 저장");
assert.ok(!/\$\("v2Save"\)\.onclick[^\n]*saveReview\(false\)/.test(src));
assert.ok(grab(src, "v2PubPaint").includes("saveReview(false)"), "공개는 V1 저장+공개 경로");
assert.ok(grab(src, "v2PubPaint").includes("approvalBlockers") && grab(src, "v2PubPaint").includes("consent_withdrawn"));
assert.ok(grab(src, "publishOnSave").includes("consent_withdrawn") && grab(src, "publishOnSave").includes("approvalBlockers"), "공개 안전장치 유지");

// 3) 카톡: 복사·클립은 보냄 아님, ③ 전송 완료 표시만 보냄(V2도 같은 보내기 카드를 시트로 씀)
assert.ok(src.includes("복사·클립 보내기만으로는 보낸 걸로 치지 않아요"));
assert.ok(src.includes('id="btnKakaoMark"') && src.includes("rv.kakao_sent_at = new Date().toISOString()"));
assert.ok(!/v2[A-Za-z]*[\s\S]{0,40}kakao_sent_at\s*=/.test(src.slice(src.indexOf("// ── V2 선생님 화면"))), "V2 코드가 보냄 표시를 직접 바꾸지 않음");

// 4) 베스트 꼬리표: 실제로 이었을 때만 '잘한 부분 이어붙임'
const bestJoined = new Function(grab(src, "bestJoined") + "; return bestJoined;")();
assert.strictEqual(bestJoined({ isComposite: true, seams: [{}], takes_used: 2 }), true);
assert.strictEqual(bestJoined({ isComposite: true, composition: "sections_only", seams: [] }), true);
assert.strictEqual(bestJoined({ isComposite: true, composition: "single_take", seams: [], takes_used: 1 }), false);
assert.strictEqual(bestJoined({ isComposite: true, seams: [], takes_used: 1 }), false, "어젯밤 김미영 사례처럼 사실상 한 테이크");
assert.strictEqual(bestJoined({ isComposite: false }), false);
assert.strictEqual(bestJoined({ isComposite: true }), undefined, "예전 편집본(정보 없음)은 모름 → 수강생 화면 예전 문구");
assert.ok(src.includes('공개 전에 할 것: " + bl0.msg'), "구버전 서버 게시도 승인 전 확인");

// 5) 수강생 화면(실제 사이트)과 선생님 미리보기: 같은 문구, 메이크업은 미션 뒤·응원 앞, 심플에선 숨김
for (const [name, s, fn] of [["student", stu, "lessonHtml"], ["teacher-preview", src, "svLessonHtml"]]) {
  const f = grab(s, fn);
  assert.ok(f.includes("오늘 잘한 부분을 이어 붙였어요") && f.includes("오늘 가장 좋았던 한 번을 골랐어요"), name);
  assert.ok(f.includes("간단 음정보정 예시") && f.includes("음원 발매용으로 정식 보정하면 더 자연스럽고 좋아져요"), name);
  assert.ok(!f.includes("보컬 메이크업 버전"), name);
  const iMk = f.indexOf('class="card makeup"'), iMission = f.indexOf("📋 다음 미션"), iCheer = f.indexOf('class="card cheer"');
  assert.ok(iMission < iMk && iMk < iCheer, name + " 메이크업 위치");
  assert.ok(/\$\{full && (sv)?[mM]akeupOk\(/.test(f), name + " 심플에선 메이크업 숨김");
}

// 6) AI 작성 비율: 그대로면 100, 고치면 줄어듦, AI 초안 없으면 null
const v2Lcs = new Function(grab(src, "v2Lcs") + "; return v2Lcs;")();
const v2Join = (a) => (a || []).map(x => typeof x === "string" ? x : x?.text || "").filter(Boolean).join("\n");
const share = new Function("v2Lcs", "v2Join", grab(src, "v2AiShare") + "; return v2AiShare;")(v2Lcs, v2Join);
const ai = { feedback_text: "오늘 수고하셨어요", points: [{ text: "호흡 먼저" }], practice: ["숨 채우기 5번"] };
assert.strictEqual(share({ ai, review: { feedback: "오늘 수고하셨어요", points: ["호흡 먼저"], practice: ["숨 채우기 5번"] } }), 100);
const p = share({ ai, review: { feedback: "오늘 정말 잘하셨어요 다음에 또 봐요", points: ["호흡 먼저"], practice: ["숨 채우기 5번"] } });
assert.ok(p < 100 && p > 20, "고친 만큼 줄어듦: " + p);
assert.strictEqual(share({ ai: null, review: {} }), null);

// 7) V1 보관본: 실행 가능한 사본 + 표시, 공유 대상(share_target) 없음
const v1 = fs.readFileSync(__dirname + "/../teacher-v1/index.html", "utf8");
assert.ok(v1.includes("V1 보관본") && !v1.includes("V2 선생님 화면"));
const man = JSON.parse(fs.readFileSync(__dirname + "/../teacher-v1/manifest.webmanifest", "utf8"));
assert.ok(!man.share_target && /V1/.test(man.name));
console.log("v2-default ok");
// 8) 메이크업 자동(2026-10-29): 같은 편집본 요청이 있으면 안 만듦·30일 안·4분 이하·철회/시험 제외, 앱 요청 형식 = 서버 auto_makeup 형식
{
  const f = src.match(/function mkAutoEnsure\([\s\S]*?\n}\n/)[0];
  assert.ok(f.includes("loadMkJobs(me.sid)") && f.includes("if (bestMakeupJob(o))"), "최신 목록으로 중복 확인");
  assert.ok(f.includes("consent_withdrawn") && f.includes('status === "test"') && f.includes("> 240") && f.includes("MK_AUTO_DAYS"));
  assert.ok(f.includes("auto: true") && f.includes("best_file_id: o.file_id") && f.includes("lesson_folder: me.folder.id"));
  assert.ok(!f.includes("Include"), "자동으로 만들기만, 수강생에게 보내기(포함)는 건드리지 않음");
  assert.ok(src.includes("if (typeof mkAutoEnsure === \"function\") { try { mkAutoEnsure(o); } catch {} }"));
}
console.log("v2-default auto-makeup ok");
