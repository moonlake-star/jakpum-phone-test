// (11/19) 유튜브 앱 '공유 → 보컬노트': 파일 없이 유튜브 주소만 오면 곡 서랍에 바로 넣음 — 앱 코드 그대로 시험
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i > 0 && j > i, a); return html.slice(i, j); };
const src = cut("function ytParse", "const YT_AUDIO") + cut("function sharedYtUrl", "async function openShared");
const env = {}; new Function("env", `with (env) { ${src}\n env.sharedYtUrl = sharedYtUrl; env.sharedToSong = sharedToSong; }`)(env);
const U = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
// ① 주소 찾기: 글 안의 주소(제목+주소 꼴, youtu.be·공유 꼬리표), 파일 있는 묶음은 건너뜀, 최근 것 우선
assert.equal(env.sharedYtUrl([{ batch: "b1", files: [], text: "https://youtu.be/dQw4w9WgXcQ?si=abc" }]).url, U);
assert.equal(env.sharedYtUrl([{ batch: "b1", files: [], text: "아이유 - 밤편지\nhttps://youtu.be/dQw4w9WgXcQ" }]).batch, "b1");
assert.equal(env.sharedYtUrl([{ batch: "b1", files: [{ i: 0 }], text: "https://youtu.be/dQw4w9WgXcQ" }]), null, "파일 공유는 기존 화면");
assert.equal(env.sharedYtUrl([{ files: [], text: "안녕하세요" }, { files: [], text: "https://www.youtube.com/playlist?list=PLx" }]), null, "영상 주소 아님");
assert.equal(env.sharedYtUrl([{ batch: "a", files: [], text: "https://youtu.be/aaaaaaaaaaa" }, { batch: "b", files: [], text: "https://youtu.be/dQw4w9WgXcQ" }]).batch, "b", "최근 것");
assert.equal(env.sharedYtUrl(null), null);
// ② 넣기: 제목·가수를 채워 songAdd / 같은 주소가 이미 있으면 넣지 않음
(async () => {
  const el = {}, $ = (id) => (el[id] ||= { value: "", textContent: "" });
  let added = 0, toasts = [];
  const mk = (list, info) => { const e = {}; new Function("env", `with (env) { ${src}\n env.sharedToSong = sharedToSong; }`)(Object.assign(e, {
    $, songLib: { list }, openSongs: async () => {}, songPaintList: () => {}, toast: (m) => toasts.push(m),
    ytInfo: info, songAdd: async () => { added++; } })); return e; };
  await mk([], async () => ({ title: "밤편지", artist: "아이유" })).sharedToSong(U);
  assert.equal(added, 1); assert.equal($("slY").value, U); assert.equal($("slT").value, "밤편지"); assert.equal($("slA").value, "아이유");
  for (const k in el) el[k].value = "";
  await mk([], async () => { throw new Error("oembed 401"); }).sharedToSong(U);
  assert.equal(added, 2, "제목을 못 가져와도 주소로 넣음"); assert.equal($("slT").value, "");
  await mk([{ folder: "F", d: { title: "밤편지", youtube: "https://youtu.be/dQw4w9WgXcQ" } }], async () => ({})).sharedToSong(U);
  assert.equal(added, 2, "중복은 안 넣음"); assert.ok(/이미 곡 서랍/.test(toasts.pop()));
  // ③ openShared가 유튜브 주소 공유를 곡 서랍으로 보냄(선생님 직원 앱은 제외)
  assert.ok(/const yt = !isStaffApp\(\) && [^\n]*sharedYtUrl\(metas\)/.test(html) && /if \(yt\) \{[^\n]*clearSharedBatches[^\n]*sharedToSong\(yt\.url\)/.test(html));
  console.log("share-yt-song ok");
})().catch((x) => { console.error(x); process.exit(1); });
