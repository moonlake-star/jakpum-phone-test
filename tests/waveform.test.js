// 재생바 → 소리 파형(10/28 시안): 선생님 재생바는 파형 위 투명 슬라이더(위치 이동 그대로), 공개 때 파형을 노트에 실어 수강생도 파형
const fs = require('fs'), assert = require('assert');
const t = fs.readFileSync(__dirname + '/../teacher/index.html', 'utf8'), st = fs.readFileSync(__dirname + '/../student/index.html', 'utf8');
const grab = (s, n) => s.match(new RegExp('function ' + n + '\\([^]*?\\n}\\n'))[0];
// 선생님: 재생바 안에 파형 캔버스 + 같은 슬라이더(class tpSeek, 0~1000) — 기존 이동 동작·이어 붙인 자리 표시 유지
const tp = new Function(grab(t, 'tpHTML') + 'return tpHTML;')()(true);
assert(tp.includes('<canvas class="tpWave"') && /class="tpSeek" min="0" max="1000"/.test(tp) && tp.indexOf('tpWave') < tp.indexOf('tpSeek'));
assert(tp.includes('aria-label="재생 위치" style="width:100%">'), '이어 붙인 자리 표시가 끼어드는 자리 그대로');
assert(/\.tpWaveBox \.tpSeek \{[^}]*opacity:0/.test(t) && /\.tpWaveBox \.seamStrip \{ left:0; right:0; top:0; height:100%; \}/.test(t));
assert(/drawWave\(tpRoot\.querySelector\("\.tpWave"\), wavePeaks\[tpFile\]/.test(t), '재생 위치가 바뀌면 파형 색도 따라감');
// 공개 때 파형 싣기(못 구하면 없이) — 녹음 원본은 바꾸지 않음
assert(/note\[k\]\.peaks = pk/.test(t) && /catch \{ return null; \}/.test(grab(t, 'notePeaks')));
// 수강생: 파형 있으면 그리고, 없거나 이상하면 버튼만
const esc = x => String(x ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const player = new Function('esc', grab(st, 'waveSvg') + grab(st, 'player') + 'return player;')(esc);
const pk = Array.from({ length: 120 }, (_, i) => i % 100);
const h = player('B1', '듣기', pk);
assert(h.includes('data-wv="B1"') && (h.match(/<rect /g) || []).length === 240 && h.includes('data-au="B1"'));
for (const bad of [undefined, null, [], [1, 2, 3], 'x', Array(500).fill(1)]) { const x = player('B1', '듣기', bad); assert(!x.includes('data-wv') && x.includes('data-au="B1"')); }
assert(!player('B1', '듣기', [...pk.slice(0, 119), '<script>']).includes('<script>'), '이상한 값도 숫자로만');
assert(/l\.best\.peaks/.test(st) && /l\.makeup\.peaks/.test(st));
console.log('waveform ok');
