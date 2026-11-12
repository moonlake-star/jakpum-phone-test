// (11/12 18:33) 수강생에게 보내기: 완성본을 미리 받아 두고 누른 직후 공유 창(Permission denied 막기)
const assert = require("assert"), H = require("fs").readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(H.includes("try { mixPre(); } catch {}"), "화면 열 때 미리 받기");
assert.ok(H.includes('if (!blob) { toast("완성본 받는 중…"); await mixPre(); return toast('), "못 받았으면 받은 뒤 한 번 더");
assert.ok(!H.includes('await readBlob(by("mix.mp3").id, true)], `${j.st.name}'), "누른 뒤 내려받기 없음");
assert.ok(H.includes('e.name === "NotAllowedError"'), "허락 끝남 안내");
console.log("share-gesture ok");
