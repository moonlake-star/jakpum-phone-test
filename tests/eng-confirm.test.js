// (11/09 21:23 사용자) A/B에서 고르면 몰래 엔진이 바뀌던 것 → 확인 창 · 리버브 기본 20%
const assert = require("assert"), fs = require("fs"), path = require("path");
const A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8"), H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(A.includes("이 곡 보정 엔진을 ${nm}(으)로 바꿀까요?") && A.includes('x.dataset.cf === "1" ? { engine: en, engine_pick: k } : { engine_pick: k }'), "확인 창에서만 엔진 바꿈");
assert.ok(!A.includes("→ 이 곡 보정 엔진으로 정했어요"), "옛 문구 없음");
assert.ok(H.includes("r.result?.wet_gain ?? 0.0288"), "리버브 기본 20%");
console.log("eng-confirm ok");
