// 드라이브 호출 재시도 시험 — index.html의 api()/retryDelay/limiter를 꺼내 가짜 fetch에 붙여 실행
const fs = require("fs"), assert = require("assert");
const src = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
const m = src.match(/const API_TRIES[\s\S]*?\nfunction limiter[\s\S]*?\n}\n/);
assert.ok(m, "api 재시도/limiter 코드를 찾지 못함(재시도 없음)");
const body = m[0];

const res = (status, text = "", headers = {}) => ({ status, ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k] ?? null }, text: async () => text, json: async () => JSON.parse(text || "{}") });
function mk(responses) {
  const calls = [], sleeps = [], LS = { set() {} };
  const fetch = async (url, opt) => { calls.push({ url, opt }); const r = responses.shift(); if (r instanceof Error) throw r; return r; };
  const f = new Function("fetch", "savedToken", "getToken", "LS", "sleeps",
    `let token = "T"; ${body}; apiSleep = async (ms) => { sleeps.push(ms); }; return { api, limiter, retryDelay };`);
  return { ...f(fetch, () => "T", async () => "T", LS, sleeps), calls, sleeps };
}
(async () => {
  // 1. GET 429 → 두 번째 시도 성공, Retry-After(초) 존중
  { const t = mk([res(429, "slow", { "Retry-After": "2" }), res(200, "{}")]);
    const r = await t.api("https://drive/files");
    assert.strictEqual(r.status, 200); assert.strictEqual(t.calls.length, 2); assert.deepStrictEqual(t.sleeps, [2000]); }
  // 2. 5xx 계열 각각 재시도
  for (const s of [500, 502, 503, 504]) {
    const t = mk([res(s), res(200, "{}")]); await t.api("u"); assert.strictEqual(t.calls.length, 2, "status " + s); }
  // 3. 3번 모두 실패하면 오류(무한 재시도 없음), 지수 대기
  { const t = mk([res(503), res(503), res(503), res(200)]);
    await assert.rejects(t.api("u"), /드라이브 503/); assert.strictEqual(t.calls.length, 3); assert.strictEqual(t.sleeps.length, 2);
    assert.ok(t.sleeps[0] >= 500 && t.sleeps[0] < 750 && t.sleeps[1] >= 1000 && t.sleeps[1] < 1250, String(t.sleeps)); }
  // 4. 쓰기(POST/PATCH)는 재시도하지 않음(중복 저장 방지)
  for (const method of ["POST", "PATCH", "PUT", "DELETE"]) {
    const t = mk([res(503), res(200)]); await assert.rejects(t.api("u", { method }), /503/); assert.strictEqual(t.calls.length, 1, method); }
  // 5. 404·400 같은 확정 오류는 바로 실패
  { const t = mk([res(404, "nf"), res(200)]); await assert.rejects(t.api("u"), /드라이브 404: nf/); assert.strictEqual(t.calls.length, 1); }
  // 6. 드라이브식 사용량 초과 403(rateLimitExceeded)은 재시도, 권한 403은 바로 실패(메시지 유지)
  { const t = mk([res(403, '{"error":{"errors":[{"reason":"userRateLimitExceeded"}]}}'), res(200)]); await t.api("u"); assert.strictEqual(t.calls.length, 2); }
  { const t = mk([res(403, "forbidden"), res(200)]); await assert.rejects(t.api("u"), /드라이브 403: forbidden/); assert.strictEqual(t.calls.length, 1); }
  // 7. 네트워크 끊김(TypeError)도 GET이면 재시도
  { const t = mk([new TypeError("Failed to fetch"), res(200)]); await t.api("u"); assert.strictEqual(t.calls.length, 2); }
  // 8. Range 헤더 등 원래 옵션 유지 + 401은 기존대로 토큰 갱신 1회
  { const t = mk([res(401), res(200)]); await t.api("u", { headers: { Range: "bytes=0-9" } });
    assert.strictEqual(t.calls[1].opt.headers.Range, "bytes=0-9"); assert.strictEqual(t.calls.length, 2); }
  // 9. Retry-After 상한 30초, 날짜 형식도 해석
  { const t = mk([]); assert.strictEqual(t.retryDelay(res(429, "", { "Retry-After": "999" }), 0), 30000);
    const d = t.retryDelay(res(429, "", { "Retry-After": new Date(Date.now() + 3000).toUTCString() }), 0); assert.ok(d > 1000 && d <= 3000, String(d)); }
  // 10. limiter: 동시에 n개까지만
  { const t = mk([]), lim = t.limiter(2); let act = 0, max = 0;
    const job = (v) => lim(async () => { act++; max = Math.max(max, act); await new Promise(r => setTimeout(r, 5)); act--; return v; });
    assert.deepStrictEqual(await Promise.all([1, 2, 3, 4, 5].map(job)), [1, 2, 3, 4, 5]); assert.strictEqual(max, 2);
    await assert.rejects(lim(async () => { throw new Error("x"); }), /x/);           // 실패가 줄을 막지 않음
    assert.strictEqual(await lim(async () => 7), 7); }
  console.log("api-retry ok (10 scenarios)");
})().catch((e) => { console.error(e); process.exit(1); });
