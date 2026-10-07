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
APP_PATH=$(find build/DerivedData -name "App.app" -type d 2>/dev/null | head -n 1)

if [ -z "$APP_PATH" ] && [ -d "build/Payload/App.app" ]; then
    echo "ℹ️ Using existing build/Payload/App.app bundle..."
    APP_PATH="build/Payload/App.app"
fi

if [ -z "$APP_PATH" ]; then
    echo "❌ Error: App.app was not found in build/DerivedData or build/Payload."
    exit 1
fi

echo "Found compiled App.app at: $APP_PATH"
if [ "$APP_PATH" != "build/Payload/App.app" ]; then
    rm -rf build/Payload/*
    cp -r "$APP_PATH" build/Payload/
fi

# Sync latest icons and public assets into the app bundle
if [ -f "public/tietar_for_tesla.png" ]; then
    cp public/tietar_for_tesla.png build/Payload/App.app/public/ 2>/dev/null || true
    if command -v sips &> /dev/null; then
        sips -z 120 120 public/tietar_for_tesla.png --out build/Payload/App.app/AppIcon60x60@2x.png &>/dev/null || true
        sips -z 152 152 public/tietar_for_tesla.png --out "build/Payload/App.app/AppIcon76x76@2x~ipad.png" &>/dev/null || true
    fi
fi
if [ -f "public/logo.png" ]; then cp public/logo.png build/Payload/App.app/public/ 2>/dev/null || true; fi
if [ -f "public/favicon.png" ]; then cp public/favicon.png build/Payload/App.app/public/ 2>/dev/null || true; fi
if [ -f "public/apple-touch-icon.png" ]; then cp public/apple-touch-icon.png build/Payload/App.app/public/ 2>/dev/null || true; fi
if [ -f "index.html" ]; then cp index.html build/Payload/App.app/public/ 2>/dev/null || true; fi

echo "Signing bundle with ad-hoc signature for sideloading validation..."
if [ -d "build/Payload/App.app/Frameworks" ]; then
    find "build/Payload/App.app/Frameworks" -type d -name "*.framework" -exec codesign -s - --force --deep {} + 2>/dev/null || true
fi
codesign -s - --force --deep "build/Payload/App.app"

cd build
rm -f TeslaLocalStats_castor_tech.ipa
zip -qry TeslaLocalStats_castor_tech.ipa Payload
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
