@echo off
chcp 65001 >nul
title 작품 보컬노트 서버 자동 설정
echo 작품 보컬노트 서버 자동 설정을 시작합니다. 창을 닫지 마세요.
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup_server.ps1" -Stage A
pause
