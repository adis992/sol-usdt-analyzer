#!/usr/bin/env bash
# ============================================
#  SOL/USDT Analyzer - BUILD ALL PLATFORMS
#  Windows EXE + Android APK + iOS IPA
# ============================================
# Pokretanje:
#   bash build_all.sh               -- sve platforme
#   bash build_all.sh --win         -- samo Windows
#   bash build_all.sh --android     -- samo Android
#   bash build_all.sh --ios         -- samo iOS (samo macOS)
#   bash build_all.sh --win --android -- Win + Android
# ============================================

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── Parse arguments ───────────────────────────────────────────────────────────

BUILD_WIN=false
BUILD_ANDROID=false
BUILD_IOS=false

if [ $# -eq 0 ]; then
  BUILD_WIN=true
  BUILD_ANDROID=true
  BUILD_IOS=true
else
  for arg in "$@"; do
    case "$arg" in
      --win)     BUILD_WIN=true ;;
      --android) BUILD_ANDROID=true ;;
      --ios)     BUILD_IOS=true ;;
      *)
        echo "[WARN] Nepoznati argument: $arg"
        ;;
    esac
  done
fi

# ── Header ────────────────────────────────────────────────────────────────────

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║          SOL/USDT Analyzer — BUILD ALL PLATFORMS            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  Platforme za build:"
$BUILD_WIN     && echo "    ✅ Windows (EXE)"    || echo "    ⬜ Windows (EXE)"
$BUILD_ANDROID && echo "    ✅ Android (APK)"    || echo "    ⬜ Android (APK)"
$BUILD_IOS     && echo "    ✅ iOS (IPA)"        || echo "    ⬜ iOS (IPA)"
echo ""
echo "  Start: $(date)"
echo ""

mkdir -p output_app/windows output_app/android output_app/ios

FAIL_WIN=false
FAIL_ANDROID=false
FAIL_IOS=false

START_ALL=$SECONDS

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: Shared — npm install + React build
# ══════════════════════════════════════════════════════════════════════════════

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  [SHARED] Installing dependencies..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ ! -d "node_modules" ]; then
  npm install
fi
echo "[OK] Dependencies ready."

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  [SHARED] Building React web app..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
npm run build
echo "[OK] React build done."

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: Windows EXE
# ══════════════════════════════════════════════════════════════════════════════

if $BUILD_WIN; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  [WINDOWS] Building EXE with Electron Builder..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  T_WIN=$SECONDS

  if [[ "$(uname -s)" == MINGW* ]] || [[ "$(uname -s)" == CYGWIN* ]] || [[ "$(uname -s)" == MSYS* ]]; then
    # Running in Git Bash / MSYS on Windows
    npx electron-builder --win --x64 \
      --config.directories.output=output_app/windows && \
      echo "[OK] Windows EXE build done." || \
      { echo "[ERROR] Windows build neuspješan!"; FAIL_WIN=true; }
  elif [[ "$(uname -s)" == "Darwin" ]] || [[ "$(uname -s)" == "Linux" ]]; then
    # Cross-compile for Windows
    npx electron-builder --win --x64 \
      --config.directories.output=output_app/windows && \
      echo "[OK] Windows EXE build done." || \
      { echo "[ERROR] Windows build neuspješan!"; FAIL_WIN=true; }
  fi

  echo "  ⏱  Windows build trajao: $((SECONDS - T_WIN))s"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: Android APK
# ══════════════════════════════════════════════════════════════════════════════

if $BUILD_ANDROID; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  [ANDROID] Building APK with Capacitor + Gradle..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  T_ANDROID=$SECONDS

  if [ ! -d "android" ]; then
    npx cap add android
  fi

  npx cap sync android

  cd android
  chmod +x gradlew 2>/dev/null || true
  ./gradlew assembleDebug && ANDROID_OK=true || ANDROID_OK=false
  cd "$SCRIPT_DIR"

  if $ANDROID_OK; then
    APK_FILE=$(find android/app/build/outputs/apk -name "*.apk" 2>/dev/null | head -1)
    if [ -n "$APK_FILE" ]; then
      cp "$APK_FILE" "output_app/android/SOL-USDT-Analyzer.apk"
      echo "[OK] APK kopiran: output_app/android/SOL-USDT-Analyzer.apk"
    fi
    echo "[OK] Android APK build done."
  else
    echo "[ERROR] Android build neuspješan!"
    FAIL_ANDROID=true
  fi

  echo "  ⏱  Android build trajao: $((SECONDS - T_ANDROID))s"
fi

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4: iOS IPA (samo macOS)
# ══════════════════════════════════════════════════════════════════════════════

if $BUILD_IOS; then
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  [iOS] Building IPA..."
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  T_IOS=$SECONDS

  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "[SKIP] iOS build zahtijeva macOS. Pokreni build_ios.sh na Mac-u."
    echo "       Ili koristi GitHub Actions CI/CD (macOS runner)."
    FAIL_IOS=false  # not a failure, just skipped
  else
    bash "$SCRIPT_DIR/build_ios.sh" && echo "[OK] iOS build done." || {
      echo "[ERROR] iOS build neuspješan!"
      FAIL_IOS=true
    }
    echo "  ⏱  iOS build trajao: $((SECONDS - T_IOS))s"
  fi
fi

# ══════════════════════════════════════════════════════════════════════════════
# FINAL SUMMARY
# ══════════════════════════════════════════════════════════════════════════════

TOTAL_TIME=$((SECONDS - START_ALL))

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    BUILD SUMMARY                            ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "  ⏱  Ukupno vrijeme: ${TOTAL_TIME}s"
echo ""
echo "  Rezultati:"
$BUILD_WIN     && ( $FAIL_WIN     && echo "    ❌ Windows — GREŠKA"    || echo "    ✅ Windows EXE" ) || true
$BUILD_ANDROID && ( $FAIL_ANDROID && echo "    ❌ Android — GREŠKA"   || echo "    ✅ Android APK" ) || true
$BUILD_IOS     && ( $FAIL_IOS     && echo "    ❌ iOS — GREŠKA"        || echo "    ✅ iOS IPA / Archive" ) || true
echo ""
echo "  Output folder struktura:"
echo "  📁 output_app/"
echo "    📁 windows/  — Windows installer (.exe) + portable"
echo "    📁 android/  — Android APK"
echo "    📁 ios/      — iOS Archive + IPA"
echo ""

# List output files
echo "  Fajlovi:"
find output_app -name "*.exe" -o -name "*.apk" -o -name "*.ipa" -o -name "*.xcarchive" 2>/dev/null | while read f; do
  SIZE=$(du -sh "$f" 2>/dev/null | cut -f1)
  echo "    📦 $f ($SIZE)"
done

echo ""
if $FAIL_WIN || $FAIL_ANDROID || $FAIL_IOS; then
  echo "  ⚠️  Jedan ili više buildova je neuspješan. Provjeri greške iznad."
  exit 1
else
  echo "  🎉 Svi buildovi uspješno završeni!"
fi
echo ""
