@echo off
REM Pharmacy Backend Setup Script for Windows

echo.
echo 🚀 Pharmacy Backend Setup
echo =========================

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ❌ Node.js is not installed. Please install Node.js 14 or later.
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo ✅ Node.js version: %NODE_VERSION%

REM Create .env file if it doesn't exist
if not exist .env (
    echo 📝 Creating .env file...
    copy .env.example .env > nul
    echo ✅ .env file created (update with your database credentials)
) else (
    echo ℹ️  .env file already exists
)

REM Install dependencies
echo.
echo 📦 Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo ❌ Failed to install dependencies
    exit /b 1
)

echo ✅ Dependencies installed

echo.
echo ✨ Setup complete!
echo.
echo Next steps:
echo 1. Update .env file with your PostgreSQL credentials
echo 2. Create database using pgAdmin or psql:
echo    CREATE DATABASE pharmacy_db;
echo 3. Run schema using pgAdmin query tool
echo 4. Start server: npm run dev
echo.
pause
