'use strict';

// GitHub Actions -> one dedicated GitHub issue. Does not use Telegram or secrets.
module.exports = async function notify({ github, context, core, issueNumber }) {
  const {owner, repo} = context.repo;
  const n = Number(issueNumber || process.env.VOCALNOTE_ALERT_ISSUE);
  if (!Number.isSafeInteger(n) || n <= 0) throw new Error('Invalid notification issue number');
  let kind, sha, text;
  if (context.eventName === 'pull_request') {
    const pr = context.payload.pull_request;
    if (context.payload.action !== 'closed' || !pr || !pr.merged || !pr.base || pr.base.ref !== 'main') return 'ignored';
    kind = 'merged';
    sha = pr.merge_commit_sha;
    if (!sha) throw new Error('Missing merge SHA');
    text = '✅ **앱 PR 병합 완료** — PR #' + pr.number + ' (' + sha.slice(0,12) + ')' +
      '\n' + pr.html_url + '\n**아직 배포 완료가 아닙니다.**';
  } else if (context.eventName === 'deployment_status') {
    const dep = context.payload.deployment;
    const ds = context.payload.deployment_status;
    if (!dep || dep.environment !== 'github-pages' || !ds || !['success','failure','error'].includes(ds.state)) return 'ignored';
    kind = ds.state === 'success' ? 'pages-success' : 'pages-failed';
    sha = dep.sha;
    if (!sha) throw new Error('Missing deployed SHA');
    const success = kind === 'pages-success';
    const url = ds.target_url || ds.environment_url || ds.log_url || 'https://github.com/' + owner + '/' + repo + '/deployments';
    text = (success ? '✅ **GitHub Pages 배포 성공**' : '❌ **GitHub Pages 배포 실패**') +
      ' — ' + sha.slice(0,12) + '\n' + url + '\n' +
      (success ? '앱을 새로고침해 확인할 수 있습니다(브라우저 캐시 반영은 별도).' : '새 버전이 배포됐다고 판단하면 안 됩니다.');
  } else if (context.eventName === 'workflow_dispatch') {
    kind = 'test';
    sha = String(context.runId || 'manual');
    text = '🔔 **[시험 알림 — 실제 병합·배포 아님]**' +
      '\nGitHub 봇의 직접 멘션이 휴대폰에 도착하는지 확인하는 시험입니다.';
  } else return 'ignored';
  const marker = '<!-- vocalnote-mobile-notify:' + kind + ':' + sha + ' -->';
  const comments = await github.paginate(github.rest.issues.listComments, {owner, repo, issue_number:n, per_page:100});
  if (comments.some(c => (c.body || '').includes(marker))) {
    core.info('Already notified: ' + kind + ' / ' + sha);
    return 'duplicate';
  }
  await github.rest.issues.createComment({
    owner, repo, issue_number:n,
    body: '@moonlake-star\n\n' + text + '\n\n' + marker
  });
  core.info('Notification posted to GitHub issue #' + n);
  return 'posted';
};
