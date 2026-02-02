# Electron App Release Setup

This document describes how to set up automated Electron app builds and releases using GitHub Actions.

## Overview

The `release-electron.yml` workflow builds signed desktop applications for:
- **macOS**: DMG installers for Intel (x64) and Apple Silicon (arm64)
- **Windows**: NSIS installer (x64)
- **Linux**: AppImage and Debian package (x64)

## Triggering a Release

### Option 1: Create a Git Tag

```bash
# Create and push a version tag
git tag v2.6.0
git push origin v2.6.0
```

This will automatically trigger the release workflow.

### Option 2: Manual Trigger

1. Go to Actions → "Release Electron App"
2. Click "Run workflow"
3. Optionally specify a version (e.g., `2.6.0`)
4. Click "Run workflow"

## Required Secrets

### For macOS Code Signing (Optional but Recommended)

| Secret | Description |
|--------|-------------|
| `MACOS_CERTIFICATE` | Base64-encoded .p12 certificate file |
| `MACOS_CERTIFICATE_PWD` | Password for the .p12 certificate |
| `MACOS_KEYCHAIN_PWD` | Temporary keychain password (any secure string) |

### For macOS Notarization (Optional but Recommended)

| Secret | Description |
|--------|-------------|
| `APPLE_ID` | Your Apple ID email |
| `APPLE_ID_PASSWORD` | App-specific password (not your Apple ID password) |
| `APPLE_TEAM_ID` | Your Apple Developer Team ID |

### Creating macOS Secrets

#### 1. Export Your Certificate

```bash
# Export from Keychain Access as .p12 file, then:
base64 -i DeveloperIDApplication.p12 | pbcopy
# Paste this into MACOS_CERTIFICATE secret
```

#### 2. Create App-Specific Password

1. Go to https://appleid.apple.com/
2. Sign in → Security → App-Specific Passwords
3. Generate a new password for "GitHub Actions"
4. Use this as `APPLE_ID_PASSWORD`

#### 3. Find Your Team ID

```bash
# List your teams
xcrun altool --list-providers -u "your@email.com" -p "app-specific-password"
```

Or find it in your Apple Developer account under Membership.

## Build Outputs

Each release creates the following artifacts:

| Platform | File | Description |
|----------|------|-------------|
| macOS (Intel) | `open-data-modelling-X.Y.Z-mac-x64.dmg` | DMG installer |
| macOS (ARM) | `open-data-modelling-X.Y.Z-mac-arm64.dmg` | DMG installer |
| Windows | `open-data-modelling-X.Y.Z-win-setup.exe` | NSIS installer |
| Linux | `open-data-modelling-X.Y.Z-linux-x86_64.AppImage` | Portable AppImage |
| Linux | `open-data-modelling-X.Y.Z-linux-amd64.deb` | Debian package |

SHA256 checksums are generated for all files.

## Without Code Signing

If no macOS certificates are configured:
- macOS apps will be unsigned
- Users will see "unidentified developer" warning
- Users must right-click → Open to bypass Gatekeeper

Windows apps are currently unsigned (Windows signing can be added later).

## Local Testing

To build locally without CI:

```bash
cd frontend

# Build for current platform
npm run electron:build

# Or build for specific platform
npx electron-builder --mac
npx electron-builder --win
npx electron-builder --linux
```

## Troubleshooting

### macOS: "damaged and can't be opened"

This usually means the app is unsigned or quarantine attributes are set:

```bash
xattr -cr "/Applications/Open Data Modelling.app"
```

### Windows: SmartScreen Warning

Without code signing, Windows SmartScreen will warn users. They can click "More info" → "Run anyway".

### Linux: AppImage Won't Run

```bash
chmod +x open-data-modelling-*.AppImage
./open-data-modelling-*.AppImage
```

## Version Management

The version is read from `frontend/package.json`. To release a new version:

1. Update `version` in `frontend/package.json`
2. Commit the change
3. Create and push a tag: `git tag v2.6.0 && git push origin v2.6.0`

The workflow checks if a release with that tag already exists and skips if it does.
