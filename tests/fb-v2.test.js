// (11/21 화면 개편 3단계 · 코덱스 검토) 포인트·미션은 칸에만(fb_v 2). ① 글 속 목록 → 칸 이동 ② 공개된 노트는 그대로 ③ 근거 확인에 옮긴 문장 포함 ④ 수강생 노트: 새 형식은 편지 끝에 번호 포인트, 옛 형식 노트는 바뀌기 전과 똑같이 그려짐
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), S = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const fbCode = T.match(/\/\/#fbv2-begin\n([\s\S]*?)\/\/#fbv2-end/)[1];
const sentKey = (x) => String(x).replace(/\s+/g, " ").trim();
const F = new Function("sentKey", fbCode + "return { fbSplit, fbMoveBlocks, fbAdoptV2, fbCheckText, fbDropField, fbFieldOf };")(sentKey);
// ① 이동
const AI = "홍길동님, 오늘 레슨 수고 많으셨어요!\n\n좋았던 부분\n· 4:00 고음이 편해졌어요\n\n오늘 중요한 포인트\n· 턱 힘 빼기\n· 끝음 숨 남기기\n\n이번 주 연습\n· 립트릴 3분\n\n다음에 또 봬요.";
const sp = F.fbSplit(AI);
assert.deepEqual(sp.points, ["턱 힘 빼기", "끝음 숨 남기기"]); assert.deepEqual(sp.practice, ["립트릴 3분"]);
assert.ok(!/오늘 중요한 포인트|이번 주 연습|턱 힘 빼기|립트릴/.test(sp.text) && sp.text.includes("좋았던 부분") && sp.text.includes("다음에 또 봬요."), "목록 덩어리만 빠지고 나머지 글은 그대로");
assert.equal(F.fbSplit("이번 주 연습할 것까지 정리했어요!\n좋아요").practice, null, "인사말 속 '이번 주 연습할 것'은 제목 아님");
const rv = { feedback: AI, points: ["옛 칸"], practice: ["옛 미션"] };
assert.equal(F.fbAdoptV2(rv), true); assert.equal(rv.fb_v, 2);
assert.deepEqual(rv.points, ["턱 힘 빼기", "끝음 숨 남기기"], "글이 기준(예전 autoMission 규칙)"); assert.deepEqual(rv.practice, ["립트릴 3분"]);
assert.ok(!/이번 주 연습/.test(rv.feedback));
assert.equal(F.fbMoveBlocks(rv), false, "다시 해도 그대로");
const noBlk = { feedback: "글만 있어요", points: ["칸 포인트"], practice: ["칸 미션"] }; F.fbAdoptV2(noBlk);
assert.deepEqual(noBlk.points, ["칸 포인트"], "글에 목록이 없으면 칸 유지"); assert.equal(noBlk.feedback, "글만 있어요");
// ② 승인·공개된 적 있는 노트는 그대로(바꾸면 '이후 수정됨'·다시 공개)
for (const k of ["approved_sig", "published_at", "prev_approved_sig"]) { const r = { feedback: AI, [k]: "x" }; assert.equal(F.fbAdoptV2(r), false, k); assert.equal(r.feedback, AI); assert.equal(r.fb_v, undefined); }
// (코덱스 P1) 칸에 다 못 담으면 옮기지 않음 · 레슨 폴더에 노트 파일이 있거나 카톡 보낸 기록이 있으면 옛 형식 유지
const many = { feedback: "인사\n오늘 중요한 포인트\n· a\n· b\n· c\n· d", points: [] };
assert.equal(F.fbMoveBlocks(many), false); assert.ok(many.feedback.includes("· d"), "4번째 포인트 손실 없음");
const mm = { feedback: "인사\n이번 주 연습\n· a\n· b\n· c" }; assert.equal(F.fbMoveBlocks(mm), false);
for (const [r, has] of [[{ feedback: AI }, true], [{ feedback: AI, kakao_sent_at: "x" }, false], [{ feedback: AI, sent: { feedback: "x" } }, false]]) { assert.equal(F.fbAdoptV2(r, has), false); assert.equal(r.feedback, AI); }
assert.ok(/fbAdoptV2\(review, !!d\.note \|\| files\.some\(f => f\.name === NOTE\)\)/.test(T), "노트 파일 여부를 넘김");
// (코덱스 P1) 저장·AI 원문 되돌리기 때도 목록을 칸으로 · 빠른 점검 '빼기'·상세 '고치기'가 칸 문장을 다룸
assert.ok(/me\.review\.feedback = fbNow;\n  if \(rv\.fb_v === 2 && fbMoveBlocks\(rv\)\)/.test(T), "saveReview(조용한·일반) 서명 전 이동");
assert.ok(/updateFeedbackDraft\(ai\.feedback_text\); if \(rv\.fb_v === 2 && fbMoveBlocks\(rv\)\)/.test(T), "AI 원문 되돌리기 후 이동");
const dr = { fb_v: 2, points: ["고음이 안정됐어요", "끝음"], practice: ["립트릴"] };
assert.equal(F.fbDropField(dr, "고음이 안정됐어요"), "points"); assert.deepEqual(dr.points, ["끝음"]);
assert.equal(F.fbFieldOf(dr, "립트릴"), "practice"); assert.equal(F.fbDropField({ points: ["x"] }, "x"), null, "옛 형식은 칸을 안 건드림");
assert.ok(/if \(j < 0 && fbDropField\(rv, key\)\) \{ delete rv\.sent_ok\[key\];/.test(T), "빠른 점검 빼기");
assert.ok(/if \(act === "fix" && fbFieldOf\(rv, key\)\)/.test(T), "상세 점검 고치기 → 카드");
// (4단계에서 발견) 새 형식 노트는 미션이 글에 없어도 '서로 달라요'로 막히지 않음
const mc = new Function(T.match(/function missionConsistent\(note\) \{[\s\S]*?\n\}\n/)[0] + "return missionConsistent;")();
assert.equal(mc({ fb_v: 2, feedback: "글만", practice: ["립트릴 3분"] }), true, "새 형식: 미션은 칸에만 → 통과");
assert.equal(mc({ fb_v: 2, feedback: "글\n이번 주 연습\n· x", practice: ["x"] }), false, "새 형식인데 글에 목록 제목이 남아 있으면 불일치");
assert.equal(mc({ feedback: "글만", practice: ["립트릴 3분"] }), false, "옛 형식 규칙은 그대로");
// ③ 근거 확인 대상
const ct = F.fbCheckText({ fb_v: 2, feedback: "글", points: ["고음 음정이 안정됐어요"], practice: ["립트릴"], no_mission: false });
assert.ok(ct.includes("· 고음 음정이 안정됐어요") && ct.includes("· 립트릴"), "칸으로 옮긴 문장도 확인 대상");
assert.equal(F.fbCheckText({ feedback: "옛 글" }), "옛 글", "옛 형식은 글 그대로");
// 연결 확인
assert.ok(/try \{ fbAdoptV2\(review, /.test(T), "레슨 열 때 새 형식 적용");
assert.ok(/\.\.\.\(rv\.fb_v === 2 \? \{ fb_v: 2 \} : \{\}\)/.test(T), "노트에 fb_v 실음");
assert.ok(/if \(rv\.fb_v === 2\) \{ const mv = fbMoveBlocks\(rv\);/.test(T), "전달 전 자동 맞춤도 새 형식은 칸으로");
assert.ok(/me\.review\.fb_v === 2 \? me\.review\.feedback : setBlock\(me\.review\.feedback, "이번 주 연습", a\)/.test(T), "미션 카드 저장은 글을 안 건드림");
assert.ok(/sentBlockers\(fbCheckText\(rv, note\?\.feedback\)/.test(T), "공개 막힘 검사도 옮긴 문장 포함");
// ④ 수강생 노트 그리기
const harness = (src) => { const pick = (re) => { const m = src.match(re); assert.ok(m, String(re)); return m[0]; };
  return new Function([pick(/const esc = [^\n]*\n/), pick(/const md = [^\n]*\n/), pick(/function player\([\s\S]*?\n}\n/), pick(/function waveSvg\([\s\S]*?\n}\n/), pick(/function pill\([\s\S]*?\n}\n/),
    pick(/const MAX_CLIPS[^\n]*\n/), pick(/const listHtml[^\n]*\n/), pick(/const sidOk = [^\n]*\n/), pick(/const makeupOk = [^\n]*\n/), pick(/function lessonHtml\([\s\S]*?\n}\n/)].join("\n") + "; return lessonHtml;")(); };
const NEW = harness(S), MAINF = process.env.MAIN_STUDENT;
const v2 = NEW({ id: "L9", date: "2026-11-21", fb_v: 2, feedback: sp.text, points: sp.points, practice: sp.practice, best: { file_id: "B9", len: 30 }, clips: [], extra_best: [] }, null);
const iL = v2.indexOf("선생님 한마디"), iP = v2.indexOf("오늘 중요한 포인트"), iT = v2.indexOf("턱 힘 빼기"), iB = v2.indexOf('data-lp="B9"');
assert.ok(iL >= 0 && iL < iP && iP < iT && iT < iB, "새 형식: 편지 안(베스트 위)에 번호 포인트");
assert.ok(!v2.includes("오늘의 핵심 포인트"), "따로 카드로 또 나오지 않음");
assert.ok(v2.includes("립트릴 3분") && v2.indexOf("다음 미션") > iB, "미션은 응원 옆 카드");
// 옛 형식 노트 10개: 바뀌기 전 코드(2026-11-21 main)로 그린 결과(고정 파일)와 같아야 함 · 고정 파일 다시 만들기: MAIN_STUDENT=<옛 student/index.html> GOLDEN_WRITE=1
const pk = Array.from({ length: 40 }, (_, i) => (i * 7) % 99);
const olds = [
  { feedback: AI, points: ["턱 힘 빼기", "끝음 숨 남기기"], practice: ["립트릴 3분"] },
  { feedback: AI, points: [], practice: [] },
  { feedback: "글만", points: ["숨", "끝음"], practice: ["허밍"] },
  { feedback: "글만", points: [], practice: [], no_mission: true },
  { feedback: "", points: ["a"], practice: ["b"] },
  { feedback: "오늘의 핵심 포인트\n· 하나\n이번주 연습\n· 둘", points: ["하나"], practice: [] },
  { feedback: AI, points: ["턱 힘 빼기"], practice: ["립트릴 3분"], point_snd: [{ p: 0, kind: "pair", file_id: "PS1" }], pairs: [{ file_id: "PS1", peaks: pk, label: "전후" }] },
  { feedback: "4:00 좋았어요\n· 8:24 끝음", points: ["x"], practice: ["y"], clips: [{ file_id: "C1", label: "8:24", t: 504, note: "끝음", peaks: pk }] },
  { feedback: AI, highlight: "순간", cheer: "응원해요", song: { title: "곡" }, points: ["턱 힘 빼기"], practice: ["립트릴 3분"] },
  { feedback: AI, makeup: { file_id: "M1", source_file_id: "B0", len: 20 }, points: [], practice: ["립트릴 3분"] },
];
const cases = olds.flatMap((o, k) => ["normal", "simple", "detail"].map(mode => ({ k, mode, l: { id: "O" + k, date: "2026-10-2" + k, best: k % 3 ? { file_id: "B" + k, len: 30, peaks: pk } : null, clips: [], extra_best: [], ...o } })));
const GF = __dirname + "/fixtures/fb_v1_golden.json";
if (process.env.GOLDEN_WRITE && MAINF) { const OLD = harness(fs.readFileSync(MAINF, "utf8")); fs.writeFileSync(GF, JSON.stringify(cases.map(c => OLD(c.l, null, c.mode)))); console.log("  고정 파일 다시 만듦"); }
const golden = JSON.parse(fs.readFileSync(GF, "utf8"));
assert.equal(golden.length, cases.length);
cases.forEach((c, i) => assert.equal(NEW(c.l, null, c.mode), golden[i], `옛 노트 ${c.k} (${c.mode}) 바뀌기 전과 같음`));
console.log(`  옛 형식 노트 ${olds.length}개 × 보기 3종: 바뀌기 전과 같음`);
console.log("fb-v2 OK");
