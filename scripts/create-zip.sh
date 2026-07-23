#!/bin/bash
# Creates a downloadable zip of the AgentBrowser project
# Run this from the browser-app root: bash scripts/create-zip.sh

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
ROOT="$SCRIPT_DIR/.."
OUTPUT="$ROOT/../browser-app-macos.zip"

echo "📦 Packaging AgentBrowser for macOS..."

cd "$ROOT/.."

zip -r browser-app-macos.zip browser-app \
  --exclude "*/node_modules/*" \
  --exclude "*/.git/*" \
  --exclude "*/dist/*" \
  --exclude "*/release/*" \
  --exclude "*/.DS_Store"

echo "✅ Created: browser-app-macos.zip"
echo ""
echo "📋 Next steps on your Mac:"
echo "  1. Unzip browser-app-macos.zip"
echo "  2. cd browser-app"
echo "  3. npm install -g pnpm  (if not installed)"
echo "  4. pnpm install"
echo "  5. pnpm run dist:dmg"
echo "  6. Open release/AgentBrowser-1.0.0.dmg"
