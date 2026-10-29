// (10/29 09:54 사용자 확정) 핵심 포인트에 소리 붙이기: 선생님이 고른 것 우선, 안 고르면 글·시각이 비슷한 것 자동 추천, '소리 없음'은 존중, 한 소리는 한 포인트에만
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (n) => { const m = src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n")); assert.ok(m, n); return m[0]; };
const sndTimes = src.match(/const sndTimes = [^\n]*\n/)[0];
const plan = new Function(grab("sndSim") + sndTimes + grab("pointSndPlan") + "return pointSndPlan;")();
const ch = [
  { key: "pair:K1", kind: "pair", file_id: "P1", text: "후렴 전에 숨을 먼저 채우기 호흡", t: 300 },
  { key: "clip:c2", kind: "clip", file_id: "C2", text: "고음에서 턱 힘 뺀 부분이 아주 좋았어요", t: 655 },
  { key: "clip:c3", kind: "clip", file_id: "C3", text: "전혀 다른 이야기", t: 900 },
];
const pts = ["후렴 들어가기 전에 숨을 먼저 채우기", "고음에서 턱 힘 빼기", "가사는 말하듯이"];
let p = plan(pts, ch, {});
assert.strictEqual(p[0]?.key, "pair:K1"); assert.strictEqual(p[1]?.key, "clip:c2"); assert.strictEqual(p[2], null, "비슷한 게 없으면 안 붙임");
assert.ok(p[0].auto && p[1].auto);
// 선생님이 고른 것 우선 + 같은 소리 두 번 안 붙임
p = plan(pts, ch, { 2: "pair:K1" });
assert.strictEqual(p[2].key, "pair:K1"); assert.strictEqual(p[2].auto, false); assert.notStrictEqual(p[0]?.key, "pair:K1");
// '소리 없음'은 자동 추천도 안 함
p = plan(pts, ch, { 0: "none" }); assert.strictEqual(p[0], null);
// 글에 같은 시각(±20초)이 적혀 있으면 추천
p = plan(["10:58 이 부분"], ch, {}); assert.strictEqual(p[0]?.key, "clip:c2");
// 없어진 소리를 골라 뒀으면 무시(자동으로)
p = plan(pts, ch, { 1: "clip:gone" }); assert.strictEqual(p[1]?.key, "clip:c2");
// 노트·화면 연결
assert.ok(/point_snd: pointSndForNote\(/.test(src) && /\.\.\.\(n\.point_snd \|\| \[\]\)\.map\(x => x\?\.file_id\)/.test(src), "노트에 싣고 공개 때 링크 열기");
assert.ok(src.includes('data-pvsnd="${i}"') && src.includes("(me.review.point_snd ??= {})[x.dataset.pvsnd] = x.value"));
console.log("point-snd ok");
