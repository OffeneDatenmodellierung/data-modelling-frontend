#!/bin/bash
# Cloudflare Pages build script
# This script builds the frontend application for Cloudflare Pages
# SDK WASM is bundled via NPM package (@offenedatenmodellierung/data-modelling-sdk)

set -e

echo "🚀 Starting Cloudflare Pages build..."

# Set environment variables for Cloudflare Pages
export VITE_OFFLINE_MODE="true"
export VITE_BASE_PATH="/"
export CLOUDFLARE_PAGES="true"

# Install dependencies first (includes SDK NPM package with bundled WASM)
echo "📦 Installing npm dependencies..."
npm ci

# =============================================================================
# Version Configuration
# =============================================================================
# SDK version is now managed via NPM package.json
# Check: npm list @offenedatenmodellierung/data-modelling-sdk

# SDK WASM is bundled in the NPM package - no manual download needed!
echo "✅ SDK WASM bundled via NPM package (@offenedatenmodellierung/data-modelling-sdk)"

# =============================================================================
# Build Application
# =============================================================================

# Build the frontend application
echo "🔨 Building frontend application..."
npm run build

# =============================================================================
# Verify Build Output
# =============================================================================

echo "🔍 Verifying build output..."

# Check that the build completed
if [ ! -d "dist" ]; then
  echo "❌ ERROR: Build output directory 'dist' not found"
  exit 1
fi

# Note: SDK WASM is bundled by Vite from node_modules
echo "   - SDK WASM: Bundled via NPM package"

# Get SDK version from package.json
SDK_VERSION=$(node -e "console.log(require('./node_modules/@offenedatenmodellierung/data-modelling-sdk/package.json').version)")

echo "✅ Build complete! Output directory: dist"
echo ""
echo "📋 Build Summary:"
echo "   - SDK Version: ${SDK_VERSION} (via NPM)"
echo "   - Output Directory: dist"
