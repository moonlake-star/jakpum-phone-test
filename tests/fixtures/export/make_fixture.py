# 서버 makeup.py의 lufs·limit 기준 값 만들기(입력은 코드로 똑같이 만들어서 큰 파일을 저장소에 안 둠):
#   /usr/local/bin/python3 make_fixture.py /home/claude/jakpum-vocalnote/app   (tests/export-core.test.js의 sig()와 같은 식)
import sys, json
import numpy as np
sys.path.insert(0, sys.argv[1])
from jakpum import makeup as M
sr = 48000; n = sr * 5; t = np.arange(n) / sr
def lcg(n, seed):
    x = np.empty(n); s = seed
    for i in range(n):
        s = (s * 1664525 + 1013904223) & 0xFFFFFFFF; x[i] = s / 2**32 * 2 - 1
    return x
f0 = 220 * 2 ** (np.sin(2 * np.pi * 0.4 * t) / 12)
env = np.clip(np.sin(2 * np.pi * 0.35 * t), 0, None) ** 0.5
ph = np.cumsum(f0) / sr
voc = sum(np.sin(2 * np.pi * ph * k) / k for k in range(1, 8)) * env * 0.3
nz = lcg(n, 12345)
voc[3 * sr:3 * sr + 960] += nz[:960] * 0.9      # 튀는 피크(리미터 시험)
mr = np.stack([sum(np.sin(2 * np.pi * f * t + p) for f, p in [(110, 0), (165, 1), (220, 2)]) * 0.12, sum(np.sin(2 * np.pi * f * t) for f in [98, 147, 196]) * 0.12]) + np.stack([nz * 0.01, np.roll(nz, 7) * 0.01])
wet = np.zeros(n); d1, d2 = int(0.03 * sr), int(0.07 * sr); wet[d1:] += voc[:-d1] * 0.5; wet[d2:] += voc[:-d2] * 0.3
voc2 = np.stack([voc, voc]).astype(np.float32); mr = mr.astype(np.float32); wet2 = np.stack([wet, wet * 0.8]).astype(np.float32)
mix = voc2 * 1.3 + wet2 * 2.0 + mr * 0.8
pre = M.lufs(mix); k = M.db(-14.0 - pre); out = M.limit(mix * k); lim = M.limit(voc2 * 3.0)
S = 499
json.dump({"sr": sr, "n": n, "lufs_voc": M.lufs(voc2), "lufs_mr": M.lufs(mr), "lufs_mix": pre, "lufs_out": M.lufs(out), "k": k,
           "peak_pre": float(np.abs(mix * k).max()), "peak_out": float(np.abs(out).max()), "step": S,
           "out_L": [float(v) for v in out[0, ::S]], "out_R": [float(v) for v in out[1, ::S]], "lim_L": [float(v) for v in lim[0, ::S]],
           "lim_peak": float(np.abs(lim).max()), "lim_zone": [float(v) for v in lim[0, 3 * sr - 300:3 * sr + 1300:20]]}, open("ref.json", "w"))
print({a: b for a, b in json.load(open("ref.json")).items() if not isinstance(b, list)})
