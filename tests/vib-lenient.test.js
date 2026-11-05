// (11/05 사용자) 비브라토: 느리거나 음정이 흔들리는 초보도 콤보가 이어지게(가짜 목소리를 실제 판정 코드에 넣어 확인)
const fs = require("fs"), assert = require("assert");
const t = fs.readFileSync(__dirname + "/../pitch/index.html", "utf8");
assert.ok(t.includes("VIB_GRACE = 600") && t.includes("SLOW_Q = .5,") && t.includes("now - V.lastExtT > 500"), "느슨한 기준 상수");
const a = t.indexOf("const VLV = {"), b = t.indexOf("const VM = {");
const pre = `const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const mkEl=()=>new Proxy(function(){}, {get:(o,k)=>k==='classList'?{toggle(){},add(){},remove(){}}:k==='style'?{}:k==='querySelectorAll'?()=>[]:k==='textContent'?'':mkEl(), set:()=>true, apply:()=>mkEl()});
const $=()=>mkEl(); const document={querySelectorAll:()=>[]}; const CFG={vw:1,vgd:1,vstv:3,vst:{},vgr:{}}; const C={mode:'vib'}; let cur='practice';
const P={an:{fftSize:2048},ctx:{sampleRate:48000},sfxUntil:0,earphone:true,mon:true,cal:false,target:null,H:600,W:400,toneUntil:0,running:false,cues:[]};
const popBanner=()=>{}; const sfx=()=>{}; const saveCfg=()=>{}; const flash=()=>{}; const burst=()=>{}; const toast=()=>{}; function fireVib(){}
const VOICE_RC={}; const scaleCfg=()=>({g:'m'}); const actx=()=>{throw 0}; const pianoOut=()=>{}; const PIANO_W=60; const renderCourseUI=()=>{}; const cache={};`;
const env = new Function(pre + "\n" + t.slice(a, b) + "\nreturn {V,vibTick,vibReset};")();
function run({ rate, ext, jit = 0, drift = 0, seed = 1 }) {
  const { V, vibTick, vibReset } = env; vibReset(); Object.assign(V, { root: 48, lastRoot: 48, cueUntil: 0, lastAn: 0, lastT: 0, tr: [], buf: [], s: { cyc: 0, ok: 0, best: 0, sR: 0, sE: 0, lv: {} } });
  let s = seed; const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }, gauss = () => { let u = 0; for (let i = 0; i < 6; i++) u += rnd(); return (u - 3) / .7071; };
  let base = 60, now = 5000, mx = 0;
  for (let ms = 0; ms < 14000; ms += 1000 / 60) { now += 1000 / 60; base += gauss() * drift * Math.sqrt(1 / 60) / 100; vibTick(now, 1000 / 60, base + ext / 100 * Math.sin(2 * Math.PI * rate * ms / 1000) + gauss() * jit / 100); mx = Math.max(mx, V.streak); }
  return mx;
}
const med = (o) => [1, 2, 3, 4, 5].map(i => run({ ...o, seed: i * 11 + 3 })).sort((x, y) => x - y)[2];
// 느리거나 흔들려도 성공의 맛(이전 기준: 1·4·7·2·10)
assert.ok(med({ rate: 1.5, ext: 35, jit: 30 }) >= 5, "아주 느림(1.5Hz)·흔들림");
assert.ok(med({ rate: 2, ext: 35, jit: 30 }) >= 15, "느림(2Hz)·흔들림");
assert.ok(med({ rate: 3, ext: 35, jit: 30 }) >= 25, "3Hz·흔들림");
assert.ok(med({ rate: 3, ext: 25, jit: 15 }) >= 25, "폭이 좁은 초보");
assert.ok(med({ rate: 2, ext: 50, jit: 15, drift: 50 }) >= 15, "음정이 흘러가는 초보");
// 보통 실력은 그대로, 엉뚱한 소리는 여전히 안 됨
assert.ok(med({ rate: 5.5, ext: 50 }) >= 60, "보통 실력 그대로");
assert.strictEqual(med({ rate: 3, ext: 100 }), 0, "너무 넓음은 안 됨");
assert.strictEqual(med({ rate: 3, ext: 10 }), 0, "너무 좁음은 안 됨");
assert.strictEqual(med({ rate: 3, ext: 0, jit: 10 }), 0, "비브라토 없는 일정한 소리는 안 됨");
assert.ok(med({ rate: 3, ext: 0, jit: 20, drift: 30 }) <= 3, "조금 흘러가는 일정한 소리는 거의 안 됨");
assert.ok(med({ rate: .3, ext: 150, jit: 10 }) <= 1, "아주 느린 음정 오르내림은 비브라토 아님");
console.log("vib-lenient: ok");
