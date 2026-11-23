// (11/24 사용자 '새로고침 알림을 절대 빠뜨리지 마') 공용 스크립트 ?v= = 파일 내용 지문.
// tune.js 등을 고치고 ?v= 를 안 올리면 이 시험이 실패 → 폰 서비스 워커가 옛 스크립트를 계속 쓰는 일(11/23 보정창 수정 미반영)을 병합 전에 막음.
// 고치는 법: node scripts/bump-versions.js
const assert = require("assert");
const { run } = require("../scripts/bump-versions.js");
const bad = run(true);
assert.deepStrictEqual(bad, [], "스크립트 버전이 내용과 다름 — node scripts/bump-versions.js 실행:\n" + bad.join("\n"));
console.log("asset-versions ok");
