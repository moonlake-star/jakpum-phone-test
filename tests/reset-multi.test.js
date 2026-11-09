// (11/03 13:46 사용자 시안 승인) 곡 전체 원본으로(음정·타이밍 따로, 10초 되살리기, 지난 고침 보관) + 여러 음 골라 원본으로
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), tj = fs.readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(!src.includes('id="mkResetAll"') && src.includes('<button class="full" id="mkFinal">🔊 완성본 새로 만들기</button>'), "(11/09 11:14) 곡 화면엔 다시 만들기만 · 원본으로는 일괄 보정에");
assert.ok(src.includes("<b style=\"font-size:16px\">곡 전체를 처음으로 되돌릴까요?</b>") && src.includes("r.target_fixes = []; r.time_edits = []; delete r.note_edits;") && src.includes('$("mkFinal")?.click(); };'), "확인 창(11/09): 전부 지우고 바로 다시 만들기");
assert.ok(src.includes("r.fix_backup = { at: new Date().toISOString(), target_fixes: fx0, time_edits: te0 }") && src.includes('10000, "되살리기"'), "보관 + 10초 되살리기");
assert.ok(src.includes("onResetRange: (t0, t1) => resetSome(true, true, [t0, t1]), countRange:"), "여러 음 연결");
assert.ok(tj.includes("function multiSheet(host, cv, st, keep, keepSel)") && tj.includes("if (d.armed) { armTip(false); clearInterval(d.auto); d.auto = null; if (preview != null) { const t_ = preview; preview = null; try { seek(t_, true); } catch {} } if (d.moved)") && !tj.includes("data-mm") && tj.includes("st.msel = [Math.max(0, Math.min(a, b)), Math.max(a, b)]") && tj.includes("if (st.mMode) { preview = Math.max(0, pinch.t"), "끌어 고르기 · 두 손가락 이동");
assert.ok(tj.includes('function undo(msg, onUndo, ms = 4000, label = "되돌리기")'));
// resetSome 동작(고른 구간 안만 지움)
{ const a = src.indexOf("    resetSome = async (pitch, time, range) =>"), b = src.indexOf("      return gone; };", a) + "      return gone; };".length;
  const r = { target_fixes: [{ t0: 1, t1: 2, midi: 60 }, { t0: 5, t1: 6, midi: 62 }], time_edits: [{ t0: 1.2, t1: 1.8, nt0: 1.3, nt1: 1.9 }] };
  let applied = null, und = null; const T = { undo: (m, f, ms, l) => { und = [m, ms, l, f]; } };
  const f = new Function("r", "toA", "applyAll", "toast", "Tune", "let resetSome;\n" + src.slice(a, b) + "\nreturn resetSome;")(r, (x) => x, async (fx, te) => { applied = [fx, te]; }, () => {}, T);
  f(true, true, [0.5, 2.5]).then((n) => { assert.strictEqual(n, 2); assert.deepStrictEqual(applied[0], [{ t0: 5, t1: 6, midi: 62 }]); assert.deepStrictEqual(applied[1], []);
    assert.strictEqual(r.fix_backup.target_fixes.length, 2); assert.strictEqual(und[1], 10000);
    return f(true, false, null); }).then((n) => { assert.strictEqual(n, 2); assert.deepStrictEqual(applied[0], []); console.log("reset-multi ok"); }).catch((e) => { console.error(e); process.exit(1); }); }
