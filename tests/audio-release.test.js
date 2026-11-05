// (11/05 사용자 '에어팟: 재생하다 다른 앱을 재생하면 볼륨 조절이 한동안 안 먹다가 갑자기 먹음') 쓰고 난 소리 장치를 놓아 주기
const fs = require("fs"), assert = require("assert");
const T = fs.readFileSync(__dirname + "/../teacher/index.html", "utf8"), P = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8"), U = fs.readFileSync(__dirname + "/../tune.js", "utf8");

// 선생님 앱: 멈추면 1.5초 뒤·화면을 벗어나면 바로 쉬게, 재생·미리듣기 중에는 안 쉬게, 다시 재생하면 깨움
const a = T.indexOf("const audioIdleCtx ="), b = T.indexOf('if (typeof document !== "undefined") document.addEventListener("visibilitychange", () => { if (document.hidden) audioIdle(true); });');
assert.ok(a > 0 && b > a, "audioIdle 위치");
const mk = (vars) => { const timers = []; const fakeSet = (f, ms) => { timers.push({ f, ms }); return timers.length; }; const fakeClear = () => {};
  const env = new Function("setTimeout", "clearTimeout", "state", T.slice(a, b) + "; return { audioIdle };");
  const st = { mkCtx: { state: "running", suspend() { this.state = "suspended"; } }, chimeCtx: { state: "running", suspend() { this.state = "suspended"; } }, mkPlaying: false, vtNow: null, ...vars };
  const api = new Function("setTimeout", "clearTimeout", "st", "let mkCtx = st.mkCtx, chimeCtx = st.chimeCtx, mkPlaying = st.mkPlaying, vtNow = st.vtNow; " + T.slice(a, b) + "; return { audioIdle };")(fakeSet, fakeClear, st);
  return { api, st, timers }; };
{ const { api, st, timers } = mk({}); api.audioIdle(); assert.strictEqual(timers[0].ms, 1500, "멈추고 1.5초 뒤"); timers[0].f(); assert.strictEqual(st.mkCtx.state, "suspended"); assert.strictEqual(st.chimeCtx.state, "suspended"); }
{ const { api, st } = mk({}); api.audioIdle(true); assert.strictEqual(st.mkCtx.state, "suspended", "화면을 벗어나면 바로"); }
{ const { api, st } = mk({ mkPlaying: true }); api.audioIdle(true); assert.strictEqual(st.mkCtx.state, "running", "재생 중에는 안 쉼"); assert.strictEqual(st.chimeCtx.state, "suspended"); }
{ const { api, st } = mk({ vtNow: {} }); api.audioIdle(true); assert.strictEqual(st.mkCtx.state, "running", "음 미리듣기 중에는 안 쉼"); }
assert.ok(T.includes("function mkStop() {") && /mkPlaying = false; audioIdle\(\); }/.test(T), "멈추면 쉬게 예약");
assert.ok(T.includes('pauseOthers("mk"); mkStop(); try { if (mkCtx.state !== "running") mkCtx.resume(); } catch {}'), "재생 때 깨움");
assert.ok(T.includes('try { if (mkCtx.state !== "running") mkCtx.resume(); } catch {}   // (11/05) 쉬고 있던 소리 장치 깨우기'), "음 미리듣기 때 깨움");
assert.ok(T.includes("    audioIdle();\n    return new Promise(r => setTimeout(r, 600));"), "구분음 뒤 쉬게");
// 건반 소리·연습 천재
assert.ok(U.includes("toneIdle") && U.includes('toneCtx.state === "running") toneCtx.suspend()') && U.includes("toneNow = null; toneIdle();"), "건반 소리 뒤 쉬게");
assert.ok(P.includes("stopMonitor(); try { if (P.ctx && P.ctx.state === 'running') P.ctx.suspend(); } catch (e) {} }"), "연습 천재: 다른 앱으로 가면 마이크·소리 장치 놓기");
assert.ok(P.includes("function actx() { if (!P.ctx) P.ctx = new (window.AudioContext || window.webkitAudioContext)(); if (P.ctx.state === 'suspended') P.ctx.resume();"), "쓸 때 깨움");
console.log("audio-release: ok");
