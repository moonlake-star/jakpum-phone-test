// (11/10 12:44 사용자 '맥북 크롬에서 왼쪽으로만 스크롤') 휠이 이어지는 동안엔 가려던 시각을 기준으로 더함(재생기가 앞쪽으로 맞춰도 오른쪽으로 감)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
assert.ok(T.includes("st.wheelT != null && now_ - (st.wheelAt || 0) < 400 ? st.wheelT : (+getT() || 0)") && T.includes("st.wheelT = nt; st.wheelAt = now_;"), "휠 누적");
// 흉내: 재생기가 시각을 0.05초 앞쪽으로 맞춤, 휠은 +0.03초씩
let cur = 10, st = {}; const getT = () => cur, seek = (t) => { cur = Math.floor(t / 0.05) * 0.05; };
for (let i = 0; i < 20; i++) { const now_ = 1000 + i * 16, base = st.wheelT != null && now_ - (st.wheelAt || 0) < 400 ? st.wheelT : getT(); const nt = base + 0.03; st.wheelT = nt; st.wheelAt = now_; seek(nt); }
assert.ok(cur > 10.5, "오른쪽으로 감 " + cur);
console.log("wheel-accum ok");
