# Building and Running Electron App with WASM

This guide explains how to build and run the Electron desktop application with WASM SDK support.

## Prerequisites

1. **Node.js** (v18+ recommended)
2. **Rust** and **wasm-pack** (for building WASM SDK)
   ```bash
   # Install Rust
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   
   # Install wasm-pack
   curl https://rustwasm.github.io/wasm-pack/installer/init.sh -sSf | sh
   ```
3. **data-modelling-sdk** repository cloned and accessible
   - The SDK should be at: `../data-modelling-sdk` (relative to frontend directory)
   - Or update the path in `scripts/build-wasm.sh`

## Step-by-Step Build Process

### 1. Build WASM SDK

The WASM SDK must be built first. This happens automatically during the build process, but you can also build it manually:

```bash
cd frontend
npm run build:wasm
```

This script will:
- Locate the `data-modelling-sdk` repository
- Build the WASM module using `wasm-pack`
- Copy the built WASM files to `frontend/public/wasm/`

**Note**: If the SDK is not found, the build will skip with a warning. Make sure the SDK is accessible at one of these locations:
- `../data-modelling-sdk` (relative to frontend)
- `../../data-modelling-sdk` (relative to project root)
- Or update `scripts/build-wasm.sh` with your SDK path

### 2. Build Frontend

Build the React frontend:

```bash
cd frontend
npm run build
```

This will:
- Run TypeScript compilation (`tsc`)
- Build the frontend with Vite
- Include WASM files from `public/wasm/` in the build output

### 3. Build Electron Main Process

Build the Electron main and preload scripts:

```bash
cd frontend
npm run build:electron
```

This uses `vite.electron.config.ts` to build:
- `electron/main.ts` → `dist-electron/main.cjs`
- `electron/preload.ts` → `dist-electron/preload.cjs`

### 4. Run Electron App (Development)

For development with hot-reload:

```bash
cd frontend
npm run electron:dev
```

This will:
1. Build Electron main/preload scripts
2. Start the Vite dev server (http://localhost:5173)
3. Launch Electron pointing to the dev server
4. Enable hot-reload for frontend changes

### 5. Run Electron App (Production)

For production mode (uses built files, **offline mode**):

```bash
cd frontend
npm run build          # Build frontend (required!)
npm run build:electron # Build Electron scripts
npm run electron       # Run Electron app in production/offline mode
```

**Important**: You **must** run `npm run build` first to create the `dist/` folder. The Electron app will load from `dist/index.html` in production mode, which enables offline mode (no API calls).

Or use the combined command:

```bash
cd frontend
npm run electron:build
```

This builds everything and creates a distributable package using `electron-builder`.

## Complete Build Script

For a complete build from scratch:

```bash
cd frontend

# 1. Install dependencies (if needed)
npm install

# 2. Build WASM SDK
npm run build:wasm

# 3. Build frontend
npm run build

# 4. Build Electron
npm run build:electron

# 5. Run Electron app
npm run electron
```

## Troubleshooting

### Electron App Trying to Connect to localhost:5173 in Production Mode

**Symptom**: Error `ERR_CONNECTION_REFUSED` when running `npm run electron` in production mode.

**Solution**: 
1. Make sure you've built the frontend first:
   ```bash
   npm run build
   ```
2. Verify `dist/index.html` exists:
   ```bash
   ls -la dist/index.html
   ```
3. The Electron app prioritizes `NODE_ENV=production` and will use the built files instead of the dev server.

**Note**: The `electron` script sets `NODE_ENV=production`, which forces offline mode. The app will load from `dist/index.html` instead of connecting to the dev server.

### WASM SDK Not Found

If you see: `WASM SDK build skipped (SDK not found or wasm-pack not installed)`

**Solutions:**
1. Clone the SDK repository:
   ```bash
   cd ..
   git clone <sdk-repo-url> data-modelling-sdk
   ```

2. Or update the SDK path in `scripts/build-wasm.sh`:
   ```bash
   SDK_DIR="/path/to/your/data-modelling-sdk"
   ```

3. Verify wasm-pack is installed:
   ```bash
   wasm-pack --version
   ```

### Electron Window Shows Blank Screen

1. Check that the frontend build completed successfully
2. Check Electron console for errors: `View > Toggle Developer Tools`
3. Verify `dist-electron/main.cjs` exists and is valid
4. Check that Vite dev server is running (for dev mode)

### WASM Module Not Loading

1. Verify WASM files exist in `public/wasm/`:
   ```bash
   ls -la frontend/public/wasm/
   ```

2. Check browser console for WASM loading errors
3. Ensure WASM files are copied to `dist/` during build
4. Verify CORS headers if loading from file:// protocol

### Build Errors

1. **TypeScript errors**: Run `npm run type-check` to see all errors
2. **Vite build errors**: Check `vite.config.ts` and `vite.electron.config.ts`
3. **Electron build errors**: Ensure Electron dependencies are installed:
   ```bash
   npm install --save-dev electron electron-builder
   ```

## File Structure

```
frontend/
├── electron/
│   ├── main.ts          # Electron main process
│   ├── preload.ts       # Preload script (IPC bridge)
│   └── electron-builder.yml  # Electron Builder config
├── scripts/
│   └── build-wasm.sh    # WASM SDK build script
├── public/
│   └── wasm/            # WASM SDK output (generated)
├── dist/                # Frontend build output
├── dist-electron/       # Electron build output
│   ├── main.cjs
│   └── preload.cjs
├── vite.config.ts       # Frontend Vite config
└── vite.electron.config.ts  # Electron Vite config
```

## Development Workflow

1. **Terminal 1** - Start Vite dev server:
   ```bash
   cd frontend
   npm run dev
   ```

2. **Terminal 2** - Run Electron (after building):
   ```bash
   cd frontend
   npm run build:electron
   npm run electron
   ```

   Or use the combined command:
   ```bash
   npm run electron:dev
   ```

## Production Distribution

To create a distributable package:

```bash
cd frontend
npm run electron:build
```

This creates platform-specific installers in `dist/`:
- **macOS**: `.dmg` or `.pkg`
- **Windows**: `.exe` or `.msi`
- **Linux**: `.AppImage` or `.deb`

Configuration is in `electron/electron-builder.yml`.

## Environment Variables

- `NODE_ENV=development` - Development mode (uses Vite dev server)
- `NODE_ENV=production` - Production mode (uses built files)

## Additional Notes

- The Electron app uses **offline mode by default** (no API connection)
- WASM SDK is required for offline functionality
- File system access is available through Electron IPC handlers
- Native file dialogs are used for workspace folder selection


