// (11/14 사용자 시안 B) 곡 서랍 플레이어: 속도·구간 반복·보컬 0→올림 어긋남·파형. 합성 mock만 — 실기기 청감은 미검증
const fs = require("fs"), assert = require("assert"), vm = require("vm");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const block = (h) => h.slice(h.indexOf("// <stem-engine>"), h.indexOf("// </stem-engine>"));
assert.strictEqual(block(T), block(S), "선생님·수강생 엔진 같아야 함");
const code = block(T), made = [], timers = new Map(); let tid = 0;
const mkAudio = () => { const a = { paused: true, currentTime: 0, duration: 200, readyState: 4, seeking: false, ended: false, volume: 1, playbackRate: 1, play() { a.paused = false; return Promise.resolve(); }, pause() { a.paused = true; }, load() {}, removeAttribute() {} }; made.push(a); return a; };
const URLm = { createObjectURL: () => "blob:" + Math.random(), revokeObjectURL() {} };
const tm = { set: (f, ms) => { const id = ++tid; timers.set(id, [f, ms]); return id; }, clear: (id) => timers.delete(id) };
const run = (ms) => { for (const [f, m] of [...timers.values()]) if (m === ms) f(); };
const mk = new Function(code + "; return stemEngine;")();
(async () => {
  const E = mk({ html: true, AC: null, Audio: mkAudio, URL: URLm, Blob: class {}, timers: tm, fetchBuf: async () => new ArrayBuffer(10) });
  await E.load(); const [mr, voc] = made;
  // 속도: 두 태그에 같은 속도·음 높이 유지
  E.setRate(0.9); assert.strictEqual(mr.playbackRate, 0.9); assert.strictEqual(voc.playbackRate, 0.9); assert.strictEqual(mr.preservesPitch, true); assert.strictEqual(E.rate(), 0.9);
  E.setRate(5); assert.strictEqual(E.rate(), 2, "상한"); E.setRate(0.9);
  await E.play();
  // 보컬 0 → 올림: 위치를 바로 맞춤(늦게 따라오던 것)
  E.setVol(0); mr.currentTime = 30; voc.currentTime = 29; E.setVol(40); assert.strictEqual(voc.currentTime, 30, "0%에서 올리면 보컬이 반주 위치로");
  // 작은 어긋남은 위치를 건드리지 않고 속도로 따라잡음 · 큰 어긋남은 한 번 맞춤
  voc.currentTime = mr.currentTime - 0.2; const c0 = voc.currentTime; run(250); assert.strictEqual(voc.currentTime, c0, "0.2초 차이는 위치 이동 없음"); assert.ok(voc.playbackRate > 0.9, "느린 보컬은 살짝 빠르게");
  voc.currentTime = mr.currentTime; run(250); assert.strictEqual(voc.playbackRate, 0.9, "맞으면 원래 속도");
  voc.currentTime = mr.currentTime + 1; run(250); assert.strictEqual(voc.currentTime, mr.currentTime, "1초 차이는 맞춤");
  // 구간 반복: B 근처에서 A로 · 멀리 지나면 건드리지 않음 · 해제
  E.setLoop(10, 20); assert.ok(E.loop()); assert.ok([...timers.values()].some(x => x[1] === 40), "40ms 확인 타이머");
  mr.currentTime = 20.01; voc.currentTime = 20.01; run(40); assert.strictEqual(mr.currentTime, 10); assert.strictEqual(voc.currentTime, 10);
  mr.currentTime = 50; run(40); assert.strictEqual(mr.currentTime, 50, "B보다 한참 뒤는 반복 안 함");
  E.setLoop(NaN, NaN); assert.strictEqual(E.loop(), null); assert.ok(![...timers.values()].some(x => x[1] === 40), "해제하면 타이머 없음"); E.setLoop(10, 10.2); assert.strictEqual(E.loop(), null, "0.5초 미만 구간 무시");
  // 반주 볼륨
  E.setMrVol(40); assert.strictEqual(mr.volume, 0.4);
  // 음원 바꿔 끼우기(키 바꾼 파일): 위치·재생 유지, 멈춤 알림 안 뜸
  let paused = 0; const E2 = mk({ html: true, AC: null, Audio: mkAudio, URL: URLm, Blob: class {}, timers: tm, onPause: () => paused++, fetchBuf: async () => new ArrayBuffer(10) });
  await E2.load(); const [m2, v2] = made.slice(-2); await E2.play(); m2.currentTime = 33; const hadPause = m2.onpause;
  m2.pause = function () { this.paused = true; hadPause && hadPause(); }; await E2.swap(new ArrayBuffer(5), new ArrayBuffer(5));
  assert.ok(E2.isPlaying() && paused === 0, "바꿔 끼우는 동안 멈춤 처리 안 함"); assert.strictEqual(m2.currentTime, 33); assert.strictEqual(m2.paused, false);
  // 파형(songPeaks): 가짜 디코더로 0.1초 구간 최댓값 → 0~63 글자
  const src = T.slice(T.indexOf("const DK_STEP"), T.indexOf("function songDeck(")), data = new Float32Array(8000 * 2).map((_, i) => (i < 8000 ? 0.1 : 0.8));
  class OC { decodeAudioData(ab, ok) { ok({ numberOfChannels: 1, getChannelData: () => data }); } }
  const peaks = await new Function("window", src + "; return songPeaks;")({ OfflineAudioContext: OC })(new ArrayBuffer(8));
  assert.strictEqual(peaks.length, 20, "2초 = 20칸"); assert.ok(peaks.charCodeAt(0) < peaks.charCodeAt(19) && peaks.charCodeAt(19) - 48 === 63, "큰 소리는 63");
  // 코드 이름 올림·내림(서버가 읽은 장·단 3화음)
  { const nm = new Function(T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")) + "; return songChordName;")();
    assert.strictEqual(nm("C", 2), "D"); assert.strictEqual(nm("Am", 3), "Cm"); assert.strictEqual(nm("F#m", -2), "Em"); assert.strictEqual(nm("A", -9), "C"); assert.strictEqual(nm("Bb", 1), "B"); assert.strictEqual(nm("G", 12), "G"); assert.strictEqual(nm("N", 3), "N"); }
  // 프롬프터: 마디·박·코드 유지 박 수·가사 자리
  { const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures, songBeatPos };")();
    const beats = Array.from({ length: 18 }, (_, i) => +(1 + i * 0.5).toFixed(3));   // 120BPM, 1초부터 · 첫 강박 = 두 번째 박(down=1)
    const an = { beats, down: 1, chords: [[0.5, "C"], [1.5, "C"], [2.5, "Am"], [3.5, "G"], [4.0, "F"]] };
    const M = f.songMeasures(an, 0, [[1.6, "가"], [3.1, "나"]]);
    assert.strictEqual(M.length, 5, "17박 - 앞 1박 = 16박 → 4마디 + 마지막 1박(짧은 마디)");
    assert.deepStrictEqual(M[0].chords.map(c => [c.b, c.name, c.len]), [[0, "C", 2], [2, "Am", 2]], "한 마디 안에서 3박에 바뀜 + 유지 박 수");
    assert.deepStrictEqual(M[1].chords.map(c => [c.b, c.name, c.len]), [[0, "G", 1], [1, "F", 3]], "2박에 바뀌는 것도 표시");
    assert.deepStrictEqual(M[2].chords.map(c => [c.b, c.name, c.len]), [[0, "F", 4]], "다음 마디에서 계속되는 코드도 첫 박에 다시 표시");
    assert.strictEqual(M[0].lyrics.length, 2); assert.ok(M[0].lyrics[0].b < M[0].lyrics[1].b && M[0].lyrics[0].b >= 0 && M[0].lyrics[1].b < 4);
    assert.strictEqual(f.songMeasures(an, 2, [])[0].chords[0].name, "D", "키 +2");
    assert.deepStrictEqual(f.songMeasures({ beats: [1, 2], down: 0 }, 0), [], "박이 모자라면 빈 목록");
    assert.deepStrictEqual(f.songBeatPos(an, 1.0), { m: 0, b: 0 }); const q = f.songBeatPos(an, 2.25); assert.strictEqual(q.m, 0); assert.ok(Math.abs(q.b - 1.5) < 1e-9, q.b);
    assert.deepStrictEqual(f.songBeatPos(an, 0.2), { m: 0, b: 0 }, "첫 강박 전(앞박)은 첫 마디 앞"); assert.strictEqual(f.songBeatPos(an, 3.6).m, 1); assert.strictEqual(f.songBeatPos(an, 3.0).m, 0); }
  // 프롬프터 직접 수정: 코드 글자 해석·원곡 키 기준 저장·구간 목록
  { const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songParseChords, songFmtChords, songApplyEdits, songSecList, songSecAt, songChordName, SG_PER };")();
    assert.strictEqual(f.SG_PER, 20, "한 쪽 5줄 × 4마디");
    assert.deepStrictEqual(f.songParseChords("D").ch, [[1, "D"]]); assert.deepStrictEqual(f.songParseChords("Bm Em").ch, [[1, "Bm"], [3, "Em"]], "코드 2개 = 1·3박");
    assert.deepStrictEqual(f.songParseChords("G A@2").ch, [[1, "G"], [2, "A"]], "박 지정"); assert.deepStrictEqual(f.songParseChords("a b c").ch.map(c => c[0]), [1, 2, 3]);
    { const r = f.songParseChords("bm7 x! F#m7/C#"); assert.deepStrictEqual(r.ch, [[1, "Bm7"], [3, "F#m7/C#"]], "소문자는 대문자로 · 분수 코드"); assert.deepStrictEqual(r.bad, ["x!"], "못 읽는 입력 알림"); }
    assert.deepStrictEqual(f.songParseChords("").ch, []);
    assert.strictEqual(f.songFmtChords([{ b: 0, name: "G" }, { b: 1, name: "A" }]), "G A@2", "기본 박이 아니면 @박 표시"); assert.strictEqual(f.songFmtChords([{ b: 0, name: "Bm" }, { b: 2, name: "Em" }]), "Bm Em");
    assert.strictEqual(f.songChordName("C/E", 2), "D/F#", "분수 코드의 베이스도 함께 올림"); assert.strictEqual(f.songChordName("Bb", 0), "Bb", "그대로면 쓴 대로");
    const M = [{ no: 1, chords: [{ b: 0, name: "C", len: 4 }], lyrics: [{ b: 0, text: "가" }] }, { no: 2, chords: [{ b: 0, name: "F", len: 4 }], lyrics: [] }];
    const R = f.songApplyEdits(M, { 0: { ch: [[1, "A"], [3, "D"]], ly: "새 가사" } }, 2);
    assert.deepStrictEqual(R[0].chords, [{ b: 0, name: "B", len: 2 }, { b: 2, name: "E", len: 2 }], "수정은 원곡 키로 저장 → 키 +2에서 같이 올라감"); assert.deepStrictEqual(R[0].lyrics, [{ b: 0, text: "새 가사" }]); assert.strictEqual(R[0].edited, true);
    assert.strictEqual(R[1], M[1], "안 고친 마디는 그대로"); assert.strictEqual(f.songApplyEdits(M, { 1: { ly: " " } }, 0)[1].lyrics.length, 0, "가사를 비우면 빈 칸"); assert.strictEqual(M[0].chords[0].name, "C", "원본은 안 바뀜");
    const L = f.songSecList(48, []); assert.strictEqual(L.length, 6, "이름이 없으면 8마디씩"); assert.strictEqual(L[0].name, "구간 1"); assert.strictEqual(L.reduce((a, x) => a + x.len, 0), 48);
    const L2 = f.songSecList(48, [[4, "1절"], [16, "후렴"], [24, "간주"], [28, "2절"], [40, "후렴"]]); assert.deepStrictEqual(L2.map(x => [x.name, x.start, x.len]), [["인트로", 0, 4], ["1절", 4, 12], ["후렴", 16, 8], ["간주", 24, 4], ["2절", 28, 12], ["후렴", 40, 8]], "첫 구간 앞은 인트로");
    assert.strictEqual(f.songSecAt(L2, 0), 0); assert.strictEqual(f.songSecAt(L2, 16), 2); assert.strictEqual(f.songSecAt(L2, 47), 5); assert.strictEqual(f.songSecList(10, [[3, "  "]]).length, 2, "이름이 빈 칸이면 무시 → 자동"); }
  // 프롬프터 PDF: 조립한 PDF의 구조(페이지 수·xref 위치)와 파일명
  { const src = T.slice(T.indexOf("function songPdf("), T.indexOf("// 프롬프터 한 쪽(마디 20칸")), f = new Function("Blob", "TextEncoder", src + "; return { songPdf, songPdfName };")(class { constructor(p, o) { this.parts = p; this.type = o.type; } }, TextEncoder);
    assert.strictEqual(f.songPdfName("그리움만 쌓이네", "여행스케치", "D"), "그리움만 쌓이네_여행스케치_D.pdf"); assert.strictEqual(f.songPdfName("A/B:C", "", "Am"), "A_B_C_Am.pdf", "가수가 없으면 건너뜀·금지 글자 치환");
    const jpg = new Uint8Array([0xff, 0xd8, 1, 2, 3, 0xff, 0xd9]), blob = f.songPdf([{ jpg, w: 10, h: 6 }, { jpg, w: 10, h: 6 }], 960, 600), buf = Buffer.concat(blob.parts.map((x) => Buffer.from(x))), txt = buf.toString("latin1");
    assert.strictEqual(blob.type, "application/pdf"); assert.ok(txt.startsWith("%PDF-1.4") && txt.trimEnd().endsWith("%%EOF")); assert.ok(txt.includes("/Count 2") && txt.includes("/Kids [3 0 R 6 0 R]") && txt.includes("/MediaBox [0 0 960 600]"));
    const sx = +/startxref\n(\d+)/.exec(txt)[1]; assert.strictEqual(txt.slice(sx, sx + 4), "xref", "startxref가 xref를 가리킴");
    const ent = txt.slice(sx).split("\n").filter((l) => /^\d{10} 00000 n/.test(l)); assert.strictEqual(ent.length, 8); ent.forEach((l, i) => assert.ok(new RegExp("^" + (i + 1) + " 0 obj").test(txt.slice(+l.slice(0, 10), +l.slice(0, 10) + 12)), "객체 " + (i + 1) + " 위치")); }
  // 화면 연결(정적)
  const dk = T.slice(T.indexOf("function songDeck("), T.indexOf("// (11/05 00:14 사용자)"));
  for (const k of ["dkWv", "dkHome", "dkBk", "dkFw", "dkEnd", "dkRep", "dkLoop", "dkRv", "dkA", "dkB", "dkClr", "dkMr", "dkSpM", "dkSpP", "dkRst"]) assert.ok(dk.includes('id="' + k + '"'), k);
  assert.ok(dk.includes("eng.setLoop(") && dk.includes("eng.setRate(") && dk.includes("cv.onpointerdown"), "구간 반복·속도·밀기 연결");
  assert.ok(T.includes("touch-action:pan-y"), "세로 스크롤은 허용");
  assert.ok(dk.includes("o.analysis && o.analysis.key") && dk.includes("eng.swap(") && dk.includes("o.onKeyReq"), "키 카드는 서버가 분석한 곡에만 · 파일 없으면 요청");
  assert.ok(/songDeck\(pl, ids, \{[^]*analysis: x\.d\.analysis, keys: x\.d\.keys, keyReq: x\.d\.key_req/.test(T), "곡 서랍이 분석·키 파일을 넘김");
  assert.ok(dk.includes("openPrompter") && dk.includes("Brand.layer") && dk.includes('id="dkTv"') && dk.includes("o.analysis.chords.length"), "프롬프터는 코드가 있는 곡에만 · 뒤로 가기 한 칸");
  assert.ok(dk.includes('id="prPdf"') && dk.includes("songPdfName(o.name, o.artist, capoOf() ? keyName(keyN)"), "프롬프터 PDF 버튼·파일명 규칙");
  for (const k of ["prVol", "prSeek", "prSgs", "prEd", "prPv", "prNx", "prCi", "prLi", "prSi"]) assert.ok(dk.includes('id="' + k + '"'), "프롬프터 " + k);
  assert.ok(!dk.includes('id="prNow"') && !dk.includes('id="prNext"'), "‘지금·다음 코드’는 뺌(사용자 11/14)");
  assert.ok(dk.includes("navigator.vibrate(20)") && dk.includes("buzz(si)"), "구간 경계를 지나면 짧은 진동");
  assert.ok(dk.includes("songSecList(M.length, SEC.length ? SEC : autoSec())") && dk.includes("o.onEdits") && dk.includes("o.onSections") && /onEdits: \(e\)[^]*onSections: \(v\)/.test(T), "수정·구간 이름이 song.json에 저장됨");
  assert.ok(dk.includes("for (let r = 0; r < 5; r++)"), "한 쪽 5줄");
  { const pp = T.slice(T.indexOf("function songPdfPage("), T.indexOf("async function songPeaks(")); assert.ok(!/prVol|prSeek|슬라이더|타임라인/.test(pp) && pp.includes("(H - gy - 40 - 4 * gap) / 5"), "PDF는 5줄 악보만(조작 부품 없음)"); }
  assert.ok(dk.includes("me.onVol") && /me\.onVol && me\.onVol\(\)/.test(T), "곡 서랍 보컬 볼륨과 프롬프터 슬라이더가 같이 움직임");
  // (11/14 22:12 사용자) 코드 줄 길게 눌러 고치기·빈 자리 추가·비슷한 구간 자동 수정(보라)
  { const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures, songApplyEdits, songBeatNames, songEditRange, songSimilarRanges, songRenameBeats, songChordsOfRow, songLaneEvents };")();
    const beats = Array.from({ length: 32 }, (_, i) => i * 0.5), an = { beats, down: 0, key: "G", mode: "minor" };
    // 마디 0: 빈 자리 · 1~7: Gm A# Gm A# Gm A# Cm (마디 4의 A#은 앞뒤가 Gm이라 마디 2와 같은 문맥, 마디 6은 뒤가 Cm이라 다름)
    const names = ["Gm", "A#", "Gm", "A#", "Gm", "A#", "Cm"]; an.chords = names.map((n, i) => [(i + 1) * 2, n]);   // 마디 1(2초)부터 마디마다 한 코드
    const M0 = f.songMeasures(an, 0, null), ON = f.songBeatNames(M0);
    assert.strictEqual(ON.length, 32); assert.strictEqual(ON[0], null, "첫 마디는 코드 없음"); assert.strictEqual(ON[4], "Gm"); assert.strictEqual(ON[8], "A#");
    assert.deepStrictEqual(f.songEditRange(ON, 1), [1, 4], "빈 자리: 누른 박부터 마디 끝까지"); assert.deepStrictEqual(f.songEditRange(ON, 5), [4, 8], "코드 덩어리 한 마디"); assert.strictEqual(f.songEditRange(ON, 99), null);
    // 마디 2의 A#을 Gm으로: 같은 문맥(앞 Gm·뒤 Gm)인 마디 4의 A#도 같이
    const [a0, z0] = f.songEditRange(ON, 9), sim = f.songSimilarRanges(ON, a0, z0, null);
    assert.deepStrictEqual([a0, z0], [8, 12]); assert.deepStrictEqual(sim.map((r) => r[0]), [16], "마디 4의 A#만 비슷한 구간(마디 6은 문맥이 다름): " + JSON.stringify(sim)); assert.ok(sim.every((r) => r[0] % 4 === a0 % 4 && r[0] !== a0), "같은 박 위치만");
    let CN = f.songRenameBeats(ON, a0, z0, "Gm"); sim.forEach((r) => (CN = f.songRenameBeats(CN, r[0], r[1], "Gm")));
    assert.deepStrictEqual(f.songChordsOfRow(CN, 2, 4), [[1, "Gm"]]); assert.strictEqual(CN[24], "A#", "다른 문맥은 안 바뀜"); assert.strictEqual(ON[8], "A#", "원본은 안 바뀜");
    const ED = { 2: { ch: [[1, "Dm"]], g: "x" }, 4: { ch: [[1, "Dm"]], g: "x", auto: 1 } }, LE = f.songLaneEvents(an, an.chords, ED, M0);
    const fl = (t) => LE.find((e) => e.t === t); assert.strictEqual(fl(4).f, 1, "직접 고친 건 1(초록)"); assert.strictEqual(fl(8).f, 2, "자동은 2(보라)"); assert.strictEqual(fl(2).f, 0, "안 고친 건 0");
    assert.strictEqual(f.songLaneEvents(an, an.chords, {}, M0).length, an.chords.length, "고침 없으면 분석 그대로");
    // 직접 고친 마디는 자동 수정이 건드리지 않음(skip)
    assert.deepStrictEqual(f.songSimilarRanges(ON, a0, z0, (s1) => s1 === 16), [], "skip이면 제외");
    // 빈 자리 추가: 마디 0의 3박부터 Em
    const rg = f.songEditRange(ON, 2); assert.deepStrictEqual(rg, [2, 4]); const C2 = f.songRenameBeats(ON, rg[0], rg[1], "Em"); assert.deepStrictEqual(f.songChordsOfRow(C2, 0, 4), [[3, "Em"]]);
    assert.deepStrictEqual(f.songApplyEdits(M0, { 0: { ch: [[3, "Em"]] } }, 0)[0].chords.map((c) => [c.b, c.name]), [[2, "Em"]], "프롬프터도 같은 기록으로 그림"); }
  assert.ok(dk.includes("baseMeas = () => songApplyEdits(songMeasures(AN, keyN, o.lyrics), ED, keyN)") && dk.includes("const meas = () => showM(baseMeas())"), "프롬프터(·PDF·코드 악보)도 같은 고침 기록을 그림");
  { const pr = dk.slice(dk.indexOf("const openPrompter"), dk.indexOf("if (Q(\"dkTv\"))")); assert.ok(!/f === 2|d9b8ff|8dffb0|a287d0/.test(pr), "프롬프터에는 고침 색 구분 없음(사용자 11/14 22:16)"); }
  assert.ok(dk.includes("openChordEdit") && dk.includes('e.clientY - rc.top < 30') && dk.includes("navigator.vibrate(15)"), "코드 줄 길게 누르기");
  assert.ok(dk.includes("let tx = x + 3; if (tx < 2)") && dk.includes("put.pop()"), "코드 글자 겹침 방지");
  assert.ok(/delete e\.auto; delete e\.g;/.test(dk) && !/let ED = JSON\.parse[^]*let ED = JSON\.parse/.test(dk), "프롬프터 수정은 직접 고침으로 표시 · ED는 한 곳");
  // (11/14 21:49 사용자) 미끄러지는 중 다시 터치하면 옛 소리 위치로 튀던 버그: 지금 보이는 위치(vp)에서 이어잡고, 톡이면 그 자리에서 멈춤
  assert.ok(/const live = !!glide \|\| pend/.test(dk) && dk.includes("if (!live) vp = Math.max(0, Math.min(dur(), cur()))"), "미끄러지는 중 터치는 vp를 소리 위치로 되돌리지 않음");
  assert.ok(dk.includes("d.live ? commit(d.was) : commitTap(d)") && dk.includes("if (drag || glide) return;"), "미끄러지는 중 톡·옮기는 사이 재터치 처리");
  assert.ok(!/await seekTo\(vp\)/.test(dk.slice(dk.indexOf("const commit = async"), dk.indexOf("cv.onpointerdown"))), "commit이 vp를 덮어쓰는 seekTo를 쓰지 않음");
  assert.ok(!dk.includes("new Audio") && !/\.voc\.volume/.test(dk), "플레이어는 엔진만 씀");
  assert.ok(/songDeck\(pl, ids, \{ folder: x\.folder, autoplay: auto/.test(T), "곡 서랍 카드가 새 플레이어");
  assert.ok(T.includes("function songDestroy() {") && /dispose\?\.\(\)/.test(T), "닫을 때 애니메이션 정리");
  console.log("song-deck: ok");
})().catch((e) => { console.error(e); process.exit(1); });

{
  const css = T.match(/#dkPr \.prSgs\{[^}]*\}#dkPr \.prSgs button\{[^}]*\}/)[0];
  assert.ok(/min-height:0/.test(css) && /height:100%/.test(css), "프롬프터 구간 칸 버튼: 전역 button 최소높이(46px)에 눌려 슬라이더를 덮지 않게 min-height:0 · 부모 높이에 맞춤");
  assert.ok(/#dkPr \.prSgs\{[^}]*flex:none/.test(css), "구간 칸 줄은 줄어들지 않음");
}

{
  assert.ok(T.includes('id="dkSpM" aria-label="속도 1 내리기') && T.includes(">−1</button>") && !T.includes(">−5%</button>"), "속도 버튼은 ±1");
  assert.ok(/holdRepeat\(Q\("dkSpM"\)[^;]*rate - rStep\(\)/.test(T) && /holdRepeat\(Q\("dkSpP"\)[^;]*rate \+ rStep\(\)/.test(T), "속도 버튼은 길게 누르면 계속");
  assert.ok(T.includes("const rStep = () => { const b = +o.bpm; return b > 0 ? 1 / b : 0.01; }"), "한 칸 = BPM 1(분석 없으면 1%)");
  // 로직: 한 칸 단위로 맞춤 + 0.8~1.2 한계
  const fn = new Function("o", "rate", "const rStep = () => { const b = +o.bpm; return b > 0 ? 1 / b : 0.01; };" +
    "const setRate = (r) => { const st = rStep(); rate = Math.max(0.8, Math.min(1.2, Math.round(r / st) * st)); if (Math.abs(rate - 1) < st / 2) rate = 1; return rate; };" +
    "return { setRate, rStep };");
  const { setRate, rStep } = fn({ bpm: 125 }, 1);
  let r = 1; for (let i = 0; i < 3; i++) r = setRate(r + rStep());
  assert.strictEqual(Math.round(125 * r), 128, "+1 세 번 = 128 BPM");
  for (let i = 0; i < 100; i++) r = setRate(r - rStep());
  assert.ok(Math.abs(r - 0.8) < 1e-9 && Math.round(125 * r) === 100, "아래 한계 0.8배");
  const f2 = fn({}, 1); let q = 1; q = f2.setRate(q + f2.rStep()); assert.ok(Math.abs(q - 1.01) < 1e-9, "BPM 모르면 1%");
}

// ── 11/19: 프롬프터 닫기=재생 정지 · 제목 누르면 재생 없이 열기 · 프롬프터 키/속도 칸
{
  const fs = require("fs"), assert = require("assert"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert(/const stopPlay = \(\) => \{ document\.querySelectorAll\("\.capoP"\)\.forEach\(\(e\) => e\.remove\(\)\); try \{ eng\.pause\(\); \}/.test(H), "프롬프터 stopPlay 없음");
  assert(/Brand\.layer\(\(\) => \{ stopPlay\(\);/.test(H), "뒤로가기/닫기 때 stopPlay 호출 없음");
  assert(/\{ close: \(\) => \{ stopPlay\(\);/.test(H), "대체 close에도 stopPlay 필요");
  assert(/data-slt/.test(H) && /songLib\.auto = null; songDestroy\(\); songPaintList\(\); if \(opening\) songOpenScroll\(x\.folder\); \};/.test(H), "제목 탭: 자동재생 없이 열기");
  for (const id of ["prKm", "prKp", "prSm", "prSp", "prKv", "prSv"]) assert(H.includes('id="' + id + '"'), id + " 없음");
  assert(/#dkPr \.prKg button\{[^}]*min-height:0/.test(H), "전역 button min-height 덮어쓰기 필요");
  console.log("song-deck: prompter close/title/keytempo ok");
}

// ── 11/19: 가사 자동 찾기(LRCLIB) · A4 악보 모드
(async () => {
  const fs = require("fs"), assert = require("assert"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = H.slice(H.indexOf("const SG_NOTES"), H.indexOf("async function songPeaks("));
  const f = new Function(src + "; return { songParseLrc, songPickLyrics, songFetchLyrics, songSheetPages, songCleanTitle };")();
  const L = f.songParseLrc("[ar:x]\n[00:12.50]하나\n[01:02.3][02:00]둘\n[00:20.00]\n[00:30]셋\n[00:40]넷");
  assert.deepStrictEqual(L.slice(0, 2), [[12.5, "하나"], [30, "셋"]]); assert.strictEqual(L.length, 5, "빈 줄 제외·한 줄 여러 시각 지원");
  const synced = (d) => ({ duration: d, syncedLyrics: "[00:01.0]a\n[00:02.0]b\n[00:03.0]c\n[00:04.0]d", trackName: "t", artistName: "a" });
  assert.strictEqual(f.songPickLyrics([synced(300)], 200), null, "길이가 6초 넘게 다르면(다른 버전) 안 씀");
  assert.strictEqual(f.songPickLyrics([synced(230), synced(201)], 200).df, 1, "길이 가장 비슷한 것");
  assert.strictEqual(f.songPickLyrics([{ duration: 200, plainLyrics: "x" }, { duration: 200, instrumental: true, syncedLyrics: "[00:01]a" }], 200), null, "시간표 없는/연주곡은 안 씀");
  assert.strictEqual(f.songCleanTitle("Stumblin' In (Official MV) [Live]"), "Stumblin' In");
  const calls = []; const mkF = (fn) => async (u) => { calls.push(u); return fn(u); };
  let r = await f.songFetchLyrics("Song (Live)", "Art", 200, mkF((u) => u.includes("/get?") ? { ok: false } : u.includes("/search?track_name") ? { ok: true, json: async () => [synced(199)] } : { ok: true, json: async () => [] }));
  assert.ok(r && r.lines.length === 4, "get 실패 → 검색으로 찾음"); assert.ok(calls[0].includes("track_name=Song") && calls[0].includes("duration=200") && !calls[0].includes("Live"));
  assert.strictEqual(await f.songFetchLyrics("x", "y", 100, mkF(() => ({ ok: true, json: async () => [] }))), null, "없으면 null");
  assert.strictEqual(await f.songFetchLyrics("x", "y", 100, async () => { throw new Error("net"); }), undefined, "인터넷 안 되면 undefined(다시 시도 가능)");
  assert.deepStrictEqual(f.songSheetPages(40), { pages: 1, rpp: 10 }); assert.strictEqual(f.songSheetPages(107).pages, 1, "27줄이면 한 장"); assert.strictEqual(f.songSheetPages(200).pages, 2);
  for (const k of ["id=\"dkSh0\"", "id=\"shPlay\"", "id=\"shKm\"", "id=\"shSm\"", "id=\"shPdf\""]) assert(H.includes(k), k + " 없음");
  assert(/Brand\.layer\(\(\) => \{ stopPlay\(\); cancelAnimationFrame\(raf\); if \(sv\) \{ clearTimeout\(sv\); flushEd\(\); \} try \{ LE = songLaneEvents\(AN, CHORDS, ED, M0\); draw\(\); \} catch \{\} me\.onLyrics = null; me\.onVol = null; me\.onCapo = null; me\.sh = null;/.test(H), "A4 악보 닫기=재생 정지");
  assert(/pdfPreview\(out, 595, 842,/.test(H) && /songPdf\(out, pw, ph\)/.test(H), "A4 크기 PDF"); assert(/if \(CHORDS && needLy\(\)\) setTimeout/.test(H), "가사 비면 자동 찾기");
  assert(/onLyrics: \(L, t\) => \{[^}]*cx\.d\.lyrics_try = t/.test(H), "찾은 가사·시도 시각을 곡 파일에 저장");
  console.log("song-deck: lyrics + A4 sheet ok");
})().catch((e) => { console.error(e); process.exit(1); });

// ── 11/19: 카포 추천 · 볼륨 슬라이더 줄임 · A4 악보에도 볼륨/카포
{
  const fs = require("fs"), assert = require("assert"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = H.slice(H.indexOf("const SG_NOTES"), H.indexOf("async function songPeaks("));
  const f = new Function(src + "; return { songChordCost, songCapoBest };")();
  assert.strictEqual(f.songChordCost("G"), 0); assert.strictEqual(f.songChordCost("Em7"), 0); assert.ok(f.songChordCost("F") > 0.5); assert.strictEqual(f.songChordCost("Bb"), 1); assert.strictEqual(f.songChordCost("G/B"), 0.15);
  const mk = (arr) => arr.map((n, i) => ({ no: i + 1, chords: [{ b: 0, name: n, len: 4 }] }));
  // Bb 키 곡(Bb Gm Eb F): 카포 3 → G Em C D (전부 열린 코드)
  let R = f.songCapoBest(mk(["A#", "Gm", "D#", "F", "A#", "Gm", "D#", "F"]));
  assert.strictEqual(R.best[0].capo, 3, "A# Gm D# F → 카포 3"); assert.deepStrictEqual(R.best[0].forms.sort(), ["C", "D", "Em", "G"]); assert.strictEqual(R.best[0].easy, 1);
  R = f.songCapoBest(mk(["G", "C", "D", "Em"])); assert.strictEqual(R.best[0].capo, 0, "이미 쉬우면 카포 없이"); assert.strictEqual(f.songCapoBest([]), null);
  // 오래 나오는 코드가 더 큰 비중
  R = f.songCapoBest([{ chords: [{ name: "C#", len: 28 }, { name: "A#m", len: 4 }] }]); assert.ok(R.best[0].capo >= 1, "C# 위주 → 카포로 내림");
  assert(/#dkPr \.prVo\{[^}]*max-width:calc\(var\(--u\)\*22\)/.test(H), "프롬프터 볼륨 슬라이더 폭 줄임");
  for (const id of ["prCp", "shCp", "shVol", "shVv"]) assert(H.includes('id="' + id + '"'), id);
  assert(/\$\("#prCp"\)\.onclick = \(\) => capoPanel\(\)/.test(H) && /\$\("#shCp"\)\.onclick = \(\) => capoPanel\(\)/.test(H));
  assert(/\$\("#shVol"\)\.oninput = \(\) => setVol/.test(H), "A4 악보 볼륨 → 같은 setVol");
  console.log("song-deck: capo + slim volume ok");
}


// ── 11/19: 카포 고르면 화면 코드·키 표시 변경 · PDF 미리보기 · 구간 슬라이더 · 더블탭 재생/길게 눌러 수정
(async () => {
  const fs = require("fs"), assert = require("assert"), H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = H.slice(H.indexOf("const SG_NOTES"), H.indexOf("async function songPeaks("));
  const f = new Function(src + "; return { songFlat, songCapoBest, cellGesture, songChordName };")();
  assert.strictEqual(f.songFlat("A#"), "Bb"); assert.strictEqual(f.songFlat("D#m7"), "Ebm7"); assert.strictEqual(f.songFlat("C/G#"), "C/Ab"); assert.strictEqual(f.songFlat("F#"), "F#");
  const R = f.songCapoBest([{ chords: [{ name: "D", len: 8 }, { name: "A#", len: 2 }] }]); assert.strictEqual(R.all.length, 8); assert.strictEqual(R.all[0].capo, 0, "all은 카포 번호 순");
  // 카포 모양 이름: D#(소리) 카포 3 → 'C' 폼
  assert.strictEqual(f.songChordName("D#", -3), "C");
  // cellGesture: 탭·더블탭·길게 누름·움직이면 취소
  { const L = {}, el = { addEventListener: (n, fn) => { L[n] = fn; } }, ev = []; const timers = []; const realST = global.setTimeout, realCT = global.clearTimeout;
    global.setTimeout = (fn, ms) => { timers.push([fn, ms]); return timers.length; }; global.clearTimeout = (id) => { if (timers[id - 1]) timers[id - 1][0] = null; };
    f.cellGesture(el, { tap: () => ev.push("tap"), dbl: () => ev.push("dbl"), long: () => ev.push("long") });
    const down = (x = 0, y = 0) => L.pointerdown({ clientX: x, clientY: y }); const flush = () => timers.splice(0).forEach(([fn]) => fn && fn());
    down(); L.pointerup(); assert.deepStrictEqual(ev, ["tap"]); down(); L.pointerup(); assert.deepStrictEqual(ev, ["tap", "dbl"], "350ms 안 두 번 = 더블");
    ev.length = 0; down(); flush(); L.pointerup(); assert.deepStrictEqual(ev, ["long"], "길게 누르면 long만(탭 아님)");
    ev.length = 0; down(0, 0); L.pointermove({ clientX: 40, clientY: 0 }); flush(); L.pointerup(); assert.deepStrictEqual(ev, [], "스크롤하려고 움직이면 모두 취소");
    ev.length = 0; down(); L.pointercancel(); L.pointerup(); assert.deepStrictEqual(ev, []);
    global.setTimeout = realST; global.clearTimeout = realCT; }
  for (const k of ['const showM = (M)', 'const keyLabel = (n)', 'const meas = () => showM(baseMeas())', 'const pdfPreview = (out, pw, ph, fname)', 'pdfPreview(out, 960, 600,', 'pdfPreview(out, 595, 842,', 'id="shSeek"', 'id="shSgs"', 'cellGesture(c, { tap: () => tapCell(m.t0), dbl: () => playFrom(m.t0), long: () => openShEdit(i) })', 'dbl: () => playFrom(m.t0), long: () => openEdit(i)', 'me.onCapo = () => { build(); sub(); paintPk(); }'])
    assert(H.includes(k), "없음: " + k);
  assert(!/songSave\(songPdf\(out, (595, 842|960, 600)/.test(H.replace(/const pdfPreview[\s\S]*?close\(\); \};/, "")), "PDF는 미리보기를 거쳐서만 저장");
  assert(/capoOf\(\) - keyN/.test(H), "카포 중 코드 고치기는 카포 번호만큼 되돌려 원곡 키로 저장");
  console.log("song-deck: capo view/preview/seek/gesture ok");
})().catch((e) => { console.error(e); process.exit(1); });

{ // 키를 바꾸면 가장 편한 카포를 자동으로, 직접 해제하면 자동은 쉼
  assert.match(T, /const autoCapo = \(\) => \{ if \(!AN \|\| me\.capoOff\) return;/);
  assert.match(T, /songCapoBest\(songApplyEdits\(songMeasures\(AN, keyN, o\.lyrics\), ED, keyN\)\)/);
  assert.match(T, /keyN = keyWant; autoCapo\(\); paintKey\(\)/, "실시간 엔진 경로");
  assert.match(T, /keyN = n; autoCapo\(\); draw\(\)/, "키 파일 경로");
  assert.match(T, /me\.capo = k; me\.capoOff = !k;/);
  assert.match(T, /\(me\.capo \? ` · 카포 \$\{me\.capo\}` : ""\)/, "키 표시에 카포");
  assert.ok(!/const paintKey = \(\) => \{[^\n]*capoOf\(\)/.test(T), "paintKey 는 capoOf(TDZ) 대신 me.capo");
}

{ // 구간 자동 이름: 전주·벌스·코러스·간주·후주
  const src = T.slice(T.indexOf("// (11/19 사용자 '전주·벌스·코러스·간주로"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songAutoSections };")();
  // 마디 1초(0.1초 단위 10칸). 구성: 전주4 · 벌스8 · 코러스8 · 간주4 · 벌스8 · 코러스8 · 후주4
  const plan = [["i", 4], ["v", 8], ["c", 8], ["m", 4], ["v", 8], ["c", 8], ["o", 4]], chordOf = { i: "C", v: "Am F", c: "G C", m: "C", o: "C" };
  const M = [], voc = [], mr = []; let t = 0;
  for (const [k, n] of plan) for (let i = 0; i < n; i++) { M.push({ t0: t, t1: t + 1, chords: chordOf[k].split(" ").map((x, b) => ({ b, name: x, len: 2 })) }); const q = (x) => String.fromCharCode(48 + Math.round(Math.sqrt(x) * 63)); for (let j = 0; j < 10; j++) { voc.push(k === "v" ? q(0.2) : k === "c" ? q(0.5) : q(0)); mr.push(q(k === "c" ? 0.6 : 0.3)); } t++; }
  const r = f.songAutoSections(M, { s: 0.1, voc: voc.join(""), mr: mr.join("") });
  assert.deepStrictEqual(r.map((x) => x[1]), ["전주", "벌스 1", "코러스 1", "간주", "벌스 2", "코러스 2", "후주"]);
  assert.deepStrictEqual(r.map((x) => x[0]), [0, 4, 12, 20, 24, 32, 40]);
  assert.deepStrictEqual(f.songAutoSections(M, null), [], "파형 없으면 이름 안 붙임(예전 8마디 구간)");
  // 코드가 전부 같은 곡(반복 진행): 소리 큰 쪽이 코러스
  const M2 = M.map((m) => ({ ...m, chords: [{ b: 0, name: "G", len: 4 }] })), r2 = f.songAutoSections(M2, { s: 0.1, voc: voc.join(""), mr: mr.join("") });
  assert.ok(r2.some((x) => /^코러스/.test(x[1])) && r2.some((x) => /^벌스/.test(x[1])) && r2[0][1] === "전주" && r2[r2.length - 1][1] === "후주");
  assert.match(T, /SEC\.length \? SEC : autoSec\(\)/); assert.match(T, /return a\.length \? a : autoSec\(\)/, "직접 이름이 있으면 그게 우선");
}

{ // 처음 재생 대기 팝업 + A4/TV 버튼 순서
  assert.ok(T.includes('const pop = busyPop("곡 불러오는 중이에요"') && T.includes("finally { pop.close(); }"), "불러오는 동안 팝업·끝나면 닫힘");
  assert.ok(T.indexOf('id="dkSh0"') < T.indexOf('id="dkTv"'), "A4 악보 버튼이 TV 앞");
}

{ // 멈춰 있을 때 한 번 누르면 그 칸부터 재생
  assert.ok(T.includes("const tapCell = (t) => { if (eng.isPlaying()) seekTo(t); else playFrom(t); };"));
  assert.ok(T.includes("tap: () => tapCell(m.t0), dbl: () => playFrom(m.t0), long: () => openShEdit(i)") && T.includes("else tapCell(m.t0); }, dbl: () => playFrom(m.t0)"), "A4·프롬프터 둘 다");
}

{ // 긴 가사 줄은 여러 마디에 나눠 놓음
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures };")();
  const beats = Array.from({ length: 41 }, (_, i) => +(i * 0.5).toFixed(3));   // 120BPM · 한 마디 2초 · 10마디
  const an = { beats, down: 0, chords: [[0, "C"]] };
  const M = f.songMeasures(an, 0, [[0.2, "Our love is alive, and so we begin tonight"], [9.0, "다음 줄 가사입니다 여기 모두 같이"]]);
  const withLy = M.filter((m) => m.lyrics.length).map((m) => m.no);
  assert.ok(withLy.length >= 3, "한 줄이 3마디 이상에 나뉨: " + withLy);
  assert.strictEqual(M.flatMap((m) => m.lyrics.map((l) => l.text)).join(" ").replace(/\s+/g, " "), "Our love is alive, and so we begin tonight 다음 줄 가사입니다 여기 모두 같이", "글자는 하나도 안 사라지고 순서 그대로");
  assert.strictEqual(M[0].lyrics[0].b < 1, true, "첫 낱말은 줄이 시작한 자리");
}

{ // 곡을 열면 그 카드가 화면 맨 위에
  assert.ok(T.includes("function songOpenScroll(folder)") && T.includes("songGlide(() => { const r = row();"));
  assert.strictEqual((T.match(/if \(opening\) songOpenScroll\(x\.folder\)/g) || []).length, 2, "▶ 듣기와 제목 둘 다");
}

// (11/19 사용자) 곡이 열린 화면에서 뒤로 스와이프 = 곡만 접히고 곡 서랍 맨 위로 — 열려 있는 동안 Brand.layer 한 칸
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes("function songSyncLayer()") && T.includes("songLy = Brand.layer((pop) =>"), "곡 열림 = 뒤로 가기 한 칸");
  assert.ok(T.includes("function songPaintList() { songPaintList0(); try { songSyncLayer(); } catch {} }"), "목록을 그릴 때마다 칸 맞춤");
  assert.ok(T.includes("if (pop) songGlide(0);") && T.includes("const SONG_GLIDE_MS = 900;"), "접힌 뒤 맨 위로 · 애니 2배(0.9초)");
  assert.ok(/try \{ if \(songLy\) \{ const l = songLy; songLy = null; l\.close\(\); \} \} catch \{\} \}/.test(T), "다른 화면으로 가면 칸 정리");
}
