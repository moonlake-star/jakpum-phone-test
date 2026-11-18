# 작품 보컬노트 · 새 노트북 서버 자동 설정 (2026-11-18)
# 한 번 실행하면: Windows 11 서버용 설정 → 필요한 프로그램 설치 → Windows 업데이트(드라이버 포함) → 자동 재시작 →
#                 재시작 뒤 이어서: 코드 받기 → 파이썬 도구 설치 → 일꾼 자동 시작 등록 → 시험 → 결과 보고
# 이 파일에는 비밀번호·키·토큰이 없습니다(공개 저장소에 올라가 있음). 비밀값은 '열쇠 폴더'(옛 노트북에서 USB로 복사)에서만 가져옵니다.
# 여러 번 실행해도 안전합니다(이미 된 것은 건너뜀).
param([ValidateSet("A", "B")][string]$Stage = "A")

$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }

$Base = "C:\jakpum"
$LogFile = Join-Path $Base "setup.log"
$StateFile = Join-Path $Base "state.json"
$SelfCopy = Join-Path $Base "setup_server.ps1"
$UserHome = $env:USERPROFILE
$Src = Join-Path $UserHome "jakpum_src"
$Repo = "https://github.com/moonlake-star/jakpum-vocalnote.git"
$ResumeTask = "Jakpum Setup Resume"
$script:Fails = New-Object System.Collections.ArrayList
$script:Manual = New-Object System.Collections.ArrayList

if (-not (Test-Path $Base)) { New-Item -ItemType Directory -Force -Path $Base | Out-Null }

function Log([string]$m) {
    $line = "{0:yyyy-MM-dd HH:mm:ss} {1}" -f (Get-Date), $m
    Add-Content -Path $LogFile -Value $line -Encoding UTF8
    Write-Host $line
}

function Test-Admin {
    $id = [Security.Principal.WindowsIdentity]::GetCurrent()
    return (New-Object Security.Principal.WindowsPrincipal($id)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

# 관리자가 아니면 관리자 권한으로 다시 실행(Windows가 '예' 한 번만 물어봄)
if (-not (Test-Admin)) {
    Write-Host "관리자 권한이 필요합니다. 곧 나오는 창에서 [예]를 눌러 주세요."
    $me = $PSCommandPath
    if (-not $me) { $me = $MyInvocation.MyCommand.Path }
    Start-Process -FilePath "powershell.exe" -Verb RunAs -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", "`"$me`"", "-Stage", $Stage)
    exit
}

function Get-State {
    if (Test-Path $StateFile) { try { return (Get-Content $StateFile -Raw -Encoding UTF8 | ConvertFrom-Json) } catch { } }
    return (New-Object PSObject -Property @{ stageA = $false; bTries = 0; autologon = $false })
}
function Save-State($s) { ($s | ConvertTo-Json) | Set-Content -Path $StateFile -Encoding UTF8 }

function Try-Step([string]$name, [scriptblock]$sb) {
    Log "▶ $name"
    try {
        & $sb
        Log "✔ $name"
    } catch {
        Log ("✘ {0}: {1}" -f $name, $_.Exception.Message)
        [void]$script:Fails.Add($name)
    }
}

function Set-Reg([string]$path, [string]$name, $value, [string]$type = "DWord") {
    if (-not (Test-Path $path)) { New-Item -Path $path -Force | Out-Null }
    New-ItemProperty -Path $path -Name $name -Value $value -PropertyType $type -Force | Out-Null
}

function Update-EnvPath {
    $m = [Environment]::GetEnvironmentVariable("Path", "Machine")
    $u = [Environment]::GetEnvironmentVariable("Path", "User")
    $env:Path = ($m + ";" + $u)
}

function Run-Quiet([string]$exe, [string[]]$argv) {
    # 프로그램을 실행하고 종료 코드를 돌려줌(출력은 로그 파일에만)
    $out = & $exe @argv 2>&1
    $code = $LASTEXITCODE
    if ($out) { Add-Content -Path $LogFile -Value ($out | Out-String) -Encoding UTF8 }
    return $code
}

function Install-Pkg([string]$id, [string]$label) {
    Update-EnvPath
    & winget list --id $id -e --accept-source-agreements 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) { Log "  이미 설치됨: $label"; return $true }
    for ($i = 1; $i -le 2; $i++) {
        Log "  설치 중($i/2): $label"
        $code = Run-Quiet "winget" @("install", "-e", "--id", $id, "--silent", "--accept-package-agreements", "--accept-source-agreements", "--source", "winget")
        & winget list --id $id -e --accept-source-agreements 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) { Log "  설치 완료: $label"; Update-EnvPath; return $true }
        Log "  설치 실패(종료 코드 $code): $label"
        Start-Sleep -Seconds 5
    }
    return $false
}

function Find-Python {
    Update-EnvPath
    $cands = @(
        (Join-Path $env:ProgramFiles "Python311\python.exe"),
        (Join-Path $env:LOCALAPPDATA "Programs\Python\Python311\python.exe")
    )
    foreach ($c in $cands) { if (Test-Path $c) { return $c } }
    $py = Get-Command py -ErrorAction SilentlyContinue
    if ($py) {
        $p = (& py -3.11 -c "import sys;print(sys.executable)" 2>$null)
        if ($p -and (Test-Path $p)) { return $p }
    }
    return $null
}

function Find-KeyPack {
    # 옛 노트북에서 만든 '열쇠 폴더'(jakpum_keys_pack)를 USB·다운로드·바탕화면에서 찾음
    $dirs = New-Object System.Collections.ArrayList
    if ($PSCommandPath) { [void]$dirs.Add((Split-Path -Parent $PSCommandPath)) }
    foreach ($d in (Get-PSDrive -PSProvider FileSystem)) { [void]$dirs.Add($d.Root) }
    [void]$dirs.Add((Join-Path $UserHome "Downloads"))
    [void]$dirs.Add((Join-Path $UserHome "Desktop"))
    [void]$dirs.Add($Base)
    foreach ($d in $dirs) {
        $p = Join-Path $d "jakpum_keys_pack"
        if (Test-Path (Join-Path $p "keys.env")) { return $p }
    }
    return $null
}

function Test-PendingReboot {
    $keys = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired",
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending"
    )
    foreach ($k in $keys) { if (Test-Path $k) { return $true } }
    return $false
}

$state = Get-State

# ======================================================================
# 단계 A: 설정 + 설치 + Windows 업데이트 → 자동 재시작
# ======================================================================
if ($Stage -eq "A") {
    Log "===== 작품 보컬노트 서버 자동 설정 시작(단계 A) ====="

    Try-Step "사전 확인(Windows 11 · 인터넷)" {
        $b = [Environment]::OSVersion.Version.Build
        Log ("  Windows 빌드 {0} / {1}" -f $b, (Get-CimInstance Win32_OperatingSystem).Caption)
        if ($b -lt 22000) { Log "  ⚠ Windows 11이 아닙니다(그래도 계속 진행)" }
        $ok = $false
        try { $r = Invoke-WebRequest -UseBasicParsing -Uri "https://github.com" -Method Head -TimeoutSec 20; $ok = $true } catch { }
        if (-not $ok) { throw "인터넷(github.com)에 연결되지 않습니다. 와이파이를 확인하고 다시 실행해 주세요." }
    }

    # 이 파일을 안전한 곳에 복사(재시작 뒤 이어서 실행하려고)
    try {
        $me = $PSCommandPath
        if ($me -and ($me -ne $SelfCopy)) { Copy-Item -Force $me $SelfCopy }
    } catch { }

    # ---- 사람이 해야 하는 유일한 입력 2개(처음에 몰아서 묻고, 그 뒤로는 자리를 비워도 됨) ----
    $pwd = $null
    if (-not $state.autologon) {
        Write-Host ""
        Write-Host "[입력 1/2] 정전·재시작 뒤에도 서버가 저절로 켜지도록 '자동 로그인'을 설정합니다."
        Write-Host "           이 Windows 계정의 암호를 입력하세요(화면에 안 보임). 암호가 없으면 그냥 Enter."
        Write-Host "           (Microsoft 계정이면 PIN이 아니라 Microsoft 계정 암호입니다. 암호는 Windows 안에서 암호화되어 저장됩니다.)"
        $pwd = Read-Host "Windows 암호" -AsSecureString
    }
    $pack = Find-KeyPack
    if (-not $pack) {
        Write-Host ""
        Write-Host "[입력 2/2] '열쇠 폴더'(jakpum_keys_pack)를 못 찾았습니다."
        Write-Host "           옛 노트북에서 만든 USB를 지금 꽂고 Enter를 누르세요. 아직 없으면 그냥 Enter(나중에 이 파일을 다시 실행하면 됩니다)."
        [void](Read-Host "USB를 꽂았으면 Enter")
        $pack = Find-KeyPack
    }
    if ($pack) { Log "열쇠 폴더 발견: $pack" } else { Log "열쇠 폴더 없음 — 설치는 계속하고, 열쇠는 나중에 넣습니다" }

    Try-Step "자동 로그인 설정" {
        if ($state.autologon) { Log "  이미 설정됨"; return }
        Set-Reg "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\PasswordLess\Device" "DevicePasswordLessBuildVersion" 0
        $plain = ""
        if ($pwd) {
            $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($pwd)
            $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
            [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        }
        $wl = "HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion\Winlogon"
        if ($plain -ne "") {
            $tools = Join-Path $Base "tools"
            New-Item -ItemType Directory -Force -Path $tools | Out-Null
            $exe = Join-Path $tools "Autologon64.exe"
            if (-not (Test-Path $exe)) { Invoke-WebRequest -UseBasicParsing -Uri "https://live.sysinternals.com/Autologon64.exe" -OutFile $exe }
            $p = Start-Process -FilePath $exe -ArgumentList @("/accepteula", $env:USERNAME, $env:COMPUTERNAME, $plain) -Wait -PassThru -WindowStyle Hidden
            Log ("  Autologon 종료 코드 {0}" -f $p.ExitCode)
        } else {
            Set-Reg $wl "AutoAdminLogon" "1" "String"
            Set-Reg $wl "DefaultUserName" $env:USERNAME "String"
            Set-Reg $wl "DefaultDomainName" $env:COMPUTERNAME "String"
            Set-Reg $wl "DefaultPassword" "" "String"
        }
        $plain = $null
        $chk = (Get-ItemProperty $wl -ErrorAction SilentlyContinue).AutoAdminLogon
        if ($chk -ne "1") { throw "자동 로그인이 켜지지 않았습니다(암호가 틀렸을 수 있음)" }
        $state.autologon = $true
        Save-State $state
    }
    $pwd = $null

    # ---------------- Windows 11 서버용 설정 ----------------
    Try-Step "시간대·시계(한국)" {
        & tzutil /s "Korea Standard Time"
        Set-Service -Name w32time -StartupType Automatic -ErrorAction SilentlyContinue
        Start-Service -Name w32time -ErrorAction SilentlyContinue
        & w32tm /resync 2>&1 | Out-Null
    }

    Try-Step "전원: 절대 안 잠들게 · 덮개 닫아도 계속 · 절전 끄기" {
        $g = $null
        $out = (& powercfg -duplicatescheme 8c5e7fda-e8bf-4a96-9a85-a6e23a8c635c 2>&1 | Out-String)
        if ($out -match "([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})") { $g = $Matches[1] }
        if ($g) {
            & powercfg -changename $g "작품 서버(고성능)" 2>&1 | Out-Null
            & powercfg -setactive $g
            Log "  전원 관리 옵션: 고성능 복제본 $g 사용"
        } else {
            Log "  ⚠ 고성능 옵션을 만들지 못함 — 현재 옵션에 값만 적용"
            $g = "SCHEME_CURRENT"
        }
        # 잠들기·최대 절전·디스크 끄기 없음
        & powercfg /change standby-timeout-ac 0
        & powercfg /change standby-timeout-dc 0
        & powercfg /change hibernate-timeout-ac 0
        & powercfg /change hibernate-timeout-dc 0
        & powercfg /change disk-timeout-ac 0
        & powercfg /change disk-timeout-dc 0
        # 화면만 꺼짐(백라이트 보호): 전원 연결 10분 · 배터리 5분
        & powercfg /change monitor-timeout-ac 10
        & powercfg /change monitor-timeout-dc 5
        # 덮개 닫기·전원 버튼: 아무 것도 안 함(0)
        & powercfg /setacvalueindex $g SUB_BUTTONS LIDACTION 0
        & powercfg /setdcvalueindex $g SUB_BUTTONS LIDACTION 0
        & powercfg /setacvalueindex $g SUB_BUTTONS PBUTTONACTION 0
        & powercfg /setdcvalueindex $g SUB_BUTTONS PBUTTONACTION 0
        # USB 선택적 절전 끔 · PCIe 링크 절전 끔 · 무선랜 최대 성능 · 프로세서 100% · 냉각 팬 적극적
        & powercfg /setacvalueindex $g 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
        & powercfg /setdcvalueindex $g 2a737441-1930-4402-8d77-b2bebba308a3 48e6b7a6-50f5-4782-a5d4-53bb8f07e226 0
        & powercfg /setacvalueindex $g ee12f906-d277-404b-b6da-e5fa1a576df5 501a4d13-42af-4429-9fd1-a8218c268e20 0
        & powercfg /setdcvalueindex $g ee12f906-d277-404b-b6da-e5fa1a576df5 501a4d13-42af-4429-9fd1-a8218c268e20 0
        & powercfg /setacvalueindex $g 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0
        & powercfg /setdcvalueindex $g 19cbb8fa-5279-450e-9fac-8a3d5fedd0c1 12bbebe6-58d6-4636-95bb-3217ef867c1a 0
        & powercfg /setacvalueindex $g SUB_PROCESSOR PROCTHROTTLEMAX 100
        & powercfg /setdcvalueindex $g SUB_PROCESSOR PROCTHROTTLEMAX 100
        & powercfg /setacvalueindex $g SUB_PROCESSOR SYSCOOLPOL 1
        & powercfg /setactive $g
        # 최대 절전·빠른 시작 끔(전원 문제 뒤 깨끗하게 다시 켜지도록)
        & powercfg /hibernate off
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Session Manager\Power" "HiberbootEnabled" 0
        # 깨울 때 암호 요구·잠금 화면·화면 보호기 끔(자동 로그인과 같이 쓰려고)
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Power\PowerSettings\0e796bdb-100d-47d6-a2d5-f7d2daa51f51" "ACSettingIndex" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Power\PowerSettings\0e796bdb-100d-47d6-a2d5-f7d2daa51f51" "DCSettingIndex" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\Personalization" "NoLockScreen" 1
        Set-Reg "HKCU:\Control Panel\Desktop" "ScreenSaveActive" "0" "String"
    }

    Try-Step "네트워크 어댑터 절전 끄기" {
        $ads = Get-NetAdapter -Physical -ErrorAction SilentlyContinue
        foreach ($a in $ads) {
            try { Disable-NetAdapterPowerManagement -Name $a.Name -ErrorAction Stop; Log ("  절전 끔: " + $a.Name) } catch { Log ("  (건너뜀) " + $a.Name) }
        }
    }

    Try-Step "Windows 업데이트: 일하는 중 자동 재시작 금지 · 전송 최적화 끔" {
        $au = "HKLM:\SOFTWARE\Policies\Microsoft\Windows\WindowsUpdate\AU"
        Set-Reg $au "NoAutoRebootWithLoggedOnUsers" 1
        Set-Reg "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" "ActiveHoursStart" 7
        Set-Reg "HKLM:\SOFTWARE\Microsoft\WindowsUpdate\UX\Settings" "ActiveHoursEnd" 1
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DeliveryOptimization" "DODownloadMode" 0
    }

    Try-Step "불필요한 기능 끄기(위젯·게임 바·광고·추천·텔레메트리 최소)" {
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Dsh" "AllowNewsAndInterests" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\GameDVR" "AllowGameDVR" 0
        Set-Reg "HKCU:\System\GameConfigStore" "GameDVR_Enabled" 0
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" "DisableWindowsConsumerFeatures" 1
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\CloudContent" "DisableSoftLanding" 1
        Set-Reg "HKLM:\SOFTWARE\Policies\Microsoft\Windows\DataCollection" "AllowTelemetry" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SubscribedContent-338389Enabled" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\ContentDeliveryManager" "SystemPaneSuggestionsEnabled" 0
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Advanced" "ShowTaskViewButton" 0
    }

    Try-Step "화면 효과 줄이기(성능 우선)" {
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\VisualEffects" "VisualFXSetting" 2
        Set-Reg "HKCU:\Software\Microsoft\Windows\CurrentVersion\Themes\Personalize" "EnableTransparency" 0
        Set-Reg "HKCU:\Control Panel\Desktop\WindowMetrics" "MinAnimate" "0" "String"
    }

    Try-Step "Defender: 일꾼 작업 폴더만 검사 제외(처리 속도)" {
        $paths = @($Src, (Join-Path $UserHome ".vocalnote_jam"), (Join-Path $UserHome ".cache"), (Join-Path $env:TEMP "jakpum_yt_*"))
        foreach ($p in $paths) { Add-MpPreference -ExclusionPath $p -ErrorAction SilentlyContinue }
    }

    Try-Step "원격 데스크톱(집 안에서만) 켜기 — Home 에디션이면 건너뜀" {
        $cap = (Get-CimInstance Win32_OperatingSystem).Caption
        if ($cap -match "Home|홈") { Log "  Windows Home 에디션: 원격 데스크톱 서버 기능 없음(건너뜀)"; return }
        Set-Reg "HKLM:\SYSTEM\CurrentControlSet\Control\Terminal Server" "fDenyTSConnections" 0
        Get-NetFirewallRule -Group "@FirewallAPI.dll,-28752" -ErrorAction SilentlyContinue | Enable-NetFirewallRule -ErrorAction SilentlyContinue
    }

    Try-Step "주 1회 점검 재시작(업데이트가 재시작을 기다릴 때만, 일요일 04:30)" {
        $cmd = "if ((Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\WindowsUpdate\Auto Update\RebootRequired') -or (Test-Path 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Component Based Servicing\RebootPending')) { shutdown /r /t 60 /c 'Jakpum weekly maintenance restart' }"
        $act = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ("-NoProfile -ExecutionPolicy Bypass -Command `"" + $cmd + "`"")
        $trg = New-ScheduledTaskTrigger -Weekly -DaysOfWeek Sunday -At "04:30"
        $pri = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
        Register-ScheduledTask -TaskName "Jakpum Weekly Restart" -Action $act -Trigger $trg -Principal $pri -Force | Out-Null
    }

    Try-Step "PowerShell 스크립트 실행 허용" {
        Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine -Force
    }

    # ---------------- 프로그램 설치(winget) ----------------
    Try-Step "winget 확인" {
        Update-EnvPath
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
            Log "  winget이 없어 설치합니다"
            $tmp = Join-Path $env:TEMP "winget_setup"
            New-Item -ItemType Directory -Force -Path $tmp | Out-Null
            $bundle = Join-Path $tmp "winget.msixbundle"
            Invoke-WebRequest -UseBasicParsing -Uri "https://aka.ms/getwinget" -OutFile $bundle
            Add-AppxPackage -Path $bundle -ErrorAction Stop
            Update-EnvPath
        }
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw "winget을 설치하지 못했습니다" }
        & winget source update 2>&1 | Out-Null
    }

    $pkgs = @(
        @{ id = "Microsoft.VCRedist.2015+.x64"; label = "Visual C++ 런타임" },
        @{ id = "Git.Git"; label = "Git" },
        @{ id = "GitHub.cli"; label = "GitHub 명령줄(보조 로그인용)" },
        @{ id = "Python.Python.3.11"; label = "Python 3.11" },
        @{ id = "Gyan.FFmpeg"; label = "FFmpeg" },
        @{ id = "yt-dlp.yt-dlp"; label = "yt-dlp" },
        @{ id = "Google.Chrome"; label = "Chrome" },
        @{ id = "Google.GoogleDrive"; label = "Google 드라이브 데스크톱" },
        @{ id = "Anthropic.Claude"; label = "Claude 데스크톱" },
        @{ id = "Anthropic.ClaudeCode"; label = "Claude Code" }
    )
    foreach ($p in $pkgs) {
        $id = $p.id; $label = $p.label
        Try-Step ("설치: " + $label) {
            if (-not (Install-Pkg $id $label)) { throw ($label + " 설치 실패") }
        }
    }

    # ---------------- Windows 업데이트(그래픽 드라이버 포함) ----------------
    Try-Step "Windows 업데이트·드라이버 설치(시간이 오래 걸릴 수 있어요)" {
        try {
            Install-PackageProvider -Name NuGet -MinimumVersion 2.8.5.201 -Force -ErrorAction Stop | Out-Null
            Set-PSRepository -Name PSGallery -InstallationPolicy Trusted -ErrorAction SilentlyContinue
            if (-not (Get-Module -ListAvailable -Name PSWindowsUpdate)) { Install-Module -Name PSWindowsUpdate -Force -Scope AllUsers -ErrorAction Stop }
            Import-Module PSWindowsUpdate -ErrorAction Stop
            Add-WUServiceManager -MicrosoftUpdate -Confirm:$false -ErrorAction SilentlyContinue | Out-Null
            $job = Start-Job -ScriptBlock {
                Import-Module PSWindowsUpdate
                Install-WindowsUpdate -MicrosoftUpdate -AcceptAll -IgnoreReboot -ErrorAction SilentlyContinue | Out-String
            }
            if (Wait-Job $job -Timeout 5400) { Add-Content -Path $LogFile -Value (Receive-Job $job) -Encoding UTF8 } else { Log "  업데이트가 90분을 넘겨 일단 넘어갑니다(재시작 뒤 Windows가 이어서 합니다)"; Stop-Job $job }
            Remove-Job $job -Force -ErrorAction SilentlyContinue
        } catch {
            Log ("  업데이트 도구 실패: " + $_.Exception.Message + " — Windows 설정 > Windows 업데이트에서 '업데이트 확인'을 눌러 주세요")
            throw
        }
    }

    # ---------------- 재시작 뒤 이어서 실행하도록 등록 ----------------
    Try-Step "재시작 뒤 이어서 하도록 예약" {
        $act = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ("-NoProfile -ExecutionPolicy Bypass -File `"" + $SelfCopy + "`" -Stage B")
        $trg = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
        $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -ExecutionTimeLimit (New-TimeSpan -Hours 6)
        $pri = New-ScheduledTaskPrincipal -UserId ($env:COMPUTERNAME + "\" + $env:USERNAME) -LogonType Interactive -RunLevel Highest
        Register-ScheduledTask -TaskName $ResumeTask -Action $act -Trigger $trg -Settings $set -Principal $pri -Force | Out-Null
    }

    $state = Get-State
    $state.stageA = $true
    Save-State $state
    Log "===== 단계 A 끝. 실패 항목: $($script:Fails.Count)개 ====="
    if ($script:Fails.Count -gt 0) { foreach ($f in $script:Fails) { Log ("  - " + $f) } }
    Write-Host ""
    Write-Host "60초 뒤 자동으로 다시 시작합니다. 다시 켜진 뒤에는 저절로 이어서 설치됩니다(로그인 화면에서 아무것도 안 해도 됩니다)."
    Write-Host "(지금 바로 다시 시작하려면 Enter, 멈추려면 이 창을 닫고 shutdown /a 를 입력)"
    & shutdown /r /t 60 /c "작품 서버 설정: 단계 A 완료. 다시 시작 후 자동으로 이어집니다."
    [void](Read-Host "Enter")
    exit 0
}

# ======================================================================
# 단계 B: 코드·도구·일꾼 등록 → 시험 → 결과 보고  (재시작 뒤 자동으로 실행됨)
# ======================================================================
Log "===== 단계 B 시작 ====="
$state = Get-State
$state.bTries = [int]$state.bTries + 1
Save-State $state
if ($state.bTries -gt 4) {
    Log "단계 B를 4번 시도했습니다. 더 이상 자동 재시도하지 않습니다 — C:\jakpum\setup.log 를 Claude에게 보여 주세요."
    Unregister-ScheduledTask -TaskName $ResumeTask -Confirm:$false -ErrorAction SilentlyContinue
    exit 1
}
Update-EnvPath

# ---- 열쇠 가져오기 ----
$packFound = $false
Try-Step "열쇠 폴더 가져오기(키·구글 열쇠·GitHub 로그인)" {
    $pack = Find-KeyPack
    if (-not $pack) { Log "  열쇠 폴더 없음 — 건너뜀"; return }
    $sec = Join-Path $UserHome "jakpum_secret"
    $voc = Join-Path $UserHome ".vocalnote"
    New-Item -ItemType Directory -Force -Path $sec | Out-Null
    New-Item -ItemType Directory -Force -Path $voc | Out-Null
    foreach ($n in @("keys.env", "client.json")) {
        $f = Join-Path $pack $n
        if (Test-Path $f) { Copy-Item -Force $f (Join-Path $sec $n) }
    }
    $tok = Join-Path $pack "google_token.json"
    if (Test-Path $tok) {
        Copy-Item -Force $tok (Join-Path $voc "google_token.json")
        Copy-Item -Force $tok (Join-Path $sec "google_token.json")
    }
    $cred = Join-Path $pack "github_cred.txt"
    if (Test-Path $cred) {
        $txt = (Get-Content $cred -Raw -Encoding UTF8).Trim()
        if ($txt -match "password=") {
            ("protocol=https`nhost=github.com`n" + $txt + "`n`n") | & git credential approve
            Log "  GitHub 로그인 정보를 Windows 자격 증명에 저장"
        }
    }
    $script:packFound = $true
    Log "  열쇠 가져옴(USB의 원본 폴더는 직접 지워 주세요)"
}

# ---- 코드 받기 ----
Try-Step "코드 받기(jakpum_src)" {
    $git = Get-Command git -ErrorAction SilentlyContinue
    if (-not $git) { throw "git이 없습니다" }
    $env:GIT_TERMINAL_PROMPT = "0"
    if (Test-Path (Join-Path $Src ".git")) {
        & git -C $Src fetch -q origin main
        & git -C $Src checkout -q main
        & git -C $Src merge -q --ff-only origin/main
    } else {
        $code = Run-Quiet "git" @("clone", "-q", $Repo, $Src)
        if ($code -ne 0) {
            $gh = Get-Command gh -ErrorAction SilentlyContinue
            if ($gh) {
                Log "  GitHub 로그인이 필요합니다 — 열리는 창의 안내(코드 입력)를 따라 주세요"
                & gh auth login --hostname github.com --git-protocol https --web
                & gh auth setup-git
                $code = Run-Quiet "git" @("clone", "-q", $Repo, $Src)
            }
        }
        if (-not (Test-Path (Join-Path $Src ".git"))) { throw "코드 저장소를 받지 못했습니다(GitHub 로그인 필요)" }
    }
    Log ("  코드 버전: " + (& git -C $Src rev-parse --short HEAD))
}

# ---- 파이썬 도구 ----
$py = Find-Python
if (-not $py) { Log "✘ 파이썬 3.11을 찾지 못했습니다"; [void]$script:Fails.Add("파이썬 없음") }
else {
    Log "파이썬: $py"
    Try-Step "파이썬 기본 도구 설치" {
        [void](Run-Quiet $py @("-m", "pip", "install", "--upgrade", "pip"))
        $pk = @("pedalboard==0.9.26", "pyloudnorm", "soundfile", "scipy", "numpy", "praat-parselmouth==0.4.7", "mido==1.3.3", "setuptools<81", "pyworld==0.3.4", "yt-dlp", "requests", "tzdata", "pytest")
        $code = Run-Quiet $py (@("-m", "pip", "install", "--quiet") + $pk)
        if ($code -ne 0) { throw "pip 설치 실패(종료 코드 $code)" }
    }
    Try-Step "그래픽 카드(GPU)용 torch 설치 판단" {
        $nv = Get-Command nvidia-smi -ErrorAction SilentlyContinue
        if (-not $nv) {
            foreach ($c in @("C:\Windows\System32\nvidia-smi.exe", "C:\Program Files\NVIDIA Corporation\NVSMI\nvidia-smi.exe")) { if (Test-Path $c) { $nv = $c } }
        }
        $gpuOk = $false
        if ($nv) {
            Log "  NVIDIA 드라이버 확인됨 → GPU용 torch(cu121)"
            $code = Run-Quiet $py @("-m", "pip", "install", "--quiet", "torch==2.5.1", "torchaudio==2.5.1", "--index-url", "https://download.pytorch.org/whl/cu121")
            if ($code -eq 0) {
                $r = (& $py -c "import torch;print(torch.cuda.is_available())" 2>$null)
                if ($r -match "True") { $gpuOk = $true }
            }
        }
        if (-not $gpuOk) {
            Log "  GPU를 쓸 수 없어 CPU용 torch 설치(느리지만 동작)"
            $code = Run-Quiet $py @("-m", "pip", "install", "--quiet", "torch==2.5.1", "torchaudio==2.5.1", "--index-url", "https://download.pytorch.org/whl/cpu")
            if ($code -ne 0) { throw "torch 설치 실패" }
            [void]$script:Manual.Add("그래픽 드라이버(NVIDIA)가 아직 안 잡혀 CPU로만 돕니다 → 안내문의 'GPU 확인' 단계를 보세요")
        }
    }
    Try-Step "음원 분리(demucs)·화자 인식 도구 설치" {
        $code = Run-Quiet $py @("-m", "pip", "install", "--quiet", "demucs==4.0.1")
        if ($code -ne 0) { throw "demucs 설치 실패" }
        [void](Run-Quiet $py @("-m", "pip", "install", "--quiet", "speechbrain==1.0.3", "huggingface_hub<0.26"))
        $req = Join-Path $Src "app\requirements.txt"
        if (Test-Path $req) { [void](Run-Quiet $py @("-m", "pip", "install", "--quiet", "-r", $req)) }
    }
}

# ---- 일꾼 시작 파일 · 자동 시작 등록 ----
Try-Step "일꾼 시작 파일 만들기" {
    $bat = Join-Path $Src "start_worker.bat"
    $lines = @(
        "@echo off",
        "cd /d `"%USERPROFILE%\jakpum_src`"",
        "set PYTHONUTF8=1",
        "rem SYSTEM_FOLDER_ID 등 비밀값은 %USERPROFILE%\jakpum_secret\keys.env 에서 읽습니다(저장소에 올리지 않음)",
        ":loop",
        "python app\tools\local_worker.py",
        "timeout /t 20 /nobreak >nul",
        "goto loop"
    )
    Set-Content -Path $bat -Value $lines -Encoding ASCII
    # 코드 받기가 이 파일 때문에 막히지 않게(저장소에 없는 파일이라 안전하지만 확실히)
}

Try-Step "일꾼·원곡받기 자동 시작(로그인 때 + 5분마다 살아 있는지 확인)" {
    $wd = Join-Path $Base "worker_watchdog.ps1"
    $body = @'
# 일꾼(local_worker.py)과 원곡 받기(home_yt.ps1)가 꺼져 있으면 다시 켠다
$home1 = $env:USERPROFILE
$procs = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue
$w = $procs | Where-Object { $_.Name -like "python*" -and $_.CommandLine -match "local_worker\.py" }
if (-not $w) {
    $bat = Join-Path $home1 "jakpum_src\start_worker.bat"
    if (Test-Path $bat) { Start-Process -FilePath $bat -WindowStyle Minimized }
}
$y = $procs | Where-Object { $_.Name -like "powershell*" -and $_.CommandLine -match "home_yt\.ps1" }
if (-not $y) {
    $ps = Join-Path $home1 "jakpum_src\tools\home_yt\home_yt.ps1"
    if (Test-Path $ps) {
        Start-Process -FilePath "powershell.exe" -WindowStyle Hidden -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-WindowStyle", "Hidden", "-File", ('"' + $ps + '"'))
    }
}
'@
    Set-Content -Path $wd -Value $body -Encoding UTF8
    $act = New-ScheduledTaskAction -Execute "powershell.exe" -Argument ("-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"" + $wd + "`"")
    $t1 = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
    $t2 = New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(2) -RepetitionInterval (New-TimeSpan -Minutes 5) -RepetitionDuration (New-TimeSpan -Days 3650)
    $set = New-ScheduledTaskSettingsSet -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable -ExecutionTimeLimit (New-TimeSpan -Minutes 10) -MultipleInstances IgnoreNew
    $pri = New-ScheduledTaskPrincipal -UserId ($env:COMPUTERNAME + "\" + $env:USERNAME) -LogonType Interactive -RunLevel Limited
    Register-ScheduledTask -TaskName "Jakpum Worker Watchdog" -Action $act -Trigger @($t1, $t2) -Settings $set -Principal $pri -Force | Out-Null
    Start-ScheduledTask -TaskName "Jakpum Worker Watchdog" -ErrorAction SilentlyContinue
}

Try-Step "상태 확인용 바탕화면 바로가기" {
    $chk = Join-Path $Base "check_server.ps1"
    $body = @'
Write-Host "== 작품 서버 상태 =="
$py = (Get-Command python -ErrorAction SilentlyContinue)
Write-Host ("파이썬: " + $(if ($py) { (& python --version) } else { "없음" }))
Write-Host ("FFmpeg: " + $(if (Get-Command ffmpeg -ErrorAction SilentlyContinue) { "있음" } else { "없음" }))
Write-Host ("GPU: " + $(if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) { (& nvidia-smi --query-gpu=name,driver_version --format=csv,noheader) } else { "NVIDIA 드라이버 없음" }))
$procs = Get-CimInstance Win32_Process
Write-Host ("일꾼: " + $(if ($procs | Where-Object { $_.CommandLine -match "local_worker\.py" }) { "돌아가는 중" } else { "꺼짐" }))
Write-Host ("원곡 받기: " + $(if ($procs | Where-Object { $_.CommandLine -match "home_yt\.ps1" }) { "돌아가는 중" } else { "꺼짐" }))
Write-Host ("열쇠(키 파일): " + $(if (Test-Path "$env:USERPROFILE\jakpum_secret\keys.env") { "있음" } else { "없음" }))
Write-Host ("구글 열쇠: " + $(if (Test-Path "$env:USERPROFILE\.vocalnote\google_token.json") { "있음" } else { "없음" }))
Write-Host ""
Write-Host "이 창의 사진을 Claude에게 보내면 됩니다."
Read-Host "Enter로 닫기"
'@
    Set-Content -Path $chk -Value $body -Encoding UTF8
    $desk = [Environment]::GetFolderPath("Desktop")
    $lnk = Join-Path $desk "서버상태확인.lnk"
    $s = (New-Object -ComObject WScript.Shell).CreateShortcut($lnk)
    $s.TargetPath = "powershell.exe"
    $s.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"" + $chk + "`""
    $s.Save()
}

# ---- 시험(이 노트북이 일꾼 노릇을 할 수 있는지) ----
$testSummary = "시험을 돌리지 못함"
if ($py -and (Test-Path (Join-Path $Src "app\tests"))) {
    Try-Step "서버 시험 실행(수 분 걸립니다)" {
        Push-Location (Join-Path $Src "app")
        $out = & $py -m pytest tests -q -p no:cacheprovider 2>&1 | Out-String
        Pop-Location
        Add-Content -Path $LogFile -Value $out -Encoding UTF8
        $last = ($out -split "`n" | Where-Object { $_ -match "passed|failed" } | Select-Object -Last 1)
        $script:testSummary = "$last".Trim()
        Log ("  시험 결과: " + $script:testSummary)
    }
}

# ---- 앱 열어 두기(로그인용) ----
Try-Step "Google 드라이브·Claude 앱 열기(로그인 화면)" {
    $gd = Get-ChildItem "C:\Program Files\Google\Drive File Stream" -Filter "GoogleDriveFS.exe" -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($gd) { Start-Process -FilePath $gd.FullName }
    $cl = Get-AppxPackage -Name "*Claude*" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($cl) { Start-Process "shell:AppsFolder\$($cl.PackageFamilyName)!App" -ErrorAction SilentlyContinue }
}

# ---- 마무리 ----
$hasKeys = Test-Path (Join-Path $UserHome "jakpum_secret\keys.env")
$hasTok = Test-Path (Join-Path $UserHome ".vocalnote\google_token.json")
if (-not $hasKeys -or -not $hasTok) { [void]$script:Manual.Add("열쇠 폴더(키·구글 열쇠)가 없어 일꾼이 아직 일을 못 합니다 → 안내문의 '열쇠 넣기' 단계") }
[void]$script:Manual.Add("Google 드라이브 앱에 로그인(작품 앱 구글 계정)")
[void]$script:Manual.Add("Claude 앱에 로그인 → 이 컴퓨터 연결 허용")
[void]$script:Manual.Add("Chrome에 로그인하고 'Claude in Chrome' 확장 프로그램 추가")

$state = Get-State
if ($script:Fails.Count -eq 0 -and $hasKeys -and $hasTok) {
    Unregister-ScheduledTask -TaskName $ResumeTask -Confirm:$false -ErrorAction SilentlyContinue
    Log "재시작 뒤 이어서 하기 예약을 지웠습니다(설정 끝)"
} else {
    Log "일부 항목이 남아 다음 로그인 때 단계 B를 한 번 더 시도합니다(최대 4번)"
}

$rep = Join-Path $Base "설정결과.txt"
$lines = New-Object System.Collections.ArrayList
[void]$lines.Add("작품 서버 설정 결과 — " + (Get-Date -Format "yyyy-MM-dd HH:mm"))
[void]$lines.Add("코드 버전: " + $(if (Test-Path (Join-Path $Src ".git")) { (& git -C $Src rev-parse --short HEAD) } else { "없음" }))
[void]$lines.Add("시험: " + $testSummary)
[void]$lines.Add("실패한 자동 단계: " + $(if ($script:Fails.Count -eq 0) { "없음" } else { ($script:Fails -join " / ") }))
[void]$lines.Add("")
[void]$lines.Add("직접 해야 하는 것:")
foreach ($m in $script:Manual) { [void]$lines.Add(" - " + $m) }
Set-Content -Path $rep -Value $lines -Encoding UTF8
Log "===== 단계 B 끝 ====="
Write-Host ""
Get-Content $rep -Encoding UTF8 | ForEach-Object { Write-Host $_ }
Write-Host ""
Write-Host "이 창의 사진을 Claude에게 보내 주세요. (자세한 기록: C:\jakpum\setup.log)"
[void](Read-Host "Enter로 닫기")
