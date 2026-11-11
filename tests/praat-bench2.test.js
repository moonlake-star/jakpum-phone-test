// Praat 폰 측정 2: 워커·화면 양쪽 측정이 있고 기존 엔진 파일만 쓰는지
const fs = require("fs"), assert = require("assert"), D = __dirname + "/../bench/praat2/";
const h = fs.readFileSync(D + "index.html", "utf8"), w = fs.readFileSync(D + "worker.js", "utf8");
assert.ok(w.includes("importScripts") && w.includes("PraatCore.analyze") && w.includes("PraatCore.apply") && w.includes("praat_web.wasm.gz"), "워커 측정");
assert.ok(h.includes('new Worker("worker.js")') && h.includes("화면 최대 멈춤") && h.includes("결과 복사"), "화면");
for (const f of ["../../praat/praat_web.js", "../../praat/praat-core.js"]) assert.ok(w.includes(f) || h.includes(f), f);
console.log("praat-bench2 ok");
