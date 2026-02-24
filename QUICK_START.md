# Quick Start Guide

**⚠️ IMPORTANT: This application currently only supports OFFLINE MODE.**

## Quick Start Options

### Option 1: Docker (Web Version)

Build and run using Docker (automatically builds latest SDK):

```bash
docker-compose up -d
# Access at http://localhost:5173
```

See [docker/README.md](./docker/README.md) for details.

### Option 2: Electron Desktop Application

```bash
cd frontend
npm install
npm run build:wasm   # Build WASM SDK (required)
npm run electron:dev # Start Electron app
```

This will:
1. Build Electron main/preload scripts
2. Start Vite dev server (http://localhost:5173)
3. Launch Electron app connected to dev server

**Note**: No API server is required. The app operates entirely offline.

### Option 3: Read-Only Viewer (Cloudflare Pages)

Deploy a read-only viewer for a private GitHub repo:

**Prerequisites**:
- A GitHub App with `contents:read` and `metadata:read` permissions, installed on the target org
- A Cloudflare Pages project

**Setup**:

1. Create GitHub App and note the App ID, Private Key, and Installation ID
2. Create a Cloudflare Pages project connected to this repo
3. Set the build command: `cd frontend && bash cloudflare-build-viewer.sh`
4. Set the build output directory: `frontend/dist`
5. Configure environment variables in Cloudflare Pages dashboard:

   **Secrets** (encrypted):
   - `GITHUB_APP_ID` — numeric App ID
   - `GITHUB_APP_PRIVATE_KEY` — PEM private key
   - `GITHUB_INSTALLATION_ID` — installation ID on the target org

   **Environment variables** (plain text):
   - `VIEWER_OWNER` — GitHub org/user owning the repo
   - `VIEWER_REPO` — repository name
   - `VIEWER_BRANCH` — branch to display (default: `main`)
   - `VIEWER_WORKSPACE_PATH` — workspace path within the repo (optional)

6. Attach a Cloudflare Access policy with an IP allowlist for access control
7. Deploy — the viewer auto-redirects to the configured workspace on load

**Local testing**:
```bash
cd frontend

# Set viewer env vars
export VITE_VIEWER_MODE=true
export VITE_VIEWER_OWNER=your-org
export VITE_VIEWER_REPO=your-repo
export VITE_VIEWER_BRANCH=main

# Run dev server (viewer UI without proxy)
npm run dev

# Or build and test with Wrangler (includes proxy)
npm run build
npx wrangler pages dev dist
```

## Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with UI
npm run test:ui

# Run tests with coverage (must be 95%+)
npm run test:coverage

# Type check
npm run type-check

# Lint code
npm run lint
```

## Building Production Release

```bash
cd frontend
npm run build:wasm   # Build WASM SDK
npm run build        # Build frontend
npm run build:electron # Build Electron scripts
npm run electron:build  # Create production package
```

This creates platform-specific installers in `release/` directory.

See [frontend/ELECTRON_BUILD_GUIDE.md](./frontend/ELECTRON_BUILD_GUIDE.md) for detailed instructions.

## Manual Testing Checklist

See [frontend/MANUAL_TESTING.md](./frontend/MANUAL_TESTING.md) for detailed test scenarios.

Quick checklist:
- [ ] Create tables
- [ ] Edit tables
- [ ] Create relationships
- [ ] Switch domains
- [ ] Import/Export ODCS
- [ ] Test offline mode
- [ ] Verify validation

## GitHub Actions

CI/CD is configured in `.github/workflows/build-release.yml`:

- **Lint and Format**: Runs ESLint and Prettier checks
- **Test**: Runs test suite on Node.js 20.x and 22.x (95% coverage threshold)
- **Build**: Builds WASM SDK, frontend, and Electron apps for all platforms
- **Release**: Creates GitHub releases with installers when tags are pushed
- **Security**: Performs npm security audits

The workflow runs on:
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop`
- Tags starting with `v*` (creates release)
- Manual workflow dispatch

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 5173
lsof -i :5173

# Kill process
kill -9 <PID>
```

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

### Tests Failing

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Check specific test file
npm test -- tests/unit/services/api/workspaceService.test.ts
```

## Next Steps

1. **Read Testing Guide**: [frontend/TESTING.md](./frontend/TESTING.md)
2. **Manual Testing**: [frontend/MANUAL_TESTING.md](./frontend/MANUAL_TESTING.md)
3. **Electron Build Guide**: [frontend/ELECTRON_BUILD_GUIDE.md](./frontend/ELECTRON_BUILD_GUIDE.md)
4. **Offline Mode**: [frontend/docs/OFFLINE_MODE.md](./frontend/docs/OFFLINE_MODE.md)



