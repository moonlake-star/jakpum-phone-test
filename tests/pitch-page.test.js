// 음정 연습 페이지(pitch/index.html): 공개 저장소 안전 규칙 + 핵심 계산이 깨지지 않았는지
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
// 1) 외부로 나가는 코드 없음(스크립트·이미지·통신) — 데이터는 이 폰의 localStorage에만
assert.ok(!/<script[^>]+src=/i.test(src), "외부 스크립트 금지");
assert.ok(!/\bfetch\(|XMLHttpRequest|sendBeacon|WebSocket/.test(src), "네트워크 전송 금지");
assert.ok(/name="robots" content="noindex"/.test(src), "검색 노출 금지");
// 2) 공개 저장소: 데모 이름은 가명만
for (const real of ["김하늘", "정우진", "최예린", "한도윤", "송지아", "이서연", "박민준"]) assert.ok(!src.includes(real), "실명 의심: " + real);
// 3) 스크립트 문법
const js = src.match(/<script>([\s\S]*)<\/script>/)[1];
new Function(js);
// 4) 핵심 함수 존재(마이크·피치·코스·비브라토)
for (const k of ["getUserMedia", "function yin(", "function genLine(", "function vibTick(", "function stopSession("]) assert.ok(js.includes(k), "누락: " + k);
// 5) 코스 라인 생성: 같은 씨앗이면 같은 라인, 난이도·스테이지마다 음이 있고 음역이 합리적
const body = js.slice(js.indexOf("const LM ="), js.indexOf("/* ============ course state + UI"));
const prelude = "const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const mod=(a,n)=>((a%n)+n)%n;" + js.match(/function rng\(seed\)[^\n]*\n/)[0] +
  js.match(/const DF = \{[\s\S]*?\n\};\n/)[0];
const genLine = new Function(prelude + body + "\nreturn genLine;")();
for (const diff of ["easy", "normal"]) for (const st of [0, 1, 2]) for (const seed of [11, 23, 37, 4242]) {
  const a = genLine(st, seed, diff, 55), b = genLine(st, seed, diff, 55);
  assert.deepStrictEqual(a.notes, b.notes, "같은 씨앗 → 같은 라인");
  assert.ok(a.notes.length >= 3, "음 개수");
  assert.ok(a.minM >= 36 && a.maxM <= 84, `음역 ${diff} s${st} ${seed}: ${a.minM}-${a.maxM}`);
  for (let i = 1; i < a.notes.length; i++) assert.ok(a.notes[i].t0 >= a.notes[i - 1].t0 + a.notes[i - 1].d - 1e-9, "음이 겹치지 않음");
}

// 6) 발성 스케일(믹스보이스): 성별·스케일·난이도 조합마다 겹치지 않고, 음역이 코스 레인(28음) 안이며, 같은 설정이면 같은 라인
const genScale = new Function(prelude + body + "\nreturn genScaleLine;")();
for (const g of ["m", "f"]) for (const k of ["five", "tri", "arp"]) for (const off of [-4, 0, 4]) for (const diff of ["easy", "normal"]) {
  const a = genScale({ g, k, off }, diff), b = genScale({ g, k, off }, diff);
  assert.deepStrictEqual(a.notes, b.notes, "스케일: 같은 설정 → 같은 라인");
  assert.ok(a.reps >= 1 && a.end < 330, `스케일 길이 ${g}${k}${off}${diff}`);
  assert.ok(a.maxM - a.minM <= 26, `스케일 음역 ${g}${k}${off}${diff}: ${a.maxM - a.minM}`);
  for (let i = 1; i < a.notes.length; i++) assert.ok(a.notes[i].t0 >= a.notes[i - 1].t0 + a.notes[i - 1].d - 1e-9, "스케일: 음이 겹치지 않음");
  assert.ok(a.notes.every(n => n.m >= 36 && n.m <= 84), "스케일: 음역 범위");
}
assert.ok(js.includes("id=\"v-scale\"") || src.includes('id="v-scale"'), "발성 탭 화면 누락");
console.log("pitch-page ok");
