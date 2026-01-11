@echo off
echo Installing trading visualization dependencies...
call npm install lightweight-charts date-fns papaparse recharts
call npm install -D @types/papaparse
echo.
echo Dependencies installed successfully!
pause
