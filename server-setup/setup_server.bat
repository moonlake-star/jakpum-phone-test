@echo off
chcp 65001 >nul
title 작품 보컬노트 서버 자동 설정
echo 작품 보컬노트 서버 자동 설정을 시작합니다. 창을 닫지 마세요.
rem ps1 파일이 옆에 없으면(브라우저가 이름을 바꾸거나 막은 경우) 스스로 내려받는다
if not exist "%~dp0setup_server.ps1" (
  echo setup_server.ps1 이 없어 인터넷에서 받습니다...
  powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol=[Net.SecurityProtocolType]::Tls12; Invoke-WebRequest -UseBasicParsing -Uri 'https://moonlake-star.github.io/jakpum-phone-test/server-setup/setup_server.ps1' -OutFile '%~dp0setup_server.ps1'"
)
if not exist "%~dp0setup_server.ps1" (
  echo 받지 못했습니다. 인터넷을 확인하고 다시 실행해 주세요.
  pause
  exit /b 1
)
powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "Unblock-File -LiteralPath '%~dp0setup_server.ps1'" 
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_server.ps1" -Stage A
pause
