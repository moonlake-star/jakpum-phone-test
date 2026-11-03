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
const student = fsTips({ setMode() {} }).map(t => t.text()).join("|"), teacher = fsTips({ setMode() {}, onFix() {}, onNote() {}, onAdd() {} }).map(t => t.text()).join("|");
assert.ok(!/정음 막대를 톡|✂|주석을 달/.test(student) && /정음 막대를 톡/.test(teacher) && /주석을 달/.test(teacher));
assert.ok(src.includes('<p class="tfTip"></p>') && src.includes('"💡 " + ldTips[tipI].text()'));
console.log("loading-tips ok", FS_TIPS.length);
