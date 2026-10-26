// 카톡 대화 가져오기(#83): 형식 해석·인코딩·요약·중복/혼입 방지 (합성 대화만 사용)
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const code = src.match(/\/\/#kk-begin\n([\s\S]*?)\/\/#kk-end/)[1];
const pad2 = (n) => String(n).padStart(2, "0");
const K = new Function("pad2", "crypto", code + "return {kkDecode,kkParse,kkSummarize,kkSha,kkMerge,kkRecord,kkKind,kkNorm,KK_MAX_FILE};")(pad2, require("crypto").webcrypto);

const A = `홍길동 님과 카카오톡 대화
저장한 날짜 : 2026-10-23 23:50:12

--------------- 2026년 10월 23일 금요일 ---------------
[홍길동] [오후 3:04] 선생님 오늘 고음이 편했어요 ㅎㅎ
[작품] [오후 3:05] 잘했어요 👍 다음엔 후렴 한 번 더^^
연습 꼭 해봐요 😊
[작품] [오후 3:06] 사진
[홍길동] [오전 12:10] 이모티콘
홍길동님이 들어왔습니다.
[작품] [오후 3:08] 삭제된 메시지입니다.
`;
const B = `2026년 10월 23일 금요일
2026. 10. 23. 오후 3:04, 홍길동 : 선생님 안녕하세요
2026. 10. 23. 오후 3:05, 나 : 반가워요 ^^
`;
const C = `﻿홍길동샘 님과 카카오톡 대화\r\n저장한 날짜 : 2026년 10월 24일 오전 1:05\r\n\r\n2026년 6월 23일 오후 6:59\r\n2026년 6월 23일 오후 6:59, 작품 : 안녕하세요.\r\n여러 줄 메시지\r\n2026년 6월 23일 오후 7:59, 홍길동샘 : 네 감사합니다\r\n`;

// 형식 A/B/C, 오전12시=0시, 여러 줄, 시스템줄 제외
let p = K.kkParse(A);
assert.equal(p.format, "A"); assert.equal(p.msgs.length, 5);
assert(p.msgs[1].text.includes("연습 꼭 해봐요") && p.msgs[1].text.includes("\n"));
assert.equal(p.msgs[3].at, "2026-10-23T00:10:00+09:00"); assert.equal(p.system >= 1, true);
assert(!p.msgs.some(m => m.text.includes("들어왔")));
p = K.kkParse(B); assert.equal(p.format, "B"); assert.deepEqual(p.msgs.map(m => m.speaker), ["홍길동", "나"]);
p = K.kkParse(C); assert.equal(p.format, "C"); assert.equal(p.msgs.length, 2); assert(p.msgs[0].text.includes("여러 줄")); assert.equal(p.msgs[1].at, "2026-06-23T19:59:00+09:00");
assert.equal(K.kkParse("").msgs.length, 0); assert.equal(K.kkParse("그냥 메모 글").format, null);

// 분류: 쓸 수 없는 글
for (const [t, k] of [["사진", "photo"], ["사진 3장", "photo"], ["이모티콘", "sticker"], ["(이모티콘)", "sticker"], ["삭제된 메시지입니다.", "deleted"], ["전달 안녕", "forward"], ["답장: 네", "reply"], ["동영상", "video"], ["안녕", "text"], ["사진 잘 찍었네요", "text"]]) assert.equal(K.kkKind(t), k, t);

// 요약: 강사 별칭 선택 전엔 전부 화자 불명 + 검토 필요(조용한 성공 금지)
let s = K.kkSummarize(K.kkParse(A), [], "홍길동");
assert.equal(s.counts.teacher, 0); assert(s.review); assert(s.flags.some(f => f.includes("고르지 않았")));
s = K.kkSummarize(K.kkParse(A), ["작품"], "홍길동");
assert.equal(s.counts.total, 5); assert.equal(s.counts.teacher, 1); assert.equal(s.counts.student, 1); assert.equal(s.counts.invalid, 3);
assert.deepEqual(s.emoji.sort(), ["😊", "👍"].sort()); assert(s.emot.includes("^^") || s.emot.includes("ㅎㅎ"));
assert(s.sample.every(x => !x.includes("오늘 고음이"))); // 수강생 글은 스타일 샘플 아님
assert(s.review); // 강사 글 5건 미만 → 검토 필요
// 별칭이 파일에 없으면 강사 글 0 → 검토 필요
s = K.kkSummarize(K.kkParse(A), ["없는이름"], "홍길동"); assert.equal(s.counts.teacher, 0); assert(s.flags.some(f => f.includes("글이 없어요")));
// 단체방: 학생 이름 일치만 student, 나머지 unknown
const G = `--------------- 2026년 10월 23일 금요일 ---------------\n[작품] [오후 1:00] 안녕하세요\n[홍길동] [오후 1:01] 네\n[김철수] [오후 1:02] 안녕\n`;
s = K.kkSummarize(K.kkParse(G), ["작품"], "홍길동");
assert.equal(s.counts.student, 1); assert.equal(s.counts.unknown, 1); assert(s.flags.some(f => f.includes("3명")));
// 동명이인/다른 상대: 제목 이름이 수강생과 다르면 경고
s = K.kkSummarize(K.kkParse(A), ["작품"], "이몽룡"); assert(s.flags.some(f => f.includes("달라요")));

// 인코딩
const enc = (str) => new TextEncoder().encode(str);
const ab = (b) => b.buffer.slice(b.byteOffset, b.byteOffset + b.length);
let d = K.kkDecode(ab(Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from(C)])));
assert.equal(d.encoding, "utf-8"); assert.equal(K.kkParse(d.text).msgs.length, 2);
const u16 = Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from(B, "utf16le")]);
d = K.kkDecode(u16.buffer.slice(u16.byteOffset, u16.byteOffset + u16.length)); assert.equal(d.encoding, "utf-16le"); assert.equal(K.kkParse(d.text).msgs.length, 2);
try {   // EUC-KR 폴백(환경에 디코더가 없으면 건너뜀)
  const bytes = new Uint8Array([0xBE, 0xC8, 0xB3, 0xE7]); // "안녕"
  d = K.kkDecode(bytes.buffer); assert.equal(d.text, "안녕"); assert.equal(d.encoding, "euc-kr"); assert(d.warnings.length);
} catch (e) { if (e.code === "ERR_ASSERTION") throw e; console.log("euc-kr skip"); }
d = K.kkDecode(new Uint8Array([0xFF, 0xFF, 0xFF, 0x80, 0x81]).buffer); assert(d.text === null || d.encoding === "euc-kr");

// CRLF·LF 동일 SHA(같은 파일 반복 업로드 중복 방지), BOM 무시
(async () => {
  const a = await K.kkSha(C), b = await K.kkSha(C.replace(/\r\n/g, "\n").replace("﻿", ""));
  assert.equal(a, b); assert.equal(a.length, 64); assert.notEqual(a, await K.kkSha(B));
  const mk = (sid, sha, name = "홍길동") => K.kkRecord({ sha, sid, name, aliases: new Set(["작품"]), fileName: "KakaoTalk.txt", now: "2026-10-26T00:00:00Z", p: K.kkParse(A), sum: K.kkSummarize(K.kkParse(A), ["작품"], name), text: A });
  let r = K.kkMerge(null, mk("S1", a)); assert(!r.err && !r.dup); assert.equal(r.obj.imports.length, 1);
  const rec = r.obj.imports[0]; assert.equal(rec.analysis_status, "pending"); assert.equal(rec.sid, "S1"); assert.deepEqual(rec.teacher_aliases, ["작품"]); assert.equal(rec.text, A);
  assert.equal(K.kkMerge(r.obj, mk("S1", a)).dup, true);                       // 같은 내용 두 번째 → 중복
  r = K.kkMerge(r.obj, mk("S1", await K.kkSha(B))); assert.equal(r.obj.imports.length, 2);    // 다른 내용은 누적
  assert(K.kkMerge(r.obj, mk("S2", "x")).err);                                 // 다른 수강생 sid 혼입 거부
  assert(K.kkMerge({ sid: "S1", imports: [{ sid: "S2" }] }, mk("S1", "y")).err); // 파일 안에 남의 기록
  assert(K.kkMerge({ foo: 1 }, mk("S1", "z")).err);                            // 알 수 없는 형식은 덮어쓰지 않음
  assert(K.kkMerge({ version: 1, sid: "S1", imports: [{ sid: "S1", pad: "x".repeat(K.KK_MAX_FILE) }] }, mk("S1", "w")).err); // 저장 한도
  // UI 연결: 학습 완료 표시 금지·덮어쓰기 대상은 전용 파일뿐
  assert(!/학습 완료|학습됨/.test(code + src.match(/function kkPreview[\s\S]*?\nasync function kkSave/)[0]));
  assert.equal([...src.matchAll(/writeJSON\(st\.folder, ([^,]+),/g)].filter(m => m[1] === "KK_NAME").length, 1);
  console.log("kakao-import ok");
})();
