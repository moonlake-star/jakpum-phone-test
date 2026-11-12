// (11/12 09:53 사용자 결정 · ChatGPT 검토) 폰 mp3 = 곡 전체를 보정 전 보컬(p0)에서 다시 합성(서버 보정본 안 씀) · 실패하면 예전 방식
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes("async function pvFullVocal(name, onProg)") && H.includes("const PV_FULL_CH = 20;"), "곡 전체 20초씩");
assert.ok(H.includes("const x = pvSrc(src, 0, ia, ib), A = await PraatCore.analyze(x, sr), sh = Float64Array.from(A.t, (t) => pvShiftAt(bins, fps, ia / sr + t));"), "p0에서 서버 숫자(보정선)로");
assert.ok(H.includes("pvRawPaste(vb, src, fxE.filter((f) => f.off).concat(pvBadSpans(cv)), sr);") && H.includes("const w = await PraatCore.warp(x, sr, anc, pitch);"), "원음 자리·타이밍(높이+길이 한 번에)");
assert.ok(H.includes("out[i] += (y[i - ia] ?? 0) * Math.max(0, Math.min(1, w));"), "조각 이음 = 겹쳐 더함(무게 합 1)");
assert.ok(H.includes('const y = await pvFullVocal(n, setMsg); if (y) { full[n] = y; fullOk = true; }') && H.includes("for (const k in full) delete full[k]; fullOk = false;"), "내보내기에 연결 · 실패 시 예전 방식");
assert.ok(H.includes('navigator.wakeLock?.request("screen")'), "만드는 동안 화면 꺼짐 방지");
console.log("phone-full-export ok");
// (11/12 10:21 사용자 '포먼트·치찰음도 폰=서버') 서버 post_audio 차례 그대로 · 치찰음 판정은 서버와 같은 10ms·4kHz·Parseval 합
assert.ok(H.includes("await pvPostAudio(out, sr, cv, vt, onProg);") && H.includes("async function pvPostAudio(y, sr, cv, vt, onProg)"), "폰 완성본 = 목소리 결·치찰음·볼륨까지");
assert.ok(H.includes("await PraatCore.formantShift(y.slice(ia, ib), sr, g.formant)") && H.includes("function pvSibGain(") && H.includes("function pvRangeGain(") && H.includes("function pvGainCurve("), "포먼트·치찰음·구간 치찰음/숨·볼륨 고르게");
// (11/12) 서버가 옥타브를 바로잡았거나 믿을 수 없다고 본 자리 = 원음 그대로
assert.ok(H.includes("function pvBadSpans(cv)") && H.includes("fxE.filter((f) => f.off).concat(pvBadSpans(cv))"), "옥타브 튐 자리 원음");
{ // 치찰음 판정 계산 확인: 높이 없는 고음역 소음 = 줄임, 소리 높이 있는 곳 = 그대로
  const src = H.slice(H.indexOf("function pvSibGain("), H.indexOf("function pvRangeGain(")); const f = eval("(" + src.trim() + ")"), sr = 16000, y = new Float32Array(sr);
  let s = 1; const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647 - 0.5);
  let pv = 0; for (let i = 0; i < sr; i++) { const r_ = rnd(); y[i] = i < sr / 2 ? 0.3 * Math.sin(2 * Math.PI * 200 * i / sr) : 0.2 * (r_ - pv); pv = r_; }   // 뒤 절반 = 고음역 소음(차분)
  const vt = []; for (let t = 0; t < 0.5; t += 0.01) vt.push(t);
  const g = f(y, sr, vt, -6); assert.ok(g[sr / 4] > 0.99 && g[Math.round(sr * 0.8)] < 0.6, "치찰음만 줄임");
}
console.log("phone-full-export post ok");
