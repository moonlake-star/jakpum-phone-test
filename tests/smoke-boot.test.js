// 점검(11/14): 가짜 데이터로 선생님 앱을 가상 화면에서 실제로 열어 보는 '켜보기' 시험 — 정의 안 된 변수·null 접근 같은 실행 오류를 잡음
// 시험 환경: 가짜 Drive(fetch)·가짜 오디오·가짜 canvas. jsdom이 없으면 건너뜀(CI는 먼저 설치: npm i --no-save eslint@9 globals jsdom@26)
let JSDOM, VirtualConsole; try { ({ JSDOM, VirtualConsole } = require("jsdom")); } catch { console.log("smoke-boot SKIP (jsdom 없음)"); process.exit(0); }
const fs = require("fs"), path = require("path");
const ROOT = path.join(__dirname, "..");
const errors = [];
function inlineAll(html) {
  html = html.replace(/<script src="https:\/\/accounts\.google\.com[^>]*><\/script>/, "");
  return html.replace(/<script src="\.\.\/([^"?]+)(\?[^"]*)?"[^>]*><\/script>/g, (m, f) => { const p = path.join(ROOT, f); return fs.existsSync(p) ? "<script>" + fs.readFileSync(p, "utf8").replace(/<\/script>/g, "<\\/script>") + "</script>" : ""; });
}

const vc = new VirtualConsole(); vc.on("jsdomError", (e) => errors.push("jsdomError: " + (e.detail && e.detail.stack || e.message).split("\n").slice(0, 3).join(" | "))); vc.on("error", (...a) => errors.push("console.error: " + a.join(" ").slice(0, 300)));
const students = { S1: { name: "가나다", status: "active", folder: "F1", sub: { "02_레슨": "L1" }, payments: [] }, S2: { name: "라마바", status: "active", folder: "F2", sub: { "02_레슨": "L2" }, payments: [] }, TCH_0001: { name: "작품(선생님)", status: "teacher", folder: "F0", sub: { "02_레슨": "L0" } } };
const list = Object.keys(students).map((sid) => ({ sid, rows: [{ l: { id: "les-" + sid, name: "2026-11-1" + (sid === "S1" ? 3 : 1) + "_레슨" }, files: [], done: true, fb: false, ck: false, ai: sid === "S1", pub: false }], subs: [], jobs: [], hasRoot: true }));
const dom = new JSDOM(inlineAll(fs.readFileSync(ROOT + "/teacher/index.html", "utf8")), { url: "http://localhost/jakpum-phone-test/teacher/", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.localStorage.setItem("vn_tok", JSON.stringify({ t: "T", exp: Date.now() + 3e6 })); w.localStorage.setItem("vn_hint", JSON.stringify("t@x.com"));
    w.localStorage.setItem("vn_cfg", JSON.stringify({ role: "owner", name: "원장", students })); w.localStorage.setItem("vn_cfg_id", JSON.stringify("CFG"));
    w.localStorage.setItem("vn_list", JSON.stringify(list));
    const J = (o, s = 200) => Promise.resolve({ status: s, ok: s < 300, headers: { get: () => null }, json: async () => o, text: async () => JSON.stringify(o), blob: async () => new w.Blob([JSON.stringify(o)]), arrayBuffer: async () => new ArrayBuffer(8) });
    w.fetch = (url) => { url = String(url); if (/files\/CFG\?alt=media/.test(url)) return J({ role: "owner", name: "원장", students }); if (/about\?/.test(url)) return J({ user: { emailAddress: "t@x.com" } }); if (/alt=media/.test(url)) return J({}); if (/\/files\?/.test(url)) return J({ files: [] }); return J({}, 404); };
    w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
    w.HTMLCanvasElement.prototype.getContext = function () { return new Proxy({}, { get: (t, k) => k === "measureText" ? () => ({ width: 10 }) : k === "canvas" ? this : k === "createLinearGradient" ? () => ({ addColorStop() {} }) : () => {} , set: () => true }); };
    w.AudioContext = w.webkitAudioContext = function () { return { createGain: () => ({ gain: { value: 1, setValueAtTime() {}, linearRampToValueAtTime() {} }, connect() {} }), createOscillator: () => ({ connect() {}, start() {}, stop() {}, frequency: { value: 0 } }), createAnalyser: () => ({ connect() {}, getFloatTimeDomainData() {}, fftSize: 0 }), destination: {}, state: "running", resume: async () => {}, close: async () => {}, currentTime: 0, sampleRate: 44100 }; };
    w.HTMLMediaElement.prototype.play = async function () {}; w.HTMLMediaElement.prototype.pause = function () {}; w.HTMLMediaElement.prototype.load = function () {};
    w.navigator.vibrate = () => true; w.ResizeObserver = w.ResizeObserver || class { observe() {} disconnect() {} }; w.IntersectionObserver = w.IntersectionObserver || class { observe() {} disconnect() {} };
    w.scrollTo = () => {}; w.caches = { open: async () => ({ match: async () => undefined, put: async () => {}, keys: async () => [], delete: async () => true }), keys: async () => [], delete: async () => true }; w.addEventListener("error", (e) => errors.push("window.onerror: " + e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno)); w.addEventListener("unhandledrejection", (e) => errors.push("unhandledrejection: " + (e.reason && e.reason.stack || e.reason)));
    w.__errors = errors;
  } });
const w = dom.window;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await sleep(1500);
  const step = async (name, fn) => { const before = errors.length; try { await Promise.race([Promise.resolve(fn()), sleep(2500)]); } catch (e) { errors.push(name + " threw: " + (e && e.stack || e).toString().split("\n").slice(0, 3).join(" | ")); } await sleep(400); const n = errors.length - before; console.log((n ? "FAIL " : "ok   ") + name + (n ? " (" + n + " errors)" : "")); };
  for (const tab of ["lesson", "subs", "growth", "mk"]) await step("openStudent S1 " + tab, () => w.openStudent("S1", tab));
  await step("openStudent teacher mk", () => w.openStudent("TCH_0001", "mk"));
  await step("openLesson S1 0", () => w.openLesson("S1", 0));
  for (const fn of ["openSongs", "openJam", "openShared"]) if (typeof w[fn] === "function") await step(fn, () => w[fn]());
  if (typeof w.openCal === "function") await step("openCal", () => w.openCal());
  await step("Tune.openFull (선생님 편집 화면)", async () => {
    const pts = []; for (let i = 0; i < 1200; i++) { const t = i / 50, m = 6900 + 200 * Math.floor((i / 100) % 4), sung = m + 20 * Math.sin(i / 3); pts.push([t, sung, 0, m, m]); }
    const cv = { levels: [1, 3], target: true, pts, dur: 24, beats: { t: [0, 0.8, 1.6, 2.4], bpm: 75, conf: 0.8 } };
    const src = w.document.createElement("div"); w.document.body.appendChild(src);
    const o = { teacher: process.env.STU ? false : true, onFix() {}, onTime() {}, onAdv() {}, advGet: () => ({ ne: { notes: [], global: {} } }), notes: () => [], mode: () => "p", title: "시험곡", onNote() {}, histKey: "smoke:1", histGet: () => "{}", histSet: async () => {} };
    w.Tune.openFull(src, cv, () => 1.5, () => 3, () => {}, o);
    await sleep(600);
    const fs_ = w.document.getElementById("tuneFs"); console.log("   tuneFs open:", !!fs_);
    if (fs_) { const cvEl = fs_.querySelector(".tfCv"); const ev = (type, x, y) => { const e = new w.MouseEvent(type, { clientX: x, clientY: y, bubbles: true }); e.pointerId = 1; e.pointerType = "touch"; cvEl.dispatchEvent(e); };
      for (const [type, x, y] of [["pointerdown", 200, 200], ["pointermove", 240, 205], ["pointermove", 300, 210], ["pointerup", 300, 210], ["pointerdown", 200, 200], ["pointermove", 202, 300], ["pointermove", 204, 380], ["pointerup", 204, 380]]) { try { cvEl.dispatchEvent(Object.assign(new w.Event(type, { bubbles: true }), { pointerId: 1, pointerType: "touch", clientX: x, clientY: y, button: 0, preventDefault() {} })); } catch (e) { errors.push("event " + type + ": " + e.message); } await sleep(30); }
      await sleep(800);
      const b = fs_.querySelector("[data-md2]"); if (b) { b.click(); await sleep(300); console.log("   고급 클릭 ok"); }
      const st_ = fs_._st, host_ = fs_.querySelector(".tfBox") || fs_;   // 🎛 보정 설정 창 · 🌬 치찰음 창이 오류 없이 열리는지(#684 사고 재발 방지)
      if (st_ && w.TuneAdv) { try { w.TuneAdv.globalSheet(host_, st_, cv); w.TuneAdv.uvSheet(host_, st_, cv, [3, 5]); } catch (e) { errors.push("보정 설정/치찰음 창 열기 실패: " + e.message); } await sleep(100); }
      if (w.fsClose) w.fsClose(); }
  });
  await step("renderList", () => w.renderList());
  const uniq = [...new Set(errors)];
  if (uniq.length) { console.error("실행 오류 " + uniq.length + "건:\n - " + uniq.slice(0, 20).map((e) => e.slice(0, 500)).join("\n - ")); process.exit(1); }
  const okList = w.document.getElementById("vList").innerHTML.includes("가나다"); if (!okList) { console.error("목록에 가짜 수강생이 안 보임"); process.exit(1); }
  console.log("smoke-boot OK"); process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
