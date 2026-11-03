// (11/03 10:18 사용자) 아이패드 구글 로그인 창 안 열림 → 페이지 이동 로그인
const fs = require("fs"), assert = require("assert");
const te = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8");
assert.ok(te.includes('id="btnLoginRd"') && te.includes('$("btnLoginRd").onclick = loginRedirect;'));
assert.ok(te.includes('response_type: "token"') && te.includes('state: "vn_rd"') && te.includes("redirect_uri: location.origin + location.pathname"));
// 돌아온 주소에서 출입증 꺼내기
const code = te.slice(te.indexOf("(function takeRedirectToken()"), te.indexOf("function savedToken()"));
const store = {}; const LS = { get: (k) => store[k], set: (k, v) => { store[k] = v; } }; let replaced = null;
const location = { hash: "#state=vn_rd&access_token=abc123&expires_in=3599&token_type=Bearer", pathname: "/jakpum-phone-test/teacher/", search: "" };
const history = { state: null, replaceState: (s, t, u) => { replaced = u; } };
new Function("LS", "location", "history", code)(LS, location, history);
assert.strictEqual(store.vn_tok.t, "abc123"); assert.ok(store.vn_tok.exp > Date.now()); assert.strictEqual(replaced, "/jakpum-phone-test/teacher/");
assert.ok(te.includes('if (!window.google?.accounts) { $("loginMsg").textContent = "구글 로그인 준비 중이에요'), "준비 전엔 기다렸다 열지 않음(창 막힘)");
console.log("login-redirect ok");
