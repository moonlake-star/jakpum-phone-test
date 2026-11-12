// (11/09 16:29 사용자 '원음으로 돌렸는데 보정본에서 튐') 🎤 원음 구간 + 붙은 정음 없는 틈(≤0.3초)은 p0 그대로 붙여 넣음(다시 합성 안 함)
const assert = require("assert"), fs = require("fs"), path = require("path");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
const a = H.indexOf("const PV_RAW_GAP"), b = H.indexOf("function pvClusters(fixes)");
const mkPv = { orig: {} };
const pvSrc = (bf, c, i0, i1) => bf.getChannelData(c).slice(i0, i1);
const { pvOffExt, pvRawPaste } = new Function("Tune", "mkPv", "pvSrc", H.slice(a, b) + "; return { pvOffExt, pvRawPaste };")({ tgCol: () => 3 }, mkPv, pvSrc);
// 0.1초 간격: 0~0.9 정음 있음, 1.0~1.5 원음(정음 null), 1.6~1.7 틈(null), 1.8~ 정음
const pts = []; for (let i = 0; i <= 25; i++) { const t = +(i / 10).toFixed(2); pts.push([t, 6000, 6000, t >= 1.0 && t <= 1.75 ? null : 6000]); }
const cv = { pts, levels: [3] };
const [e, g] = pvOffExt(cv, [{ t0: 1.0, t1: 1.5, off: true }, { t0: 2.0, t1: 2.2, midi: 62 }]);
assert.strictEqual(e.t0, 1.0); assert.ok(Math.abs(e.t1 - 1.7) < 1e-9, "뒤 틈까지 " + e.t1); assert.ok(e.rawExt);
assert.deepStrictEqual(g, { t0: 2.0, t1: 2.2, midi: 62 }, "정음 고침은 그대로");
const sr = 1000, mk = (v) => { const d = new Float32Array(3000).fill(v); return { length: 3000, numberOfChannels: 1, getChannelData: () => d }; };
const out = mk(0.5), p0 = mk(0.2); pvRawPaste(out, p0, [e], sr);
const d = out.getChannelData(0);
assert.ok(Math.abs(d[1200] - 0.2) < 1e-6, "원음 자리 = p0 그대로"); assert.strictEqual(d[800], 0.5, "밖은 그대로"); assert.ok(d[1005] > 0.2 && d[1005] < 0.5, "30ms 이음");
assert.ok(H.includes("cls = pOn ? pvClusters(fxE)") && H.includes("pvRawPaste(buf, src, fxE.filter((f) => f.off).concat(pvBadSpans(cv)), sr)"), "미리듣기에 연결");
console.log("off-raw-exact ok");
