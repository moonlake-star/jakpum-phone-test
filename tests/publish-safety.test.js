// (11/21 코덱스 검토) ① 승인 서명에 포인트 소리·그때와 지금 포함(예전 승인은 v1로 비교) ② '지금 공개' 실패 시 열었던 녹음 링크를 다시 닫음
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const grab = (re) => { const m = src.match(re); assert.ok(m, "코드 조각 " + re); return m[0]; };
const fnv = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };
const code = grab(/const SIG_V = 2;\nfunction contentSig[\s\S]*?\n}\nconst approvedSigOf = [^\n]*\n/);
const M = new Function("fnv", code + "return { contentSig, approvedSigOf, SIG_V };")(fnv);
const base = { lesson_id: "L1", feedback: "안녕", points: ["a"], practice: ["b"], best: { file_id: "B" }, clips: [], pairs: [] };
const withSnd = { ...base, point_snd: [{ p: 0, kind: "pair", file_id: "P1" }] }, otherSnd = { ...base, point_snd: [{ p: 0, kind: "pair", file_id: "P2" }] };
assert.notEqual(M.contentSig(withSnd), M.contentSig(otherSnd), "포인트 소리를 바꾸면 다시 승인 필요");
assert.notEqual(M.contentSig({ ...base, compare: { then: { file_id: "T1" }, now: { file_id: "N1" } } }), M.contentSig({ ...base, compare: { then: { file_id: "T1" }, now: { file_id: "N2" } } }), "그때와 지금 바꾸면 다시 승인");
assert.equal(M.contentSig(withSnd, 1), M.contentSig(otherSnd, 1), "v1(예전 방식)은 예전과 같게");
// 예전 승인(approved_sig_v 없음)은 v1로 비교 → 이미 공개된 노트가 '이후 수정됨'으로 잘못 안 보임
assert.equal(M.approvedSigOf({ approved_sig: "x" }, withSnd), M.contentSig(withSnd, 1));
assert.equal(M.approvedSigOf({ approved_sig: "x", approved_sig_v: 2 }, withSnd), M.contentSig(withSnd, 2));
assert.ok(/rv\.approved_sig = sig; rv\.approved_sig_v = SIG_V;/.test(src), "새 승인은 v2로 기록");
assert.ok(/rv\.approved_sig = null; rv\.approved_sig_v = null;/.test(src), "보류하면 버전도 지움");
// ② schedAct: 서버 공개 실패 시 링크 닫기
const sa = grab(/async function schedAct\(kind, pick\) \{[\s\S]*?\n}\n/);
const iOpen = sa.indexOf("await openLink(id); opened.push(id);"), iTry = sa.lastIndexOf("try {", iOpen), iCatch = sa.indexOf("} catch (e) {", iOpen);
assert.ok(iOpen > 0 && iTry > 0 && iCatch > iOpen, "링크 열기·서버 공개가 같은 try 안");
assert.ok(sa.slice(iTry, iCatch).includes('portal("t_schedule", body)'), "서버 공개도 try 안");
assert.ok(/if \(kind === "now" && opened\.length\) \{ const left = await closeOpened\(\);/.test(sa), "실패하면 열었던 링크를 닫음");
console.log("publish-safety OK");
