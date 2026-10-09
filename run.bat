@echo off
setlocal
title JalRakshak Garden AI Launcher

echo ==================================================
echo   Starting JalRakshak Garden AI (Touch Grass MVP)
echo ==================================================
echo.

cd /d "%~dp0"

REM 1. Check Ollama local AI status (optional)
echo [1/3] Checking Ollama local AI status...
curl -s -m 2 http://127.0.0.1:11434/api/tags >nul 2>&1
if %errorlevel% equ 0 (
    echo   [OK] Ollama is running locally!
) else (
    echo   [INFO] Ollama is not detected at http://127.0.0.1:11434.
    echo          JalRakshak will use its offline rules engine seamlessly.
)
echo.

REM 2. Launch FastAPI Backend
echo [2/3] Launching FastAPI Backend on port 8000 (0.0.0.0 for LAN/ESP8266 access)...
if exist "%~dp0backend\.venv\Scripts\uvicorn.exe" (
    start "JalRakshak Backend" cmd /k "title JalRakshak Backend && cd /d "%~dp0backend" && .venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000"
) else (
    start "JalRakshak Backend" cmd /k "title JalRakshak Backend && cd /d "%~dp0backend" && uvicorn main:app --reload --host 0.0.0.0 --port 8000"
)

REM 3. Launch React Frontend
echo [3/3] Launching React Vite Frontend on http://127.0.0.1:5173...
start "JalRakshak Frontend" cmd /k "title JalRakshak Frontend && cd /d "%~dp0frontend" && npm run dev"

echo.
echo Waiting for servers to initialize...
ping 127.0.0.1 -n 4 >nul

echo.
echo Opening JalRakshak Web Application...
start http://127.0.0.1:5173

echo.
echo ==================================================
echo   JalRakshak Garden AI is now running!
echo   Frontend : http://127.0.0.1:5173
echo   Backend  : http://127.0.0.1:8000 (Docs: /docs)
echo.
echo   To stop all services cleanly, run stop.bat
echo ==================================================
echo.
pause
