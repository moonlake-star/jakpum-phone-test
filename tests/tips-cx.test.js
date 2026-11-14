// 점검(11/14): #663에서 '// 주석' 한 줄 뒤에 코드(g.font·g.textBaseline·const cx)가 붙어 주석에 먹혀 cx가 없어짐 → 안내 말풍선을 그릴 때 ReferenceError
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../tune.js", "utf8");
const i = src.indexOf("if (tips.length && !st.dragging && !st.coachOwn) {");
assert.ok(i > 0, "안내 말풍선 블록이 없음");
const first = src.slice(i, src.indexOf("\n", i)), rest = src.slice(src.indexOf("\n", i) + 1);
assert.ok(!/\/\/.*(g\.font|const cx)/.test(first), "주석 안에 코드가 먹혀 있음");
const second = rest.slice(0, rest.indexOf("\n"));
assert.ok(second.includes('g.font = "11.5px system-ui, sans-serif"') && /const cx = /.test(second), "cx 정의가 둘째 줄에 있어야 함");
// 같은 종류의 실수 방지: tune.js·adv.js에서 '//' 뒤에 'g.font = ' 같은 그리기 코드가 한 줄에 붙은 곳이 없어야 함
for (const f of ["tune.js", "adv.js"]) {
  const s = fs.readFileSync(__dirname + "/../" + f, "utf8").split("\n");
  s.forEach((ln, k) => { const m = /(^|[^:'"`\\])\/\/[^\n]*?\s(g\.(font|fillStyle|textBaseline|beginPath)\s*=|const \w+ = Math\.(max|min)\()/.exec(ln);
    if (m && !/["'`].*\/\/.*["'`]/.test(ln.slice(0, m.index))) assert.fail(`${f}:${k + 1} 주석 뒤에 코드가 붙어 있음 → 주석에 먹혔을 수 있음`); });
}
console.log("tips-cx OK");
