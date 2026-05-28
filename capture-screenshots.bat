@echo off
REM Script to capture screenshots and save to docs folder

cd /d "%~dp0"

echo Installing Playwright browsers if needed...
npx playwright install chromium

echo.
echo Starting screenshot capture...
npx node capture-screenshots.js

pause
