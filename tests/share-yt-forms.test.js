// (11/20) 유튜브·유튜브 뮤직 앱이 실제로 보내는 공유 글 꼴이 곡 서랍 등록(sharedYtUrl)에서 잡히는지 — 앱 코드 그대로 시험
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const cut = (a, b) => { const i = html.indexOf(a), j = html.indexOf(b, i); assert.ok(i > 0 && j > i, a); return html.slice(i, j); };
const src = cut("function ytParse", "const YT_AUDIO") + cut("function sharedYtUrl", "async function sharedToSong");
const env = {}; new Function("env", `with (env) { ${src}\n env.ytParse = ytParse; env.sharedYtUrl = sharedYtUrl; }`)(env);
const ID = "dQw4w9WgXcQ", U = "https://www.youtube.com/watch?v=" + ID;
const got = (text) => (env.sharedYtUrl([{ batch: "b", files: [], text }]) || {}).url || null;
// ① 주소 꼴: 일반·모바일·유튜브 뮤직·짧은 주소·쇼츠·라이브·재생목록 안의 영상
for (const t of [
  `https://www.youtube.com/watch?v=${ID}`, `https://m.youtube.com/watch?v=${ID}&feature=share`,
  `https://music.youtube.com/watch?v=${ID}&si=AbC-123_x`, `https://music.youtube.com/watch?v=${ID}&list=RDAMVM${ID}`,
  `https://youtu.be/${ID}?si=Zx9-AbCdEfGh`, `https://youtube.com/shorts/${ID}?si=QwErTy`, `https://www.youtube.com/shorts/${ID}`,
  `https://www.youtube.com/live/${ID}?si=a`, `https://www.youtube.com/watch?v=${ID}&list=PLabc&index=3`, `youtu.be/${ID}`,
]) assert.equal(got(t), U, t);
// ② 유튜브 앱이 보내는 '제목 + 주소' 섞인 글, 괄호·마침표·붙은 글자
for (const t of [
  `아이유 - 밤편지 (Through the Night) MV\nhttps://youtu.be/${ID}?si=abc`, `밤편지 https://youtu.be/${ID}`,
  `Check out this video: https://youtu.be/${ID}`, `영상 보기(https://youtu.be/${ID})`, `https://youtu.be/${ID}.`,
  `링크:https://youtu.be/${ID}`, `"https://youtu.be/${ID}"`, `<https://youtu.be/${ID}>`, `「밤편지」https://youtu.be/${ID}!`,
]) assert.equal(got(t), U, t);
// 아이디 끝의 - _ 는 지우지 않음
assert.equal(got("https://youtu.be/abcdefghij-"), "https://www.youtube.com/watch?v=abcdefghij-");
assert.equal(got("https://youtu.be/abcdefghij_."), "https://www.youtube.com/watch?v=abcdefghij_");
// ③ 거절: 재생목록만·채널·검색·남의 사이트·아이디 길이 틀림
for (const t of ["https://www.youtube.com/playlist?list=PLx", "https://www.youtube.com/@IU", "https://www.youtube.com/results?search_query=밤편지",
  `https://youtube.com.evil.example/watch?v=${ID}`, `https://example.com/?u=https%3A%2F%2Fyoutu.be%2F${ID}`, "https://youtu.be/short", "밤편지 듣는 중"])
  assert.equal(got(t), null, t);
console.log("share-yt-forms ok");
