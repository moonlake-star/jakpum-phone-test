// (11/02 17:32 사용자 버그) 주석 창: 키보드가 올라온 채 [취소]를 눌러도 안 닫힘 · 창이 뜰 때 키보드와 같이 출렁임
const fs = require("fs"), assert = require("assert");
const s = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(/const ACT = "\.tsCancel,\.tsOk,\.tsDel"/.test(s), "취소·저장·삭제는 손 뗄 때 바로 실행");
assert.ok(/b\.addEventListener\("pointerup"[^\n]*b\.click\(\)/.test(s), "pointerup에서 실행(키보드가 내려가 버튼이 움직여도)");
assert.ok(/b\.matches\(ACT\)\) return;/.test(s), "이 버튼들은 누를 때 키보드를 먼저 내리지 않음");
assert.ok(/e\.isTrusted && performance\.now\(\) - firedAt < 700/.test(s), "뒤따르는 클릭으로 두 번 저장되지 않게");
assert.ok(/let closed = false;\s*const close = \(fromPop\) => \{ if \(closed\) return;/.test(s), "닫기는 한 번만");
assert.ok(!/if \(isNew\) setTimeout\(\(\) => el\.querySelector\("\.tsTx"\)\.focus\(\)/.test(s), "새 주석도 자동으로 키보드 안 올림");
console.log("note-sheet-cancel ok");
