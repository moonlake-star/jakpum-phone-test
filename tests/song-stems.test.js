// (11/07 01:51 사용자 '고고') 원곡 보컬 볼륨 플레이어: 선생님 앱(듣기·받기·수강생에게 싣기) + 수강생 '연습 곡'
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
assert.ok(T.includes('const SONG_F = { mr: "원곡_반주.mp3", voc: "원곡_보컬.mp3", orig: "원곡.mp3" }') && T.includes("songPaint(j, r, by);") && T.includes('<div id="mkSong"></div>'));
assert.ok(T.includes('if (me !== "song" && typeof songStop === "function") songStop();'), "다른 소리를 틀면 원곡 멈춤");
assert.ok(T.includes("job?.req?.song?.stu_stems && typeof songFiles") && T.includes("n.makeup?.stems?.mr, n.makeup?.stems?.voc, n.makeup?.stems?.orig].filter(Boolean)"), "켠 곡만 노트에 싣고 링크 열기");
assert.ok(T.includes('["done", "error"].includes(r.status)) {'), "처리 중엔 볼륨 저장으로 요청 파일을 덮어쓰지 않음");
// 선생님: 상태 판정
const a = T.indexOf("const SONG_F"), b = T.indexOf("function songSave");
const ctx = {}; vm.createContext(ctx); vm.runInContext(T.slice(a, b), ctx);
assert.strictEqual(ctx.songState({ status: "done" }, null), "hide");
assert.strictEqual(ctx.songState({ status: "processing", song: { title: "x" } }, null), "wait");
assert.strictEqual(ctx.songState({ status: "done", song: { title: "x", yt_wait: "k" } }, null), "home");
assert.strictEqual(ctx.songState({ status: "done", song: { title: "x" } }, null), "none");
assert.strictEqual(ctx.songState({ status: "processing" }, { mr: 1 }), "ready");
// 수강생: 셋 다 있어야 보임 · 이름 이스케이프
const c = S.indexOf("// ── 🎤 연습 곡(11/07"), d = S.indexOf("let sgP = null;");
const sx = { sidOk: (x) => typeof x === "string" && x.trim() !== "", esc: (s) => String(s).replace(/</g, "&lt;") }; vm.createContext(sx); vm.runInContext(S.slice(c, d), sx);
assert.strictEqual(sx.stemsHtml({ stems: { mr: "a", voc: "b" } }), "");
const h = sx.stemsHtml({ stems: { mr: "a", voc: "b", orig: "c", title: "<x>", vol: 0, dur: 125 } });
assert.ok(h.includes("🎤 연습 곡") && h.includes("&lt;x>") && h.includes('id="sgVv">0%') && h.includes("2:05") && (h.match(/data-sgd=/g) || []).length === 3);
assert.ok(S.includes('stemsHtml(l.makeup) : ""}') && S.includes('wireStems(l.makeup)') && S.includes("bufMode = Math.abs(x.volume - 0.5) > 0.01"), "아이폰 볼륨 대체");
console.log("song stems ok");
// (11/07 10:58 사용자 '고고') 🎵 곡 서랍: 첫 화면 버튼 · 곡 넣기(song.json queued + 서버 깨우기) · 목록 상태 · 같은 플레이어 · 메이크업은 서버가 적은 id 먼저
assert.ok(T.includes('<section id="vSongs" class="hidden"></section>') && T.includes('"vCal","vSongs"]') && T.includes('id="songBtn"') && T.includes("async function openSongs(focus)"));
assert.ok(T.includes('status: "queued"') && T.includes("const ok = await kick();") && T.includes("function songPlayer(el, ids, o)") && T.includes("stemIds(r.song) || songFiles(by)") && T.includes("(stemIds(job.req.song) || songFiles("));
assert.ok(T.includes('home_wait: ["🏠", "집 노트북이 원곡 받는 중"]') && T.includes("trashed: true }) }); songLib.list"), "상태 표시·지우기(휴지통)");
console.log("song lib ok");
// (11/07 17:33 사용자) 유튜브 주소 → 곡 제목(버전)·가수 자동
{ const a = T.indexOf("function ytTitle"), b = T.indexOf("async function ytInfo"); const cx = {}; require("vm").createContext(cx); require("vm").runInContext(T.slice(a, b), cx);
  assert.deepStrictEqual({ ...cx.ytTitle("[MV] 애즈원(As One) - 원하고 원망하죠 (Official Music Video)") }, { title: "원하고 원망하죠", artist: "애즈원(As One)" });
  assert.deepStrictEqual({ ...cx.ytTitle("둥지", "남진 - Topic") }, { title: "둥지", artist: "남진" });
  assert.ok(T.includes('youtube.com/oembed?format=json&url=') && T.includes("ytParse?.(y)?.url || y")); console.log("yt autofill ok"); }
