// (11/09 11:18 사용자) 보컬은 한 음씩: 뒤 음을 당기면 앞 음이 그만큼 짧아져 보이게(서버와 같은 시간표로 그래프 전체 미리 옮김)
const assert = require("assert"), fs = require("fs"), path = require("path");
const T = fs.readFileSync(path.join(__dirname, "..", "tune.js"), "utf8");
assert.ok(T.includes("cv._twM = tmapOf(cv._tedits, dur)") && T.includes("if (M && M.length > 2) xs = (tt) => xs0(mapT(tt, M));"), "그래프 = 시간표로 옮김");
assert.ok(T.includes("g.strokeRect(xs0(te.t0)") && T.includes("const x0 = xs0(te.nt0), x1 = xs0(te.nt1);"), "원래 자리 점선·새 막대는 원래 좌표");
console.log("mono-warp ok");
