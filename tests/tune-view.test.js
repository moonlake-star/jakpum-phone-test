// (10/30 사용자) 튠 화면(음정선) · 원음/보정본 · 베스트 모아듣기
const fs = require("fs"), assert = require("assert");
require("../tune.js");
const T = globalThis.Tune;
const cv = { levels: [1, 2, 3], pts: [[0, 6600, 6610, 6620, 6630], [0.04, 6700, 6700, 6700, 6700]] };
assert.strictEqual(T.col(cv, 2), 3); assert.strictEqual(T.col(cv, 0), 0); assert.strictEqual(T.col(cv, 9), 0);
const r = T.range({ pts: Array.from({ length: 100 }, (_, i) => [i / 25, 6000 + i * 10]) });
assert.ok(r[0] < 6000 && r[1] > 6990 && r[0] % 50 === 0);
const st = fs.readFileSync(__dirname + "/../student/index.html", "utf8"), te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(st.includes('<script src="../tune.js"></script>') && te.includes('<script src="../tune.js"></script>'));
assert.ok(/✨ 보정본 = 음정 보정한 예시예요 · 실제 노래는 ‘원음’이에요/.test(st), "보정본엔 항상 안내");
assert.ok(/data-ab="o" class="on" aria-pressed="true">원음/.test(st), "수강생은 원음이 먼저");
assert.ok(/n\.makeup\?\.before_id, n\.makeup\?\.curve_id/.test(te), "원음·음정선도 게시 때 링크 열림");
assert.ok(/data-ab="0">보정 끔.*data-ab="1">보정 켬/.test(te) && /<details id="mkLvBox">/.test(te), "세기 4단계는 '자세히' 안에 그대로");
// 모아듣기 목록: 날짜순, 베스트 → 메이크업, 포함한 것만
const md = (d) => d, sidOk = (x) => typeof x === "string" && x.trim() !== "";
const makeupOk = new Function("sidOk", "return " + st.match(/const makeupOk = ([^\n]+);/)[1])(sidOk);
const albumTracks = new Function("md", "sidOk", "makeupOk", st.match(/function albumTracks\(ls\) \{[^]*?\n\}\n/)[0] + "return albumTracks;")(md, sidOk, makeupOk);
const ls = [{ id: "3", date: "10-25", best: { file_id: "B3" }, makeup: { file_id: "M3", source_file_id: "B3", before_id: "O3", curve_id: "C3" } },
  { id: "2", date: "10-18", best: { file_id: "B2" }, makeup: { file_id: "M2", source_file_id: "BX" } }, { id: "1", date: "10-11", best: null }];
const tr = albumTracks(ls);
assert.deepStrictEqual(tr.map(x => [x.id, x.mk]), [["B2", null], ["B3", "M3"]], "레슨마다 한 곡, 어긋난 메이크업본(원본 다름)은 빼고 날짜순");
assert.ok(tr[0].title.includes("2회차") && tr[1].curve === "C3");
console.log("tune-view ok");
