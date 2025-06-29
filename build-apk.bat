@echo off
echo.
echo ===================================
echo 🔨 BillingTick Android APK Builder
echo ===================================
echo.

echo 📦 Installing dependencies...
call npm install
if errorlevel 1 (
    echo ❌ NPM install failed!
    pause
    exit /b 1
)

echo.
echo 🧹 Cleaning previous builds...
cd android
call gradlew clean
if errorlevel 1 (
    echo ❌ Gradle clean failed!
    pause
    exit /b 1
)

echo.
echo 🔨 Building debug APK...
call gradlew assembleDebug
if errorlevel 1 (
    echo ❌ Gradle build failed!
    pause
    exit /b 1
)

echo.
echo ===================================
echo ✅ APK BUILD SUCCESSFUL!
echo ===================================
echo.
echo 📱 APK Location:
echo %CD%\app\build\outputs\apk\debug\app-debug.apk
echo.
echo 🚀 Ready to install on Android device!
echo.
pause 