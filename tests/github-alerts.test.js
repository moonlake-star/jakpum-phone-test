'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const notify = require('../.github/scripts/notify.js');

async function simulate(eventName, payload, priorBodies = [], runId = 25) {
  const posted = [];
  const gh = {
    rest: {issues:{
      listComments: function listComments(){},
      createComment: async args => { posted.push(args); }
    }},
    paginate: async () => priorBodies.map(body => ({body}))
  };
  const context = {eventName,payload,runId,repo:{owner:'moonlake-star',repo:'jakpum-phone-test'}};
  const outcome = await notify({github:gh,context,core:{info(){}},issueNumber:566});
  return {outcome,posted};
}
const mergedPR = (merged=true,base='main') => ({
  action:'closed',pull_request:{
    number:565,merged,base:{ref:base},
    merge_commit_sha:'a60635829aba812796915c55599aa2deaeb941af',
    html_url:'https://github.com/moonlake-star/jakpum-phone-test/pull/565'
  }
});
const deploy=(state='success',environment='github-pages')=>({
  deployment:{environment,sha:'a60635829aba812796915c55599aa2deaeb941af'},
  deployment_status:{state,target_url:'https://moonlake-star.github.io/jakpum-phone-test/'}
});

(async () => {
  let n=0;
  const check=(condition,message)=>{assert.ok(condition,message);n++;};
  const ignored=await simulate('pull_request',mergedPR(false));
  check(ignored.outcome === 'ignored' && ignored.posted.length===0,'Closed without merge ignored');
  check((await simulate('pull_request',mergedPR(true,'dev'))).outcome === 'ignored','Other base branch ignored');
  const merge=await simulate('pull_request',mergedPR());
  check(merge.outcome==='posted' && /PR #565/.test(merge.posted[0].body),'Merged PR notifies');
  check(/아직 배포 완료가 아닙니다/.test(merge.posted[0].body),'Merge is distinct from deployment');
  check(merge.posted[0].body.startsWith('@moonlake-star'),'Direct mention supplied');
  check((await simulate('pull_request',mergedPR(),[merge.posted[0].body])).outcome==='duplicate','Duplicate merge ignored');
  check((await simulate('deployment_status',deploy('pending'))).outcome==='ignored','Pending deployment ignored');
  check((await simulate('deployment_status',deploy('success','production'))).outcome==='ignored','Other deployments ignored');
  const success=await simulate('deployment_status',deploy('success'));
  check(success.outcome==='posted' && /배포 성공/.test(success.posted[0].body),'Actual Pages success notified');
  check(/배포 실패/.test((await simulate('deployment_status',deploy('failure'))).posted[0].body),'Pages failure notified');
  check(/배포 실패/.test((await simulate('deployment_status',deploy('error'))).posted[0].body),'Pages error notified');
  check((await simulate('deployment_status',deploy('success'),[success.posted[0].body])).outcome==='duplicate','Duplicate Pages success ignored');
  const manual=await simulate('workflow_dispatch',{});
  check(/시험 알림 — 실제 병합·배포 아님/.test(manual.posted[0].body),'Test clearly labeled');
  check((await simulate('push',{})).outcome==='ignored','Other actions ignored');
  const workflow=fs.readFileSync(path.join(__dirname,'../.github/workflows/github-alerts.yml'),'utf8');
  check(workflow.includes('deployment_status:') && workflow.includes('pull_request:') && workflow.includes('workflow_dispatch:'),'Workflow hooks present');
  check(!/TELEGRAM_|BOT_TOKEN|secrets\./i.test(workflow),'Workflow contains no Telegram or secrets');
  console.log('GitHub mobile alerts: '+n+' tests passed');
})().catch(e=>{console.error(e);process.exit(1);});
