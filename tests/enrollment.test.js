// 가입 신청: 기존 학생 연결·새 수강생 생성 경계 테스트 (실제 Google API 호출 없음)
const fs = require("fs"), assert = require("assert");
const html = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const s = html.indexOf("const JOIN_NEW ="), e = html.indexOf("// 카톡 안내 멘트:", s);
assert(s > 0 && e > s, "가입 승인 함수가 필요합니다");
const source = html.slice(s, e);
const build = new Function("cfg", "DRIVE", "api", "writeJSON", "adoptConfig", "LS", "esc", "isTeacher",
  source + "\nreturn {joinCreateStudent,joinStudentName,joinStudentOptions,joinRow};");
const mk = (failAt = 0) => {
  let writes = 0, made = 0, adopted = false;
  const config = {students: {STU_0001: {name:"김미영",folder:"student-1",status:"active",
    sub:{"02_레슨":"lesson-1"},aliases:[],payments:[]}}, portal_url:"https://example.test"};
  const cfg = JSON.parse(JSON.stringify(config));
  Object.defineProperty(cfg, "_configId", {value:"config-file"});
  const api = async (url, opt = {}) => {
    if (url.includes("fields=version")) return {json: async()=>({version:String(writes+1)})};
    if (url.includes("alt=media")) return {json:async()=>JSON.parse(JSON.stringify(config))};
    if (url.includes("fields=parents")) return {json:async()=>({parents:["students-root"],trashed:false})};
    if (url.includes("/files?fields=id") && opt.method === "POST") {
      const body = JSON.parse(opt.body); assert(body.name && body.mimeType.endsWith("folder"));
      if (!made) assert.strictEqual(body.parents[0],"students-root");
      made++;
      if (made === failAt) throw Error("업로드 실패");
      return {json:async()=>({id:"folder-"+made})};
    }
    throw Error("예상하지 못한 API 호출: "+url);
  };
  const writeJSON = async (dir,name,obj,id) => {
    assert.strictEqual(name,"config.json"); assert.strictEqual(id,"config-file");
    Object.assign(config,JSON.parse(JSON.stringify(obj))); writes++; return id;
  };
  const impl = build(cfg,"https://www.googleapis.com/drive/v3",api,writeJSON,()=>{adopted=true},
    {set:()=>{}},x=>String(x),x=>x.status==="teacher");
  return {impl, config, get writes(){return writes},get made(){return made},get adopted(){return adopted}};
};
(async()=>{
  const x = mk();
  assert(x.impl.joinStudentOptions().includes('value="__new_student__" selected'));
  assert(x.impl.joinRow("new@example.test","__new_student__","승인",true).includes("새 수강생 이름 직접 입력"));
  assert(x.impl.joinRow("linked@example.test","STU_0001","연결 변경",false).includes("연결 해제"));
  assert.throws(()=>x.impl.joinStudentName(""),/이름/);
  assert.throws(()=>x.impl.joinStudentName("나/쁜"),/이름/);
  const created = await x.impl.joinCreateStudent(" 홍길동  ",false);
  assert.strictEqual(created.name,"홍길동"); assert.notStrictEqual(created.sid,"STU_0001");
  const st = x.config.students[created.sid];
  assert.strictEqual(st.name,"홍길동"); assert.strictEqual(st.folder,"folder-1");
  assert.strictEqual(st.status,"active"); assert.strictEqual(x.made,5);
  for (const k of ["02_레슨","03_메모_카톡_통화","04_과제제출","07_커버제작"]) assert(st.sub[k]);
  assert.strictEqual(x.writes,1); assert(x.adopted);
  await assert.rejects(x.impl.joinCreateStudent("김미영"),/같은 이름/);
  assert.strictEqual(x.writes,1);
  const t = mk(), created2 = await t.impl.joinCreateStudent("연습 계정",true);
  assert.strictEqual(t.config.students[created2.sid].status,"test");
  const y = mk(2); await assert.rejects(y.impl.joinCreateStudent("실패 학생"),/폴더 생성/);
  assert.strictEqual(y.writes,0);
  console.log("enrollment ok (신규/기존연결/중복/테스트용/폴더 실패)");
})().catch(e=>{console.error(e);process.exitCode=1});
