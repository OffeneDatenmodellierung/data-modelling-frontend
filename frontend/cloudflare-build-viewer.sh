#!/bin/bash
set -e

echo "Starting Cloudflare Pages VIEWER build..."

# Standard Cloudflare build vars
export VITE_OFFLINE_MODE="true"
export VITE_BASE_PATH="/"
export CLOUDFLARE_PAGES="true"

# Viewer-specific vars (VIEWER_* set in Cloudflare Pages dashboard)
export VITE_VIEWER_MODE="true"
export VITE_VIEWER_OWNER="${VIEWER_OWNER:?VIEWER_OWNER must be set}"
export VITE_VIEWER_REPO="${VIEWER_REPO:?VIEWER_REPO must be set}"
export VITE_VIEWER_BRANCH="${VIEWER_BRANCH:-main}"
export VITE_VIEWER_WORKSPACE_PATH="${VIEWER_WORKSPACE_PATH:-}"

echo "Viewer target: ${VITE_VIEWER_OWNER}/${VITE_VIEWER_REPO}@${VITE_VIEWER_BRANCH}"

npm ci
npm run build

if [ -d "dist" ]; then
  echo "Viewer build complete. Output in dist/"
else
  echo "ERROR: Build output directory 'dist' not found!"
  exit 1
fi
