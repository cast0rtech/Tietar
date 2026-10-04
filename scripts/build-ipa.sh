#!/usr/bin/env bash
set -e

echo "=============================================="
echo "⚡ Tietar - Building iOS IPA (castor_tech)"
echo "=============================================="

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$PROJECT_ROOT"

echo "1. Checking prerequisites..."
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Error: xcodebuild is not installed or not in PATH."
    exit 1
fi

echo "2. Building web application (React + Vite)..."
if command -v npm &> /dev/null; then
    npm run build
    npx cap sync ios
else
    echo "⚠️ npm not found in PATH; skipping web build step if already built."
fi

echo "3. Building iOS Archive with xcodebuild..."
mkdir -p build/DerivedData
mkdir -p build/Payload

xcodebuild clean build \
  -workspace ios/App/App.xcworkspace \
  -scheme App \
  -configuration Release \
  -sdk iphoneos \
  -destination 'generic/platform=iOS' \
  -derivedDataPath ./build/DerivedData \
  CODE_SIGNING_ALLOWED=NO \
  CODE_SIGNING_REQUIRED=NO \
  CODE_SIGN_IDENTITY=""

echo "4. Packaging Payload into .ipa..."
APP_PATH=$(find build/DerivedData -name "App.app" -type d | head -n 1)

if [ -z "$APP_PATH" ]; then
    echo "❌ Error: App.app was not found in build/DerivedData."
    exit 1
fi

echo "Found compiled App.app at: $APP_PATH"
rm -rf build/Payload/*
cp -r "$APP_PATH" build/Payload/

cd build
rm -f TeslaLocalStats_castor_tech.ipa
zip -r TeslaLocalStats_castor_tech.ipa Payload
cd "$PROJECT_ROOT"

# Copy to root and Desktop for quick access
cp build/TeslaLocalStats_castor_tech.ipa ./TeslaLocalStats_castor_tech.ipa 2>/dev/null || true
cp build/TeslaLocalStats_castor_tech.ipa ~/Desktop/TeslaLocalStats_castor_tech.ipa 2>/dev/null || true

echo "=============================================="
echo "✅ IPA created successfully:"
echo "   - $PROJECT_ROOT/build/TeslaLocalStats_castor_tech.ipa"
echo "   - $PROJECT_ROOT/TeslaLocalStats_castor_tech.ipa"
echo "   - ~/Desktop/TeslaLocalStats_castor_tech.ipa"
echo "=============================================="
