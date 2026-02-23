@echo off
echo ============================================
echo  SOL/USDT Analyzer - BUILD WINDOWS EXE
echo ============================================
echo.

cd /d "%~dp0"

:: Check Node.js
where node >nul 2>&1 || (echo [ERROR] Node.js nije instaliran! && pause && exit /b 1)
echo [OK] Node.js: & node --version

:: Install dependencies if needed
if not exist "node_modules" (
    echo [INFO] Instaliranje dependencies...
    call npm install
    if errorlevel 1 (echo [ERROR] npm install failed && pause && exit /b 1)
)

:: Build React app
echo.
echo [1/3] Building React app...
set ELECTRON=true
call npm run build
if errorlevel 1 (echo [ERROR] Vite build failed && pause && exit /b 1)
echo [OK] React build done.

:: Package with electron-builder
echo.
echo [2/3] Packaging with Electron Builder...
call npx electron-builder --win --x64 --config.directories.output=output_app/windows
if errorlevel 1 (
    echo [WARN] electron-builder failed, trying alternative...
    call node_modules\.bin\electron-builder --win --x64 --config.directories.output=output_app/windows
)

:: Create output info
echo.
echo [3/3] Build complete!
echo.
echo ============================================
echo  Output: output_app\windows\
echo ============================================
dir /b "output_app\windows\" 2>nul || echo (folder prazna - provjeri greske iznad)
echo.
pause
