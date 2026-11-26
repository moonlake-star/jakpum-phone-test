// (11/26 사용자 '윤지선은 전체화면 뷰가 없이 보정 전/후로 듣기만 — 모든 수강생에게도 전체화면 뷰') 수강생 노트에 음정선(curve_id)
const fs = require("fs"), assert = require("assert");
const H = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes('const mkHasOut = (job) => !!job && (job.req?.status === "done" || (job.req?.render_count || 0) > 0);') && H.includes("fs = (mkHasOut(job) && job.files) || [];"), "서버가 다시 그리는 중이어도 음정선 포함");
assert.ok(H.includes("async function noteCurveFill(me)") && H.includes('if (va) await portal("t_schedule", { sid: me.sid, lesson_id: me.folder.id, approved: true, visible_after: va, note') && H.includes("noteCurveFill(me_).catch"), "이미 공개된 노트에 조용히 채움(예약 상태 유지)");
// 승인 지문(contentSig)에 음정선은 없음 → 채워도 '수정사항 미반영'이 되지 않음
const sig = H.slice(H.indexOf("function contentSig("), H.indexOf("function contentSig(") + 900); assert.ok(!sig.includes("curve"), "지문에 음정선 없음");
console.log("note-curve ok");
