@echo off
title ETF Shop 3.0 Server
echo ==========================================
echo      Starting ETF Shop 3.0 Server...
echo ==========================================
cd /d "%~dp0"
echo Running 'npm run dev'...
npm run dev
pause
