// 카톡 안내 멘트: 이름·오늘 내용·개인 노트 바로가기(같은 주소 + 레슨), 연달아 같은 틀 안 나옴
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => src.match(re)[0];
const code = [grab(/const KAKAO_TPL = \[[\s\S]*?\n\];\n/), grab(/function kakaoText[\s\S]*?\n}\n/), grab(/function nextTpl[^\n]*\n/)].join("\n");
const store = {}; const LS = { get: (k) => store[k] ?? null, set: (k, v) => { store[k] = v; } };
const cfg = { student_page_url: "https://x.github.io/jakpum-phone-test/student/" };
const f = new Function("LS", "cfg", "studentPage", code + "return {kakaoText, nextTpl, KAKAO_TPL};");
const { kakaoText, nextTpl, KAKAO_TPL } = f(LS, cfg, () => cfg.student_page_url);
const note = { lesson_id: "abc 1", highlight: "'오' 발음 잡은 브릿지" };
const ks = [nextTpl("S1"), nextTpl("S1"), nextTpl("S1")];
assert(ks[0] !== ks[1] && ks[1] !== ks[2]);
const t = kakaoText({ name: "김미영" }, note, ks[0]);
assert(t.includes("김미영님") && t.includes("'오' 발음 잡은 브릿지") && t.includes("👉 https://x.github.io/jakpum-phone-test/student/?l=abc%201"));
assert(!kakaoText({ name: "가" }, { lesson_id: "x" }, 0).includes("undefined"));
assert(new Set(KAKAO_TPL.map(fn => fn("가", "p"))).size === KAKAO_TPL.length);
console.log("kakao ok");
