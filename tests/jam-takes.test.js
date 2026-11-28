// (11/27 사용자 '짜깁기 폐기 · 합주 베스트 → 연습/합주 · 대화 빼고 Take01·Take02 · 같은 곡은 서브 리스트로')
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(T.includes("<b>🎸 연습/합주</b>") && T.includes('<h2 style="margin:4px 0 2px">🎸 연습/합주</h2>') && !T.includes("<b>🎸 합주 베스트</b>"), "메뉴 이름");
assert.ok(!T.includes("data-jamopen") && !T.includes("가장 잘 부른 구절만 이어 붙인 편집본"), "짜깁기 화면 없음");
assert.ok(T.includes('🎵 ${esc(g.title || "곡")}') && T.includes('"🎙 기타 테이크"'), "같은 곡 서브 리스트 · 기타");
assert.ok(T.includes('<span class="jtkI">▶</span> Take${String(t.no).padStart(2, "0")}'), "Take01 형식");
assert.ok(T.includes("const bl = await readBlob(id, false, true);") && T.includes("if (jam.takeId === id && b.classList.contains(\"jtkOn\")) { if (au.paused)") && T.includes("jamWaveOpen(b, id, bl);"), "누르면 재생(가로로 펼쳐 파형·시간)·다시 누르면 일시정지/이어 재생");
// 묶음 계산: 서버 songs [{takes:[1,3]},{takes:[2]}] + take_files 4개 → 곡 2줄 + 기타(4)
const a = T.indexOf("    const DT = ((C.dt || {})[s.src_id] || [])"), b = T.indexOf("    const hid = C.hide.includes(s.src_id)", a);
const f0 = new Function("C", "s", "songs", "done", "fail", "esc", "fmt", T.slice(a, b) + "; return { body, st };"), f = (...x) => f0({ hide: [], del: [] }, ...x);
const s = { take_files: [1, 2, 3, 4].map(n => ({ no: n, id: "T" + n, dur: 60 })) }, songs = [{ title: "곡 1", takes: [1, 3] }, { title: "곡 2", takes: [2] }];
const r = f(s, songs, true, false, (x) => x, (x) => "1:00");
assert.ok(r.body.indexOf("곡 1") < r.body.indexOf("Take01") && r.body.indexOf("Take03") < r.body.indexOf("곡 2") && r.body.includes("기타 테이크") && r.body.lastIndexOf("Take04") > r.body.indexOf("기타 테이크"));
assert.ok(r.st.includes("테이크 4개 · 곡 2개"));
// (11/28 사용자 '개별 삭제 · 그날 녹음의 몇 분') 지운 테이크는 빠지고, 버튼에 녹음 안 시작 시각
{ const s2 = { src_id: "S", take_files: [{ no: 1, id: "A", t0: 4, t1: 300, dur: 296 }, { no: 2, id: "B", t0: 320, t1: 600, dur: 280 }] };
  const r2 = f0({ hide: [], del: [], dt: { S: [{ id: "B", t0: 320, t1: 600 }] } }, s2, [], true, false, (x) => x, (x) => String(x));
  assert.ok(r2.body.includes("Take01") && !r2.body.includes("Take02") && r2.body.includes('<span class="jtkAt">4~</span>')); }
assert.ok(T.includes("async function jamDelTake(b)") && T.includes('del.className = "jtkDel jtkW"') && T.includes("function jamWaveView(b)"), "펼친 테이크에 개별 삭제");
console.log("jam-takes OK");
// (11/27 사용자 '연습/합주 리스트는 처음부터 열려있지 않게') 접힌 채 시작 · 눌러서 펼침 · 가사로 찾은 제목 표시
assert.ok(T.includes('data-jopen="${esc(s.src_id)}"') && T.includes("${op ? body : \"\"}") && T.includes("(jam.open ||= new Set()).has(s.src_id)"));
assert.ok(!/jam\.open\s*=\s*new Set\(\[/.test(T));
assert.ok(T.includes("🔎 가사로 찾음"));

// (11/28 사용자 '제목 부분을 터치해도 열리게') 합주 이름도 펼치기 버튼과 같은 data-jopen
assert.ok(T.includes('${body ? ` data-jopen="${esc(s.src_id)}" role="button"'));
