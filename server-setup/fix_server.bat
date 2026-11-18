@echo off
chcp 65001 >nul
title 작품 보컬노트 서버 보정(2단계만 다시)
echo 최신 설치 파일을 받아 2단계(도구·일꾼·시험)만 다시 실행합니다.
net session >nul 2>&1
if errorlevel 1 (
  powershell.exe -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
  exit /b
)
if not exist "C:\jakpum" mkdir "C:\jakpum"
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://moonlake-star.github.io/jakpum-phone-test/server-setup/setup_server.ps1' -OutFile 'C:\jakpum\setup_server.ps1'"
if not exist "C:\jakpum\setup_server.ps1" (
  echo 받지 못했습니다. 인터넷을 확인해 주세요.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "C:\jakpum\setup_server.ps1" -Stage B
