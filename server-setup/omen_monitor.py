# -*- coding: utf-8 -*-
"""서버 모니터 — CPU·GPU·RAM·네트워크·팬 속도를 작은 창으로 보고, 팬 속도를 그래프로 조절한다.
HP OMEN 노트북 전용(팬 읽기·조절은 OmenMon 프로그램을 불러 씀). 관리자 권한으로 실행(바탕화면 '서버모니터' 아이콘이 알아서 함).
팬을 못 읽거나 조절이 안 되면 숫자만 '-'로 보이고 나머지는 정상 동작한다. 기본값은 항상 'HP 자동'이다."""
import json, os, re, subprocess, sys, threading, time, traceback
from collections import deque
import queue

BASE = r"C:\jakpum"
OMEN_DIR = os.path.join(BASE, "OmenMon")
OMEN = os.path.join(OMEN_DIR, "OmenMon.exe")
CFG = os.path.join(OMEN_DIR, "OmenMon.xml")
CURVE_FILE = os.path.join(BASE, "fan_curve.json")
LOG = os.path.join(BASE, "omen_monitor.log")
DEBUG = os.path.join(BASE, "omen_monitor_debug.txt")
NOWIN = 0x08000000 if os.name == "nt" else 0
LV_MIN, LV_MAX = 20, 55          # 팬 단계(1단계 = 1000rpm÷10 → 40 = 4000rpm). OmenMon 기본 한계값
T_MIN, T_MAX = 30, 100           # 그래프 가로축(℃)
DEFAULT_POINTS = [[45, 20], [60, 26], [70, 34], [80, 44], [90, 55]]
SAFE_FLOORS = [(80, 40), (88, 55)]   # 안전 하한: 80℃ 이상이면 최소 4000rpm, 88℃ 이상이면 최대


def log(msg):
    try:
        with open(LOG, "a", encoding="utf-8") as f:
            f.write(time.strftime("%Y-%m-%d %H:%M:%S ") + str(msg) + "\n")
    except Exception:
        pass


# ---------------- 순수 계산(시험 가능) ----------------
def clamp(v, lo, hi):
    return max(lo, min(hi, v))


def normalize_points(points):
    """점 5개를 온도 오름차순·팬 단계 비감소로 정리하고 범위 안으로 맞춘다."""
    pts = sorted([[clamp(int(round(t)), T_MIN, T_MAX), clamp(int(round(l)), LV_MIN, LV_MAX)] for t, l in points])
    for i in range(1, len(pts)):
        if pts[i][1] < pts[i - 1][1]:
            pts[i][1] = pts[i - 1][1]
    return pts


def build_levels(points):
    """그래프 점 → OmenMon 프로그램 표 [(온도, 단계)]. 안전 하한(80℃↑ 4000rpm, 88℃↑ 최대)을 반드시 포함."""
    pts = normalize_points(points)
    table = {0: pts[0][1]}
    for t, l in pts:
        table[t] = max(table.get(t, 0), l)
    for t, floor in SAFE_FLOORS:
        # t 에서의 값 = 그래프 보간값과 하한 중 큰 값
        table[t] = max(table.get(t, level_at(pts, t)), floor)
    out = sorted(table.items())
    for i in range(1, len(out)):
        if out[i][1] < out[i - 1][1]:
            out[i] = (out[i][0], out[i - 1][1])
    for i, (t, l) in enumerate(out):
        for tt, floor in SAFE_FLOORS:
            if t >= tt and l < floor:
                out[i] = (t, floor)
    return out


def level_at(pts, temp):
    if temp <= pts[0][0]:
        return pts[0][1]
    if temp >= pts[-1][0]:
        return pts[-1][1]
    for (t0, l0), (t1, l1) in zip(pts, pts[1:]):
        if t0 <= temp <= t1:
            return l0 if t1 == t0 else l0 + (l1 - l0) * (temp - t0) / (t1 - t0)
    return pts[-1][1]


def program_xml(points):
    rows = "".join(
        '        <Level Temperature="%d"><Cpu>%d</Cpu><Gpu>%d</Gpu></Level>\n' % (t, l, l)
        for t, l in build_levels(points))
    return ('<?xml version="1.0" encoding="utf-8"?>\n<OmenMon>\n  <Config>\n    <FanLevelUseEc>true</FanLevelUseEc>\n    <FanPrograms>\n'
            '      <Program Name="Jakpum">\n        <FanMode>Performance</FanMode>\n'
            '        <GpuPower>Maximum</GpuPower>\n' + rows +
            '      </Program>\n    </FanPrograms>\n  </Config>\n</OmenMon>\n')


def last_number(text):
    """OmenMon 출력 '… = 2848 (Little-Endian) [RPM3]' 에서 10진 값(= 뒤 마지막 숫자)을 뽑는다."""
    m = re.findall(r"=\s*(\d+)", text or "")
    if m:
        return int(m[-1])
    nums = re.findall(r"\d+", text or "")
    return int(nums[-1]) if nums else None


# ---------------- 센서 ----------------
def _hidden():
    """OmenMon은 스스로 콘솔 창을 만들기 때문에 '창 숨김' 시작 정보를 줘야 깜빡이지 않는다."""
    if os.name != "nt":
        return None
    si = subprocess.STARTUPINFO()
    si.dwFlags |= subprocess.STARTF_USESHOWWINDOW
    si.wShowWindow = 0   # SW_HIDE
    return si


def run_omen(args, timeout=8):
    r = subprocess.run([OMEN] + args, capture_output=True, text=True, encoding="utf-8", errors="replace",
                       timeout=timeout, startupinfo=_hidden(), cwd=OMEN_DIR)
    return (r.stdout or "") + (r.stderr or "")


def parse_ec_table(text):
    """`OmenMon -Ec` 표(줄마다 '3_ 00 80 …' 16칸) → 256바이트. 못 읽으면 None."""
    regs = bytearray(256)
    got = 0
    for line in (text or "").splitlines():
        m = re.match(r"^\s*([0-9a-fA-F])_\s+((?:[0-9a-fA-F]{2}\s*){16})\s*$", line)
        if m:
            row = int(m.group(1), 16)
            vals = m.group(2).split()
            regs[row * 16:row * 16 + 16] = bytes(int(v, 16) for v in vals)
            got += 1
    return regs if got == 16 else None


def cpu_temp_wmi():
    """EC에 CPU 온도가 없는 모델용: Windows 열 센서(있을 때만). 못 믿을 값이면 None."""
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command",
                            "(Get-CimInstance -Namespace root/wmi -ClassName MSAcpi_ThermalZoneTemperature -ErrorAction Stop | "
                            "ForEach-Object { [math]::Round($_.CurrentTemperature/10 - 273.15) }) -join ','"],
                           capture_output=True, text=True, timeout=15, creationflags=NOWIN)
        vals = [int(x) for x in re.findall(r"-?\d+", r.stdout or "")]
        vals = [v for v in vals if 20 <= v <= 120]
        return max(vals) if vals else None
    except Exception:
        return None


def ec(name):
    try:
        return last_number(run_omen(["-Ec", name]))
    except Exception:
        return None


def _smi():
    for c in (r"C:\Windows\System32\nvidia-smi.exe", r"C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe"):
        if os.path.exists(c):
            return c
    return "nvidia-smi"


def gpu_info():
    try:
        r = subprocess.run([_smi(), "--query-gpu=utilization.gpu,temperature.gpu,memory.used,memory.total",
                            "--format=csv,noheader,nounits"], capture_output=True, text=True, timeout=6, creationflags=NOWIN)
        a = [x.strip() for x in r.stdout.strip().splitlines()[0].split(",")]
        return int(a[0]), int(a[1]), int(a[2]), int(a[3])
    except Exception:
        return None


def sane(v, lo, hi):
    return v if isinstance(v, int) and lo <= v <= hi else None


class Sensors:
    def __init__(self):
        import psutil
        self.ps = psutil
        self.data = {}
        self._net = psutil.net_io_counters()
        self._t = time.time()
        self.has_omen = os.path.exists(OMEN)
        self._stop = False
        psutil.cpu_percent(None)
        threading.Thread(target=self._fast, daemon=True).start()
        threading.Thread(target=self._slow, daemon=True).start()

    def _fast(self):
        while not self._stop:
            try:
                now = time.time()
                n = self.ps.net_io_counters()
                dt = max(0.2, now - self._t)
                up = (n.bytes_sent - self._net.bytes_sent) * 8 / dt / 1e6
                dn = (n.bytes_recv - self._net.bytes_recv) * 8 / dt / 1e6
                self._net, self._t = n, now
                vm = self.ps.virtual_memory()
                self.data.update(cpu=self.ps.cpu_percent(None), ram_pct=vm.percent, ram_used=vm.used / 2**30,
                                 ram_total=vm.total / 2**30, up=up, down=dn)
                g = gpu_info()
                if g:
                    self.data.update(gpu=g[0], gpu_t=g[1], vram_used=g[2], vram_total=g[3])
            except Exception:
                log("fast " + traceback.format_exc())
            time.sleep(1.5)

    def _slow(self):
        while not self._stop:
            try:
                if self.has_omen:
                    regs = parse_ec_table(run_omen(["-Ec"]))
                    if regs:
                        self.data["cpu_t"] = sane(regs[0x57], 1, 125)          # 이 모델은 0(없음)일 수 있음
                        self.data["ec_gpu_t"] = sane(regs[0xB7], 1, 125)
                        self.data["rpm1"] = sane(regs[0xB0] | regs[0xB1] << 8, 0, 9999)
                        self.data["rpm2"] = sane(regs[0xB2] | regs[0xB3] << 8, 0, 9999)
                if not self.data.get("cpu_t"):
                    n = getattr(self, "_wmi_n", 0)
                    if n % 2 == 0:
                        self.data["cpu_t_wmi"] = cpu_temp_wmi()
                    self._wmi_n = n + 1
            except Exception:
                log("slow " + traceback.format_exc())
            time.sleep(6)

    def stop(self):
        self._stop = True


# ---------------- 화면 ----------------
def main():
    import tkinter as tk
    from tkinter import messagebox
    os.makedirs(BASE, exist_ok=True)
    BG, FG, AC, PANEL, DIM = "#2b2b2b", "#eeeeee", "#ffe066", "#3a3a3a", "#aaaaaa"
    root = tk.Tk()
    root.title("서버 모니터")
    root.configure(bg=BG)
    root.attributes("-topmost", True)
    root.resizable(False, False)
    sens = Sensors()
    state = {"proc": None, "mode": "auto", "drag": None}
    try:
        with open(CURVE_FILE, encoding="utf-8") as f:
            points = normalize_points(json.load(f)["points"])
    except Exception:
        points = [list(p) for p in DEFAULT_POINTS]

    def lab(parent, text, size=12, color=FG, bold=False):
        return tk.Label(parent, text=text, bg=parent["bg"], fg=color, font=("맑은 고딕", size, "bold" if bold else "normal"), anchor="w")

    rows = {}
    top = tk.Frame(root, bg=BG)
    top.pack(padx=12, pady=(10, 4), fill="x")
    SPW, SPH, HIST = 352, 30, 90          # 추이 그래프 크기, 기록 개수(1.5초×90 ≈ 2분 15초)
    hist = {k: deque(maxlen=HIST) for k in ("cpu", "gpu", "ram", "up", "down")}
    sparks = {}
    for key, title in [("cpu", "CPU"), ("gpu", "GPU"), ("ram", "RAM"), ("net", "네트워크"), ("fan", "팬")]:
        f = tk.Frame(top, bg=PANEL)
        f.pack(fill="x", pady=3)
        head = tk.Frame(f, bg=PANEL)
        head.pack(fill="x")
        lab(head, title, 11, AC, True).pack(side="left", padx=8, pady=(6, 2))
        v = tk.StringVar(value="-")
        tk.Label(head, textvariable=v, bg=PANEL, fg=FG, font=("맑은 고딕", 12), anchor="e", justify="right").pack(side="right", padx=8)
        rows[key] = v
        if key != "fan":
            c = tk.Canvas(f, width=SPW, height=SPH, bg="#222222", highlightthickness=0)
            c.pack(padx=8, pady=(0, 6))
            sparks[key] = c

    def draw_spark(c, series, vmax):
        """series: [(데이터, 색)] — 오른쪽이 최신, 옆으로 흘러감"""
        c.delete("all")
        for y in (SPH * 0.25, SPH * 0.5, SPH * 0.75):
            c.create_line(0, y, SPW, y, fill="#333333")
        for data, color in series:
            n = len(data)
            if n < 2:
                continue
            step = SPW / (HIST - 1)
            x0 = SPW - (n - 1) * step
            pts = []
            for i, val in enumerate(data):
                pts += [x0 + i * step, SPH - 2 - min(1.0, max(0.0, val / vmax)) * (SPH - 4)]
            c.create_line(*pts, fill=color, width=2)

    def update_sparks():
        draw_spark(sparks["cpu"], [(hist["cpu"], AC)], 100)
        draw_spark(sparks["gpu"], [(hist["gpu"], "#7fd1ff")], 100)
        draw_spark(sparks["ram"], [(hist["ram"], "#9be37f")], 100)
        peak = max([1.0] + list(hist["up"]) + list(hist["down"]))
        draw_spark(sparks["net"], [(hist["down"], "#7fd1ff"), (hist["up"], "#ff9f7f")], peak * 1.1)

    gf = tk.Frame(root, bg=BG)
    gf.pack(padx=12, pady=(6, 2), fill="x")
    lab(gf, "팬 속도 그래프 (점을 끌어서 조절)", 11, AC, True).pack(anchor="w")
    W, H, ML, MB, MT, MR = 360, 210, 44, 26, 10, 10
    cv = tk.Canvas(gf, width=W, height=H, bg="#222222", highlightthickness=0)
    cv.pack(pady=4)

    def px(t): return ML + (t - T_MIN) / (T_MAX - T_MIN) * (W - ML - MR)
    def py(l): return H - MB - (l - LV_MIN) / (LV_MAX - LV_MIN) * (H - MB - MT)
    def inv_t(x): return clamp(int(round(T_MIN + (x - ML) / (W - ML - MR) * (T_MAX - T_MIN))), T_MIN, T_MAX)
    def inv_l(y): return clamp(int(round(LV_MIN + (H - MB - y) / (H - MB - MT) * (LV_MAX - LV_MIN))), LV_MIN, LV_MAX)

    def redraw():
        cv.delete("all")
        for t in range(T_MIN, T_MAX + 1, 10):
            cv.create_line(px(t), MT, px(t), H - MB, fill="#3c3c3c")
            cv.create_text(px(t), H - 12, text="%d°" % t, fill=DIM, font=("맑은 고딕", 8))
        for l in range(LV_MIN, LV_MAX + 1, 5):
            cv.create_line(ML, py(l), W - MR, py(l), fill="#3c3c3c")
            cv.create_text(ML - 4, py(l), text="%d" % (l * 100), fill=DIM, font=("맑은 고딕", 8), anchor="e")
        for tt, fl in SAFE_FLOORS:   # 안전 구간 표시
            cv.create_line(px(tt), py(fl), W - MR, py(fl), fill="#a05050", dash=(3, 3))
        pts = normalize_points(points)
        cv.create_line(*[c for t, l in pts for c in (px(t), py(l))], fill=AC, width=2)
        for i, (t, l) in enumerate(pts):
            cv.create_oval(px(t) - 7, py(l) - 7, px(t) + 7, py(l) + 7, fill=AC, outline="#000")
        d = sens.data
        cur = max([x for x in (d.get("cpu_t"), d.get("cpu_t_wmi"), d.get("gpu_t"), d.get("ec_gpu_t")) if x] or [0])
        if cur:
            cv.create_line(px(clamp(cur, T_MIN, T_MAX)), MT, px(clamp(cur, T_MIN, T_MAX)), H - MB, fill="#66ccff")

    def on_down(e):
        best, bd = None, 18
        for i, (t, l) in enumerate(points):
            dist = ((px(t) - e.x) ** 2 + (py(l) - e.y) ** 2) ** 0.5
            if dist < bd:
                best, bd = i, dist
        state["drag"] = best

    def on_move(e):
        i = state["drag"]
        if i is None:
            return
        t, l = inv_t(e.x), inv_l(e.y)
        lo_t = points[i - 1][0] + 1 if i > 0 else T_MIN
        hi_t = points[i + 1][0] - 1 if i < len(points) - 1 else T_MAX
        lo_l = points[i - 1][1] if i > 0 else LV_MIN
        hi_l = points[i + 1][1] if i < len(points) - 1 else LV_MAX
        points[i] = [clamp(t, lo_t, hi_t), clamp(l, lo_l, hi_l)]
        redraw()
        txt_hint.set("%d℃ → %d rpm" % (points[i][0], points[i][1] * 100))

    def on_up(e):
        if state["drag"] is not None:
            state["drag"] = None
            try:
                with open(CURVE_FILE, "w", encoding="utf-8") as f:
                    json.dump({"points": normalize_points(points)}, f)
            except Exception:
                pass
            if state["mode"] == "graph":
                apply_graph()

    cv.bind("<ButtonPress-1>", on_down)
    cv.bind("<B1-Motion>", on_move)
    cv.bind("<ButtonRelease-1>", on_up)
    txt_hint = tk.StringVar(value="빨간 점선 = 안전 하한(80℃↑ 4000rpm, 88℃↑ 최대)")
    tk.Label(gf, textvariable=txt_hint, bg=BG, fg=DIM, font=("맑은 고딕", 9), anchor="w").pack(anchor="w")

    status = tk.StringVar(value="팬: HP 자동")
    bf = tk.Frame(root, bg=BG)
    bf.pack(padx=12, pady=6, fill="x")

    def stop_proc():
        p = state["proc"]
        state["proc"] = None
        if p and p.poll() is None:
            try:
                p.terminate()
                p.wait(timeout=5)
            except Exception:
                try:
                    p.kill()
                except Exception:
                    pass

    def set_auto():
        stop_proc()
        state["mode"] = "auto"
        try:
            if os.path.exists(OMEN):
                for a in (["-Bios", "FanMax=Off"], ["-Bios", "FanMode=Default"]):
                    try:
                        run_omen(a)
                    except Exception:
                        pass
            status.set("팬: HP 자동")
        except Exception as ex:
            status.set("팬: 자동 복귀 실패(%s)" % ex)
            log("auto " + traceback.format_exc())

    def apply_graph():
        if not os.path.exists(OMEN):
            status.set("OmenMon이 없어 팬 조절 불가")
            return
        stop_proc()
        try:
            with open(CFG, "w", encoding="utf-8", newline="\n") as f:
                f.write(program_xml(points))
            try:
                run_omen(["-Bios", "FanMax=Off"])
            except Exception:
                pass
            state["proc"] = subprocess.Popen([OMEN, "-Prog", "Jakpum"], startupinfo=_hidden(), cwd=OMEN_DIR,
                                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, stdin=subprocess.DEVNULL)
            state["mode"] = "graph"
            status.set("팬: 그래프 조절 중")
        except Exception as ex:
            status.set("팬 조절 시작 실패")
            log("apply " + traceback.format_exc())

    def diagnose():
        try:
            out = []
            for a in (["-Ec"], ["-Bios", "FanCount"], ["-Bios", "FanType"], ["-Bios", "FanLevel"], ["-Prog"], ["-Ec", "CPUT"], ["-Ec", "GPTM"], ["-Ec", "RPM1(2)"], ["-Ec", "RPM3(2)"], ["-Ec", "XGS1"]):
                try:
                    out.append("$ OmenMon %s\n%s\n" % (" ".join(a), run_omen(a, 15)))
                except Exception as ex:
                    out.append("$ OmenMon %s\n(오류 %s)\n" % (" ".join(a), ex))
            with open(DEBUG, "w", encoding="utf-8") as f:
                f.write("\n".join(out))
            status.set("진단 저장됨: " + DEBUG)
        except Exception:
            log("diag " + traceback.format_exc())

    def btn(text, cmd):
        return tk.Button(bf, text=text, command=cmd, bg=AC, fg="#000000", font=("맑은 고딕", 11, "bold"), relief="flat", padx=10, pady=6)

    btn("HP 자동", set_auto).pack(side="left", padx=(0, 6))
    btn("그래프로 조절", apply_graph).pack(side="left", padx=6)
    btn("진단 저장", lambda: threading.Thread(target=diagnose, daemon=True).start()).pack(side="right")
    tk.Label(root, textvariable=status, bg=BG, fg=AC, font=("맑은 고딕", 10), anchor="w").pack(padx=12, pady=(0, 10), fill="x")

    # ---------- 트레이(작업표시줄 오른쪽 아래) 아이콘 ----------
    tray = {"icon": None, "metric": "cpu", "last_click": 0.0, "sig": None}
    cmds = queue.Queue()
    try:
        import pystray
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        pystray = None
        log("트레이 없음(pystray/pillow 미설치): " + traceback.format_exc().splitlines()[-1])

    def tray_value(d):
        m = tray["metric"]
        if m == "gpu":
            return d.get("gpu")
        if m == "vram":
            return None if not d.get("vram_total") else int(d.get("vram_used", 0) * 100 / d["vram_total"])
        if m == "ram":
            return None if d.get("ram_pct") is None else int(d["ram_pct"])
        return None if d.get("cpu") is None else int(d["cpu"])

    def tray_image(val):
        label = "--" if val is None else str(min(99, int(val))) if val < 100 else "99"
        col = "#3a7d44" if (val or 0) < 50 else ("#c98a00" if val < 80 else "#c0392b")
        im = Image.new("RGB", (64, 64), col)
        dr = ImageDraw.Draw(im)
        try:
            ft = ImageFont.truetype("arialbd.ttf", 46)
        except Exception:
            ft = ImageFont.load_default()
        try:
            box = dr.textbbox((0, 0), label, font=ft)
            tw, th = box[2] - box[0], box[3] - box[1]
            dr.text(((64 - tw) / 2 - box[0], (64 - th) / 2 - box[1]), label, fill="white", font=ft)
        except Exception:
            dr.text((8, 20), label, fill="white")
        return im

    def tray_tip(d):
        g = "GPU %s%% %s°C VRAM %s/%sMB" % (fmt(d.get("gpu")), fmt(d.get("gpu_t") or d.get("ec_gpu_t")), fmt(d.get("vram_used")), fmt(d.get("vram_total")))
        c = "CPU %s%% %s°C" % (fmt(None if d.get("cpu") is None else int(d["cpu"])), fmt(d.get("cpu_t") or d.get("cpu_t_wmi")))
        r = "RAM %s%%" % fmt(None if d.get("ram_pct") is None else int(d["ram_pct"]))
        n = "▲%.1f ▼%.1f Mbps" % (d.get("up") or 0, d.get("down") or 0)
        return "\n".join([c, g, r, n])[:127]

    def on_tray_default(icon=None, item=None):
        now = time.time()                       # 아이콘 '두 번 클릭'일 때만 큰 창 열기
        if now - tray["last_click"] < 0.6:
            cmds.put("show")
            tray["last_click"] = 0.0
        else:
            tray["last_click"] = now

    def set_metric(name):
        def f(icon=None, item=None):
            tray["metric"] = name
        return f

    def start_tray():
        if not pystray:
            return
        try:
            def chk(name):
                return lambda item: tray["metric"] == name
            menu = pystray.Menu(
                pystray.MenuItem("기본(더블클릭)", on_tray_default, default=True, visible=False),
                pystray.MenuItem("큰 창 열기 (아이콘 더블클릭)", lambda i, it: cmds.put("show")),
                pystray.MenuItem("아이콘 숫자", pystray.Menu(
                    pystray.MenuItem("CPU 사용률", set_metric("cpu"), checked=chk("cpu"), radio=True),
                    pystray.MenuItem("GPU 사용률", set_metric("gpu"), checked=chk("gpu"), radio=True),
                    pystray.MenuItem("VRAM 사용률", set_metric("vram"), checked=chk("vram"), radio=True),
                    pystray.MenuItem("RAM 사용률", set_metric("ram"), checked=chk("ram"), radio=True))),
                pystray.MenuItem("종료", lambda i, it: cmds.put("quit")))
            ic = pystray.Icon("jakpum_monitor", tray_image(None), "서버 모니터", menu)
            ic.run_detached()
            tray["icon"] = ic
        except Exception:
            log("트레이 시작 실패 " + traceback.format_exc())
            tray["icon"] = None

    def poll_cmds():
        try:
            while True:
                c = cmds.get_nowait()
                if c == "show":
                    show_window()
                elif c == "quit":
                    quit_all()
                    return
        except queue.Empty:
            pass
        root.after(150, poll_cmds)

    def update_tray(d):
        ic = tray["icon"]
        if not ic:
            return
        try:
            v = tray_value(d)
            sig = (tray["metric"], v)
            if sig != tray["sig"]:
                ic.icon = tray_image(v)
                tray["sig"] = sig
            ic.title = tray_tip(d)
        except Exception:
            log("tray " + traceback.format_exc())

    def fmt(v, suffix="", dash="-"):
        return dash if v is None else ("%s%s" % (v, suffix))

    def tick():
        d = sens.data
        rows["cpu"].set("%s%%   %s" % (fmt(None if d.get("cpu") is None else int(d["cpu"])), fmt(d.get("cpu_t") or d.get("cpu_t_wmi"), "°C")))
        rows["gpu"].set("%s%%   %s   VRAM %s/%s MB" % (fmt(d.get("gpu")), fmt(d.get("gpu_t") or d.get("ec_gpu_t"), "°C"), fmt(d.get("vram_used")), fmt(d.get("vram_total"))))
        rows["ram"].set("%s%%   %s / %s GB" % (fmt(None if d.get("ram_pct") is None else int(d["ram_pct"])), "-" if d.get("ram_used") is None else "%.1f" % d["ram_used"], "-" if d.get("ram_total") is None else "%.1f" % d["ram_total"]))
        rows["net"].set("▲ %s   ▼ %s Mbps" % ("-" if d.get("up") is None else "%.1f" % d["up"], "-" if d.get("down") is None else "%.1f" % d["down"]))
        rows["fan"].set("%s / %s rpm" % (fmt(d.get("rpm1")), fmt(d.get("rpm2"))))
        for k, dk in (("cpu", "cpu"), ("gpu", "gpu"), ("ram", "ram_pct"), ("up", "up"), ("down", "down")):
            hist[k].append(d.get(dk) or 0)
        update_sparks()
        update_tray(d)
        p = state["proc"]
        if state["mode"] == "graph" and p and p.poll() is not None:
            status.set("팬 조절이 멈췄습니다 → HP 자동으로 복귀")
            set_auto()
        redraw()
        root.after(1500, tick)

    def quit_all():
        try:
            if state["mode"] == "graph":
                set_auto()
        finally:
            sens.stop()
            try:
                if tray["icon"]:
                    tray["icon"].stop()
            except Exception:
                pass
            root.destroy()

    def on_close():
        # 트레이 아이콘이 있으면 X 버튼은 '트레이로 숨기기', 종료는 트레이 아이콘 우클릭 → 종료
        if tray["icon"]:
            root.withdraw()
        else:
            quit_all()

    def show_window():
        root.deiconify()
        root.lift()
        try:
            root.focus_force()
        except Exception:
            pass

    root.protocol("WM_DELETE_WINDOW", on_close)
    start_tray()
    poll_cmds()
    if sens.has_omen and not os.path.exists(DEBUG):
        threading.Thread(target=diagnose, daemon=True).start()
    tick()
    root.mainloop()


if __name__ == "__main__":
    try:
        main()
    except Exception:
        log("main " + traceback.format_exc())
        raise
