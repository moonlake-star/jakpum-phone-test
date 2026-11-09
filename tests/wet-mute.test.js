// (11/09 15:19 사용자 '반음만 옮겨도 폰 미리듣기에서 드르륵') 울림(리버브) 트랙은 간이 PSOLA로 높이를 옮기지 않고 그 구간만 잠시 뺌
const assert = require("assert"), fs = require("fs"), path = require("path");
const H = fs.readFileSync(path.join(__dirname, "..", "teacher", "index.html"), "utf8");
assert.ok(H.includes("sh = dry ? pvPsola(from, sr, f0, rat) : new Float32Array(n);"));
assert.ok(H.includes('let sh = usePitch ? (nm && nm[1] === "w" ? new Float32Array(n) : pvPsola(org, sr, f0, rat)) : org;'));
console.log("wet-mute ok");
