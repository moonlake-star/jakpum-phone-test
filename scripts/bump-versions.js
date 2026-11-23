#!/usr/bin/env node
// (11/24 사용자 '앱 수정 후 버전이 바뀌면 새로고침 알림을 절대 빠뜨리지 마')
// 화면이 부르는 공용 스크립트(../tune.js?v=… 등)의 ?v= 를 '파일 내용의 지문'으로 맞춘다.
//   - 선생님 서비스 워커는 ?v= 가 같으면 폰에 저장된 옛 스크립트를 계속 쓴다 → 사람이 ?v= 올리기를 잊으면 고친 코드가 폰에 영영 안 감(11/23 보정창 수정이 그랬음)
//   - 내용이 바뀌면 지문이 바뀌고 → 주소가 바뀌어 새로 받고 → 화면 글도 바뀌어 '✨ 새 버전' 알림이 뜬다
// 사용: node scripts/bump-versions.js        (고쳐 씀)
//       node scripts/bump-versions.js --check (안 맞으면 실패 — tests/asset-versions.test.js 가 이걸 씀)
const fs = require("fs"), path = require("path"), crypto = require("crypto");
const ROOT = path.join(__dirname, "..");
const PAGES = ["teacher/index.html", "student/index.html"];
const RE = /(src="\.\.\/)([\w.-]+\.js)\?v=([\w-]+)"/g;
const fp = (file) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, file))).digest("hex").slice(0, 10);
function run(check) {
  const bad = [];
  for (const pg of PAGES) {
    const p = path.join(ROOT, pg), src = fs.readFileSync(p, "utf8");
    const out = src.replace(RE, (all, pre, file, v) => { const want = fp(file); if (v !== want) bad.push(`${pg}: ${file} ?v=${v} → ${want}`); return `${pre}${file}?v=${want}"`; });
    if (!check && out !== src) fs.writeFileSync(p, out);
  }
  return bad;
}
if (require.main === module) {
  const check = process.argv.includes("--check"), bad = run(check);
  if (bad.length) console.log(bad.join("\n"));
  if (check && bad.length) { console.error("스크립트 버전(?v=)이 내용과 다름 → node scripts/bump-versions.js 실행"); process.exit(1); }
  if (!bad.length) console.log("스크립트 버전 모두 최신");
}
module.exports = { run, fp };
