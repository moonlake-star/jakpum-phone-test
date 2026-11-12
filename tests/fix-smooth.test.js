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
console.log("fix-smooth ok");
// (11/12 10:46 사용자 '대기 시간 없이 — 절대 원칙') 전체 보정 미리듣기 = 듣는 자리부터 2초씩 바로 끼움(다 기다리지 않음) · Praat 엔진은 한 번만 컴파일
const C = require("fs").readFileSync(__dirname + "/../praat/praat-core.js", "utf8"), W = require("fs").readFileSync(__dirname + "/../praat/praat-worker.js", "utf8");
assert.ok(H.includes("pvProgStart(name, gs); return false; }") && H.includes("async function pvProgRun(name, job)") && H.includes("const PV_PROG_CH = 2;"), "대기 없는 미리듣기");
assert.ok(H.includes("// 듣는 자리 → 그 앞 → 지나간 쪽") && H.includes("if (mkPlaying && k1 > pos && k0 < pos + 12 * sr) { try { mkPlay(mkNow()); } catch {} }"), "듣는 자리부터 · 바뀌면 같은 자리에서 이어 듣기");
assert.ok(C.includes("state.mod = await WebAssembly.compile(state.bin)") && C.includes("opt.instantiateWasm ="), "엔진 한 번만 컴파일");
assert.ok(W.includes('"praat-core.js" + (self.location.search || "")'), "워커도 새 엔진 코드");
console.log("progressive ok");
