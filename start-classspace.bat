@echo off
TITLE ClassSpace Academic Platform Launcher
echo ========================================================
echo   CLASSSPACE - CENTRALIZED CLASSROOM MANAGEMENT SYSTEM
echo ========================================================
echo.
echo [1/3] Ensuring database is seeded with sample data...
cd backend
call node db/seed.js
echo.
echo [2/3] Starting Backend API Server and Mock Plagiarism Engine...
start cmd /k "title ClassSpace Backend (Port 5000 & 5001) && npm start"
cd ..
echo.
echo [3/3] Starting Frontend Web Interface (Port 5173)...
cd frontend
start cmd /k "title ClassSpace Frontend (Port 5173) && npm run dev"
cd ..
echo.
echo ClassSpace is starting!
echo Web Application: http://localhost:5173
echo API Server:      http://localhost:5000
echo Plagiarism Hub:  http://localhost:5001
echo.
timeout /t 3 >nul
start http://localhost:5173

