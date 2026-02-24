# How to Run the Application

## Quick Start

**⚠️ IMPORTANT: This application currently only supports OFFLINE MODE.**

### Option 1: Docker (Web Version)

Build and run the web version using Docker:

```bash
# Build and start the frontend service
docker-compose up -d

# View logs
docker-compose logs -f frontend

# Access the application
# Web: http://localhost:5173
```

The Docker build automatically:
- Clones and builds the latest Rust SDK as WASM
- Builds the React frontend application
- Serves via Nginx

See [docker/README.md](./docker/README.md) for detailed Docker setup instructions.

### Option 2: Electron Desktop Application

```bash
cd frontend
npm install          # First time only
npm run build:wasm   # Build WASM SDK (required)
npm run electron:dev # Start Electron app in development mode
```

This will:
1. Build Electron main/preload scripts
2. Start Vite dev server (http://localhost:5173)
3. Launch Electron app connected to dev server

**Note**: The app operates entirely offline. No API server is required.

### Option 3: Read-Only Viewer (Cloudflare Pages)

A separate deployment mode for sharing private data models as read-only views. Uses the same codebase with build-time feature flags.

**How it works**:
- A Cloudflare Pages Function acts as a server-side proxy to the GitHub API
- The proxy authenticates using a GitHub App installation token (RS256 JWT)
- Only GET requests to the configured repository are allowed
- The browser never sees GitHub credentials
- All editing UI is hidden; the canvas is view-only
- Access is controlled via Cloudflare Access IP restrictions

**Deployment**:

1. Create a GitHub App (`contents:read` + `metadata:read` permissions)
2. Create a Cloudflare Pages project:
   - Build command: `cd frontend && bash cloudflare-build-viewer.sh`
   - Build output: `frontend/dist`
3. Set secrets in Cloudflare dashboard: `GITHUB_APP_ID`, `GITHUB_APP_PRIVATE_KEY`, `GITHUB_INSTALLATION_ID`
4. Set env vars: `VIEWER_OWNER`, `VIEWER_REPO`, `VIEWER_BRANCH`, `VIEWER_WORKSPACE_PATH`
5. Attach Cloudflare Access policy with IP allowlist
6. Deploy

**Local testing with Wrangler**:
```bash
cd frontend
VITE_VIEWER_MODE=true VITE_VIEWER_OWNER=org VITE_VIEWER_REPO=repo npm run build
npx wrangler pages dev dist --binding GITHUB_APP_ID=123 GITHUB_APP_PRIVATE_KEY="$(cat key.pem)" GITHUB_INSTALLATION_ID=456 VIEWER_OWNER=org VIEWER_REPO=repo
```

**Architecture**:
```
Browser ──GET──▶ Cloudflare Pages Function ──GET + Token──▶ GitHub API
                 (signs JWT, gets install token,
                  restricts to configured repo)
```

## Running Tests

```bash
cd frontend

# Run all tests
npm test

# Run tests with interactive UI
npm run test:ui

# Run tests with coverage report (must be 95%+)
npm run test:coverage

# Type checking
npm run type-check

# Linting
npm run lint
```

## Manual Testing

See [frontend/MANUAL_TESTING.md](./frontend/MANUAL_TESTING.md) for detailed test scenarios.

**Quick Test Checklist**:
1. ✅ Create a table
2. ✅ Add columns to table
3. ✅ Create a relationship between tables
4. ✅ Switch between domains (Conceptual/Logical/Physical)
5. ✅ Import an ODCS file
6. ✅ Export to ODCS format
7. ✅ Test offline mode (stop API, verify app still works)

## GitHub Actions CI/CD

### Automatic Runs

GitHub Actions automatically runs on:
- **Push** to `main`, `develop`, or `001-data-modelling-app` branches
- **Pull Requests** to `main` or `develop`

### What Gets Tested

1. **Test Suite** (Node.js 20.x and 22.x)
   - Unit tests
   - Integration tests
   - Coverage check (95% threshold)

2. **Build**
   - Web application build
   - Electron application build

3. **Security Audit**
   - npm audit for vulnerabilities

4. **Code Quality**
   - ESLint
   - TypeScript type checking
   - Prettier formatting check

### Viewing Results

1. Go to GitHub repository
2. Click "Actions" tab
3. Select the workflow run
4. View results for each job

### Manual Trigger

To manually trigger a workflow:
1. Push a commit to the branch
2. Or create a Pull Request

## Environment Setup

### Create `.env.local`

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local` if needed:
```env
VITE_API_BASE_URL=http://localhost:8081
VITE_WS_BASE_URL=ws://localhost:8081
```

## Electron Desktop App

See [frontend/ELECTRON_BUILD_GUIDE.md](./frontend/ELECTRON_BUILD_GUIDE.md) for complete build instructions.

### Development Mode

```bash
cd frontend
npm run build:wasm   # Build WASM SDK first
npm run electron:dev # Start Electron app
```

### Production Build

```bash
cd frontend
npm run build:wasm   # Build WASM SDK
npm run build        # Build frontend
npm run build:electron # Build Electron scripts
npm run electron:build  # Create production package
```

This creates platform-specific installers in `release/` directory.

## Troubleshooting

### Port Already in Use

```bash
# Find what's using port 5173
lsof -i :5173

# Kill the process
kill -9 <PID>
```

### Tests Failing

```bash
# Run with verbose output
npm test -- --reporter=verbose

# Run specific test file
npm test -- tests/unit/services/api/workspaceService.test.ts

# Clear test cache
npm test -- --clearCache
```

### Build Errors

```bash
# Check TypeScript errors
npm run type-check

# Check linting errors
npm run lint

# Clean build
rm -rf dist node_modules
npm install
npm run build
```

### File System Issues

- Ensure you have write permissions in the workspace directory
- Check Electron console for file operation errors: `View > Toggle Developer Tools`
- Verify WASM SDK is built: `ls -la public/wasm/`

## Development Workflow

1. **Make changes** to code
2. **Run tests**: `npm test`
3. **Check coverage**: `npm run test:coverage`
4. **Type check**: `npm run type-check`
5. **Lint**: `npm run lint`
6. **Test manually**: Open http://localhost:5173
7. **Commit** when all checks pass

## Documentation

- **Testing Guide**: [frontend/TESTING.md](./frontend/TESTING.md)
- **Manual Testing**: [frontend/MANUAL_TESTING.md](./frontend/MANUAL_TESTING.md)
- **Offline Mode**: [frontend/docs/OFFLINE_MODE.md](./frontend/docs/OFFLINE_MODE.md)
- **Electron Build Guide**: [frontend/ELECTRON_BUILD_GUIDE.md](./frontend/ELECTRON_BUILD_GUIDE.md)



