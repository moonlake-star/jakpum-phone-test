// (11/01 사용자) 강사 체험 보기: '_체험시스템' 설정(demo_readonly)이면 보기 전용 — 쓰기 막음·안내 띠·버튼 숨김. 진짜 '_시스템'이 먼저.
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const lc = src.match(/async function loadConfig\(\) \{[\s\S]*?\n\}\n/)[0];
assert.ok(lc.indexOf("name='_시스템'") < lc.indexOf("name='_체험시스템'"), "진짜 설정 먼저 찾고, 없을 때만 체험 설정");
assert.ok(lc.includes("cfg.demo_readonly !== true) continue"), "보기 전용 표시가 없는 체험 설정은 안 씀");
assert.ok(/if \(typeof isDemo === "function" && isDemo\(\) && opt\.method && String\(opt\.method\)\.toUpperCase\(\) !== "GET"\)/.test(src), "드라이브 쓰기 막음");
assert.ok((src.match(/isDemo\(\)\) throw new Error\("체험용 보기 전용이라 저장되지 않아요"\)/g) || []).length >= 2, "캘린더·수강생 노트 서버 쓰기도 막음");
assert.ok(src.includes(".demoRO #btnPublish") && src.includes(".demoRO #v2Save"), "저장·공개 버튼 숨김");
// 동작: api가 쓰기 요청을 보내지 않음
let sent = 0; const toast = () => {}; let cfg = { demo_readonly: true };
const isDemo = () => cfg?.demo_readonly === true;
const api = new Function("isDemo", "toast", "fetch", "return async " + src.match(/function api\(url, opt = \{\}, retried = false\) \{\n[^\n]*\n/)[0] + "return 'sent'; }")(isDemo, toast, () => { sent++; });
api("https://x", { method: "PATCH" }).then(() => assert.fail("막혀야 함"), (e) => { assert.ok(/보기 전용/.test(e.message)); assert.strictEqual(sent, 0); console.log("demo-readonly ok"); });
