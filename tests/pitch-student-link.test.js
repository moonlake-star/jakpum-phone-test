// 수강생 앱 '발성 연습' 진입 버튼 + 선생님 앱 '발성 연습' 카드(서버 t_pitch) + 개인정보 안내
const fs = require("fs"), assert = require("assert");
const stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8"), tea = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), pri = fs.readFileSync(__dirname + "/../student/privacy.html", "utf8");
// 수강생 앱: 같은 사이트의 ../pitch/ 를 내 계정 모드(?from=student)로 연다. 첫 화면에 보인다
assert.ok(stu.includes('href="../pitch/?from=student"') && stu.includes("const pitchLinkHtml = ()"), "발성 연습 버튼");
assert.ok(stu.indexOf("${pitchLinkHtml()}") > stu.indexOf("${growthHtml(data.growth)}") && stu.indexOf("${pitchLinkHtml()}") < stu.indexOf("님의 레슨 노트</h2>"), "레슨 노트 위, 첫 화면");
assert.ok(stu.includes(".pitchGo {") && stu.includes("min-height:64px"), "누르기 쉬운 크기");
// 선생님 앱: 성장 탭에 발성 연습 카드. 서버에서 담당 수강생 것만 받아 온다
assert.ok(tea.includes('<div id="grPitch"></div>') && tea.includes('portal("t_pitch", { sid, days: 14 })'), "성장 탭 발성 연습 카드 자리·요청");
const pitchCard = new Function(tea.match(/function pitchCard\([\s\S]*?\n}\n/)[0] + "; return pitchCard;")();
const empty = pitchCard([]);
assert.ok(empty.includes("아직 기록이 없어요") && !empty.includes("undefined"), "기록 없을 때 안내");
const h = pitchCard([{ day: "2026-11-05", sec: 125, score: 88.6, hold: 12.3, co: [{ st: 1, s: 2, c: 71 }] }, { day: "2026-11-04", sec: 40, score: null, hold: 0, co: [] }]);
assert.ok(h.includes("11/5") && h.includes("2분") && h.includes("89점") && h.includes("최고 유지 12.3초") && h.includes("★★") && h.includes("평균 점수 89점") && h.includes("미션 제출"), "날짜별 줄·평균");
assert.ok(h.includes("11/4") && h.includes("40초") && !h.includes("null") && !h.includes("NaN"), "점수 없는 날");
assert.ok(!pitchCard(null).includes("NaN") && pitchCard(undefined).includes("아직 기록이 없어요"), "방어");
// 개인정보 안내
assert.ok(pri.includes("발성 연습") && pri.includes("날짜별 요약") && pri.includes("미션 제출"), "개인정보 안내");
console.log("pitch-student-link: 수강생 버튼·선생님 카드·개인정보 안내 ok");

// (11/05) 선생님 앱 목록 맨 위에도 발성 연습 입구(../pitch/, 수강생 연결 아님)
{
  const t = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  require("assert").ok(t.includes('href="../pitch/" data-pitch-open="teacher" aria-label="발성 연습 열기"') && t.includes("pitchLinkHtml() + `<div id=\"pitchAll\"></div><div id=\"pitchRec\"></div>` + segHtml + todoHtml") && !/href="\.\.\/pitch\/\?from=student"/.test(t), "선생님 앱 발성 연습 입구");
  console.log("pitch-student-link: 선생님 앱 입구 ok");
}

// (11/05) 앱 안에서 열기: 두 앱 모두 data-pitch-open + pitch-embed.js, 닫기는 Brand.layer, 선생님은 as=teacher(수강생 서버 연결 없음)
{
  const fs = require("fs"), assert = require("assert"), r = (f) => fs.readFileSync(__dirname + "/../" + f, "utf8");
  const t = r("teacher/index.html"), st = r("student/index.html"), em = r("pitch-embed.js"), pg = r("pitch/index.html");
  assert.ok(t.includes('data-pitch-open="teacher"') && t.includes('<script src="../pitch-embed.js'), "선생님 앱 앱 안 열기");
  assert.ok(st.includes('data-pitch-open="student"') && st.includes('<script src="../pitch-embed.js'), "수강생 앱 앱 안 열기");
  assert.ok(em.includes("Brand.layer") && em.includes('allow", "microphone; autoplay"') && em.includes("e.origin !== location.origin") && em.includes('f.src = "about:blank"'), "뒤로 가기·마이크 끄기·같은 출처 메시지만");
  assert.ok(pg.includes("TM = EMB &&") && pg.includes("'vn_pitch_teacher'") && pg.includes("parent.postMessage({ vnPitch: 'close' }, location.origin)") && pg.includes("addEventListener('pagehide'"), "발성 연습 쪽 앱 안 모드");
  assert.ok(!/TM[^\n]*pitch_save|if \(SN\) \{ DB\.sync/.test(pg.split("function stopSession")[0]) , "선생님 모드는 서버 전송 없음");
  console.log("pitch-student-link: 앱 안에서 열기 ok");
}

// (11/05) 제출된 녹음 듣기(원장·담당 강사)·원장 녹음 관리(그만둬도 자동 삭제 없음, 직접 삭제)·강사 점수 전달
{
  const fs = require("fs"), assert = require("assert"), tea = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(tea.includes('portal("t_pitch_rec", { sid, _nb: true })') && tea.includes('portal("t_pitch_rec_get", { sid, take, _nb: true })') && tea.includes("recListInto(pr, sid, !isStaffApp())"), "성장 탭 제출 녹음 듣기, 삭제 버튼은 원장 앱만");
  assert.ok(tea.includes("function paintRecMgr()") && tea.includes('t_pitch_rec_all') && tea.includes('t_pitch_rec_purge') && tea.includes('t_pitch_rec_del') && tea.includes("if (!box || isStaffApp()"), "원장 녹음 관리 메뉴(강사 앱엔 없음)");
  assert.ok(tea.includes("전체 삭제") && tea.includes("confirm(`${r.st?.name || sid} 수강생이 제출한 녹음"), "삭제 전 확인");
  assert.ok(tea.includes('t_pitch_self') && tea.includes('vnPitch: "sum_ok"') && tea.includes("e.source !== f.contentWindow"), "앱 안 연습 점수 → 서버, 같은 사이트 iframe만");
  const f = new Function(tea.match(/const recMd = [^\n]*\n/)[0] + "; return { recMd, recMb };")();
  assert.strictEqual(f.recMd("2026-11-05"), "11/5"); assert.strictEqual(f.recMb(43000), "43KB"); assert.strictEqual(f.recMb(2500000), "2.5MB"); assert.strictEqual(f.recMb(0), "1KB");
  console.log("pitch-student-link: 제출 녹음 듣기·원장 관리 ok");
}
