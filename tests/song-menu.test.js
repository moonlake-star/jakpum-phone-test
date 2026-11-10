// (11/11 01:07 사용자 고 · ChatGPT 협의) ⋯ 곡 메뉴: 완성본·작업 기록·보정 엔진·기타 설정·초기화를 한 곳에 · 전체 보정 창은 소리 값만
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8"), H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(T.includes('mb.textContent = "⋯ 곡 메뉴"') && T.includes("st.songMenu = () =>"), "곡 메뉴 버튼");
for (const k of ['data-sm="mk"', 'data-sm="ph"', 'data-sm="hist"', 'data-sm="rst"', "<summary>보정 엔진 · A/B 비교", "<h4>기타 설정</h4>", "📤 수강생에게 보내기는 곡 화면"]) assert.ok(T.includes(k), "곡 메뉴 칸: " + k);
assert.ok(T.includes("st.openHist = openHist;"), "작업 기록을 버튼으로도 열기");
assert.ok(A.includes("function toolsBox(st, cv, closeFn)") && A.includes("engineBox, toolsBox, resetDetail,"), "엔진·설정 칸을 곡 메뉴에서 씀");
const gs = A.slice(A.indexOf("function globalSheet("), A.indexOf("// ── MIDI 내보내기"));
assert.ok(!gs.includes("engineBox(st)") && !gs.includes('data-g="midi"') && !gs.includes('data-g="reset"') && gs.includes("⋯ 곡 메뉴"), "전체 보정 창 = 소리 값만");
assert.ok(H.includes('phoneMix: () => $("mkPhoneMix")?.click()') && H.includes("doneState: () => ({ dirty:"), "앱이 곡 메뉴에 mp3·최신 여부를 넘김");
assert.ok(T.includes('data-mraw disabled') && T.includes('data-mr disabled>↺ 자동</button>') && !T.includes(">↺ 원본</button>"), "구간 창: 🎤 원음 · ↺ 자동(음표 창과 같은 이름)");
// 구간 원음 동작: 막대마다 off 고침 · 다시 누르면 지움
{ const a = T.indexOf("  function barsIn("), b = T.indexOf("  function multiSheet(");
  assert.ok(a > 0 && b > a); }
console.log("song-menu ok");
