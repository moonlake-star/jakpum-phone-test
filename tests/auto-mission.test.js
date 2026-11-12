// (11/12 20:47) 미션 칸 ↔ 문구 '이번 주 연습' 자동 맞춤 · 인사말 속 '이번 주 연습할 것' 오탐 없음
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
const pf = H.match(/function practiceFromText[\s\S]*?\n}\n/)[0], mc = H.match(/function missionConsistent[\s\S]*?\n}\n/)[0], sb = H.match(/function setBlock[\s\S]*?\n}\n/)[0];
const E = new Function(pf + mc + sb + "return {practiceFromText, missionConsistent, setBlock};")();
const greet = "OO님, 오늘 수업 감사했습니다. 이번 주 연습할 것까지 정리했으니 한번 보세요!";
assert.ok(E.missionConsistent({ feedback: greet, practice: [], no_mission: true }), "인사말만 = 미션 없음과 맞음");
assert.ok(E.missionConsistent({ feedback: greet + "\n\n이번 주 연습\n· 립트릴 5분", practice: ["립트릴 5분"] }));
// 미션 칸만 있고 문구엔 없음 → 붙이면 맞음
const fb2 = E.setBlock(greet, "이번 주 연습", ["허밍 3분"]); assert.ok(E.missionConsistent({ feedback: fb2, practice: ["허밍 3분"] }));
// 미션 없음인데 문구에 빈 제목 → 빼면 맞음
const fb3 = E.setBlock("인사\n\n이번 주 연습\n· A", "이번 주 연습", []); assert.ok(E.missionConsistent({ feedback: fb3, practice: [], no_mission: true }), fb3);
assert.ok(H.includes('try { if (autoMission(me)) toast("미션 칸과 ‘이번 주 연습’을 자동으로 맞췄어요"); } catch {}'), "공개 칸 열 때 자동");
console.log("auto-mission ok");
