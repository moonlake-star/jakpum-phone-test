// (11/09 사용자 '다른 앱 재생 중 보컬노트를 틀면 다른 앱이 잠깐 멈췄다 작게 나오고 겹침') 재생 중 소리 없는 오디오 태그를 같이 돌려 다른 앱을 멈추게 함
// 실제 안드로이드 동작은 검증하지 않음(mock만): 켜기·끄기·다른 앱이 시작해 태그가 멈추면 재생 멈춤·우리가 멈춘 건 무시
const fs = require("fs"), assert = require("assert");
const B = fs.readFileSync(__dirname + "/../brand.js", "utf8");
const a = B.indexOf("  const FH = {"), b = B.indexOf("  const audioKeep = (fn)");
assert.ok(a > 0 && b > a, "포커스 코드 위치");
const made = []; let revoked = 0;
class Aud { constructor() { this.paused = true; this.l = {}; this.plays = 0; this.pauses = 0; made.push(this); }
  addEventListener(t, f) { this.l[t] = f; } setAttribute() {}
  play() { this.paused = false; this.plays++; return Promise.resolve(); } pause() { this.paused = true; this.pauses++; } emit(t) { this.l[t] && this.l[t](); } }
const URLm = { createObjectURL: () => "blob:silent" }, Blobm = class { constructor(p, o) { this.p = p; this.o = o; } };
const api = new Function("Audio", "URL", "Blob", "Date", "Uint8Array", "DataView", B.slice(a, b) + "; return { focusHold, silentWav };")(Aud, URLm, Blobm, Date, Uint8Array, DataView);
// (1) 켜면 소리 없는 태그 하나만 만들어 재생, 두 번 켜도 하나
let lost = 0; api.focusHold("song", true, () => lost++); api.focusHold("mk", true, () => lost++);
assert.strictEqual(made.length, 1); assert.strictEqual(made[0].plays, 1); assert.strictEqual(made[0].loop, true);
// (2) 하나만 꺼서는 안 멈춤, 다 끄면 멈춤(우리가 멈춘 이벤트는 무시 → 재생 중단 콜백 호출 안 됨)
api.focusHold("song", false); assert.strictEqual(made[0].pauses, 0); api.focusHold("mk", false); assert.strictEqual(made[0].pauses, 1);
made[0].emit("pause"); assert.strictEqual(lost, 0, "우리가 멈춘 것은 뺏긴 게 아님");
// (3) 다른 앱이 소리를 시작해 태그가 밖에서 멈춤 → 모든 사용자에게 알림(재생 멈춤)
const wait = () => new Promise(r => setTimeout(r, 850));
(async () => {
  await wait(); api.focusHold("song", true, () => lost++); made[0].paused = true; made[0].emit("pause"); assert.strictEqual(lost, 1, "밖에서 멈추면 재생 멈춤"); 
  made[0].paused = true; made[0].emit("pause"); assert.strictEqual(lost, 1, "한 번만");
  // (4) 멈췄다 바로 다시 켠 경우(이벤트가 늦게 옴) 오작동 없음
  api.focusHold("mk", true, () => lost++); api.focusHold("mk", false); api.focusHold("mk", true, () => lost++); made[0].paused = false; made[0].emit("pause"); assert.strictEqual(lost, 1);
  // (5) 무음 파일: 8000Hz 8비트 모노 1초, 값 128(무음)
  const w = new Function("URL", "Blob", "Uint8Array", "DataView", B.slice(a, b).replace("return { focusHold, silentWav };", "") + "; let cap; const O = URL.createObjectURL; URL.createObjectURL = (x) => { cap = x; return 'b'; }; silentWav(); return cap;")(URLm, Blobm, Uint8Array, DataView);
  const bytes = w.p[0]; assert.strictEqual(bytes.length, 44 + 8000); assert.strictEqual(String.fromCharCode(...bytes.slice(0, 4)), "RIFF"); assert.ok(bytes.slice(44).every(x => x === 128), "무음");
  // (6) 연결 확인
  const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
  assert.ok(/focusHold,/.test(B) && T.includes('Brand.focusHold?.("mk", true') && T.includes('Brand.focusHold?.("mk", false)'));
  for (const src of [T, S]) { assert.ok(src.includes('Brand.focusHold?.("song", on, lost)')); assert.ok(src.includes("fh(true)") && src.includes("fh(false)")); }
  console.log("audio-focus ok");
})();
