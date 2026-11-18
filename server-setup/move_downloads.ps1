# 다운로드 폴더를 D:\Downloads 로 옮긴다(기존 파일도 같이 이동). 여러 번 실행해도 안전.
$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$dest = "D:\Downloads"
if (-not (Test-Path "D:\")) { Write-Host "D: 드라이브가 없습니다. (새 드라이브가 보이지 않으면 이 창 사진을 Claude에게 보내 주세요)"; Get-PSDrive -PSProvider FileSystem | Format-Table Name, Used, Free; exit 1 }
$old = (New-Object -ComObject Shell.Application).NameSpace("shell:Downloads").Self.Path
if (-not $old) { $old = Join-Path $env:USERPROFILE "Downloads" }
Write-Host "현재 다운로드 폴더: $old"
if ($old -ieq $dest) { Write-Host "이미 D:\Downloads 입니다."; exit 0 }
New-Item -ItemType Directory -Force -Path $dest | Out-Null
$guid = "{374DE290-123F-4565-9164-39C4925E467B}"
$k1 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\User Shell Folders"
$k2 = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Explorer\Shell Folders"
New-ItemProperty -Path $k1 -Name $guid -Value $dest -PropertyType ExpandString -Force | Out-Null
New-ItemProperty -Path $k2 -Name $guid -Value $dest -PropertyType String -Force | Out-Null
# 기존 파일 이동(충돌 없이)
if (Test-Path $old) {
    & robocopy $old $dest /E /MOVE /R:1 /W:1 /NFL /NDL /NJH /NJS | Out-Null
}
# 탐색기를 다시 시작해 반영
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process explorer.exe
Write-Host ""
Write-Host "완료: 다운로드 폴더가 $dest 로 바뀌었습니다. (Chrome 등 앱은 다시 시작하면 새 위치를 씁니다)"
