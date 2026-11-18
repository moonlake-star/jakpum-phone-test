# 옛 노트북에서 실행: 새 노트북에 옮길 '열쇠 폴더(jakpum_keys_pack)'를 만든다. 이 폴더는 비밀이므로 USB로만 옮기고, 끝나면 지운다.
$ErrorActionPreference = "Continue"
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch { }
$h = $env:USERPROFILE
$out = Join-Path (Split-Path -Parent $PSCommandPath) "jakpum_keys_pack"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function Find-First([string[]]$names, [string[]]$roots) {
    foreach ($r in $roots) {
        if (-not (Test-Path $r)) { continue }
        foreach ($n in $names) {
            $f = Get-ChildItem -Path $r -Filter $n -Recurse -File -Depth 4 -ErrorAction SilentlyContinue | Select-Object -First 1
            if ($f) { return $f.FullName }
        }
    }
    return $null
}
$roots = @((Join-Path $h "jakpum_secret"), (Join-Path $h ".vocalnote"), (Join-Path $h "jakpum_src"), $h, "D:\", "C:\jakpum_secret")
$found = @{}
foreach ($n in @("keys.env", "client.json", "google_token.json")) {
    $p = Find-First @($n) $roots
    if ($p) { Copy-Item -Force $p (Join-Path $out $n); $found[$n] = $p; Write-Host ("찾음: " + $n + "  <- " + $p) }
    else { Write-Host ("못 찾음: " + $n) }
}
# GitHub 로그인(비공개 코드 저장소용): 사용자 이름과 암호(토큰)만 저장
try {
    $inp = "protocol=https`nhost=github.com`n`n"
    $res = $inp | & git credential fill 2>$null
    $keep = $res | Where-Object { $_ -match "^(username|password)=" }
    if ($keep) { ($keep -join "`n") | Set-Content -Path (Join-Path $out "github_cred.txt") -Encoding UTF8; Write-Host "찾음: GitHub 로그인" }
    else { Write-Host "못 찾음: GitHub 로그인(새 노트북에서 한 번 로그인하면 됩니다)" }
} catch { Write-Host "GitHub 로그인 정보를 못 읽음(새 노트북에서 한 번 로그인하면 됩니다)" }
Write-Host ""
Write-Host ("만든 폴더: " + $out)
Write-Host "이 폴더 전체를 USB에 복사해 새 노트북으로 옮기세요. 새 노트북 설정이 끝나면 USB의 폴더는 지우세요."
Start-Process explorer.exe $out
