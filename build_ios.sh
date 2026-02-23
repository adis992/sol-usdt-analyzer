#!/usr/bin/env bash
# ============================================
#  SOL/USDT Analyzer - BUILD iOS IPA
# ============================================
# ZAHTJEVI: macOS + Xcode + Apple Developer Account
# Ovaj script MORA biti pokrenut na macOS sistemu!
# Za Windows korisnika: kopiraj projekt na Mac i pokreni ovaj script.
# ============================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo ""
echo "============================================"
echo "  SOL/USDT Analyzer - BUILD iOS IPA"
echo "============================================"
echo ""

# ── Platform check ───────────────────────────────────────────────────────────

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "╔══════════════════════════════════════════════════════════════╗"
  echo "║  UPOZORENJE: iOS build zahtijeva macOS!                     ║"
  echo "║                                                              ║"
  echo "║  Opcije za build:                                            ║"
  echo "║  1. Kopiraj projekat na Mac i pokreni ovaj script           ║"
  echo "║  2. Koristi GitHub Actions + macOS runner (CI/CD)           ║"
  echo "║  3. Koristi Expo EAS Build (cloud build)                    ║"
  echo "║     npm install -g eas-cli && eas build --platform ios      ║"
  echo "╚══════════════════════════════════════════════════════════════╝"
  echo ""
  echo "Script za GitHub Actions CI/CD:"
  echo ""
  cat << 'GITHUB_ACTIONS'
# .github/workflows/ios-build.yml
name: iOS Build
on: [push]
jobs:
  ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: npm install
      - run: npm run build
      - run: npx cap add ios || true
      - run: npx cap sync ios
      - name: Build IPA
        run: |
          cd ios/App
          xcodebuild -workspace App.xcworkspace -scheme App \
            -sdk iphoneos -configuration Release \
            -archivePath build/App.xcarchive archive
          xcodebuild -exportArchive \
            -archivePath build/App.xcarchive \
            -exportOptionsPlist exportOptions.plist \
            -exportPath build/ipa
GITHUB_ACTIONS
  exit 1
fi

# ── Prerequisites check ──────────────────────────────────────────────────────

command -v xcodebuild >/dev/null 2>&1 || {
  echo "[ERROR] Xcode nije instaliran. Preuzmi sa App Store."
  exit 1
}
echo "[OK] Xcode: $(xcodebuild -version | head -1)"

command -v node >/dev/null 2>&1 || { echo "[ERROR] Node.js nije instaliran!"; exit 1; }
echo "[OK] Node.js: $(node --version)"

# ── Install npm dependencies ──────────────────────────────────────────────────

if [ ! -d "node_modules" ]; then
  echo ""
  echo "[1/6] Installing npm dependencies..."
  npm install
fi

# ── Build React app ───────────────────────────────────────────────────────────

echo ""
echo "[2/6] Building React web app..."
npm run build
echo "[OK] Vite build done."

# ── Initialize Capacitor iOS ──────────────────────────────────────────────────

echo ""
echo "[3/6] Setting up Capacitor iOS..."

if [ ! -d "ios" ]; then
  echo "[INFO] Adding Capacitor iOS platform..."
  npx cap add ios
fi

# Sync web assets to iOS
npx cap sync ios
echo "[OK] Capacitor sync done."

# ── Install CocoaPods ─────────────────────────────────────────────────────────

echo ""
echo "[4/6] Installing CocoaPods..."
command -v pod >/dev/null 2>&1 || sudo gem install cocoapods
cd ios/App
pod install --repo-update
cd "$SCRIPT_DIR"
echo "[OK] CocoaPods done."

# ── Build with Xcode ─────────────────────────────────────────────────────────

echo ""
echo "[5/6] Building with Xcode..."

WORKSPACE="ios/App/App.xcworkspace"
SCHEME="App"
ARCHIVE_PATH="output_app/ios/SOLAnalyzer.xcarchive"

mkdir -p output_app/ios

xcodebuild \
  -workspace "$WORKSPACE" \
  -scheme "$SCHEME" \
  -sdk iphoneos \
  -configuration Release \
  -archivePath "$ARCHIVE_PATH" \
  archive \
  CODE_SIGN_IDENTITY="" \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGNING_ALLOWED=NO \
  -allowProvisioningUpdates

echo "[OK] Archive kreiran: $ARCHIVE_PATH"

# ── Export IPA ────────────────────────────────────────────────────────────────

echo ""
echo "[6/6] Exporting IPA..."

# Create export options plist for ad-hoc distribution
cat > output_app/ios/exportOptions.plist << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>compileBitcode</key>
    <false/>
    <key>thinning</key>
    <string>&lt;none&gt;</string>
</dict>
</plist>
PLIST

xcodebuild \
  -exportArchive \
  -archivePath "$ARCHIVE_PATH" \
  -exportOptionsPlist "output_app/ios/exportOptions.plist" \
  -exportPath "output_app/ios/ipa" \
  -allowProvisioningUpdates 2>/dev/null || {
    echo "[INFO] Export sa signing skipped. IPA za ad-hoc distribuciju:"
    echo "       Otvori Xcode → Window → Organizer → Distribute App"
  }

echo ""
echo "============================================"
echo "  iOS Build USPJEŠAN!"
echo ""
echo "  Archive:  output_app/ios/SOLAnalyzer.xcarchive"
echo "  IPA dir:  output_app/ios/ipa/"
echo ""
echo "  Za distribuciju na TestFlight ili App Store:"
echo "  Otvori Xcode Organizer i koristi Archive za upload."
echo ""
echo "  Za direktnu instalaciju (bez App Store):"
echo "  Koristi Apple Configurator 2 ili Xcode."
echo "============================================"
