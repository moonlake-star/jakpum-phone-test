// Praat 워커: 앱 화면(메인)과 따로 Praat(WebAssembly)을 돌림. praat-core.js의 같은 함수를 그대로 호출 → 소리는 화면에서 돌릴 때와 같음.
importScripts("praat_web.js", "praat-core.js");
self.onmessage = async (e) => {
  const m = e.data || {};
  if (m.type === "init") {
    try { await PraatCore.init(m.gz, PraatModule); self.postMessage({ type: "ready" }); } catch (err) { self.postMessage({ type: "initfail", err: String(err && err.message || err) }); }
    return;
  }
  try { const f = PraatCore[m.op]; if (typeof f !== "function" || !["analyze", "resynth", "warp", "formantShift"].includes(m.op)) throw new Error("모르는 요청 " + m.op);
    self.postMessage({ id: m.id, y: await f(...m.args) }); }
  catch (err) { self.postMessage({ id: m.id, err: String(err && err.message || err) }); }
};
