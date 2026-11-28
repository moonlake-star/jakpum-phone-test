// (11/24 노트북 진단) 라이브·방송본 원곡: 몰래 바꾸지 않고 곡 줄에 '공식 음원으로 바꾸기'(누른 곡만)
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const src = T.slice(T.indexOf("const SONG_UNOFF = ["), T.indexOf("async function songAdd() {"));
const songLib = { open: null }, f = new Function("isStaffApp", "esc", "songLib", src + "; return songSrcNote;")(() => false, (s) => s, songLib);
assert.ok(f({ d: { status: "done", src: { title: "[Special Clip] Yu Dabin - Someday (Live ver.)" }, title: "언젠가는", artist: "유다빈밴드" } }) === "", "접힌 곡은 버튼 없음");
songLib.open = "F1"; assert.ok(!f({ folder: "F1", d: { status: "done", src: { title: "x Live ver." } } }).includes("data-slo"), "(11/28 사용자) 버튼 숨김 — 펼친 곡도 없음"); songLib.open = null;
assert.ok(T.includes("const SONG_SRC_BTN = false;") && T.includes('const SONG_UNOFF = ["live"'), "판정 목록은 그대로");
assert.strictEqual(f({ d: { status: "done", src: { title: "최백호 - 낭만에 대하여 [낭만이즈백]" } } }), "", "방송본도 버튼 없음");
assert.strictEqual(f({ d: { status: "done", src: { title: "이문세-빗속에서 Cover by Localhero (라플람공연)" } } }), "", "커버는 없음");
assert.strictEqual(f({ d: { status: "done", src: { title: "언젠가는" } } }), "", "공식 음원은 없음");
assert.ok(f({ d: { status: "done", src_swap_req: "t", src: { title: "x live" } } }).includes("바꾸는 중"), "요청 뒤 진행 표시");
assert.strictEqual(f({ ref: true, d: { status: "done", src: { title: "x live" } } }), "", "공유받은 곡은 없음");
assert.ok(T.includes("x.d = { ...x.d, src_swap_req: new Date().toISOString(), updated: new Date().toISOString() }; await songWrite(x);"), "누르면 요청 저장");
console.log("song-official OK");
