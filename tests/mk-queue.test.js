// (11/15 사용자 시안 확정) 보컬 메이크업 여러 곡 담기: 파일 이름 짝 맞춤·카드·상태 목록을 앱 코드 그대로 시험
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const a = T.indexOf('const MK_SEP = '), b = T.indexOf("const mkReady");
assert.ok(a > 0 && b > a, "짝 맞춤 함수");
const cx = {}; vm.createContext(cx); vm.runInContext(T.slice(a, b) + "\nthis.mkPairFiles = mkPairFiles; this.mkRole = mkRole; this.mkBase = mkBase;", cx);
const F = (n) => ({ name: n, size: 10 });
assert.strictEqual(cx.mkRole("사랑비_vocal.wav"), "v"); assert.strictEqual(cx.mkRole("사랑비_MR.wav"), "m"); assert.strictEqual(cx.mkRole("Rain Vox.wav"), "v");
assert.strictEqual(cx.mkRole("rain-inst.flac"), "m"); assert.strictEqual(cx.mkRole("사랑비 보컬.wav"), "v"); assert.strictEqual(cx.mkRole("사랑비 반주.wav"), "m"); assert.strictEqual(cx.mkRole("x.mid"), "midi");
assert.strictEqual(cx.mkRole("Voice of love.wav"), "", "단어 일부(voice)는 역할 아님");
assert.strictEqual(cx.mkBase("사랑비_vocal.wav"), cx.mkBase("사랑비_MR.wav"));
// 보컬+MR 짝 · 대소문자·변형 · 짝 없는 곡 · 미디 붙이기
let r = cx.mkPairFiles([F("사랑비_vocal.wav"), F("사랑비_MR.wav"), F("Rain_VOX.wav"), F("rain_Inst.wav"), F("혼자_vocal.wav"), F("사랑비_melody.mid")], "two");
assert.strictEqual(r.items.length, 3);
const by = (t) => r.items.find(x => x.base === cx.mkBase(t));
assert.ok(by("사랑비.wav").v.name === "사랑비_vocal.wav" && by("사랑비.wav").m.name === "사랑비_MR.wav" && by("사랑비.wav").midi.name === "사랑비_melody.mid");
assert.ok(by("rain.wav").v.name === "Rain_VOX.wav" && by("rain.wav").m.name === "rain_Inst.wav");
assert.ok(by("혼자.wav").v && !by("혼자.wav").m, "짝 없음 → MR 비어 있음");
assert.strictEqual(r.midiLeft.length, 0);
// 한 파일 모드: 파일마다 카드 · 맞는 미디 없으면 남김
r = cx.mkPairFiles([F("곡A.m4a"), F("곡B.m4a"), F("다른곡.mid")], "single");
assert.strictEqual(r.items.length, 2); assert.strictEqual(r.midiLeft.length, 1);
r = cx.mkPairFiles([F("곡A.m4a"), F("아무거나.mid")], "single"); assert.ok(r.items[0].midi, "곡이 하나면 미디를 그 곡에");
// 화면 연결: 예전 한 곡 버튼 대신 대기열 · 같은 화면 상태 목록 · 서버가 대기 요청을 차례로 처리
assert.ok(T.includes('<div id="mkRun"></div><div id="mkQ"></div>') && T.includes("paintHabit(sid); mkQPaint(sid); mkRunPaint(sid);") && !T.includes('id="btnMkGo"'));
assert.ok(T.includes('곡 한꺼번에 메이크업 시작') && T.includes('파일 짝이 없어요 · 탭해서 추가') && T.includes('대기열의 다른 곡에도 같은 키 적용') && T.includes('＋ 곡 더 담기'));
assert.ok(T.includes('batch: batch.id') && T.includes('status: "canceled"') && T.includes('["queued", "waiting_download"].includes(cur.status)'), "취소는 아직 시작 안 한 곡만");
console.log("mk queue ok");
