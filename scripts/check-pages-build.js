// 읽기 전용 검사: 공개(GitHub Pages) 선생님 화면의 BUILD가 저장소 main의 BUILD와 같은지 비교.
// 종료 코드: 0=일치, 1=불일치(예전 화면이 공개됨), 2=확인 못 함(네트워크 실패 등 — 성공으로 취급 금지).
// 사용: node scripts/check-pages-build.js   (Google 계정·비밀키 불필요, 쓰기 없음)
// 이 검사는 'Pages에 올라간 파일'만 확인한다. 갤럭시 실기기에서 새 화면이 보이는지는 별도 확인.
const RAW = 'https://raw.githubusercontent.com/moonlake-star/jakpum-phone-test/main/teacher/index.html';
const PAGES = 'https://moonlake-star.github.io/jakpum-phone-test/teacher/';
const pick = (t) => (String(t).match(/const BUILD = "([^"]+)"/) || [])[1] || null;

async function get(fetchFn, url) {
  const u = url + (url.includes('?') ? '&' : '?') + 'v=' + Date.now();   // 캐시 우회
  const r = await fetchFn(u, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
  if (!r.ok) throw new Error(`HTTP ${r.status} ${url}`);
  return r.text();
}

async function check(fetchFn = fetch) {
  let mainHtml, pagesHtml;
  try { mainHtml = await get(fetchFn, RAW); pagesHtml = await get(fetchFn, PAGES); }
  catch (e) { return { code: 2, status: 'unverified', reason: String(e.message || e) }; }
  const main = pick(mainHtml), pages = pick(pagesHtml);
  if (!main || !pages) return { code: 2, status: 'unverified', reason: 'BUILD 값을 찾지 못함', main, pages };
  // BUILD만 비교하면 코드가 바뀌고 버전 상수를 안 올렸을 때 예전 Pages를 '일치'로 오판한다.
  // .nojekyll을 사용하는 이 저장소에서는 공개 HTML 본문 자체도 동일해야 한다.
  return main === pages && mainHtml === pagesHtml
    ? { code: 0, status: 'match', main, pages }
    : { code: 1, status: 'mismatch', reason: main !== pages ? 'BUILD 불일치' : 'BUILD는 같지만 HTML 본문 불일치', main, pages };
}

module.exports = { check, pick };
if (require.main === module) check().then((r) => { console.log(JSON.stringify(r)); process.exit(r.code); });
