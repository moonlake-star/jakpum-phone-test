# 서버(jakpum-vocalnote)의 pitch.analyze/correction_cents/apply를 합성 목소리에 돌려, 앱의 Praat 미리듣기가 같은 소리를 내는지 비교할 기준 자료를 만든다.
# 실제 녹음·개인정보 없음(합성). 실행: python3 make_fixture.py <jakpum-vocalnote/app 경로>
import sys, json, wave, numpy as np
sys.path.insert(0, sys.argv[1]); from jakpum import pitch as P, makeup as M
SR = 24000; DUR = 4.0; n = int(SR * DUR); t = np.arange(n) / SR
notes = [(0.15, 0.95, 60, -35), (1.05, 1.85, 64, +30), (1.95, 2.75, 67, -20), (2.95, 3.85, 65, +45)]   # 시작, 끝, 정음(MIDI), 어긋남(센트)
cents = np.full(n, np.nan)
for a, b, m, off in notes:
    i0, i1 = int(a * SR), int(b * SR); tt = t[i0:i1] - a
    cents[i0:i1] = m * 100 + off + 35 * np.sin(2 * np.pi * 5.5 * tt) * np.clip(tt * 4, 0, 1)
f0 = np.where(np.isnan(cents), 0, 440 * 2 ** ((cents - 6900) / 1200)); ph = np.cumsum(2 * np.pi * f0 / SR)
env = np.zeros(n)
for a, b, *_ in notes:
    i0, i1 = int(a * SR), int(b * SR); env[i0:i1] = np.minimum(1, np.minimum(np.arange(i1 - i0) / (0.04 * SR), np.arange(i1 - i0)[::-1] / (0.05 * SR)))
y = sum(np.sin(k * ph) / k * (1 + 2 * np.exp(-(((k * np.maximum(f0, 1) - 900) / 350) ** 2))) for k in range(1, 26)) * env
rng = np.random.default_rng(1); y = y + rng.normal(0, 0.002, n); y = 0.3 * y / np.abs(y).max()
def save(path, x):
    w = wave.open(path, "wb"); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
y = (np.round(y * 32767) / 32767)   # 16비트로 저장해도 같은 값
a = P.analyze(y, SR, fill=False); key = {"tonic": 0, "mode": "major", "name": "C"}
plan = P.plan_targets(a, key, "center", {}, None, fixes=None)
corr = P.correction_cents(a, key, 1.0, plan=plan, near=8.0)
out = P.apply(a, corr, y, SR)
corr2 = corr.copy(); corr2[(a["t"] < 0.9) | ((a["t"] > 1.9) & (a["t"] < 2.9))] = 0   # 일부만 보정(보정 안 한 사이 구간 처리 시험)
out2 = P.apply(a, corr2, y, SR)
save("in.wav", y); save("server_out.wav", out); save("server_out2.wav", out2)
json.dump({"sr": SR, "t": a["t"].tolist(), "f": a["f"].tolist(), "corr": corr.tolist(), "corr2": corr2.tolist(), "curve": M.pitch_curve(a["t"], a["cents"], {1: corr}, key, target=plan.get("target"))}, open("ref.json", "w"), separators=(",", ":"))
print("points", len(a["t"]), "shifted", int((np.abs(corr) > 0.5).sum()), "max shift", float(np.abs(corr).max()))
