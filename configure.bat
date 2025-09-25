@echo off
echo 🎯 CXS AI Chat Request Configuration
echo.

:menu
echo Select AI mode for your demo:
echo 1. Mock AI (Safe for testing, no API costs)
echo 2. Real Azure OpenAI (Requires your API keys)
echo 3. Show current configuration
echo 4. Exit
echo.
set /p choice="Enter your choice (1-4): "

if "%choice%"=="1" goto mock
if "%choice%"=="2" goto real
if "%choice%"=="3" goto show
if "%choice%"=="4" goto exit
echo Invalid choice. Please try again.
echo.
goto menu

:mock
echo.
echo 🎭 Switching to Mock AI mode...
echo USE_REAL_AI=false > .env
echo FALLBACK_TO_MOCK=true >> .env
echo PORT=3001 >> .env
echo.
echo ✅ Configuration updated to Mock AI mode
echo    - No API keys required
echo    - Consistent demo responses
echo    - No API costs
echo.
pause
goto menu

:real
echo.
echo ✨ Switching to Real Azure OpenAI mode...
echo.
echo Please enter your Azure OpenAI configuration:
set /p endpoint="Azure OpenAI Endpoint (https://your-resource.openai.azure.com): "
set /p apikey="API Key: "
set /p deployment="Deployment Name: "

echo USE_REAL_AI=true > .env
echo AZURE_OPENAI_ENDPOINT=%endpoint% >> .env
echo AZURE_OPENAI_API_KEY=%apikey% >> .env
echo AZURE_OPENAI_DEPLOYMENT_NAME=%deployment% >> .env
echo AZURE_OPENAI_API_VERSION=2024-02-01 >> .env
echo FALLBACK_TO_MOCK=true >> .env
echo PORT=3001 >> .env
echo.
echo ✅ Configuration updated to Real Azure OpenAI mode
echo    - Real AI responses for your demo
echo    - Fallback to mock if API fails
echo.
pause
goto menu

:show
echo.
echo 📊 Current Configuration:
echo.
if exist .env (
    type .env
) else (
    echo No configuration file found (.env)
)
echo.
pause
goto menu

:exit
echo.
echo 👋 Configuration complete!
echo.
echo To start your server:
echo   npm run start-api
echo.
pause