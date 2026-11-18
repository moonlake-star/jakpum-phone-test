// (11/18 15:31~15:50 사용자) V4 고치기 팝업: 손잡이 14칸 + ▼음▲8va · 확인/취소·듣기·닫기·자르기 버튼 없음 · 길이·이어짐 = 좌우 · 나머지 = 위아래 · V3로 바꿔 쓰기
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8"), A = fs.readFileSync(path.join(__dirname, "..", "adv.js"), "utf8");
const i = T.indexOf('if (v4) { d.classList.add("tfUni", "tfV4");'), mk = T.slice(i, T.indexOf("else if (uni)", i));
assert.ok(i > 0, "V4 창 있음");
for (const k of ["tin", "bin", "lin", "fine", "lout", "bout", "tout", "tilt", "vib", "fmt", "gain"]) assert.ok(mk.includes(`"${k}"`), "칸 " + k);
for (const k of ["data-raw", "data-r ", "data-snap", "data-oct", "data-vsw"]) assert.ok(mk.includes(k), "버튼 " + k);
assert.ok(!mk.includes("data-cut"), "자르기 버튼 없음(세로줄 ✂)");
assert.ok(!/확인|취소|닫기/.test(mk.replace(/aria-label="[^"]*"/g, "")), "확인/취소/닫기 없음");
const bld = T.slice(T.indexOf("function v4Build()"), T.indexOf("const buT = bu &&"));
const cell = (lbl) => { const m = bld.match(new RegExp(`sc\\("${lbl}"[^\\n]*`)); assert.ok(m, lbl); return m[0]; };
for (const l of ["앞이어짐", "앞길이", "뒤길이", "뒤이어짐"]) assert.ok(!/vert: true/.test(cell(l)), l + " = 좌우");
for (const l of ["앞상하", "전체상하", "뒤상하", "기울기", "비브라토", "포먼트", "게인"]) assert.ok(/vert: true/.test(cell(l)), l + " = 위아래");
assert.ok(A.includes("function v4Param(st, cv, b, key)") && A.includes("v4Param,"), "adv.js v4Param");
assert.ok(A.includes("(o.px || 16)"), "칸마다 끄는 감도");
assert.ok(T.includes('localStorage.getItem("tune_fix_v") !== "3"'), "V4 기본 · V3로 바꿔 쓰기");
assert.ok(T.includes("st.v4 && st.sel") && T.includes("(st.v4 && !mn)"), "고른 음만 밝게 · 가운데로");
console.log("v4-popup ok");
