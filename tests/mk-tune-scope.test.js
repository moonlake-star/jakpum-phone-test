// (11/02 15:29) 메이크업 화면 음정선이 늘 검은 칸: tuneOk/curveF가 if 블록 안 const라 아래에서 ReferenceError(그 뒤 버튼 연결도 멈춤)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const f = src.slice(src.indexOf("async function openMkJob("), src.indexOf("\n}\n", src.indexOf("async function openMkJob(")));
assert.ok(/let curveF = null, tuneOk = false;/.test(f), "함수 맨 위에서 선언");
assert.ok(!/const curveF\b/.test(f) && !/tuneOk = hasP && curveF && typeof Tune/.test(f.replace("tuneOk = !!(hasP", "")), "블록 안 const 금지");
assert.ok(f.indexOf("let curveF = null") < f.indexOf("if (tuneOk) tunePending"));
console.log("mk-tune-scope ok");
