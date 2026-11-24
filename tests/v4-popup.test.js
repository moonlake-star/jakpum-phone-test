// (11/18 15:31~15:50 사용자) V4 고치기 팝업: 손잡이 14칸 + ▼음▲8va · 확인/취소·듣기·닫기·자르기 버튼 없음 · 길이·이어짐 = 좌우 · 나머지 = 위아래 · V3로 바꿔 쓰기
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
const i = T.indexOf('if (v4) { d.classList.add("tfUni", "tfV4");'), mk = T.slice(i, T.indexOf("else if (uni)", i));
assert.ok(i > 0, "V4 창 있음");
for (const k of ["tin", "bin", "fine", "bout", "tout", "tilt", "vib", "fmt", "gain"]) assert.ok(mk.includes(`"${k}"`), "칸 " + k);
// (11/24 사용자 C안 발전) 윗줄 5칸(앞길이·뒤길이 칸 없음) · 가운데 전체상하 패드 좌우 = 앞/뒤 길이(무디게) · 아랫줄 기울기·비브라토·게인·포먼트·옥타브·원음·자동
assert.ok(mk.includes('["tin", "bin", "fine", "bout", "tout"]') && !T.includes('put_("lin"') && !T.includes('put_("lout"'), "윗줄 5칸");
assert.ok(T.includes('hAlt: { dead: 42, l: { label: "앞길이", ...tIn') && T.includes('r: { label: "뒤길이", ...tOut') && T.includes('c.classList.add("tfV4Key")'), "가운데 패드 좌우 = 길이");
{ const r = mk.slice(mk.indexOf("data-v4b>")), ix = ["data-slot=\"tilt\"", "data-slot=\"vib\"", "data-slot=\"gain\"", "data-slot=\"fmt\"", "data-oct", "data-raw", "data-r "].map(k => r.indexOf(k));
  assert.ok(ix.every((v, i) => v > 0 && (i === 0 || v > ix[i - 1])), "아랫줄 순서 " + ix); }
{ const A2 = fs.readFileSync(__dirname + "/../adv.js", "utf8"); assert.ok(A2.includes("HZ = o.hAlt ? (o.hAlt.dead || DZ * 3) : DZ") && A2.includes("d.x < r_.left + r_.width / 2 ? o.hAlt.l : o.hAlt.r"), "좌우 무디게 · 시작 위치로 앞/뒤"); }
assert.ok(!mk.includes("data-snap"), "자석 뺌(11/18 16:56)");
assert.ok(!mk.includes("data-vsw") && !mk.includes("data-d="), "V3 버튼·▲▼ 줄 없음(11/18 16:59 — 위 V4 버튼 · 전체상하 꾹 = 반음)");
for (const k of ["data-raw", "data-r ", "data-oct", "data-p"]) assert.ok(mk.includes(k), "버튼 " + k);
assert.ok(!mk.includes("data-cut"), "자르기 버튼 없음(세로줄 ✂)");
assert.ok(!/확인|취소|닫기/.test(mk.replace(/aria-label="[^"]*"/g, "")), "확인/취소/닫기 없음");
const bld = T.slice(T.indexOf("function v4Build()"), T.indexOf("const buT = bu &&"));
const cell = (lbl) => { const m = bld.match(new RegExp(`sc\\("${lbl}"[^\\n]*`)); assert.ok(m, lbl); return m[0]; };
for (const l of ["앞이어짐", "뒤이어짐"]) assert.ok(!/vert: true/.test(cell(l)), l + " = 좌우");
for (const l of ["앞상하", "전체상하", "뒤상하", "기울기", "비브라토", "포먼트", "게인"]) assert.ok(/vert: true/.test(cell(l)), l + " = 위아래");
assert.ok(A.includes("function v4Param(st, cv, b, key)") && A.includes("v4Param,"), "adv.js v4Param");
assert.ok(A.includes("(o.px || 16)") && A.includes("d0.semi = true") && A.includes("o.dead || 7") && A.includes("if (o.noTap) return;"), "칸마다 끄는 감도 · 꾹 0.5초 큰 단위 · 무딘 구간 · 한 번 톡 안 바뀜");
assert.ok(T.includes('localStorage.getItem("tune_fix_v") !== "3"'), "V4 기본 · V3로 바꿔 쓰기");
assert.ok(T.includes("st.v4 && st.sel") && T.includes("(st.v4 && !mn)"), "고른 음만 밝게 · 가운데로");
console.log("v4-popup ok");
