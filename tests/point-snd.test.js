// (10/29 09:54 사용자 확정) 핵심 포인트에 소리 붙이기: 선생님이 고른 것 우선, 안 고르면 글·시각이 비슷한 것 자동 추천, '소리 없음'은 존중, 한 소리는 한 포인트에만
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (n) => { const m = src.match(new RegExp("function " + n + "\\([\\s\\S]*?\\n}\\n")); assert.ok(m, n); return m[0]; };
const sndTimes = src.match(/const sndTimes = [^\n]*\n/)[0];
const plan = new Function(grab("sndSim") + sndTimes + grab("pointSndPlan") + "return pointSndPlan;")();
const pTimes = (ai) => new Function("cur", grab("sndSim") + grab("pointTimes") + "return pointTimes;")({ ai });
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
// (10/29 10:47) AI가 포인트에 적은 레슨 시각과 겹치는 소리 우선 — 글이 안 비슷해도 붙고, 시각이 다르면 글이 웬만큼 비슷해도 안 붙음
{ const ch2 = [{ key: "clip:a", kind: "clip", file_id: "A", text: "마지막 부분 매우 잘했어요", a0: 920, a1: 935 }, { key: "pair:K2", kind: "pair", file_id: "P2", text: "공기 새는 소리", a0: 300, a1: 340 }];
  const pts2 = ["낮은 소리 단단하게", "잘 까지는 오 는 매끄럽게"];
  const tm = pTimes({ points: [{ text: "낮은 소리 단단하게", start: 310, end: 330 }, { text: "잘 까지는 '오', '는'을 매끄럽게", start: 915, end: 930 }] })(pts2);
  assert.deepStrictEqual(tm.map(x => x && x.start), [310, 915], "선생님이 조금 고친 포인트도 AI 포인트와 짝");
  const p2 = plan(pts2, ch2, {}, tm); assert.strictEqual(p2[0]?.key, "pair:K2"); assert.strictEqual(p2[1]?.key, "clip:a");
  const p3 = plan(["공기 새는 소리 잡기"], ch2, {}, [{ start: 900, end: 935 }]); assert.strictEqual(p3[0]?.key, "clip:a", "시각이 맞는 쪽");
  assert.strictEqual(plan(["완전히 다른 이야기"], ch2, {}, [{ start: 100, end: 120 }])[0], null); }
assert.ok(src.includes('<details class="pvSnd" id="pvSndBox"') && src.includes("따로 안 고쳐도 돼요"), "평소엔 접힌 한 줄");
console.log("point-snd ok");
