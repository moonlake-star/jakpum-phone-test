// (11/09 16:44 사용자 '버튼 의미를 모르겠다' → 시안 고) 완성본 카드 하나: 고침 지문(baked_sig)으로 반영 전/최신 · 보내기 안전장치 · 이름 통일
const assert = require("assert"), fs = require("fs"), path = require("path");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8"), T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
const src = H.match(/function mkEditsSig\(r\) \{[\s\S]*?toString\(36\); \}/)[0];
const sig = new Function(src + "; return mkEditsSig;")();
const r = { target_fixes: [{ t0: 1, t1: 2, midi: 60 }], time_edits: [] };
const s0 = sig(r); assert.strictEqual(sig({ ...r }), s0, "같은 고침 = 같은 지문");
assert.notStrictEqual(sig({ ...r, target_fixes: [{ t0: 1, t1: 2, midi: 61 }] }), s0, "고침이 바뀌면 다른 지문");
assert.strictEqual(sig({ ...r, target_fixes: [...r.target_fixes, { t0: 3, t1: 4, cut: 1 }] }), s0, "쪼개기 표시는 소리 아님");
assert.notStrictEqual(sig({ ...r, engine: "world" }), s0, "엔진 바꿈도 반영 전");
assert.ok(H.includes("q.baked_sig = mkEditsSig(q);"), "완성본 요청 때 지문 저장");
assert.ok(H.includes('id="mkDone"') && H.includes('<button class="full" id="mkFinal">🔊 완성본 새로 만들기</button>') && H.includes("⚡ 지금 소리 그대로 mp3") && H.includes("📤 수강생에게 보내기"), "카드 하나");
assert.ok(!H.includes("고친 내용 반영해 완성본 다시 만들기") && !H.includes("폰에서 바로 mp3 만들기"), "옛 이름 없음");
assert.ok(H.includes("⚠ 보낼 파일을 골라 주세요") && H.includes("if (phoneFresh()) return shareNow(true);") && H.includes("if (!mkDirty()) return shareNow(false);"), "보내기 안전장치");
assert.ok(T.includes("이번에 고친 곳 <b>${n}곳</b>") && T.includes("곡 전체 <b>${ds.total}곳</b>") && !T.includes("되돌리기 기록 <b>"), "닫을 때 카드");
assert.ok(T.includes('data-m="o">🎤 보정 전') && T.includes('data-m="p">✨ 보정 후') && A.includes('data-ep="o">▶ 보정 전'), "보정 전/후로 통일");
assert.ok(A.includes('<div class="advDng"><button type="button" data-g="reset">🗑 모든 고침 지우고 처음 상태로') && !A.includes("↺ 곡 전체 원본으로"), "처음 상태로 = 따로 떨어진 빨간 칸");
console.log("done-card ok");
assert.ok(H.includes('fb.classList.toggle("ghost", !d)') && !H.includes('for (const id of ["mkFinal", "mkdNote"])'), "새로 만들기 버튼은 늘 보임");
