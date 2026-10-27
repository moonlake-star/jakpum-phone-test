// 펼쳐보기 스르륵 애니메이션: 모든 펼쳐보기에 적용, 동작 줄이기 설정 존중, 안쪽 버튼 누름은 건드리지 않음
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
assert(/function detailsAnimate\(d, open\)/.test(src));
assert(src.includes('prefers-reduced-motion: reduce'));
assert(src.includes('d.style.boxSizing = "border-box"'), '테두리 포함 높이(끝에서 덜컥 방지)');
assert(/document\.addEventListener\("click", \(e\) => \{\s*const sm = e\.target\.closest\?\.\("summary"\)/.test(src));
console.log('details-anim ok');
