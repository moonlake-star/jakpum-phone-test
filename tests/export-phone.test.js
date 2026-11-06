// 앱의 '폰에서 바로 mp3 만들기'(mkExportPhone)가 지금 트랙·배합 그대로 합쳐 mp3를 만드는지(브라우저 부품은 가짜로)
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), a = html.indexOf("async function mkExportPhone"), b = html.indexOf("let mkU = null;");
assert.ok(a > 0 && b > a, "함수를 찾음");
const X = require("../export/export-core.js"), lame = new Function(fs.readFileSync(__dirname + "/../export/lame.min.js", "utf8") + "; return lamejs;")();
const sr = 48000, n = sr * 3, mk = (f, ch = 1) => ({ sampleRate: sr, length: n, numberOfChannels: ch, getChannelData: (c) => Float32Array.from({ length: n }, (_, i) => 0.3 * Math.sin(2 * Math.PI * f * i / sr + c)) });
(async () => {
  const env = { ExportCore: X, mkTracks: { p1: { buf: mk(220) }, w1: { buf: mk(220, 2) }, mr: { buf: mk(110, 2) }, p0: { buf: mk(200) } }, mkLastGain: { p1: 1.2, w1: 0.05, mr: 0.9, p0: 0 }, mkPhone: null,
    pvLoadScript: async () => { globalThis.lamejs = lame; }, PVP: { busy: () => false, jobs: [] }, mkApply() {}, lamejs: lame };
  const f = new Function("env", `with (env) { ${html.slice(a, b)}\n env.run = mkExportPhone; }`); f(env);
  const msgs = []; const o = await env.run({}, { result: { settings: {} } }, (s) => msgs.push(s));
  console.log("폰에서 만든 mp3:", (o.blob.size / 1024).toFixed(0), "KB, 최종 LUFS", o.lufs.toFixed(2), "단계:", [...new Set(msgs.map((s) => s.replace(/\d+%/, "")))].join(" / "));
  assert.ok(o.blob.size > 100000 && Math.abs(o.lufs + 14) < 0.1, "−14 LUFS 목표로 mp3가 만들어짐");
  assert.ok(msgs.some((s) => /합치고/.test(s)) && msgs.some((s) => /mp3 만드는/.test(s)), "진행 안내");
  // 소리 없는 트랙만 켜져 있으면(0 배율) 친절히 실패
  env.mkLastGain = { p1: 0 }; await assert.rejects(env.run({}, { result: {} }, () => {}), /합칠 소리/);
  console.log("export-phone ok");
})().catch((e) => { console.error(e); process.exit(1); });
