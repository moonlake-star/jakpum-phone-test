// (11/12 10:39 사용자 '쪼개기만 했는데 음이 튐') 고친 음 경계 보정량 = 서버 v3처럼 1차 지연 + 초당 900센트 제한 · 8센트 자르기 규칙 삭제
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(!H.includes("if (Math.abs(cor) < 8 && Number.isInteger(f.midi)) cor = 0;"), "8센트 자르기(0↔8 오락가락) 없음");
assert.ok(H.includes("if (teach.size) pvSmoothTeach(m, teach, fps, cv, lvCol);"), "경계 부드럽게 잇기 연결");
const src = H.slice(H.indexOf("function pvSmoothTeach("), H.indexOf("function pvShiftAt("));
const f = eval("(" + src.trim() + ")");
// 자동 보정 0센트인 이웃 사이에 고친 음(+60센트)
const m = new Map(), teach = new Set(); for (let k = 0; k < 60; k++) { const t = k >= 20 && k < 40; m.set(k, t ? 60 : 0); if (t) teach.add(k); }
f(m, teach, 25, { levels: [3] }, 2);
let mx = 0; for (let k = 1; k < 60; k++) mx = Math.max(mx, Math.abs(m.get(k) - m.get(k - 1)));
assert.ok(mx <= 900 / 25 + 1e-6, "한 칸(40ms) 최대 36센트로만 바뀜: " + mx.toFixed(1));
assert.ok(Math.abs(m.get(30) - 60) < 1e-6, "고친 음 가운데는 그대로");
assert.ok(m.get(5) === 0 && m.get(55) === 0, "멀리 떨어진 자동 보정 칸은 서버 값 그대로");
// 전체 보정을 바꾼 곡: 미리듣기도 완성본과 같은 계산(곡 전체)으로 바꿔 끼움
assert.ok(H.includes("pvFullVocal(name).then((y) => { if (F[name] === job && y) { job.y = y; try { pvApplyAll(); } catch {} } })") && H.includes('st.sig = "FULL" + gs;'), "미리듣기 = 완성본 계산");
console.log("fix-smooth ok");
