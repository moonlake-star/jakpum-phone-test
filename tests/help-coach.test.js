// (11/12 18:06 사용자 고) 설명글: 위쪽 안내 띠 하나(상황별) · 💬 설명 켬/끔(기억, 꾹 = 처음 안내) · ✕ = 이 상황만 접기 · 옛 말풍선 안 그림
const assert = require("assert"), T = require("fs").readFileSync(__dirname + "/../tune.js", "utf8");
assert.ok(T.includes('const HELP_KEY = "tune_help_off";') && T.includes("localStorage.setItem(HELP_KEY, st.helpOff ? \"1\" : \"0\")"), "켬/끔 기억");
assert.ok(T.includes("if (tips.length && !st.dragging && !st.coachOwn)"), "옛 말풍선 대신 띠");
assert.ok(T.includes('["⇔", "분홍 선·양 끝 음표 끝 끌기", "비율로 늘이기"]') && T.includes('["‹›", "아래 ‹ › 꾹 0.5초 → 좌우", "길이"]') && T.includes('["✊", "빈 곳 꾹 0.5초 → 좌우", "여러 음 고르기"]'), "상황별 줄");
assert.ok(T.includes("if (st.coachHide && st.coachHide === k0) rows = [];"), "✕ = 이 상황만");
assert.ok(T.includes("if (!on || st.helpOff) return;") && T.includes("#tuneFs.helpOff .tfDockMsg,#tuneFs.helpOff .tfHint{visibility:hidden}"), "끄면 나머지 안내도 숨김");
assert.ok(T.includes("#tuneFs.tfTouch .tfCoach{opacity:.18}"), "손가락 닿는 동안 흐림");
console.log("help-coach ok");
