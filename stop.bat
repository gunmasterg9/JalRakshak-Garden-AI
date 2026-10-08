@echo off
setlocal
title Stop JalRakshak Garden AI

echo ==================================================
echo   Stopping JalRakshak Garden AI Services...
echo ==================================================
echo.

echo [1/2] Closing JalRakshak terminal windows...
taskkill /FI "WINDOWTITLE eq JalRakshak Backend*" /F /T >nul 2>&1
taskkill /FI "WINDOWTITLE eq JalRakshak Frontend*" /F /T >nul 2>&1

echo [2/2] Freeing ports 8000 (Backend) and 5173 (Frontend)...

REM Kill any process listening on port 8000 (FastAPI Backend)
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":8000" ^| findstr "LISTENING"') do (
    echo   Stopping Backend on port 8000 [PID: %%p]...
    taskkill /F /PID %%p >nul 2>&1
)

REM Kill any process listening on port 5173 (Vite Frontend)
for /f "tokens=5" %%p in ('netstat -ano -p tcp ^| findstr ":5173" ^| findstr "LISTENING"') do (
    echo   Stopping Frontend on port 5173 [PID: %%p]...
    taskkill /F /PID %%p >nul 2>&1
)

echo.
echo ==================================================
echo   All JalRakshak services stopped successfully!
echo ==================================================
echo.
ping 127.0.0.1 -n 2 >nul
exit /b 0
