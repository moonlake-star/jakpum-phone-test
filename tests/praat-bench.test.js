// Praat(브라우저용) 폰 측정 화면: 파일이 다 있고, 압축본이 진짜 wasm이고, GPL 소스·수정 내역 고지가 있는지
const fs = require("fs"), zlib = require("zlib"), assert = require("assert");
const d = __dirname + "/../bench/praat/", html = fs.readFileSync(d + "index.html", "utf8");
for (const f of ["index.html", "praat_web.js", "praat_web.wasm.gz", "praat-6.1.38-patches.diff", "makefile.defs.emscripten"]) assert.ok(fs.existsSync(d + f), f + " 있어야 함");
const wasm = zlib.gunzipSync(fs.readFileSync(d + "praat_web.wasm.gz"));
assert.deepStrictEqual(Array.from(wasm.subarray(0, 4)), [0, 0x61, 0x73, 0x6d], "wasm 머리말");
assert.ok(WebAssembly.validate(wasm), "wasm이 올바른 파일");
assert.ok(html.includes("praat_web.wasm.gz") && html.includes("PraatModule") && html.includes("github.com/praat/praat/tree/v6.1.38") && html.includes("GPL"), "연결·소스 고지");
assert.ok(!/Praat_tests|melder_audio/.test(html), "화면에 불필요한 것 없음");
const diff = fs.readFileSync(d + "praat-6.1.38-patches.diff", "utf8"); assert.ok(diff.includes("melder_tensor.h"), "수정 내역");
console.log("praat-bench ok");
