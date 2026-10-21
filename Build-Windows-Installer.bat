@echo off
cd /d "%~dp0"
call npm install
call npm run dist
echo.
echo Done. In the "dist" folder you now have:
echo   Pocket-Note-...-setup .exe  (installer)
echo   Pocket-Note-...  .msi       (MSI installer, e.g. for IT deployment)
echo   Pocket-Note-...  .exe       (portable, no install)
pause
