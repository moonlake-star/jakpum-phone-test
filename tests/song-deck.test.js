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
    const M = f.songMeasures(an, 0, [[1.6, "가"], [2.8, "나"]]);
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
  assert.ok(dk.includes("openPrompter") && dk.includes("Brand.layer") && dk.includes('id="shTv"') && dk.includes("o.analysis.chords.length"), "프롬프터는 코드가 있는 곡에만 · 뒤로 가기 한 칸");
  assert.ok(dk.includes('id="prPdf"') && dk.includes("songPdfName(o.name, o.artist, keyName(keyN) + shiftTag()"), "프롬프터 PDF 버튼·파일명 규칙");
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
  assert.ok(dk.includes("baseMeas = () => songApplyEdits(songMeasures(AN, keyN, o.lyrics, o.wave && o.wave.voc), ED, keyN)") && dk.includes("const meas = () => showM(baseMeas())"), "프롬프터(·PDF·코드 악보)도 같은 고침 기록을 그림");
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
  for (const k of ['const showM = (M)', 'const keyLabel = (n)', 'const meas = () => showM(baseMeas())', 'const pdfPreview = (out, pw, ph, fname, opt = {})', 'pdfPreview(out, 960, 600,', 'pdfPreview(out, 595, 842,', 'id="shSeek"', 'id="shSgs"', 'cellGesture(c, { tap: () => tapCell(i === 0 ? 0 : m.t0), dbl: () => playFrom(i === 0 ? 0 : m.t0), long: () => openShEdit(i) })', 'dbl: () => playFrom(i === 0 ? 0 : m.t0), long: () => openEdit(i)', 'me.onCapo = () => { build(); sub(); paintPk(); }'])
    assert(H.includes(k), "없음: " + k);
  assert(!/songSave\(songPdf\(out, (595, 842|960, 600)/.test(H.replace(/const pdfPreview[\s\S]*?close\(\); \};/, "")), "PDF는 미리보기를 거쳐서만 저장");
  assert(/capoOf\(\) - keyN/.test(H), "카포 중 코드 고치기는 카포 번호만큼 되돌려 원곡 키로 저장");
  console.log("song-deck: capo view/preview/seek/gesture ok");
})().catch((e) => { console.error(e); process.exit(1); });

{ // 키를 바꾸면 가장 편한 카포를 자동으로, 직접 해제하면 자동은 쉼
  assert.match(T, /const autoCapo = \(\) => \{ if \(!AN\) return; const P = modeP\(\); if \(P \? me\.tpOff : me\.capoOff\) return;/);
  assert.match(T, /const M = songApplyEdits\(songMeasures\(AN, keyN, o\.lyrics, o\.wave && o\.wave\.voc\), ED, keyN\); if \(P\) \{ const R = songPianoShift\(M\)[\s\S]*songCapoBest\(M\)/);
  assert.match(T, /keyN = keyWant; autoCapo\(\); paintKey\(\)/, "실시간 엔진 경로");
  assert.match(T, /keyN = n; autoCapo\(\); draw\(\)/, "키 파일 경로");
  assert.match(T, /me\.capo = k; me\.capoOff = !k;/);
  assert.match(T, /shiftNote = \(\) => \(modeP\(\) \? ` · 🎹 트랜스포즈/, "키 표시에 카포·트랜스포즈 값"); assert.match(T, /sgn\(n\)\}반음`\) \+ shiftNote\(\);/);
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
  assert.ok(T.indexOf('id="dkSh0"') < T.indexOf('id="dkRep"') && T.indexOf('id="dkRep"') < T.indexOf('id="dkLoop"'), "(11/19) 버튼 순서: A4 악보 · 반복 · 구간 반복");
  assert.ok(!T.includes('<button type="button" id="dkTv">') && T.indexOf('id="shCp"') < T.indexOf('id="shTv"') && T.indexOf('id="shTv"') < T.indexOf('id="shPdf"'), "TV 버튼은 A4 악보 화면의 카포·PDF 사이");
  assert.ok(/id="dkA">시작<\/button><button type="button" id="dkB">끝<\/button><button type="button" id="dkClr">해제/.test(T), "구간 반복: 시작·끝·해제");
}

{ // 멈춰 있을 때 한 번 누르면 그 칸부터 재생
  assert.ok(T.includes("const tapCell = (t) => { if (eng.isPlaying()) Q(\"sgPb\").onclick(); else playFrom(t); };"), "재생 중 터치 = 일시정지 · 멈춰 있을 때 터치 = 그 칸부터 재생(11/19)");
  assert.ok(T.includes("tap: () => tapCell(i === 0 ? 0 : m.t0), dbl: () => playFrom(i === 0 ? 0 : m.t0), long: () => openShEdit(i)") && T.includes("else tapCell(i === 0 ? 0 : m.t0); }, dbl: () => playFrom(i === 0 ? 0 : m.t0)"), "A4·프롬프터 둘 다");
}

{ // 긴 가사 줄은 여러 마디에 나눠 놓음
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures };")();
  const beats = Array.from({ length: 41 }, (_, i) => +(i * 0.5).toFixed(3));   // 120BPM · 한 마디 2초 · 10마디
  const an = { beats, down: 0, chords: [[0, "C"]] };
  const M = f.songMeasures(an, 0, [[0.2, "Our love is alive, and so we begin tonight"], [9.0, "다음 줄 가사입니다 여기 모두 같이"]]);
  const withLy = M.filter((m) => m.lyrics.length).map((m) => m.no);
  assert.ok(withLy.length >= 3, "한 줄이 3마디 이상에 나뉨: " + withLy);
  assert.strictEqual(M.flatMap((m) => m.lyrics.map((l) => l.text)).join(" ").replace(/\s+/g, " "), "Our love is alive, and so we begin tonight 다음 줄 가사입니다 여기 모두 같이", "글자는 하나도 안 사라지고 순서 그대로");
  assert.strictEqual(M[0].lyrics[0].b < 1.5, true, "첫 낱말은 줄이 시작한 자리(가사 시간표가 앞서 찍혀 0.4초 미룸)");
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
  assert.ok(T.includes("if (pop) songGlide(0);") && T.includes("const SONG_GLIDE_MS = 300;"), "접힌 뒤 맨 위로 · 애니 0.3~0.43초");
  assert.ok(/try \{ if \(songLy\) \{ const l = songLy; songLy = null; l\.close\(\); \} \} catch \{\} \}/.test(T), "다른 화면으로 가면 칸 정리");
}

// (11/19 사용자) 구간 A·B는 코드(금색 #ffd27a)와 다른 색(분홍) — 파형 표시·시작/끝 버튼·시간 글자 모두
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes('g.fillStyle = "#ff6fb5"; g.fillRect(x - 1, 0, 2, H)') && T.includes('rgba(255,111,181,.16)'), "파형의 A·B 선과 구간 색");
  assert.ok(T.includes(".dk .dkRv #dkA,.dk .dkRv #dkB{border-color:#ff6fb5;color:#ff6fb5}") && T.includes(".dk .dkLab{color:#ff6fb5;") && T.includes("#dkLoop.on{border-color:#ff6fb5"), "버튼·글자 색");
}

// (11/19 사용자) A4 악보: 마디 끝에 걸친 중복 코드 정리 · 1박짜리 겹침 합침 · 코드 글자가 칸 밖으로 안 나감 · 가사 0.4초 미룸
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures };")();
  const beats = Array.from({ length: 33 }, (_, i) => +(i * 0.5).toFixed(3));   // 8마디
  // 3마디: G(0)·Em(마지막 박) 다음 마디 첫 코드도 Em → 3마디의 Em은 뺌 · 5마디: Am → 1박 뒤 Am7 → 하나로
  const chords = [[0, "C"], [4.0, "G"], [5.5, "Em"], [6.0, "Em"], [8.0, "Am"], [8.5, "Am7"], [9.0, "Am7"], [10, "D"]];
  const M = f.songMeasures({ beats, down: 0, chords }, 0, []);
  assert.deepStrictEqual(M[2].chords.map((c) => c.name), ["G"], "다음 마디와 같은 끝 박 코드는 뺌: " + JSON.stringify(M[2].chords));
  assert.deepStrictEqual(M[4].chords.map((c) => c.name + c.b), ["Am70"], "같은 뿌리음 1박 겹침은 뒤 코드로 합침: " + JSON.stringify(M[4].chords));
  assert.ok(T.includes("const fitChords = () =>") && !T.includes("e.style.transform = `translateX(-${x.b * 25}%)`"), "코드 글자가 칸 밖으로 안 나가게(11/19 순서대로 한 줄 + 칸 너비에 맞춰 글자 축소로 바뀜)");
  const L = f.songMeasures({ beats, down: 0, chords: [[0, "C"]] }, 0, [[3.9, "나는 사랑해요 너무나 오래전부터"]]);
  assert.ok(L[2].lyrics.length && L[2].lyrics[0].b < 1.0 && L[1].lyrics.length === 0, "마디 끝(3.9초) 가사는 다음 칸으로(0.4초 미룸): " + JSON.stringify(L.map((m) => m.lyrics)));
}

// (11/19 사용자) 파형: 기본 확대를 지금보다 살짝 더(14→18 px/초 · 약 1.3배, 확대/축소 조작은 없음) · 멈춰 있을 때 파형을 톡 누르면 재생
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes("DK_PPS = 22,"), "기본 확대(18→22, 11/19 13:12 코드가 겹쳐서)");
  assert.ok(T.includes('const commitTap = async (d) => { if (!d.was) { if (alive()) Q("sgPb").onclick(); return; }'), "멈춘 파형 톡 = 재생");
  assert.ok(!T.includes("pinch"), "확대·축소 조작 없음");
}

// (11/19 사용자) STT 없이 보컬 파형으로 낱말 위치 잡기: 줄 시작 맞춤 · 줄 안 쉼 건너뛰기 · 노래 소리 구간에만 음절 비율로 배치
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures, songVoiced, songWordTimes };")();
  const beats = Array.from({ length: 81 }, (_, i) => +(i * 0.5).toFixed(3));   // 한 마디 2초 · 20마디
  const wave = (segs, n = 400) => Array.from({ length: n }, (_, i) => String.fromCharCode(48 + (segs.some(([a, b]) => i >= a * 10 && i < b * 10) ? 40 : 1))).join("");
  // 노래: 4.3~6.0초 / 쉼 / 7.5~9.0 (가사 시간표는 4.0 — 소리보다 0.3초 앞)
  const voc = wave([[4.3, 6.0], [7.5, 9.0]]), V = f.songVoiced(voc);
  assert.strictEqual(V[40], 0); assert.strictEqual(V[44], 1);
  const tw = f.songWordTimes(4.0, 12.0, ["하나", "둘둘", "셋셋셋", "넷"], V);
  assert.ok(tw && Math.abs(tw[0] - 4.3) < 0.15, "줄 시작은 첫 노래 소리: " + tw);
  assert.ok(tw[1] > tw[0] && tw[2] > tw[1] && tw[3] > tw[2], "순서대로");
  assert.ok(tw.every((x) => x < 6.0 || x >= 7.5), "쉬는 구간(6.0~7.5)에는 낱말이 놓이지 않음: " + tw);
  assert.strictEqual(f.songWordTimes(20.0, 30, ["가", "나"], V), null, "근처에 노래 소리가 없으면 옛 방식");
  const M = f.songMeasures({ beats, down: 0, chords: [[0, "C"]] }, 0, [[4.0, "하나 둘둘 셋셋셋 넷"], [12, "다음 줄 가사"]], voc);
  assert.strictEqual(M.flatMap((m) => m.lyrics.map((l) => l.text)).join(" "), "하나 둘둘 셋셋셋 넷 다음 줄 가사", "글자는 하나도 안 사라지고 순서 그대로");
  assert.ok(M[2].lyrics.length > 0 && M[2].lyrics[0].b < 1.5, "첫 낱말은 4.3초(3번째 마디 앞쪽)");
  assert.ok(T.includes("o.wave && o.wave.voc"), "보컬 파형을 넘겨 줌");
}

// (11/19 사용자 '못갖춘마디·가사가 앞 마디에서 시작') 낱말은 소리가 시작하는 마디에(마디 끝에 걸쳐도 앞 마디) · 첫 박자 전이면 첫 마디
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songMeasures };")();
  const an = { beats: Array.from({ length: 81 }, (_, i) => +(i * 0.5).toFixed(3)), down: 2, chords: [[1, "C"]] };   // 마디 = 2초, 첫 마디 시작 1.0초
  const L = (t, tx) => f.songMeasures(an, 0, [[t - 0.4, tx]]).filter((m) => m.lyrics.length).map((m) => [m.no, +m.lyrics[0].b.toFixed(2), m.lyrics[0].text])[0];   // 가사 시각은 0.4초 지연이 더해짐
  assert.deepStrictEqual(L(4.5, "하나"), [2, 3.0, "하나"], "3박(3.0)에서 시작 → 앞 마디(2번)");   // 3.0초 마디 2: 3.0~5.0 → 4.5 = 3박째
  assert.deepStrictEqual(L(4.9, "하나"), [3, 0, "하나"], "(11/20) 줄의 첫 낱말이 다음 마디 첫 박 0.35박 안쪽 앞이면 → 다음 마디 첫 박");
  assert.deepStrictEqual(L(4.6, "하나"), [2, 3.2, "하나"], "0.35박보다 더 앞(0.8박 전)이면 → 앞 마디 그대로(걸어 들어가는 음)");
  assert.ok(!T.includes("SG_PICK_SNAP"), "예외 규칙(줄 첫 낱말 밀기) 없음");
  assert.strictEqual(L(0.5, "먼저")[0], 1, "첫 박자 전 가사는 첫 마디");
  const two = f.songMeasures(an, 0, [[4.1, "도 레 미 파"]]);   // 4.5초부터: 3박째에서 시작해 다음 마디로 이어짐
  assert.strictEqual(two.flatMap((m) => m.lyrics.map((l) => l.text)).join(" "), "도 레 미 파", "글자는 그대로 · 순서 유지");
}

// (11/19 사용자 '기타/피아노 모드') 피아노 모드: 소리 키는 그대로 · 화면은 검은건반 적은 '모양' · 키보드 트랜스포즈 값(t = 소리 − 모양)
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songPianoCost, songPianoShift, songChordName };")();
  assert.strictEqual(f.songPianoCost("C"), 0); assert.strictEqual(f.songPianoCost("Am"), 0); assert.strictEqual(f.songPianoCost("G7"), 0);
  assert.ok(f.songPianoCost("F#m") > 0.4 && f.songPianoCost("Bb") > 0.4, "검은건반 코드는 어려움");
  assert.ok(f.songPianoCost("D/F#") > 0, "슬래시 베이스가 검은건반이면 감점");
  const M = (names) => [{ chords: names.map((n) => ({ name: n, len: 4 })) }];
  const A = f.songPianoShift(M(["E", "C#m", "A", "B"]));   // 소리 E 키 → C 모양으로 치고 키보드 +4
  assert.strictEqual(A.best[0].t, 4, "E·C#m·A·B 소리 → C·Am·F·G 모양 = 트랜스포즈 +4"); assert.strictEqual(A.best[0].white, 1); assert.deepStrictEqual(A.best[0].forms.slice().sort(), ["Am", "C", "F", "G"]);
  const B = f.songPianoShift(M(["C", "Am", "F", "G"])); assert.strictEqual(B.best[0].t, 0, "이미 흰건반이면 0"); assert.strictEqual(B.none.t, 0);
  const C = f.songPianoShift(M(["D", "Bm", "G", "A"])); assert.strictEqual(C.best[0].t, 2, "D 소리 → C 모양 + 트랜스포즈 +2");
  const D = f.songPianoShift(M(["Bb", "Gm", "Eb", "F"])); assert.strictEqual(D.best[0].t, -2, "Bb 소리 → C 모양, 키보드 -2(내림)");
  assert.ok(A.all.length === 13 && A.all[0].t === -6 && A.all[12].t === 6, "-6~+6 전부 계산");
  assert.strictEqual(f.songPianoShift([]), null);
  // 화면 연결: 모드 선택 버튼 · 상단 버튼/부제에 값 · 키 ± 때 자동 재추천 · 옛 '피아노 추천 키(소리 키 바꾸기)' 버튼은 없앰
  assert.ok(T.includes("SG_GUITAR_SVG + \" 기타 · 카포\"") && !T.slice(T.indexOf("const capoPanel = () =>"), T.indexOf("const capoPanel = () =>") + 3000).includes("🎸") && T.includes("🎹 피아노 · 키 변경") && T.includes('localStorage.setItem("sgMode"'), "모드 선택 버튼·기억");
  assert.ok(/shiftBtn = \(\) => \(modeP\(\) \? "🎹"/.test(T) && /\$\("#prCp"\)\.textContent = shiftBtn\(\)/.test(T) && /\$\("#shCp"\)\.textContent = shiftBtn\(\)/.test(T), "상단 버튼에 카포/트랜스포즈 값");
  assert.ok(/트랜스포즈 \$\{k \? sgn\(k\) : "0"\} \(소리/.test(T), "부제(키 옆)에 트랜스포즈 값");
  assert.ok(/songPianoShift\(M\)/.test(T) && /const autoCapo = \(\) => \{ if \(!AN\) return; const P = modeP\(\)/.test(T), "키를 바꾸면 모드에 맞게 자동 재추천");
  assert.ok(!T.includes("피아노 추천 키") && !T.includes("songPianoBest"), "소리 키를 바꾸던 옛 버튼 제거");
}

// (11/19 사용자 '줄 끝 낱말 you가 다음 칸에') 마지막 낱말은 길게 끌어 부르므로 일찍 시작해야 함 · 낱말 시작은 음절 사이(소리 약한 곳)로 붙음
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")), f = new Function(src + "; return { songVoiced, songWordTimes };")();
  // 10.0~18.0초 노래(8초), 낱말 7개(음절 1개씩) · 같은 간격으로 하면 마지막 낱말은 10+8*6/7=16.86초
  const voc = Array.from({ length: 300 }, (_, i) => String.fromCharCode(48 + (i >= 100 && i < 180 ? 40 : 1))).join(""), V = f.songVoiced(voc);
  const w = ["a", "b", "c", "d", "e", "f", "g"], tw = f.songWordTimes(10.0, 25, w, V);
  assert.ok(tw[6] < 16.5, "마지막 낱말은 균등 배분보다 일찍: " + tw[6]);
  assert.ok(tw.every((x, i) => i === 0 || x > tw[i - 1]), "순서 유지");
  // 음절 사이에 소리가 약해지는 곳(0.1초 골)이 있으면 낱말 시작이 그곳으로 붙음(균등 배분 자리 ±0.2초 안)
  const am = Array.from({ length: 300 }, (_, i) => (i >= 100 && i < 180 ? 40 : 1)); am[114] = 8; am[132] = 7;
  const V2 = f.songVoiced(am.map((x) => String.fromCharCode(48 + x)).join("")), t2 = f.songWordTimes(10.0, 25, ["a", "b", "c", "d", "e", "f"], V2);
  assert.ok(t2.some((x) => Math.abs(x - 11.4) < 0.01) && t2.some((x) => Math.abs(x - 13.2) < 0.01), "골(11.4·13.2초)에 붙음: " + t2);
}

// (11/19 사용자 '가사 수정 후 완료하면 화면 위치가 너무 아래로') A4 악보 수정: 다시 그려도 스크롤 위치 유지 · 완료하면 고친 마디가 화면 위쪽에 오게
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/const closeShEdit = \(back\) =>/.test(T) && /closeShEdit\(true\)/.test(T), "완료·Enter는 고친 마디로 되돌아감");
  assert.ok(/ep\.querySelector\("#shOk"\)\.onclick = \(\) => closeShEdit\(true\)/.test(T));
  assert.ok(/st0 = scEl \? scEl\.scrollTop : 0/.test(T) && /scEl\.scrollTop = st0/.test(T) && /paper\.style\.minHeight = paper\.offsetHeight/.test(T), "다시 그리는 동안 높이·스크롤 위치 유지");
}

// (11/19 사용자) 카포 버튼은 '카포'만 쓰지 않고 현재 카포 위치를 보여줌: 카포0 · 카포2
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/shiftBtn = \(\) => \(modeP\(\) \? "🎹" \+ \(shiftOf\(\) \? sgn\(shiftOf\(\)\) : "0"\) : "카포" \+ shiftOf\(\)\)/.test(T), "기타 모드 버튼은 카포0·카포2, 피아노 모드는 🎹+3");
}

// (11/19 사용자 'Stumblin' In 코드는 안 바꿨는데 초록') 마디 편집창에서 가사만 고치면 코드는 '직접 수정'으로 저장하지 않는다
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.strictEqual((T.match(/const ci0 = ci\.value, apply = \(\) =>/g) || []).length, 2, "프롬프터·악보 편집창 모두 처음 코드 글자를 기억");
  assert.strictEqual((T.match(/if \(ci\.value !== ci0\) \{ delete e\.auto; delete e\.g;/g) || []).length, 2, "코드 칸이 바뀐 때만 e.ch 저장");
}

// (11/19 사용자) 악보 화면: 가사 글자 크기 · 코드 겹침 방지 · 전체화면(+자동 위로 스크롤) · PDF 미리보기 좌우 넘기기
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/#dkSh \.shL\{font-size:calc\(var\(--ly\)\*max\(11px/.test(T) && /--ly:1\.25/.test(T), "가사 글자는 기본 크게(1.25배) + 크기 변수");
  assert.ok(/const LYS = \[1, 1\.25, 1\.5, 1\.8\]/.test(T) && /id="shFtM"/.test(T) && /id="shFtP"/.test(T) && /localStorage\.setItem\("sgShLy"/.test(T), "가사 글자 크기 버튼(가− 가＋, 기기에 기억)");
  assert.ok(/h\.append\(hb, hs\); paper\.appendChild\(h\); paper\.appendChild\(shTools\(\)\)/.test(T) && !/class="shBtn" id="(shFt|shFs|shPdf)"/.test(T), "글자 크기·전체화면·PDF 버튼은 제목 아래 줄로(위 조작줄에서 뺌 → 제목이 덜 잘림)");
  assert.ok(/const makePdf = async \(pdfBtn\) =>/.test(T) && /pb\.onclick = \(\) => makePdf\(pb\)/.test(T) && /class="shPdfB" id="shPdf"/.test(T), "PDF 버튼도 같은 줄");
  assert.ok(/#dkSh \.shC\{position:relative;/.test(T) && /e\.dataset\.l = String\(x\.b \/ Math\.max\(1, m\.beats\) \* 100\)/.test(T) && !/justify-content:space-between;align-items:flex-start;gap:\.3em/.test(T), "코드는 박 위치에 놓고 겹칠 때만 밀거나 줄임");
  assert.ok(/const fitChords = \(\) =>/.test(T) && /x\[0\] >= 0 || fs <= 9/.test(T) && /fitChords\(\); paper\.style\.minHeight = ""/.test(T), "칸에 안 들어가면 코드 글자를 줄임");
  assert.ok(/id="shFs"/.test(T) && /const setFs = \(on\) =>/.test(T) && /requestFullscreen/.test(T) && /#dkSh\.fs \.shBar,#dkSh\.fs \.shTl\{display:none\}/.test(T), "전체화면 버튼");
  assert.ok(/classList\.contains\("fs"\)\) \{ if \(r\.top > sc\.top \+ sc\.height \* 0\.45/.test(T) && /scrollBy\(\{ top: r\.top - \(sc\.top \+ sc\.height \* 0\.12\)/.test(T), "전체화면 자동 위로 스크롤");
  assert.ok(/id="pvPv"/.test(T) && /id="pvNx"/.test(T) && /Math\.abs\(dx\) > 50 && Math\.abs\(dx\) > 1\.5 \* Math\.abs\(dy\)/.test(T) && /ArrowRight/.test(T), "PDF 미리보기 좌우 넘기기");
}

// (11/19 사용자 '좌우폭 작은 글꼴 · sus4·add2 같은 뒤 글씨는 작게') 코드 = 뿌리+단조(크게) + 뒤에 붙는 글씨(작게) · 좁은 글꼴
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("function songChordParts"), T.indexOf("function songChordFill")), P = new Function(src + "; return songChordParts;")();
  const cases = { Am: ["Am", ""], Am7: ["Am", "7"], D: ["D", ""], D7: ["D", "7"], Gsus4: ["G", "sus4"], Cadd9: ["C", "add9"], Cmaj7: ["C", "maj7"], "F#m7": ["F#m", "7"], Bbdim: ["Bb", "dim"], "C/E": ["C", "/E"], Dsus2: ["D", "sus2"], Emadd9: ["Em", "add9"] };
  for (const [k, v] of Object.entries(cases)) assert.deepStrictEqual(P(k), v, k);
  assert.ok(/SG_CHF = '"Roboto Condensed","Arial Narrow"/.test(T) && /font-stretch:condensed/.test(T) && /sans-serif-condensed/.test(T), "좁은 글꼴 목록");
  assert.ok(/songChordFill\(e, x\.name\)/.test(T) && /songChordFill\(e, ch\.name\)/.test(T) && /songChordParts\(c\.name\)/.test(T), "악보·TV·PDF 모두 같은 규칙");
}

// (11/19 사용자 'TV 버튼도 악보 페이지로') 악보 위 조작줄에는 재생·카포·닫기만, 글자 크기·전체화면·TV·PDF는 제목 아래 줄
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/class="shTvB" id="shTv"/.test(T) && !/class="shBtn" id="shTv"/.test(T) && !/\$\("#shTv"\)\.onclick/.test(T), "TV 버튼은 제목 아래 줄(만든 뒤 연결)");
  assert.ok(/t\.querySelector\("#shTv"\)\.onclick = \(\) => \{ ly\.close\(\); setTimeout\(\(\) => \{ try \{ openPrompter\(\)/.test(T), "TV 버튼 동작 그대로");
}

// (11/19 사용자) PDF: 가사 글자 크기가 그대로 들어가고(미리보기에서도 조절·전체화면) · 제목이 세로로 깨지지 않음
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("function songSheetPages"), T.indexOf("function songSheetPage(")), P = new Function(src + "; return songSheetPages;")();
  assert.deepStrictEqual(P(120, 1), { pages: 2, rpp: 15 }, "보통 크기: 120마디 = 30줄 → 2쪽");
  assert.deepStrictEqual(P(120, 1.25), { pages: 3, rpp: 10 }); const big = P(120, 1.8); assert.ok(big.pages > 3 && big.rpp <= 8, "글자를 키우면 한 쪽 줄 수가 줄어 쪽이 늘거나 줄 수가 준다: " + JSON.stringify(big));
  assert.ok(P(4, 1.8).pages === 1);
  assert.ok(/meta\.ly \|\| 1/.test(T) && /songSheetPage\(MM, p, rpp, \{ title: o\.name, sub: sb, pages, sec, ly: ls \}\)/.test(T) && /songSheetPages\(MM\.length, ls\)/.test(T), "PDF 쪽을 가사 배율로 만듦");
  assert.ok(/regen: pdfPages/.test(T) && /out = await opt\.regen\(li\)/.test(T) && /onLy: \(i\) => setLy\(i\)/.test(T), "미리보기에서 크기를 바꾸면 그 크기로 다시 만들고 저장은 보이는 그대로");
  assert.ok(/id="pvFm"/.test(T) && /id="pvFs"/.test(T) && /\.pvW\.fs \.pvB\{display:none\}/.test(T), "미리보기 가사 크기·전체화면");
  assert.ok(/\.pvB\{flex-wrap:wrap\}/.test(T) && /\.pvB b\{flex:1 1 auto;font-size:1rem;white-space:nowrap\}/.test(T) && /white-space:nowrap;font-family:inherit\}\.pvB2/.test(T), "미리보기 윗줄이 좁은 폰에서 세로로 깨지지 않게 줄바꿈·nowrap");
}

// (11/19 사용자 '시간 글씨가 슬라이더 줄과 겹쳐 가려져 → 아래로') 0:00·전체 시간은 슬라이더 바 양옆(맨 아래 정렬)
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/#dkSh \.shTl\{display:flex;align-items:center/.test(T) && /#dkSh \.shTl>span\{font-size:\.75rem;min-width:34px;height:36px;line-height:36px;align-self:center\}/.test(T))   // (11/20) 시간 글자는 막대와 상하 가운데;
}
// (11/20 사용자 '가사의 칸 배치가 여전히 맘에 안 듦') 줄 시작 박이 줄마다 흔들려도 곡에서 가장 자주 놓이는 자리(마디 첫 박)로 맞춰 같은 노랫말이 같은 칸에 놓이게
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const f = new Function(T.slice(T.indexOf("const SG_NOTES"), T.indexOf("async function songPeaks(")) + "; return { songMeasures, SG_LY_DELAY };")();
  const beats = Array.from({ length: 121 }, (_, i) => i * 0.5), an = { beats, down: 0, chords: [[0, "C"]] };   // 120BPM, 마디 = 2초
  const mk = (pos) => pos.map((p, k) => [(k * 2) * 2 + p * 0.5 - f.SG_LY_DELAY, "가" + k]);   // 두 마디(4초)마다 한 줄, p = 마디 안 박 위치
  const firstB = (M) => M.map((m) => m.lyrics[0] ? +m.lyrics[0].b.toFixed(2) : null).filter((x) => x != null);
  // 줄 시작이 대부분 첫 박 근처 → 1.75박 안쪽은 모두 첫 박으로 (3.8박은 다음 마디 첫 박으로)
  const M = f.songMeasures(an, 0, mk([0.3, 1.2, 0.1, 3.8, 0.4, 0.9, 0.2, 1.5, 0.3, 3.9, 0.6, 0.1]));
  const got = firstB(M); assert.strictEqual(got.length, 12, "줄 12개 모두 어딘가에 놓임");
  assert.ok(got.every((b) => b < 0.05), "모든 줄이 마디 첫 박에 놓임: " + got.join(","));
  // 멀리 벗어난 줄(2박)은 건드리지 않음
  const M2 = f.songMeasures(an, 0, mk([0.1, 0.2, 2.0, 0.3, 0.1, 0.2, 0.3, 0.1])); const g2 = firstB(M2);
  assert.ok(g2.some((b) => Math.abs(b - 2) < 0.05) && g2.filter((b) => b < 0.05).length === 7, "1.75박 넘게 벗어난 줄은 그대로: " + g2.join(","));
  // 줄 시작이 고르게 흩어진 곡은 그대로
  const M3 = f.songMeasures(an, 0, mk([0, 1, 2, 3, 0, 1, 2, 3])); assert.deepStrictEqual(firstB(M3).map((b) => Math.round(b)), [0, 1, 2, 3, 0, 1, 2, 3]);
  // 줄 안 낱말의 간격은 유지
  const M4 = f.songMeasures(an, 0, [[0.3 + 0.0, "가나다 라마바 사아자"], [4.3, "하하 호호 후후"], [8.3, "가나다 라마바 사아자"], [12.3, "하하 호호 후후"]]);
  assert.ok(M4.length >= 8);
}
// (11/20 사용자 '버튼 이거 뭐야' — 카포·키 패널 모드 버튼 글자가 "카/포"로 세로로 깨짐) 한 줄 고정 + 작은 글자 + 줄인 이름
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(/min-width:0;min-height:44px;margin:0;padding:0 6px;white-space:nowrap;font-size:\.92rem;/.test(T) && T.includes('["p", "🎹 피아노 · 키 변경"]'));
}
// (11/20 사용자 '첫 마디를 눌렀는데 5초부터 재생') 첫 마디는 0초부터 — 악보·프롬프터 둘 다
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.strictEqual((T.match(/tapCell\(i === 0 \? 0 : m\.t0\)/g) || []).length, 2); assert.strictEqual((T.match(/playFrom\(i === 0 \? 0 : m\.t0\)/g) || []).length, 2);
}
// (11/20 사용자 '송폼 버튼을 아래 슬라이더에 녹여 넣을 수 있지 않을까') 악보 구간 버튼: 곡 시간 비례 폭으로 슬라이더 위에 · 좁으면 줄인 이름
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes("b.style.flex = sp[k] + \" 1 0\"") && T.includes("#dkSh .shTrk{position:relative;height:36px"), "구간이 슬라이더 막대 안에 시간 비례로");
  const m = T.match(/const segAbbr = [^\n]*\n/); assert.ok(m);
  const abbr = new Function(m[0] + "; return segAbbr;")();
  assert.strictEqual(abbr("코러스 1"), "코1"); assert.strictEqual(abbr("벌스 2"), "벌2"); assert.strictEqual(abbr("전주"), "전"); assert.strictEqual(abbr("브릿지"), "브"); assert.strictEqual(abbr("구간 3"), "구3");
}
// (11/20 사용자 '다크 모드 버튼 · 인쇄는 흰 종이 + 안내') 악보 화면 다크 모드: 화면 전용 · PDF(canvas)는 늘 흰 종이 · 인쇄 CSS는 흰색으로 되돌림
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes('id="shDk"') && T.includes('localStorage.setItem("sgShDark"') && T.includes("#dkSh .shPaper.dk{background:#121316"), "다크 버튼·저장·스타일");
  assert.ok(T.includes("#dkSh .shPaper.dk{background:#fff;box-shadow:none}"), "인쇄는 흰색");
  assert.ok(T.includes("다크 모드는 화면에서만 보여요 · PDF·인쇄는 흰 종이로 나와요") && T.includes("PDF는 다크 모드와 상관없이 흰 종이로 만들어요"), "안내 메시지");
  const f = T.slice(T.indexOf("function songSheetPage("), T.indexOf("function songSheetPage(") + 1500);
  assert.ok(/fillStyle\s*=\s*"#fff(fff)?"/.test(f), "PDF 쪽 그림은 흰 바탕");
}
// (11/20 사용자 '송폼 구간 인식이 잘못되었어') 가사가 반복되는 곳=코러스 · 같은 이름이 이어져도 16마디 넘으면 나눔
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("function songLyricChorus("), T.indexOf("async function songPeaks("));
  const f = new Function(src + "; return { songLyricChorus, songAutoSections };")();
  const M = Array.from({ length: 48 }, (_, i) => ({ t0: i * 4, t1: i * 4 + 4, chords: [{ name: i % 2 ? "G" : "C", len: 4 }], lyrics: [] }));
  const vs = ["가나다라마바사", "아자차카타파하", "거너더러머버서", "어저처커터퍼허", "고노도로모보소", "오조초코토포호", "구누두루무부수", "우주추쿠투푸후"], ch = ["봄날의꽃잎처럼", "흩날려사라져가", "그대를사랑했던", "내마음은남아서"];
  const L = []; vs.forEach((t, i) => L.push([8 + i * 2, t])); ch.forEach((t, i) => L.push([24 + i * 3, t])); ch.forEach((t, i) => L.push([60 + i * 3, t])); ["서로다른가사하나", "또다른가사둘이다"].forEach((t, i) => L.push([42 + i * 3, t])); ch.forEach((t, i) => L.push([120 + i * 3, t]));
  const R = f.songLyricChorus(M, L.sort((a, b) => a[0] - b[0]));
  assert.ok(R.length >= 2 && R[0][0] >= 5 && R[0][0] <= 7 && R[1][0] >= 14 && R[1][0] <= 16, "반복 가사 구간: " + JSON.stringify(R));
  assert.deepStrictEqual(f.songLyricChorus(M, L.slice(0, 5)), [], "가사가 너무 적으면 판단 안 함");
  const uniq = vs.map((t, i) => [4 + i * 4, t]); assert.deepStrictEqual(f.songLyricChorus(M, uniq), [], "반복 없으면 후렴 없음");
}
// (11/20 10:12) 위 바와 악보 머리말이 같은 제목·정보를 두 번 보여주던 것 — 화면에선 머리말 숨김, 인쇄에선 표시
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes("#dkSh .shH{display:none}@media print{#dkSh .shH{display:block}"), "화면에선 shH 숨김·인쇄엔 표시");
}
// (11/20 10:14 '보기 불편') 송폼 막대: 짧은 구간도 최소 폭(8.5%) · 위치↔시간은 구간 지도(t2f/f2t)로 변환
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes("Math.max(v, tot * 0.05) * (k === fc ? (tc ? 3.6 : 3) :") && T.includes("const t2f = ") && T.includes("f2t(+sk.value / 1000, -99)") && T.includes("const pf = dur() ? t2f(p) : 0;"), "송폼 막대 최소 폭 지도");
}
// (11/20) 줄 시작은 반주가 새는 약한 소리(작은 값)가 아니라 이 줄의 큰 소리가 시작하는 곳
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const src = T.slice(T.indexOf("function songVoiced("), T.indexOf("function songWordTimes(")), f = new Function(src + "; return { songVoiced, songLineStart };")();
  const amp = [...Array(10).fill(1), ...Array(6).fill(9), ...Array(10).fill(44)];   // 1.0~1.6초 약한 누설(9) · 1.6초부터 진짜 노래(44)
  const V = f.songVoiced(amp.map((a) => String.fromCharCode(48 + a)).join(""));
  assert.strictEqual(+f.songLineStart(1.2, V).toFixed(1), 1.6, "약한 누설 말고 큰 소리 시작");
}

// (11/20 사용자 '송폼 인식도 틀렸어' · '가사 위치 전혀 틀려') 후렴=여러 줄이 이어서 되풀이 · 한 줄 길이 줄의 끝은 0.8초 침묵
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  const f = new Function(T.slice(T.indexOf("function songLyricChorus("), T.indexOf("async function songPeaks(")) + "; return { songLyricChorus };")();
  const M = Array.from({ length: 80 }, (_, i) => ({ t0: i * 2, t1: i * 2 + 2, chords: [], lyrics: [] }));
  const ch = ["봄날의꽃잎처럼", "흩날려사라져가", "그대를사랑했던", "내마음은남아서"], vs = ["가나다라마바사", "아자차카타파하", "거너더러머버서", "어저처커터퍼허", "고노도로모보소", "오조초코토포호"], tag = ["꼭한번더말해줘", "다시는놓지않을게"];
  const L = []; let t = 4; const add = (a) => a.forEach((x) => { L.push([t, x]); t += 4; });
  add(ch); add(vs.slice(0, 2)); add(tag); add(vs.slice(2, 3)); add(ch); add(vs.slice(3, 4)); add(tag); add(vs.slice(4)); add(ch);
  const R = f.songLyricChorus(M, L);
  assert.strictEqual(R.length, 3, "4줄 후렴 3번만 후렴(2줄만 되풀이된 구절은 제외): " + JSON.stringify(R));
  assert.ok(R[0][0] <= 3 && R[1][0] > R[0][1], "후렴 시작 위치");
  assert.ok(T.includes("nx != null && nx > st + 0.8 ? nx - 0.1"), "줄 끝 = 다음 줄 실제 시작 앞");
}

// (11/20 사용자 '터치한 부분이 볼록하게 · 경계 진동') 누르는 구간 3.6배 볼록 · 경계 넘을 때 짧은 진동 · 끝나면 원래 확대로
{
  const T = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
  assert.ok(T.includes("touchK = -1;") && T.includes("(tc ? 3.6 : 3)") && T.includes("navigator.vibrate(12)") && T.includes("if (k !== touchK && sd) { touchK = k; buzz2(); paintSegs(); }") && T.includes("sk.onchange = endTouch;"), "누르는 구간 볼록·진동");
}
