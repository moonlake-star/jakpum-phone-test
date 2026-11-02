// (11/02 사용자) 수강생 '나의 성장': 낮아진 날 격려 문구(사실 기반), 같은 곡 비교, 보이기 설정
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const g = (src, re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
const f = new Function(g(t, /function growthCheer\([\s\S]*?\n\}\n/) + "return growthCheer;")();
const P = (d, v, tt) => ({ d, v, t: tt });
assert.strictEqual(f({ prev: P("2026-10-29", 50, "a"), last: P("2026-10-30", 55, "a"), first: P("", 40), best: P("", 55) }), "", "오르면 격려 문구 없음");
assert.ok(/처음 불러 본 곡|새 곡/.test(f({ prev: P("x", 60, "a"), last: P("2026-10-30", 50, "사랑으로"), first: P("", 40), best: P("", 60), newSong: true })), "새 곡이면 새 곡 격려");
const c = f({ prev: P("x", 60, "a"), last: P("2026-10-31", 50, "a"), first: P("", 40), best: P("", 62), newSong: false });
assert.ok(/62%|40%/.test(c) && !/꾸준히 부르는 중/.test(c), "최고·첫 기록 사실로 격려, '꾸준히 부르는 중' 안 씀");
const h = new Function("esc", g(s, /function growthHtml\([\s\S]*?\n\}\n/) + "return growthHtml;")((x) => String(x));
const out = h({ kind: "growth", n: 5, first: P("2026-10-22", 45), last: P("2026-10-30", 58), best: P("2026-10-29", 62), pts: [P("2026-10-22", 45), P("2026-10-29", 62), P("2026-10-30", 58)], same: [{ title: "사랑으로", n: 2, first: P("2026-10-22", 44), last: P("2026-10-29", 61) }], tip: "중간 음 위에서 찍기", cheer: "" });
assert.ok(out.includes("▲ 13%p") && out.includes("최고 62%") && out.includes("사랑으로") && out.includes("선생님의 한 마디"));
assert.ok(!/센트|낮게 \d|플랫/.test(out), "수강생에겐 센트·낮게 % 없음");
assert.ok(h({ kind: "growth", n: 1, first: P("", 40), last: P("", 40) }).includes("기록이 쌓이는 중"));
assert.ok(t.includes('lesson_id: "_growth"') && s.includes('l.id !== "_growth"'));
console.log("student-growth ok");
