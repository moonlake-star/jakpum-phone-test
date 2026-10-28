const fs = require('fs'), vm = require('vm'), assert = require('assert');
const ctx = {crypto: {randomUUID: () => 'request_000000001'}};
vm.runInNewContext(fs.readFileSync(__dirname + '/../lesson-replies.js','utf8'),ctx);
function harness(request) {
 const els = {};
 const box = {innerHTML:'',querySelector(s) {return els[s] ||= {value:'',textContent:'',innerHTML:'',disabled:false};},querySelectorAll(){return [];}};
 ctx.LessonReplies.mount(box,{request});
 return {box,els};
}
(async () => {
 const requests=[]; let fail=true;
 const {els} = harness(async (action,b) => {requests.push({action,b}); if(fail) throw Error('연결 실패'); return {messages:[{role:'student',text:'<img onerror=bad>',at:'now'}]};});
 els['[data-text]'].value='질문 있어요';
 await els['[data-send]'].onclick();
 assert.equal(els['[data-text]'].value,'질문 있어요');
 fail=false; await els['[data-send]'].onclick();
 assert.equal(requests[0].b.request_id,requests[1].b.request_id);
 assert.equal(els['[data-text]'].value,'');
 assert.ok(els['[data-messages]'].innerHTML.includes('&lt;img'));
 assert.ok(!els['[data-messages]'].innerHTML.includes('<img'));
 const old = harness(async () => ({ok:true,state:'approved'}));
 old.els['[data-text]'].value='유지'; await old.els['[data-send]'].onclick();
 assert.equal(old.els['[data-text]'].value,'유지');
 assert.ok(!old.els['[data-status]'].textContent.includes('저장했어요'));
 console.log('lesson-replies ok: 재시도/입력보존/XSS/구버전 서버');
})().catch(e=>{console.error(e);process.exit(1);});
