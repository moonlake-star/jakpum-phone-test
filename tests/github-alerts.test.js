const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
const yaml = fs.readFileSync(path.join(__dirname, '../.github/workflows/github-alerts.yml'), 'utf8');
const lines = yaml.split('\n');
const idx = lines.findIndex(l => l.trim() === 'script: |');
assert(idx >= 0, 'inline script exists');
const code = [];
for (let i = idx + 1; i < lines.length; i++) {
  if (lines[i].startsWith('            ')) code.push(lines[i].slice(12));
  else if (lines[i] === '') code.push('');
  else break;
}
const action = new AsyncFunction('github', 'context', 'core', code.join('\n'));
assert(yaml.includes('deployment_status:'));
assert(yaml.includes('github.event.pull_request.merged == true'));
assert(!/TELEGRAM|TELEGRAM_BOT_TOKEN|APP_REPO_TOKEN/.test(yaml));

async function run(eventName, payload, old = []) {
  const created = [];
  const listComments = () => old.map(body => ({body}));
  const listPullRequestsAssociatedWithCommit = () => [{number:565, merged_at:'2026-11-08', base:{ref:'main'}}];
  const github = {
    rest: {
      issues: {listComments, createComment: async x => {created.push(x);return {data:{html_url:'https://github.com/example/comment'}};}},
      repos: {listPullRequestsAssociatedWithCommit},
      pulls: {get: async x => ({data:{number:x.pull_number}})}
    },
    paginate: async (fn,args) => fn(args)
  };
  const context = {repo:{owner:'moonlake-star',repo:'jakpum-phone-test'},eventName,payload,runId:123,serverUrl:'https://github.com'};
  const core = {getInput:()=>'',info:()=>{},warning:()=>{}};
  await action(github,context,core);
  return created;
}
(async () => {
  const merged = {pull_request:{merged:true,base:{ref:'main'},number:565,merge_commit_sha:'abcdef0123456789',html_url:'https://github.com/PR/565'}};
  let c = await run('pull_request', merged);
  assert.equal(c.length, 1);
  assert(c[0].body.includes('@moonlake-star'));
  assert(c[0].body.includes('병합 완료'));
  assert.equal((await run('pull_request',merged,[c[0].body])).length,0, 'duplicate suppressed');
  assert.equal((await run('pull_request',{pull_request:{...merged.pull_request,merged:false}})).length,0);
  const deploy = (state,environment='github-pages') => ({deployment:{sha:'abcdef0123456789',environment},deployment_status:{state,target_url:'https://example.org'}});
  c=await run('deployment_status',deploy('success'));
  assert(c[0].body.includes('배포 성공'));
  c=await run('deployment_status',deploy('failure'));
  assert(c[0].body.includes('배포 실패'));
  assert.equal((await run('deployment_status',deploy('pending'))).length,0);
  assert.equal((await run('deployment_status',deploy('success','staging'))).length,0);
  c=await run('workflow_dispatch',{inputs:{pr_number:'565'}});
  assert(c[0].body.includes('실제 병합·배포 아님'));
  console.log('GitHub alerts: tests passed');
})().catch(e => {console.error(e);process.exitCode=1;});
