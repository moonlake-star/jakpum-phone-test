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
  // 화면 연결(정적)
  const dk = T.slice(T.indexOf("function songDeck("), T.indexOf("// (11/05 00:14 사용자)"));
  for (const k of ["dkWv", "dkHome", "dkBk", "dkFw", "dkEnd", "dkRep", "dkLoop", "dkRv", "dkA", "dkB", "dkClr", "dkMr", "dkSpM", "dkSpP", "dkRst"]) assert.ok(dk.includes('id="' + k + '"'), k);
  assert.ok(dk.includes("eng.setLoop(") && dk.includes("eng.setRate(") && dk.includes("cv.onpointerdown"), "구간 반복·속도·밀기 연결");
  assert.ok(T.includes("touch-action:pan-y"), "세로 스크롤은 허용");
  assert.ok(dk.includes("o.analysis && o.analysis.key") && dk.includes("eng.swap(") && dk.includes("o.onKeyReq"), "키 카드는 서버가 분석한 곡에만 · 파일 없으면 요청");
  assert.ok(/songDeck\(pl, ids, \{[^]*analysis: x\.d\.analysis, keys: x\.d\.keys, keyReq: x\.d\.key_req/.test(T), "곡 서랍이 분석·키 파일을 넘김");
  assert.ok(dk.includes("openPrompter") && dk.includes("Brand.layer") && dk.includes('id="dkTv"') && dk.includes("o.analysis.chords.length"), "프롬프터는 코드가 있는 곡에만 · 뒤로 가기 한 칸");
  assert.ok(!dk.includes("new Audio") && !/\.voc\.volume/.test(dk), "플레이어는 엔진만 씀");
  assert.ok(/songDeck\(pl, ids, \{ folder: x\.folder, autoplay: auto/.test(T), "곡 서랍 카드가 새 플레이어");
  assert.ok(T.includes("function songDestroy() {") && /dispose\?\.\(\)/.test(T), "닫을 때 애니메이션 정리");
  console.log("song-deck: ok");
})().catch((e) => { console.error(e); process.exit(1); });
