// 수강생 앱 '음정 연습' 진입 버튼 + 선생님 앱 '음정 연습' 카드(서버 t_pitch) + 개인정보 안내
const fs = require("fs"), assert = require("assert");
const stu = fs.readFileSync(__dirname + "/../student/index.html", "utf8"), tea = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), pri = fs.readFileSync(__dirname + "/../student/privacy.html", "utf8");
// 수강생 앱: 같은 사이트의 ../pitch/ 를 내 계정 모드(?from=student)로 연다. 첫 화면에 보인다
assert.ok(stu.includes('href="../pitch/?from=student"') && stu.includes("const pitchLinkHtml = ()"), "음정 연습 버튼");
assert.ok(stu.indexOf("${pitchLinkHtml()}") > stu.indexOf("${growthHtml(data.growth)}") && stu.indexOf("${pitchLinkHtml()}") < stu.indexOf("님의 레슨 노트</h2>"), "레슨 노트 위, 첫 화면");
assert.ok(stu.includes(".pitchGo {") && stu.includes("min-height:64px"), "누르기 쉬운 크기");
// 선생님 앱: 성장 탭에 음정 연습 카드. 서버에서 담당 수강생 것만 받아 온다
assert.ok(tea.includes('<div id="grPitch"></div>') && tea.includes('portal("t_pitch", { sid, days: 14 })'), "성장 탭 음정 연습 카드 자리·요청");
const pitchCard = new Function(tea.match(/function pitchCard\([\s\S]*?\n}\n/)[0] + "; return pitchCard;")();
const empty = pitchCard([]);
assert.ok(empty.includes("아직 기록이 없어요") && !empty.includes("undefined"), "기록 없을 때 안내");
const h = pitchCard([{ day: "2026-11-05", sec: 125, score: 88.6, hold: 12.3, co: [{ st: 1, s: 2, c: 71 }] }, { day: "2026-11-04", sec: 40, score: null, hold: 0, co: [] }]);
assert.ok(h.includes("11/5") && h.includes("2분") && h.includes("89점") && h.includes("최고 유지 12.3초") && h.includes("★★") && h.includes("평균 점수 89점") && h.includes("녹음은 저장하지 않아요"), "날짜별 줄·평균");
assert.ok(h.includes("11/4") && h.includes("40초") && !h.includes("null") && !h.includes("NaN"), "점수 없는 날");
assert.ok(!pitchCard(null).includes("NaN") && pitchCard(undefined).includes("아직 기록이 없어요"), "방어");
// 개인정보 안내
assert.ok(pri.includes("음정 연습") && pri.includes("날짜별 요약") && pri.includes("미션 제출"), "개인정보 안내");
console.log("pitch-student-link: 수강생 버튼·선생님 카드·개인정보 안내 ok");

// (11/05) 선생님 앱 목록 맨 위에도 음정 연습 입구(../pitch/, 수강생 연결 아님)
{
  const t = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  require("assert").ok(t.includes('href="../pitch/" data-pitch-open="teacher" aria-label="음정 연습 열기"') && t.includes("pitchLinkHtml() + `<div id=\"pitchAll\"></div>` + segHtml + todoHtml") && !/href="\.\.\/pitch\/\?from=student"/.test(t), "선생님 앱 음정 연습 입구");
  console.log("pitch-student-link: 선생님 앱 입구 ok");
}

// (11/05) 앱 안에서 열기: 두 앱 모두 data-pitch-open + pitch-embed.js, 닫기는 Brand.layer, 선생님은 as=teacher(수강생 서버 연결 없음)
{
  const fs = require("fs"), assert = require("assert"), r = (f) => fs.readFileSync(__dirname + "/../" + f, "utf8");
  const t = r("teacher/index.html"), st = r("student/index.html"), em = r("pitch-embed.js"), pg = r("pitch/index.html");
  assert.ok(t.includes('data-pitch-open="teacher"') && t.includes('<script src="../pitch-embed.js'), "선생님 앱 앱 안 열기");
  assert.ok(st.includes('data-pitch-open="student"') && st.includes('<script src="../pitch-embed.js'), "수강생 앱 앱 안 열기");
  assert.ok(em.includes("Brand.layer") && em.includes('allow", "microphone; autoplay"') && em.includes("e.origin !== location.origin") && em.includes('f.src = "about:blank"'), "뒤로 가기·마이크 끄기·같은 출처 메시지만");
  assert.ok(pg.includes("TM = EMB &&") && pg.includes("'vn_pitch_teacher'") && pg.includes("parent.postMessage({ vnPitch: 'close' }, location.origin)") && pg.includes("addEventListener('pagehide'"), "음정 연습 쪽 앱 안 모드");
  assert.ok(!/TM[^\n]*pitch_save|if \(SN\) \{ DB\.sync/.test(pg.split("function stopSession")[0]) , "선생님 모드는 서버 전송 없음");
  console.log("pitch-student-link: 앱 안에서 열기 ok");
}
