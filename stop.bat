@echo off
echo ==========================================
echo      Stopping ETF Shop 3.0 Server
echo ==========================================

echo Looking for process on Port 3000...

:: Find PID listening on port 3000 and kill it
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo Found process ID: %%a
    taskkill /f /pid %%a
    echo Server Stopped.
    pause
    exit /b
)

echo No server found running on port 3000.
pause
