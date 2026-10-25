Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  CLASSSPACE - CENTRALIZED CLASSROOM MANAGEMENT SYSTEM" -ForegroundColor Yellow
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "[1/3] Ensuring database is seeded with sample data..." -ForegroundColor Green
Set-Location "$PSScriptRoot\backend"
node db/seed.js
Set-Location "$PSScriptRoot"

Write-Host "`n[2/3] Starting Backend API Server (Port 5000) & Mock Plagiarism Service (Port 5001)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; Write-Host 'ClassSpace Backend Running...' -ForegroundColor Cyan; npm start"

Write-Host "`n[3/3] Starting Frontend Dev Server (Port 5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\frontend'; Write-Host 'ClassSpace Frontend Running...' -ForegroundColor Cyan; npm run dev"

Write-Host "`nClassSpace is launching!" -ForegroundColor Magenta
Write-Host "  Web Application: http://localhost:5173" -ForegroundColor White
Write-Host "  API Server:      http://localhost:5000" -ForegroundColor White
Write-Host "  Plagiarism Hub:  http://localhost:5001" -ForegroundColor White

Start-Sleep -Seconds 3
Start-Process "http://localhost:5173"

