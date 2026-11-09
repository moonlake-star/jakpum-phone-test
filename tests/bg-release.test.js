// (11/05 사용자 '백그라운드로 가면 장치를 놔줘야') brand.js: 화면이 가려지면 쓰고 있지 않은 AudioContext를 모두 쉬게
const fs = require("fs"), assert = require("assert");
const B = fs.readFileSync(__dirname + "/../brand.js", "utf8");
const a = B.indexOf("const ACX = new Set()"), b = B.indexOf("  G.Brand = {");
assert.ok(a > 0 && b > a, "놓기 코드 위치");
const listeners = {}, doc = { hidden: false, addEventListener: (t, f) => (listeners["d:" + t] = f) };
class Ctx { constructor() { this.state = "running"; } suspend() { this.state = "suspended"; } }
const G = { AudioContext: Ctx, webkitAudioContext: Ctx, addEventListener: (t, f) => (listeners["w:" + t] = f) };
const api = new Function("G", "document", B.slice(a, b) + "; return { audioRelease, audioKeep };")(G, doc);
const c1 = new G.AudioContext(), c2 = new G.AudioContext(), c3 = new G.webkitAudioContext();
assert.ok(c1 instanceof Ctx, "원래 클래스 상속");
// 숨겨지면 모두 쉼
doc.hidden = true; listeners["d:visibilitychange"](); assert.deepStrictEqual([c1.state, c2.state, c3.state], ["suspended", "suspended", "suspended"], "숨겨지면 전부 쉼");
// 재생 중이라고 알린 것은 둠, 나머지는 쉼
for (const c of [c1, c2, c3]) c.state = "running";
api.audioKeep((c) => c === c2); listeners["d:visibilitychange"]();
assert.deepStrictEqual([c1.state, c2.state, c3.state], ["suspended", "running", "suspended"], "재생 중인 것은 둠");
// 탭을 닫거나 떠날 때도
for (const c of [c1, c2, c3]) c.state = "running"; listeners["w:pagehide"]();
assert.strictEqual(c1.state, "suspended"); assert.strictEqual(c2.state, "running");
// 보이는 상태로 돌아와도 억지로 깨우지 않음(쓸 때 각 화면이 깨움)
doc.hidden = false; listeners["d:visibilitychange"](); assert.strictEqual(c1.state, "suspended", "돌아와도 자동 재개 안 함");
// 닫힌 것은 목록에서 빠지고 오류 없음
c1.state = "closed"; assert.doesNotThrow(() => api.audioRelease());
// 화면 쪽 연결
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
assert.ok(T.includes("Brand.audioKeep?.((c) => (c === mkCtx && (mkPlaying || !!vtNow)) || (c === loudCtx && loudActive()))"), "선생님 앱: 재생 중 알림");
assert.ok(S.includes('if (c.state !== "running") c.resume(); clearTimeout(chime.t)') && S.includes("chime.c.suspend()"), "수강생 앱: 종소리 깨우기·쉬기");
console.log("bg-release: ok");
// (11/09) 메이크업 재생을 시작할 때 다른 소리 장치를 모두 쉬게 함(블루투스에서 장치가 여러 개 열려 있으면 볼륨이 꼬임)
{ const T2 = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/mkPlaying = true;\s*\n\s*try \{ Brand\.audioRelease\?\.\(\); \} catch \{\}/.test(T2), "재생 시작 때 audioRelease"); console.log("bg-release: 재생 시작 때 다른 장치 쉬기 연결 ok"); }
