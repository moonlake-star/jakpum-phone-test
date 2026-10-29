// 수강생 재생 주소: 재생용 키가 노트에 있으면 드라이브 API(부분 받기), 없으면 기존 주소
const fs = require("fs"), assert = require("assert");
const s = fs.readFileSync(__dirname + "/../student/index.html", "utf8");
const grab = (name) => s.match(new RegExp(`const ${name} = [^\\n]*`))[0];
const mk = (lessons) => new Function("data", `${grab("akey")}\n${grab("driveUrl")}\nreturn driveUrl;`)({ lessons });
const K = "AIzaSyA" + "x".repeat(32);
assert.match(mk([{ id: "a" }, { id: "b", audio_key: K }])("F1"), /^https:\/\/www\.googleapis\.com\/drive\/v3\/files\/F1\?alt=media&key=AIza/);
assert.match(mk([{ id: "a" }])("F1"), /drive\.google\.com\/uc\?export=download&id=F1$/);
assert.match(mk([{ audio_key: "bad key<script>" }])("F1"), /drive\.google\.com\/uc/);   // 이상한 값은 무시
const t = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(/audio_key: cfg\.student_audio_key/.test(t), "선생님 게시 노트에 재생용 키가 실려야 함");
console.log("student-audio-key ok");
