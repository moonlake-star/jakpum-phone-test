// 모든 HTML의 인라인 <script> 전체를 문법 검사 + checkBuild 정규식을 실제 HTML 문자열로 시험
const assert = require('assert'), fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const skip = new Set(['node_modules', '.git', 'tests']);
const htmls = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    if (skip.has(e.name)) continue;
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p); else if (e.name.endsWith('.html')) htmls.push(p);
  }
})(root);
assert.ok(htmls.some((p) => p.endsWith(path.join('teacher', 'index.html'))), 'teacher/index.html 필요');
let n = 0;
for (const f of htmls) {
  const src = fs.readFileSync(f, 'utf8');
  const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(src))) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    if (/type\s*=/i.test(attrs) && !/type\s*=\s*["']?(text\/javascript|module)/i.test(attrs)) continue; // json 등
    const code = m[2]; if (!code.trim()) continue;
    try { new Function(code); } catch (e) {
      if (/module/.test(attrs) && /\b(import|export)\b/.test(code)) continue; // 모듈 구문은 Function으로 검사 불가
      assert.fail(path.relative(root, f) + ': 인라인 스크립트 문법 오류 — ' + e.message);
    }
    n++;
  }
}
assert.ok(n > 0);
// checkBuild 정규식: 실제 teacher HTML에서 BUILD를 뽑아 현재 BUILD와 같아야 함(값 하드코딩 금지)
const t = fs.readFileSync(path.join(root, 'teacher', 'index.html'), 'utf8');
const cur = (t.match(/^const BUILD = "([^"]+)"/m) || [])[1];
assert.ok(cur, 'BUILD 선언 필요');
const line = t.split('\n').find((l) => l.includes('t.match(') && l.includes('const BUILD'));
assert.ok(line, 'checkBuild 추출 줄 필요');
assert.ok(!line.includes(cur), 'BUILD 값을 정규식에 하드코딩하면 안 됨');
const rx = new Function('return ' + line.match(/t\.match\((\/.*\/)\)/)[1])();
assert.equal((t.match(rx) || [])[1], cur);
assert.equal(('const BUILD = "zz-1";'.match(rx) || [])[1], 'zz-1');
console.log('inline-js-syntax ok (' + n + ' scripts, ' + htmls.length + ' html)');
