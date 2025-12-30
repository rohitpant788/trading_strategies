@echo off
echo ==========================================
echo      Git Sync & Push Automation
echo ==========================================

echo [1/4] Pulling latest changes...
git pull origin main --no-edit
if %errorlevel% neq 0 (
    echo Error: Pull failed. You might have merge conflicts.
    pause
    exit /b
)

echo [2/4] Staging changes...
git add .

set "commitMsg=Auto-sync: Merging local changes to remote main [%date% %time%]"

echo [3/4] Committing with default message...
git commit -m "%commitMsg%"

echo [4/4] Pushing to main...
git push origin main

echo ==========================================
echo             Success!
echo      Closing in 5 seconds...
echo ==========================================
timeout /t 5
