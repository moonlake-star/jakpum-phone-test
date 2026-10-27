// 문구 속 '이번 주 연습'을 고치면 미션 칸도 같이 바뀌어 "서로 달라요" 경고가 안 뜬다(2026-10-28)
const fs = require('fs'), assert = require('assert');
const src = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8');
const pf = src.match(/function practiceFromText[\s\S]*?\n}\n/)[0];
const mc = src.match(/function missionConsistent[\s\S]*?\n}\n/)[0];
const { practiceFromText, missionConsistent } = new Function(pf + mc + 'return {practiceFromText, missionConsistent};')();
const fb = "홍길동님, 오늘 레슨 수고 많으셨어요!\n\n오늘 중요한 포인트\n· 호흡\n\n이번 주 연습\n· 갈라지는 음에 표시하고 두 마디만 집중\n· 연습 녹음을 톡으로 보내 주세요\n\n다음 주에 봬요";
const pr = practiceFromText(fb);
assert.deepStrictEqual(pr, ["갈라지는 음에 표시하고 두 마디만 집중", "연습 녹음을 톡으로 보내 주세요"]);
assert(missionConsistent({ feedback: fb, practice: pr }));
assert(!missionConsistent({ feedback: fb, practice: ["예전 연습"] }));
assert.strictEqual(practiceFromText("이번 주 연습 없음"), null);
assert.deepStrictEqual(practiceFromText("이번 주 연습\n· 하나"), ["하나"]);
assert(!src.includes("수강생 공개는 별도로"), "검수 저장 = 바로 공개로 바뀌었으니 옛 안내 금지");
console.log('practice-sync ok');
