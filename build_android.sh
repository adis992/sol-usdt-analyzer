#!/usr/bin/env bash
# ============================================
#  SOL/USDT Analyzer - BUILD ANDROID APK
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "============================================"
echo "  SOL/USDT Analyzer - BUILD ANDROID APK"
echo "============================================"
echo ""

# ── Prerequisites check ──────────────────────────────────────────────────────

command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js nije instaliran!"; exit 1; }
echo "[OK] Node.js: $(node --version)"

# Check for Java (needed for Android build)
if ! command -v java >/dev/null 2>&1; then
  echo "[WARN] Java nije pronađena. Android build zahtijeva JDK 17+."
  echo "       Preuzmi sa: https://adoptium.net/"
  echo "       Nastavljam svejedno (Gradle možda neće raditi)..."
fi

# Check for Android SDK
if [ -z "$ANDROID_HOME" ] && [ -z "$ANDROID_SDK_ROOT" ]; then
  # Try common locations
  if [ -d "$HOME/AppData/Local/Android/Sdk" ]; then
    export ANDROID_HOME="$HOME/AppData/Local/Android/Sdk"
  elif [ -d "/usr/local/lib/android/sdk" ]; then
    export ANDROID_HOME="/usr/local/lib/android/sdk"
  else
    echo "[WARN] Android SDK nije pronađen (ANDROID_HOME nije postavljen)."
    echo "       Instaliraj Android Studio: https://developer.android.com/studio"
    echo "       Ili postavi ANDROID_HOME environment varijablu."
  fi
fi

if [ -n "$ANDROID_HOME" ]; then
  echo "[OK] Android SDK: $ANDROID_HOME"
fi

# ── Install npm dependencies ──────────────────────────────────────────────────

if [ ! -d "node_modules" ]; then
  echo ""
  echo "[1/5] Installing npm dependencies..."
  npm install
fi

# ── Build React app ───────────────────────────────────────────────────────────

echo ""
echo "[2/5] Building React web app..."
npm run build
echo "[OK] Vite build done."

# ── Initialize Capacitor Android ─────────────────────────────────────────────

echo ""
echo "[3/5] Setting up Capacitor Android..."

if [ ! -d "android" ]; then
  echo "[INFO] Adding Capacitor Android platform..."
  npx cap add android
fi

# Sync web assets to Android
npx cap sync android
echo "[OK] Capacitor sync done."

# ── Build APK with Gradle ─────────────────────────────────────────────────────

echo ""
echo "[4/5] Building APK with Gradle..."

cd android

# Make gradlew executable
chmod +x gradlew 2>/dev/null || true

# Build debug APK (for testing) — change to assembleRelease for production
./gradlew assembleDebug --stacktrace 2>&1

APK_PATH="app/build/outputs/apk/debug/app-debug.apk"
cd ..

# ── Copy to output ────────────────────────────────────────────────────────────

echo ""
echo "[5/5] Copying APK to output folder..."
mkdir -p output_app/android

if [ -f "android/$APK_PATH" ]; then
  cp "android/$APK_PATH" "output_app/android/SOL-USDT-Analyzer-debug.apk"
  echo ""
  echo "============================================"
  echo "  APK Build USPJEŠAN!"
  echo "  Output: output_app/android/SOL-USDT-Analyzer-debug.apk"
  echo "============================================"
  echo ""
  echo "Za instalaciju na uređaj:"
  echo "  adb install output_app/android/SOL-USDT-Analyzer-debug.apk"
  echo ""
  echo "Za RELEASE build:"
  echo "  Promijeni 'assembleDebug' u 'assembleRelease' i dodaj keystore."
else
  echo "[WARN] APK nije pronađen na očekivanoj lokaciji."
  echo "       Provjeri android/app/build/outputs/apk/ folder."
  find android/app/build/outputs/apk/ -name "*.apk" 2>/dev/null | head -5 || true
fi
