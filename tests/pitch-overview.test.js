// 선생님 앱 '수강생 발성 연습' 한눈에 목록 시험 — index.html의 해당 블록을 가짜 서버(portal)와 함께 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const body = src.match(/let pitchAllMem = null;[\s\S]*?(?=function pitchCard\(days\))/)[0];
const today = new Date(Date.now() + 9 * 36e5).toISOString().slice(0, 10);
const cfg = { students: { a: { name: "가나" }, b: { name: "다라" }, c: { name: "마바" }, d: { name: "사아" } } };
const calls = [];
const portal = async (action, o) => { calls.push([action, o.sid, o.days]); if (o.sid === "d") throw new Error("담당 수강생이 아님");
  return { days: o.sid === "a" ? [{ day: today, sec: 130, score: 71.4 }, { day: "2020-01-01", sec: 20 }] : o.sid === "b" ? [{ day: "2020-01-01", sec: 20 }, { day: "2020-01-02", sec: 30 }] : [] }; };
const limiter = (n) => (fn) => Promise.resolve().then(fn);
const mk = new Function("cfg", "portal", "limiter", "esc", "$", "portalUrl", "enrollOf", "isTeacher", "openStudent", `${body}; return { pitchAllLoad, pitchAllHtml };`);
const app = mk(cfg, portal, limiter, (s) => String(s ?? ""), () => null, () => "x", () => "active", () => false, () => {});
(async () => {
  const rows = await app.pitchAllLoad(["a", "b", "c", "d"]);
  assert.deepStrictEqual(calls.map(c => c[0] + c[1] + c[2]), ["t_pitcha7", "t_pitchb7", "t_pitchc7", "t_pitchd7"], "수강생별로 최근 7일만 요청");
  const h = app.pitchAllHtml(rows);
  assert.strictEqual(h.sum, "오늘 1명 / 전체 4명");
  const order = [...h.html.matchAll(/<b>([^<]+)<\/b>/g)].map(m => m[1]);
  assert.deepStrictEqual(order, ["가나", "다라", "마바", "사아"], "오늘 연습한 사람 → 최근 7일 많은 순 → 안 불러와진 사람은 뒤");
  assert.ok(h.html.includes("오늘 2분 · 71점") && h.html.includes("오늘 연습 없음 · 최근 7일 2일") && h.html.includes("불러오지 못함") && h.html.includes("1명은 불러오지 못했어요"), "표시 문구");
  await app.pitchAllLoad(["a", "b", "c", "d"]); assert.strictEqual(calls.length, 4, "5분 안에는 다시 안 불러옴");
  console.log("pitch-overview: ok");
})();
