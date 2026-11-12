// 유튜브 링크 메이크업(11/06): 주소 정리·받은 파일 고르기·'받는 중→대기' 전환을 앱 코드 그대로 시험
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), a = html.indexOf("function ytParse"), b = html.indexOf("function paintYtWait");
assert.ok(a > 0 && b > a, "함수를 찾음");
const run = (env) => { new Function("env", `with (env) { ${html.slice(a, b)}\n env.ytParse = ytParse; env.ytPickAudio = ytPickAudio; env.ytPromote = ytPromote; }`)(env); return env; };

const e = run({ MK_NEWQ: { _demo: true, _new_code: 7 }, MKREQ: "메이크업요청.json" });
// ① 주소 정리
const ok = (u, id) => assert.equal(e.ytParse(u)?.id, id, u);
ok("https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLx&t=30", "dQw4w9WgXcQ");
ok("https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ");
ok("https://m.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ");
ok("music.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ");
ok("https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ");
assert.equal(e.ytParse("https://youtu.be/dQw4w9WgXcQ").url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ", "바른 주소로 통일");
for (const bad of ["", "   ", "hello", "https://www.youtube.com/playlist?list=PLabc", "https://www.youtube.com/@channel", "https://evil.com/watch?v=dQw4w9WgXcQ", "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ", "https://www.youtube.com/watch?v=short", "javascript:alert(1)"])
  assert.equal(e.ytParse(bad), null, "거절: " + bad);
// ② 받은 파일 고르기: 올리는 중·방금 바뀐 것·폴더·소리 아닌 것은 건너뜀
const now = Date.parse("2026-11-06T12:00:00Z"), t = (s) => new Date(now - s * 1000).toISOString();
const files = [{ name: "a.m4a.part", modifiedTime: t(100) }, { name: "new.m4a", modifiedTime: t(3) }, { name: "memo.txt", modifiedTime: t(100) }, { name: "dir.mp3", mimeType: "application/vnd.google-apps.folder", modifiedTime: t(100) },
  { name: "old.webm", id: "o", modifiedTime: t(600) }, { name: "song.m4a", id: "s", modifiedTime: t(60) }];
assert.equal(e.ytPickAudio(files, now).name, "song.m4a", "가장 최근의 다 올라온 소리");
assert.equal(e.ytPickAudio([files[0], files[1], files[2]], now), null, "아직 없음");
assert.equal(e.ytPickAudio([], now), null); assert.equal(e.ytPickAudio(null, now), null);
// ③ 전환: 파일이 생기면 queued + source_id 로 쓰고 kick, 없으면 그대로 / 이미 다른 상태면 건드리지 않음
(async () => {
  const writes = []; let kicked = 0;
  const listing = { F: [{ id: "O", name: "원본", mimeType: "application/vnd.google-apps.folder" }], O: [{ id: "s", name: "song.m4a", modifiedTime: new Date(Date.now() - 60000).toISOString() }] };
  const env = run({ MK_NEWQ: { _demo: true, _new_code: 7 }, MKREQ: "메이크업요청.json", list: async (id) => listing[id] || [], writeJSON: async (...x) => { writes.push(x); }, kick: () => kicked++ });
  const job = { folder: { id: "F" }, reqId: "R", req: { status: "waiting_download", youtube_url: "u", title: "t", student_id: "x" } };
  assert.equal(await env.ytPromote(job), true);
  assert.equal(job.req.status, "queued"); assert.equal(job.req.source_id, "s"); assert.equal(job.req.mode, "single"); assert.equal(job.req.youtube_url, "u", "링크 기록 유지");
  assert.equal(writes.length, 1); assert.equal(writes[0][1], "메이크업요청.json"); assert.equal(writes[0][3], "R"); assert.equal(kicked, 1);
  assert.equal(await env.ytPromote(job), false, "이미 queued면 다시 하지 않음"); assert.equal(kicked, 1);
  listing.O = [{ id: "p", name: "x.m4a.part", modifiedTime: new Date(Date.now() - 60000).toISOString() }];
  const j2 = { folder: { id: "F" }, reqId: "R", req: { status: "waiting_download" } };
  assert.equal(await env.ytPromote(j2), false); assert.equal(j2.req.status, "waiting_download"); assert.equal(writes.length, 1);
  console.log("youtube-link ok");
})().catch((x) => { console.error(x); process.exit(1); });
