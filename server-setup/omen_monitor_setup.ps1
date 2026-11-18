# 서버 모니터 설치: OmenMon(팬 읽기·조절 도구) + 모니터 프로그램 + 바탕화면 아이콘(관리자 확인창 없이 실행)
$ErrorActionPreference = "Stop"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
$Base = "C:\jakpum"; $OmenDir = Join-Path $Base "OmenMon"
New-Item -ItemType Directory -Force -Path $Base | Out-Null

function Step([string]$m) { Write-Host ("▶ " + $m) }

Step "파이썬 확인"
$py = $null
foreach ($c in @("$env:LOCALAPPDATA\Programs\Python\Python311\python.exe", "$env:ProgramFiles\Python311\python.exe")) { if (Test-Path $c) { $py = $c; break } }
if (-not $py) { $g = Get-Command python -ErrorAction SilentlyContinue; if ($g) { $py = $g.Source } }
if (-not $py) { throw "파이썬을 찾지 못했습니다(서버 설정을 먼저 끝내 주세요)" }
$pyw = $py -replace "python\.exe$", "pythonw.exe"
if (-not (Test-Path $pyw)) { $pyw = $py }

Step "psutil 설치"
& $py -m pip install --quiet psutil
if ($LASTEXITCODE -ne 0) { throw "psutil 설치 실패" }
Step "트레이 아이콘용 pystray·pillow 설치"
& $py -m pip install --quiet pystray pillow
if ($LASTEXITCODE -ne 0) { Write-Host "  (트레이 부품 설치 실패 — 트레이 없이 창만 동작)" }

Step "모니터 프로그램 내려받기"
Invoke-WebRequest -UseBasicParsing -Uri "https://moonlake-star.github.io/jakpum-phone-test/server-setup/omen_monitor.py" -OutFile (Join-Path $Base "omen_monitor.py")

if (-not (Test-Path (Join-Path $OmenDir "OmenMon.exe"))) {
    Step "OmenMon 내려받기(GitHub 최신 릴리스)"
    $rel = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/OmenMon/OmenMon/releases/latest" -Headers @{ "User-Agent" = "jakpum-setup" }
    $asset = $rel.assets | Where-Object { $_.name -match "\.zip$" } | Select-Object -First 1
    if (-not $asset) { throw "OmenMon 압축 파일을 찾지 못했습니다(릴리스: " + $rel.tag_name + ")" }
    $zip = Join-Path $env:TEMP $asset.name
    Invoke-WebRequest -UseBasicParsing -Uri $asset.browser_download_url -OutFile $zip
    $tmp = Join-Path $env:TEMP "omenmon_x"
    if (Test-Path $tmp) { Remove-Item -Recurse -Force $tmp }
    Expand-Archive -Path $zip -DestinationPath $tmp -Force
    $exe = Get-ChildItem -Path $tmp -Filter "OmenMon.exe" -Recurse | Select-Object -First 1
    if (-not $exe) { throw "OmenMon.exe가 압축 안에 없습니다" }
    New-Item -ItemType Directory -Force -Path $OmenDir | Out-Null
    Copy-Item -Path (Join-Path $exe.DirectoryName "*") -Destination $OmenDir -Recurse -Force
    Get-ChildItem -Path $OmenDir -Recurse -File | Unblock-File -ErrorAction SilentlyContinue
    Write-Host ("  OmenMon " + $rel.tag_name + " 설치됨")
}

Step "바탕화면 아이콘 만들기(확인창 없이 관리자 권한으로 실행)"
$act = New-ScheduledTaskAction -Execute $pyw -Argument ('"' + (Join-Path $Base "omen_monitor.py") + '"') -WorkingDirectory $Base
$set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Seconds 0)
$pri = New-ScheduledTaskPrincipal -UserId ($env:COMPUTERNAME + "\" + $env:USERNAME) -LogonType Interactive -RunLevel Highest
Register-ScheduledTask -TaskName "Jakpum Monitor" -Action $act -Settings $set -Principal $pri -Force | Out-Null
$desk = [Environment]::GetFolderPath("Desktop")
$s = (New-Object -ComObject WScript.Shell).CreateShortcut((Join-Path $desk "서버모니터.lnk"))
$s.TargetPath = "schtasks.exe"; $s.Arguments = '/run /tn "Jakpum Monitor"'; $s.WindowStyle = 7
$s.IconLocation = "$env:SystemRoot\System32\perfmon.exe,0"
$s.Save()

Step "모니터 실행"
Start-ScheduledTask -TaskName "Jakpum Monitor"
Write-Host ""
Write-Host "완료. 바탕화면의 「서버모니터」 아이콘으로 언제든 열 수 있습니다."
