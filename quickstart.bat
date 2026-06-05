@echo off
REM ============================================================================
REM Grito Labs: Quick Start Script (Windows)
REM One-command setup for complete development environment
REM ============================================================================

setlocal enabledelayedexpansion
cls

echo.
echo Grito Labs Marketing Analytics - Quick Start (Windows)
echo ============================================================================
echo.

REM ─── Check Prerequisites ──────────────────────────────────────────────────
echo Checking prerequisites...

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Python not found. Please install Python 3.9+
    pause
    exit /b 1
)

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found. Please install Node.js 18+
    pause
    exit /b 1
)

echo.
echo. ✓ Python: 
python --version
echo. ✓ Node.js: 
node --version
echo. ✓ npm: 
npm --version

REM ─── Setup Backend ────────────────────────────────────────────────────────
echo.
echo Setting up backend...

if not exist "venv" (
    python -m venv venv
    echo.  ✓ Virtual environment created
)

call venv\Scripts\activate.bat
echo.  ✓ Virtual environment activated

pip install -q -r backend\requirements.txt
echo.  ✓ Dependencies installed

python backend\seed_data.py
echo.  ✓ Mock data generated (mock_data.json, seed_data.sql)

REM ─── Setup Frontend ───────────────────────────────────────────────────────
echo.
echo Setting up frontend...

cd frontend
call npm install --quiet
echo.  ✓ npm dependencies installed
cd ..

REM ─── Display Next Steps ───────────────────────────────────────────────────
echo.
echo ============================================================================
echo. ✅ Setup complete! Run the following in separate command prompts:
echo.
echo.    Command Prompt 1 (Backend API):
echo.    python backend\main.py
echo.    📡 Available at: http://localhost:8000
echo.    📖 Docs at: http://localhost:8000/docs
echo.
echo.    Command Prompt 2 (Frontend):
echo.    cd frontend ^&^& npm run dev
echo.    🎨 Available at: http://localhost:5173
echo.
echo.    Command Prompt 3 (PostgreSQL Setup - Optional):
echo.    psql -U postgres -d grito_labs < backend\seed_data.sql
echo.
echo ============================================================================
echo.
echo. 📚 Documentation: See README.md for complete setup guide
echo. 🆘 Troubleshooting: See README.md#troubleshooting section
echo.

pause
