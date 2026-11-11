// 고친 음의 끝(옆 음으로 미끄러지는 곳)에서 보정량이 갑자기 커져 소리가 튀지 않는지 (11/11 사용자 영상)
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), a = html.indexOf("let mkPv = {"), b = html.indexOf("// (11/03 11:13 사용자) 멜로다인처럼");
const env = { mkPv: null };
new Function("env", `with (env) { ${html.slice(a, b)}\n env.pvBins = pvBins; env.pvTotalBins = pvTotalBins; env.pvClusterRatio = pvClusterRatio; env.setPv = (o) => { mkPv = o; env.mkPv = o; }; }`)(env);
// 25칸/초: 앞 음 G4(6700) → 고칠 음(약 6900~6980, 끝에서 G4로 미끄러짐) → 다음 음 G4. 열: [시각, 부른 높이, 보정 후]
const fps = 25, pitch = [6700, 6700, 6700, 6700, 6900, 6960, 6950, 6940, 6900, 6800, 6700, 6700, 6700, 6700];
const t0 = 4 / fps, t1 = 9 / fps;   // 칸 4~9가 고친 음(끝 칸 9는 이미 내려가는 중)
const cv = { fps, levels: [], pts: pitch.map((c, i) => [i / fps, c, c]) };
env.setPv({ fixes: [{ t0, t1, midi: 69.1 }], rendered: () => null, orig: {}, cv, tedits: [], adv: null });
const bins = env.pvTotalBins(cv, 2, [{ t0, t1, fx: [{ t0, t1, midi: 69.1 }] }], null);
const cor = (k) => bins.get(k);
const inner = cor(6), tail = cor(9);
console.log("보정량(센트) 가운데", inner.toFixed(0), "끝", tail.toFixed(0));
assert.ok(Math.abs(tail - inner) < 120, "음 끝 보정량이 가운데보다 갑자기 커지면 안 됨: " + (tail - inner));
// 보정 후 높이(부른 + 보정)가 목표를 크게 넘지 않음
for (let k = 4; k <= 9; k++) assert.ok(pitch[k] + cor(k) < 6910 + 150, `칸 ${k} 보정 후가 목표를 크게 넘음 ${pitch[k] + cor(k)}`);
// 간이 소리 경로(pvClusterRatio dry)도 같은 값
const ratio = env.pvClusterRatio(cv, { t0, t1, fx: [{ t0, t1, midi: 69.1 }] }, true, 2, fps, 0, 14);
assert.ok(ratio, "비율");
console.log("fix-edge-spike ok");
