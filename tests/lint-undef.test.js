// 점검(11/14): 정의 안 된 변수·같은 이름 두 번 정의 같은 '실제 버그'만 잡는 자동 검사(ESLint). 옛 사고: #663 주석에 코드가 먹혀 cx 없음, #684 코드가 엉뚱한 창에 들어가 dirty·draft 없음
// 로컬에 eslint가 없으면 건너뜀(CI는 먼저 설치함: npm i --no-save eslint@9 globals)
const fs = require("fs"), path = require("path"), os = require("os"), assert = require("assert");
let ESLint, globals;
try { ({ ESLint } = require("eslint")); globals = require("globals"); } catch { console.log("lint-undef SKIP (eslint 없음)"); process.exit(0); }
const root = path.join(__dirname, "..");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vnlint-"));
const files = [];
const inline = (html, out) => { const s = fs.readFileSync(path.join(root, html), "utf8"); const m = [...s.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).filter(x => x.length > 2000)[0];
  assert.ok(m, html + "에서 큰 인라인 스크립트를 찾지 못함"); const f = path.join(tmp, out); fs.writeFileSync(f, m); files.push(f); };
inline("teacher/index.html", "teacher_inline.js"); inline("student/index.html", "student_inline.js");
for (const f of ["tune.js", "adv.js", "brand.js", "pitch-embed.js", "lesson-replies.js"]) { const d = path.join(tmp, f); fs.copyFileSync(path.join(root, f), d); files.push(d); }
(async () => {
  const eslint = new ESLint({ cwd: tmp, overrideConfigFile: true, overrideConfig: [{ files: ["**/*.js"],
    languageOptions: { ecmaVersion: 2023, sourceType: "script", globals: { ...globals.browser, ...globals.es2021,
      // 따로 불러오는 스크립트가 만드는 전역(없으면 거짓 경고)
      Brand: "readonly", Tune: "readonly", TuneAdv: "readonly", google: "readonly", PraatCore: "readonly", PraatModule: "readonly", ExportCore: "readonly", Pitch: "readonly", PitchEmbed: "readonly", LessonReplies: "readonly" } },
    rules: { "no-undef": "error", "no-dupe-keys": "error", "no-dupe-args": "error", "no-const-assign": "error", "no-func-assign": "error", "no-dupe-else-if": "error", "no-duplicate-case": "error", "use-isnan": "error", "valid-typeof": "error", "no-unsafe-finally": "error", "getter-return": "error", "no-setter-return": "error" } }] });
  const res = await eslint.lintFiles(files);
  const skipped = res.filter(r => r.messages.some(m => /ignored/i.test(m.message)));
  assert.strictEqual(skipped.length, 0, "검사에서 제외된 파일이 있음(설정 오류): " + skipped.map(r => path.basename(r.filePath)).join(", "));
  assert.strictEqual(res.length, files.length, "검사 결과 수가 파일 수와 다름");
  const errs = res.flatMap(r => r.messages.filter(m => m.severity === 2).map(m => `${path.basename(r.filePath)}:${m.line}:${m.column} ${m.ruleId} ${m.message}`));
  assert.strictEqual(errs.length, 0, "정의 안 된 변수 등 실제 버그 후보:\n" + errs.slice(0, 20).join("\n"));
  console.log("lint-undef OK (" + files.length + "개 파일)");
})().catch((e) => { console.error(e.message || e); process.exit(1); });
