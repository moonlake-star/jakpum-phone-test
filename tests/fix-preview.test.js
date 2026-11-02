// (11/02 17:09 사용자) 고친 정음 폰 미리듣기: 그 구간만 음 높이를 옮김(길이 그대로), 원래대로 하면 되돌림
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.slice(src.indexOf("let mkPv = {"), src.indexOf("function mkStop() {"));
const ctx = { mkTracks: {}, mkPlaying: false };
const f = new Function("ctx", "let mkTracks = ctx.mkTracks, mkPlaying = false; const mkNow = () => 0, mkPlay = () => {};\n" + code + "\nreturn { pvShift, pvApply, pvApplyAll, get mkPv() { return mkPv; }, set mkPv(v) { mkPv = v; } };")(ctx);
const sr = 48000, n = sr, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = Math.sin(2 * Math.PI * 220 * i / sr);
const zc = (a, s, e) => { let c = 0; for (let i = s + 1; i < e; i++) if (a[i - 1] < 0 && a[i] >= 0) c++; return c / ((e - s) / sr); };
const y = f.pvShift(x, 2 ** (2 / 12));
assert.strictEqual(y.length, n, "길이 그대로");
const fr = zc(y, 4800, 43200); assert.ok(Math.abs(fr - 246.94) < 4, "2반음 올라감: " + fr);
// 트랙에 반영 → 되돌림
const ch = new Float32Array(x), buf = { sampleRate: sr, length: n, numberOfChannels: 1, getChannelData: () => ch };
ctx.mkTracks.p2 = { buf }; ctx.mkTracks.p0 = { buf: { sampleRate: sr, length: n, numberOfChannels: 1, getChannelData: () => new Float32Array(n) } };
f.mkPv = { fixes: [{ t0: 0.2, t1: 0.8, midi: 59 }], rendered: () => 57, orig: {} };
assert.ok(f.pvApply("p2")); assert.ok(!f.pvApply("p0"), "보정 끔 트랙은 그대로");
assert.ok(Math.abs(zc(ch, 0.35 * sr, 0.65 * sr) - 246.94) < 5, "그 구간만 옮김"); assert.ok(Math.abs(zc(ch, 0.84 * sr, 1.0 * sr - 1) - 220) < 9, "구간 밖은 그대로");
f.mkPv.fixes = []; assert.ok(f.pvApply("p2")); assert.ok(Math.abs(zc(ch, 0.35 * sr, 0.65 * sr) - 220) < 4, "고침을 지우면 원래 소리");
assert.ok(src.includes("try { pvApply(name); } catch {}") && src.includes("mkPv.fixes = r.target_fixes.slice(); try { pvApplyAll(); }"));
console.log("fix-preview ok");
