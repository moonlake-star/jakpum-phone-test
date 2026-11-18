@echo off
chcp 65001 >nul
title 작품 보컬노트 열쇠 폴더 만들기(옛 노트북)
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0export_keys.ps1"
pause
