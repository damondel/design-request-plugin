@echo off
echo ========================================
echo   AI Design Assistant - Quick Setup
echo ========================================
echo.

echo Installing plugin dependencies...
call npm install
if %errorlevel% neq 0 (
    echo Error: Plugin dependency installation failed
    pause
    exit /b 1
)

echo.
echo Installing API server dependencies...
cd api
call npm install
if %errorlevel% neq 0 (
    echo Error: API server dependency installation failed
    pause
    exit /b 1
)
cd ..

echo.
echo Building plugin...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Plugin build failed
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete! 
echo ========================================
echo.
echo Next steps:
echo 1. Run: npm run start-api (in a new terminal)
echo 2. Open Figma Desktop App
echo 3. Go to Plugins ^> Development ^> Import plugin from manifest
echo 4. Select manifest.json from this directory
echo.
echo API Server will run on: http://localhost:3001
echo Use API key for testing: test-api-key-12345
echo.
pause