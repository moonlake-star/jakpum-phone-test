@echo off
chcp 65001 >nul
title 서버 모니터 설치
net session >nul 2>&1
if errorlevel 1 (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://moonlake-star.github.io/jakpum-phone-test/server-setup/omen_monitor_setup.ps1' -OutFile '%TEMP%\omen_monitor_setup.ps1'; & '%TEMP%\omen_monitor_setup.ps1'"
pause
