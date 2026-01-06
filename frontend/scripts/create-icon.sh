#!/bin/bash
# Script to create Electron app icons from SVG logo
# Creates PNG (for Linux/Windows) and ICNS (for macOS)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ICONS_DIR="$FRONTEND_DIR/electron/icons"
LOGO_SVG="$FRONTEND_DIR/public/logo.svg"

echo "Creating Electron app icons from logo.svg..."

# Create icons directory
mkdir -p "$ICONS_DIR"

# Check if logo exists
if [ ! -f "$LOGO_SVG" ]; then
  echo "Error: Logo file not found at $LOGO_SVG"
  exit 1
fi

# For macOS, try to create ICNS using iconutil (requires PNG first)
# For other platforms, create PNG

# Create PNG from SVG using sips (macOS) or other tools
if command -v sips >/dev/null 2>&1; then
  echo "Creating PNG icon using sips..."
  # Extract just the circle part for a square icon (better for app icons)
  # Create a 1024x1024 PNG
  sips -s format png "$LOGO_SVG" --out "$ICONS_DIR/icon.png" --resampleHeightWidthMax 1024 2>&1 || {
    echo "Warning: sips conversion failed, trying alternative method..."
    # Fallback: Use qlmanage or create a simple square version
    if command -v qlmanage >/dev/null 2>&1; then
      qlmanage -t -s 1024 -o "$ICONS_DIR" "$LOGO_SVG" 2>/dev/null || true
      # Rename the output
      if [ -f "$ICONS_DIR/logo.png" ]; then
        mv "$ICONS_DIR/logo.png" "$ICONS_DIR/icon.png"
      fi
    fi
  }
  
  # Create ICNS for macOS (requires iconutil)
  if [ -f "$ICONS_DIR/icon.png" ] && command -v iconutil >/dev/null 2>&1; then
    echo "Creating ICNS icon for macOS..."
    # Create iconset directory structure
    ICONSET_DIR="$ICONS_DIR/icon.iconset"
    mkdir -p "$ICONSET_DIR"
    
    # Create different sizes for ICNS
    for size in 16 32 64 128 256 512 1024; do
      sips -z $size $size "$ICONS_DIR/icon.png" --out "$ICONSET_DIR/icon_${size}x${size}.png" 2>/dev/null || true
      # Also create @2x versions for Retina
      if [ $size -lt 1024 ]; then
        sips -z $((size * 2)) $((size * 2)) "$ICONS_DIR/icon.png" --out "$ICONSET_DIR/icon_${size}x${size}@2x.png" 2>/dev/null || true
      fi
    done
    
    # Convert iconset to ICNS
    iconutil -c icns "$ICONSET_DIR" -o "$ICONS_DIR/icon.icns" 2>/dev/null || {
      echo "Warning: Failed to create ICNS, PNG will be used instead"
    }
    
    # Clean up iconset directory
    rm -rf "$ICONSET_DIR"
  fi
else
  echo "Warning: sips not found. Please install ImageMagick or use an online converter to create icon.png and icon.icns"
  echo "Place them in: $ICONS_DIR"
fi

if [ -f "$ICONS_DIR/icon.png" ]; then
  echo "✅ Created icon.png"
else
  echo "⚠️  icon.png not created - you may need to create it manually"
fi

if [ -f "$ICONS_DIR/icon.icns" ]; then
  echo "✅ Created icon.icns"
else
  echo "⚠️  icon.icns not created - PNG will be used for macOS"
fi

echo "Done! Icons are in: $ICONS_DIR"


