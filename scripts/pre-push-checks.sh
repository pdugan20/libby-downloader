#!/bin/bash

# Pre-push validation script for Libby Downloader
# Ensures code quality and prevents common mistakes before pushing

set -e

echo "Running pre-push checks..."

# 1. Check DEBUG_MODE is disabled
echo "Checking DEBUG_MODE..."
if grep -q "export const DEBUG_MODE = true" src/shared/constants.ts; then
  echo "❌ ERROR: DEBUG_MODE is still enabled in src/shared/constants.ts"
  echo "   Set DEBUG_MODE = false before pushing to production"
  exit 1
fi
echo "✓ DEBUG_MODE is disabled"

# 2. Verify extension builds successfully
echo "Verifying extension build..."
npm run build:extension > /dev/null 2>&1
if [ $? -ne 0 ]; then
  echo "❌ ERROR: Extension build failed"
  echo "   Run 'npm run build:extension' to see errors"
  exit 1
fi
echo "✓ Extension builds successfully"

# 3. Check bundle sizes
echo "Checking bundle sizes..."
MAX_CONTENT_SIZE=15000  # 15KB
MAX_BACKGROUND_SIZE=8000  # 8KB
MAX_IFRAME_SIZE=8000  # 8KB

content_size=$(wc -c < chrome-extension/content/content.js | tr -d ' ')
background_size=$(wc -c < chrome-extension/background/background.js | tr -d ' ')
iframe_ui_size=$(wc -c < chrome-extension/iframe/iframe-ui.js | tr -d ' ')

if [ "$content_size" -gt "$MAX_CONTENT_SIZE" ]; then
  echo "⚠️  WARNING: content.js is ${content_size} bytes (limit: ${MAX_CONTENT_SIZE})"
fi

if [ "$background_size" -gt "$MAX_BACKGROUND_SIZE" ]; then
  echo "⚠️  WARNING: background.js is ${background_size} bytes (limit: ${MAX_BACKGROUND_SIZE})"
fi

if [ "$iframe_ui_size" -gt "$MAX_IFRAME_SIZE" ]; then
  echo "⚠️  WARNING: iframe-ui.js is ${iframe_ui_size} bytes (limit: ${MAX_IFRAME_SIZE})"
fi

echo "✓ Bundle sizes: content=${content_size}b background=${background_size}b iframe-ui=${iframe_ui_size}b"

# 4. Security audit (don't fail on warnings, only errors)
echo "Running security audit..."
if npm audit --audit-level=high > /dev/null 2>&1; then
  echo "✓ No high/critical vulnerabilities found"
else
  echo "⚠️  WARNING: High or critical vulnerabilities detected"
  echo "   Run 'npm audit' for details"
  # Don't fail the push, just warn
fi

echo ""
echo "✅ All pre-push checks passed!"
