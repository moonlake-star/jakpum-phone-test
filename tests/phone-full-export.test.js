// (11/12 09:53 사용자 결정 · ChatGPT 검토) 폰 mp3 = 곡 전체를 보정 전 보컬(p0)에서 다시 합성(서버 보정본 안 씀) · 실패하면 예전 방식
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes("async function pvFullVocal(name, onProg)") && H.includes("const PV_FULL_CH = 20;"), "곡 전체 20초씩");
assert.ok(H.includes("const x = pvSrc(src, 0, ia, ib), A = await PraatCore.analyze(x, sr), sh = Float64Array.from(A.t, (t) => pvShiftAt(bins, fps, ia / sr + t));"), "p0에서 서버 숫자(보정선)로");
assert.ok(H.includes("pvRawPaste(vb, src, fxE.filter((f) => f.off), sr);") && H.includes("const w = await PraatCore.warp(x, sr, anc, pitch);"), "원음 자리·타이밍(높이+길이 한 번에)");
assert.ok(H.includes("out[i] += (y[i - ia] ?? 0) * Math.max(0, Math.min(1, w));"), "조각 이음 = 겹쳐 더함(무게 합 1)");
assert.ok(H.includes('const y = await pvFullVocal(n, setMsg); if (y) { full[n] = y; fullOk = true; }') && H.includes("for (const k in full) delete full[k]; fullOk = false;"), "내보내기에 연결 · 실패 시 예전 방식");
assert.ok(H.includes('navigator.wakeLock?.request("screen")'), "만드는 동안 화면 꺼짐 방지");
console.log("phone-full-export ok");
