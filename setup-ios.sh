#!/bin/bash
set -e

REPO="$HOME/Documents/fixitiq"
cd "$REPO"

echo ""
echo "========================================="
echo "  FixitIQ iOS Setup"
echo "========================================="
echo ""

# ── 1. Find Node ─────────────────────────────
if ! command -v node &>/dev/null; then
  # Try nvm
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
fi

if ! command -v node &>/dev/null; then
  echo "❌ Node.js not found."
  echo "   Install it from https://nodejs.org (LTS) then run this script again."
  exit 1
fi

echo "✅ Node $(node --version)  |  npm $(npm --version)"

# ── 2. Install dependencies ───────────────────
echo ""
echo "📦 Installing npm dependencies..."
npm install

# ── 3. Check .env ─────────────────────────────
LAN_IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "")
if [ -n "$LAN_IP" ]; then
  # Update the commented-out API URL line with actual IP (for reference)
  echo ""
  echo "ℹ️  Your Mac LAN IP is: $LAN_IP"
  echo "   If you want the app to talk to the local API, edit mobile/.env and set:"
  echo "   EXPO_PUBLIC_API_URL=http://$LAN_IP:3000"
fi

# ── 4. Expo prebuild (generates ios/ folder) ──
echo ""
echo "🔨 Running expo prebuild for iOS..."
cd mobile
npx expo prebuild --platform ios --clean

# ── 5. Build & install on device ──────────────
echo ""
echo "📱 Building and installing on your iPhone..."
echo "   Make sure your iPhone is:"
echo "   • Connected via USB"
echo "   • Trusted this Mac (tap 'Trust' on the phone)"
echo "   • Developer Mode ON (Settings > Privacy & Security > Developer Mode)"
echo ""
npx expo run:ios --device
