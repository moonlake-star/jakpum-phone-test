@echo off
chcp 65001 >nul
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://moonlake-star.github.io/jakpum-phone-test/server-setup/move_downloads.ps1' -OutFile '%TEMP%\move_downloads.ps1'; & '%TEMP%\move_downloads.ps1'"
pause
