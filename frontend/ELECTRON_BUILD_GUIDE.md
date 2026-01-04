# Electron Build Guide

Complete guide for building the Electron desktop application.

## Prerequisites

1. **Node.js 20+** (LTS version recommended)
2. **Rust** and **wasm-pack** (for building WASM SDK)
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install wasm-pack
   cargo install wasm-pack
   ```
3. **data-modelling-sdk** repository (for WASM build)
   - Clone the SDK repository: `git clone <sdk-repo-url> data-modelling-sdk`
   - Place it at: `../data-modelling-sdk` (relative to `frontend/` directory)
   - Or update the path in `scripts/build-wasm.sh`

## Quick Start

### Development Mode

```bash
cd frontend
npm install
npm run build:wasm
npm run electron:dev
```

This will:
1. Build Electron main/preload scripts
2. Start Vite dev server (http://localhost:5173)
3. Launch Electron app connected to dev server
4. Enable hot-reload for frontend changes

### Production Build

```bash
cd frontend
npm install
npm run build:wasm
npm run build
npm run build:electron
npm run electron:build
```

This creates platform-specific installers in `release/`:
- **macOS**: `.dmg` or `.pkg` files
- **Windows**: `.exe` or `.msi` files
- **Linux**: `.AppImage` or `.deb` files

## Detailed Build Steps

### Step 1: Install Dependencies

```bash
cd frontend
npm install
```

### Step 2: Build WASM SDK

The WASM SDK is required for offline functionality. Build it manually:

```bash
npm run build:wasm
```

This script will:
- Locate the `data-modelling-sdk` repository
- Build the WASM module using `wasm-pack`
- Copy built files to `public/wasm/`

**Note**: The WASM build also runs automatically before `npm run build` via the `prebuild` script.

### Step 3: Build Frontend

```bash
npm run build
```

This will:
- Run TypeScript compilation (`tsc`)
- Build the frontend with Vite
- Include WASM files from `public/wasm/` in the build output
- Output to `dist/` directory

### Step 4: Build Electron Main Process

```bash
npm run build:electron
```

This uses `vite.electron.config.ts` to build:
- `electron/main.ts` → `dist-electron/main.cjs`
- `electron/preload.ts` → `dist-electron/preload.cjs`

### Step 5: Create Production Package

```bash
npm run electron:build
```

This uses `electron-builder` to create distributable packages:
- Reads configuration from `electron/electron-builder.yml`
- Creates platform-specific installers
- Outputs to `release/` directory

## Running the Electron App

### Development Mode

```bash
npm run electron:dev
```

Runs Electron connected to Vite dev server with hot-reload.

### Production Mode

```bash
npm run electron
```

Runs Electron using built files from `dist/` (offline mode).

**Note**: You must run `npm run build` first to create the `dist/` folder.

## Complete Build Script

For a complete build from scratch:

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Build WASM SDK
npm run build:wasm

# 3. Build frontend
npm run build

# 4. Build Electron scripts
npm run build:electron

# 5. Create production package
npm run electron:build
```

## Troubleshooting

### WASM SDK Not Found

**Error**: `WASM SDK build skipped (SDK not found or wasm-pack not installed)`

**Solutions**:
1. Clone the SDK repository:
   ```bash
   cd ..
   git clone <sdk-repo-url> data-modelling-sdk
   ```

2. Verify wasm-pack is installed:
   ```bash
   wasm-pack --version
   ```

3. Update SDK path in `scripts/build-wasm.sh` if needed

### Electron App Shows Blank Screen

1. Check that frontend build completed: `ls -la dist/index.html`
2. Check Electron console: `View > Toggle Developer Tools`
3. Verify Electron scripts built: `ls -la dist-electron/main.cjs`
4. For dev mode, ensure Vite server is running

### Build Errors

1. **TypeScript errors**: Run `npm run type-check`
2. **Vite build errors**: Check `vite.config.ts` and `vite.electron.config.ts`
3. **Electron build errors**: Ensure Electron dependencies are installed

### Port Already in Use

If port 5173 is in use:
```bash
# Find process using port
lsof -i :5173

# Kill process
kill -9 <PID>
```

## File Structure

```
frontend/
├── electron/
│   ├── main.ts              # Electron main process
│   ├── preload.ts           # Preload script (IPC bridge)
│   ├── electron-builder.yml # Electron Builder config
│   └── icons/               # App icons
├── scripts/
│   └── build-wasm.sh        # WASM SDK build script
├── public/
│   └── wasm/                # WASM SDK output (generated)
├── dist/                    # Frontend build output
├── dist-electron/           # Electron build output
│   ├── main.cjs
│   ├── preload.cjs
│   └── wasm/                # Copied WASM files
└── release/                 # Production packages (generated)
```

## Environment Variables

- `NODE_ENV=development` - Development mode (uses Vite dev server)
- `NODE_ENV=production` - Production mode (uses built files, offline mode)

## Additional Notes

- The Electron app operates in **offline mode** by default (no API connection)
- WASM SDK is required for offline functionality
- File system access is available through Electron IPC handlers
- Native file dialogs are used for workspace folder selection
- All data is stored locally in YAML files

## Related Documentation

- [README.md](../../README.md) - Project overview
- [HOW_TO_RUN.md](../../HOW_TO_RUN.md) - Running instructions
- [QUICK_START.md](../../QUICK_START.md) - Quick start guide
