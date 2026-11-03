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
assert.ok(src.includes('<p class="tfTip"></p>') && src.includes('"💡 " + ldTips[tipI].text()'));
console.log("loading-tips ok", FS_TIPS.length);
// (11/03 11:31 사용자) 팁 창: 톡 = 계속 · 다시 톡 = 닫기 · 0.7초 꾹 = 누르는 동안만 · 닫힐 땐 페이드
assert.ok(src.includes("const long = performance.now() - ldDown >= 700") && src.includes("if (long) ldPin = false; else ldPin = !ldPin;") && src.includes("const vis = on || ldPin || ldHold;"));
assert.ok(src.includes("transition:opacity .6s ease,visibility 0s linear .6s"), "서서히 사라짐");
