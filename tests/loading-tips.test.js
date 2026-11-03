// (11/03 10:38 사용자) '불러오는 중' 기능 팁 — 기능이 바뀌거나 없어지면 이 시험이 실패해서 팁 문구도 같이 고치게 함
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const a = src.indexOf("  const FS_TIPS = ["), b = src.indexOf("  const fsTips = (o) =>");
assert.ok(a > 0 && b > a, "팁 목록이 있음");
const block = src.slice(a, b), code = src.slice(0, a) + src.slice(b);   // 팁 목록 밖(실제 기능 코드)에서 찾음
require("../tune.js"); const T = globalThis.Tune;
const DT_JUMP = +(/const DT_JUMP = (\d+)/.exec(src) || [])[1];
const FS_TIPS = new Function("DT_JUMP", "return " + block.slice(block.indexOf("["), block.lastIndexOf("]") + 1))(DT_JUMP);
assert.ok(FS_TIPS.length >= 12, "팁 개수");
for (const t of FS_TIPS) {
  assert.ok(t.need && code.includes(t.need), `기능이 바뀌었거나 없어졌어요 → 팁 문구를 고쳐 주세요: "${t.text()}" (찾는 코드: ${t.need})`);
  assert.ok(t.text().length <= 60, "한두 줄 길이: " + t.text());
}
assert.ok(FS_TIPS[0].text().includes(DT_JUMP + "초"), "숫자는 기능 값에서 바로 가져옴(바뀌면 문구도 자동으로)");
// 화면별: 수강생 화면(고치기·주석 없음)엔 고치기 팁이 안 나옴
const fsTips = (o) => FS_TIPS.filter(x => !x.when || x.when(o));
const student = fsTips({ setMode() {}, notes() { return []; } }).map(t => t.text()).join("|"), teacher = fsTips({ teacher: true, setMode() {}, onFix() {}, onNote() {}, onAdd() {}, notes() { return []; } }).map(t => t.text()).join("|");
assert.ok(!/정음 막대를 톡|✂|주석을 달|고친 양/.test(student) && /정음 막대를 톡/.test(teacher) && /주석을 달/.test(teacher), "선생님 전용은 수강생에게 안 나옴");
assert.ok(/강사님 피드백/.test(student) && /내가 부른 음/.test(student) && !/강사님 피드백|내가 부른 음/.test(teacher), "(11/03 10:42) 수강생 전용 팁은 선생님에게 안 나옴");
assert.ok(src.includes('<p class="tfTip"></p>') && src.includes("<span>[Tip]</span><span class=\"tfPn\">톡 하면 닫혀요</span>") && src.includes('class="tfHg"') && !src.includes('"💡 " + ldTips'), "(11/03 11:39) 작은 모래시계 + [안내팁]");
console.log("loading-tips ok", FS_TIPS.length);
// (11/03 11:31 사용자) 팁 창: 톡 = 계속 · 다시 톡 = 닫기 · 0.7초 꾹 = 누르는 동안만 · 닫힐 땐 페이드
assert.ok(src.includes("transition:opacity 1.3s ease,visibility 0s linear 1.3s"), "서서히 사라짐");
assert.ok(src.includes('/* 새로 뜰 땐 제자리 */ if (ldShown && !vis') && src.includes('ldEl.classList.toggle("on", vis && !TIP_LINE); ldEl.classList.toggle("pin", ldPin);'), "팁 창 켜고 끄는 줄이 주석에 묻히지 않음");

assert.ok(src.includes("const LD_LINGER = 1000, LD_LONG = 600, LD_FADE = 1300;") && src.includes("if (moved || long || fromFade) { ldPin = true; return; } ldShut();") && src.includes('wrap.addEventListener("click", (e) => { if (!ldRe && performance.now() < ldEat)') && src.includes("const vis = (on && !ldDis) || ldPin || ldDown > 0 || performance.now() < ldLinger;"), "(11/03 14:47) 2초 · 톡 = 닫기 · 아래 화면 막음");
assert.ok(src.includes("if (q.moved || !ldShown) return;") && src.includes('q.t.dispatchEvent(new PointerEvent("pointercancel"'), "(11/03 15:10) 끌기는 그대로 · 톡만 붙잡음");
assert.ok(src.includes("const TIP_LINE = true;") && src.includes('ldEl.classList.toggle("on", vis && !TIP_LINE)') && src.includes("#tuneFs .tfTipLine{position:absolute"), "(11/03 17:23 C안) 전체화면 팁 = 아래 안내 자리 한 줄");
