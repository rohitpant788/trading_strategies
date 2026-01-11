@echo off
echo Installing UUID package...
call npm install uuid
call npm install -D @types/uuid
echo.
echo UUID installed successfully!
pause
