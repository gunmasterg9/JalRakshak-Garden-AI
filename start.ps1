# JalRakshak Garden AI — One-Click Windows PowerShell Startup Script
Write-Host "==================================================" -ForegroundColor Green
Write-Host "🌱 Starting JalRakshak Garden AI (Touch Grass MVP)" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green

$RootPath = Split-Path -Parent $MyInvocation.MyCommand.Path

# 1. Check Ollama local AI status
Write-Host "`n[1/3] Checking Ollama local AI status..." -ForegroundColor Cyan
try {
    $res = Invoke-RestMethod -Uri "http://127.0.0.1:11434/api/tags" -Method Get -TimeoutSec 2 -ErrorAction Stop
    Write-Host "  ✔ Ollama is running locally!" -ForegroundColor Green
    $models = $res.models | ForEach-Object { $_.name }
    Write-Host "  Available models: $($models -join ', ')" -ForegroundColor DarkGray
} catch {
    Write-Host "  ⚠ Ollama is not detected at http://127.0.0.1:11434." -ForegroundColor Yellow
    Write-Host "    JalRakshak will seamlessly use its deterministic offline rules engine." -ForegroundColor Yellow
    Write-Host "    (To enable local AI: install Ollama and run 'ollama pull gemma4:12b' or 'ollama pull gemma3:4b')" -ForegroundColor DarkGray
}

# 2. Start Backend FastAPI server in background
Write-Host "`n[2/3] Launching FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Cyan
$BackendPath = Join-Path $RootPath "backend"
$BackendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$BackendPath'; uvicorn main:app --reload --host 127.0.0.1 --port 8000" -PassThru

# 3. Start Frontend Vite server
Write-Host "`n[3/3] Launching React Vite Frontend on http://127.0.0.1:5173..." -ForegroundColor Cyan
$FrontendPath = Join-Path $RootPath "frontend"
$FrontendProcess = Start-Process -FilePath "powershell.exe" -ArgumentList "-NoExit", "-Command", "cd '$FrontendPath'; npm run dev" -PassThru

Start-Sleep -Seconds 3
Write-Host "`n🚀 Opening Web Application..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"

Write-Host "`nJalRakshak is running! Close the opened terminal windows to stop the servers." -ForegroundColor Green
