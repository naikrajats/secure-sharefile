@echo off
title SecureBurn Runner
echo ========================================================
echo   Starting SecureBurn - Expiring Link File Vault
echo ========================================================
echo.

echo [1/2] Starting FastAPI Backend on http://localhost:8000 ...
start "SecureBurn Backend (FastAPI)" cmd /k "cd /d %~dp0backend && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

timeout /t 3 /nobreak >nul

echo [2/2] Starting React Vite Frontend on http://localhost:5173 ...
start "SecureBurn Frontend (React)" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 2 /nobreak >nul

echo.
echo ========================================================
echo   System launched successfully!
echo   - Web App UI:       http://localhost:5173
echo ========================================================
echo.
pause
