import { app, BrowserWindow, dialog, ipcMain, nativeImage } from 'electron';
import { readFile, writeFile, mkdir, readdir, unlink } from 'fs/promises';
import { existsSync } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
try {
  if (require('electron-squirrel-startup')) {
    app.quit();
  }
} catch {
  // electron-squirrel-startup not installed, continue
}

// Helper function to get icon path
const getIconPath = (): string | undefined => {
  const possiblePaths = [
    path.join(__dirname, '../electron/icons/icon.png'),
    path.join(__dirname, '../electron/icons/icon.icns'),
    path.join(__dirname, '../../electron/icons/icon.png'),
    path.join(__dirname, '../../electron/icons/icon.icns'),
    path.join(app.getAppPath(), 'electron/icons/icon.png'),
    path.join(app.getAppPath(), 'electron/icons/icon.icns'),
  ];

  for (const iconFile of possiblePaths) {
    if (existsSync(iconFile)) {
      console.log('[Electron] Found icon:', iconFile);
      return iconFile;
    }
  }
  console.log('[Electron] No icon found, using default');
  return undefined;
};

const createWindow = (): void => {
  // Determine icon path based on platform and availability
  const iconPath = getIconPath();

  // Convert icon path to nativeImage for better cross-platform support
  let iconImage: Electron.NativeImage | undefined;
  if (iconPath) {
    try {
      iconImage = nativeImage.createFromPath(iconPath);
      if (iconImage.isEmpty()) {
        console.warn('[Electron] Icon image is empty, falling back to path');
        iconImage = undefined;
      }
    } catch (error) {
      console.warn('[Electron] Failed to create native image from icon path:', error);
      iconImage = undefined;
    }
  }

  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'Open Data Modelling',
    icon: iconImage || iconPath, // Use nativeImage if available, fallback to path
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  // Set Content Security Policy for file:// protocol
  mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
    const csp =
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';";
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [csp],
      },
    });
  });

  // Also set CSP via meta tag injection for file:// protocol
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents
      .executeJavaScript(
        `
      if (!document.querySelector('meta[http-equiv="Content-Security-Policy"]')) {
        const meta = document.createElement('meta');
        meta.httpEquiv = 'Content-Security-Policy';
        meta.content = "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';";
        document.head.appendChild(meta);
      }
    `
      )
      .catch(() => {
        // Ignore errors
      });
  });

  // Load the app
  // Prioritize NODE_ENV over app.isPackaged
  // If NODE_ENV=production, always use production build (offline mode)
  // Only use dev server if explicitly in development mode
  const isProduction = process.env.NODE_ENV === 'production';

  // Resolve path relative to the main process file location
  // __dirname points to dist-electron/ when running built Electron app
  // app.getAppPath() returns the app's directory (frontend/ in dev, app.asar in packaged)
  const appPath = app.getAppPath();
  const indexPath = path.join(appPath, 'dist', 'index.html');
  const indexPathResolved = path.resolve(indexPath);

  console.log('app.getAppPath():', appPath);
  console.log('__dirname:', __dirname);
  console.log('indexPath:', indexPath);
  console.log('indexPath (resolved):', indexPathResolved);
  console.log('File exists:', existsSync(indexPathResolved));

  if (isProduction || existsSync(indexPathResolved)) {
    // Production mode: load from built files (offline mode)
    console.log('Loading production build from:', indexPathResolved);
    // Use loadFile with resolved absolute path
    mainWindow.loadFile(indexPathResolved).catch((err) => {
      console.error('Failed to load production build:', err);
      console.error('Attempted path:', indexPathResolved);
      // Try alternative path resolution
      const altPath = path.join(__dirname, '../dist/index.html');
      const altPathResolved = path.resolve(altPath);
      console.log('Trying alternative path:', altPathResolved);
      if (existsSync(altPathResolved)) {
        mainWindow.loadFile(altPathResolved).catch((altErr) => {
          console.error('Alternative path also failed:', altErr);
          // If production build fails and we're not explicitly in production, try dev server
          if (!isProduction) {
            console.log('Falling back to dev server...');
            mainWindow.loadURL('http://localhost:5173').catch((devErr) => {
              console.error('Failed to load dev server:', devErr);
            });
            mainWindow.webContents.openDevTools();
          }
        });
      } else if (!isProduction) {
        console.log('Falling back to dev server...');
        mainWindow.loadURL('http://localhost:5173').catch((devErr) => {
          console.error('Failed to load dev server:', devErr);
        });
        mainWindow.webContents.openDevTools();
      }
    });
  } else {
    // Development mode: use dev server
    console.log('Loading from dev server: http://localhost:5173');
    mainWindow.loadURL('http://localhost:5173').catch((err) => {
      console.error('Failed to load dev server:', err);
      mainWindow.webContents.once('did-fail-load', () => {
        console.log('Dev server not ready, showing error page');
        mainWindow.webContents.send('dev-server-error');
      });
    });
    mainWindow.webContents.openDevTools();
  }

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    console.error('Failed to load:', {
      errorCode,
      errorDescription,
      validatedURL,
    });
  });
};

// IPC handlers for file operations
ipcMain.handle('read-file', async (_event, path: string) => {
  try {
    const content = await readFile(path, 'utf-8');
    return content;
  } catch (error) {
    throw new Error(
      `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
});

ipcMain.handle('write-file', async (_event, filePath: string, data: string) => {
  try {
    // Ensure the directory exists before writing the file
    const dirPath = path.dirname(filePath);
    if (!existsSync(dirPath)) {
      console.log(`[Electron] Creating directory: ${dirPath}`);
      try {
        await mkdir(dirPath, { recursive: true });
        console.log(`[Electron] Directory created successfully: ${dirPath}`);
      } catch (mkdirError) {
        const mkdirErrorMessage =
          mkdirError instanceof Error ? mkdirError.message : 'Unknown error';
        console.error(`[Electron] Failed to create directory: ${dirPath}`, mkdirErrorMessage);
        throw new Error(`Failed to create directory ${dirPath}: ${mkdirErrorMessage}`);
      }
    }
    await writeFile(filePath, data, 'utf-8');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Electron] Failed to write file: ${filePath}`, errorMessage);
    throw new Error(`Failed to write file: ${errorMessage}`);
  }
});

ipcMain.handle('ensure-directory', async (_event, dirPath: string) => {
  try {
    if (!existsSync(dirPath)) {
      console.log(`[Electron] Creating directory: ${dirPath}`);
      await mkdir(dirPath, { recursive: true });
      console.log(`[Electron] Directory created successfully: ${dirPath}`);
      return true;
    }
    return true; // Directory already exists
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Electron] Failed to create directory: ${dirPath}`, errorMessage);
    throw new Error(`Failed to create directory ${dirPath}: ${errorMessage}`);
  }
});

ipcMain.handle('read-directory', async (_event, dirPath: string) => {
  try {
    const entries = await readdir(dirPath, { withFileTypes: true });
    const files = entries
      .filter((entry) => entry.isFile())
      .map((entry) => ({
        name: entry.name,
        path: path.join(dirPath, entry.name),
      }));
    return files;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error(`[Electron] Failed to read directory: ${dirPath}`, errorMessage);
    throw new Error(`Failed to read directory ${dirPath}: ${errorMessage}`);
  }
});

ipcMain.handle('delete-file', async (_event, filePath: string) => {
  try {
    await unlink(filePath);
    console.log(`[Electron] Deleted file: ${filePath}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Don't throw if file doesn't exist (already deleted)
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      console.error(`[Electron] Failed to delete file: ${filePath}`, errorMessage);
      throw new Error(`Failed to delete file ${filePath}: ${errorMessage}`);
    }
  }
});

ipcMain.handle('show-open-dialog', async (_event, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(options);
  return result;
});

ipcMain.handle('show-save-dialog', async (_event, options: Electron.SaveDialogOptions) => {
  const result = await dialog.showSaveDialog(options);
  return result;
});

// Set application name
app.setName('Open Data Modelling');

// Set dock/tray icon for macOS
if (process.platform === 'darwin') {
  app.whenReady().then(() => {
    const iconPath = getIconPath();
    if (iconPath && app.dock) {
      try {
        const icon = nativeImage.createFromPath(iconPath);
        if (!icon.isEmpty()) {
          app.dock.setIcon(iconPath);
          console.log('[Electron] Dock icon set successfully');
        } else {
          console.warn('[Electron] Icon file exists but could not be loaded');
        }
      } catch (error) {
        console.warn('[Electron] Failed to set dock icon:', error);
      }
    }
  });
}

// Request file system permissions for macOS
app.on('ready', () => {
  if (process.platform === 'darwin') {
    // Request file access permissions
    // Note: Actual permission requests happen when user interacts with file dialogs
    // macOS will prompt for permissions when file dialogs are used
  }
  createWindow();
});

// IPC handler for closing the app
ipcMain.handle('close-app', () => {
  app.quit();
});

// ============================================================================
// DuckDB-related IPC handlers
// ============================================================================

/**
 * Export database/OPFS data to a native file
 * This allows saving browser database content to the local filesystem
 */
ipcMain.handle(
  'duckdb:export',
  async (
    _event,
    options: {
      data: ArrayBuffer | string;
      defaultPath?: string;
      format: 'json' | 'csv' | 'duckdb';
    }
  ) => {
    try {
      const filters: Electron.FileFilter[] = [];
      let defaultExtension = '';

      switch (options.format) {
        case 'json':
          filters.push({ name: 'JSON Files', extensions: ['json'] });
          defaultExtension = '.json';
          break;
        case 'csv':
          filters.push({ name: 'CSV Files', extensions: ['csv'] });
          defaultExtension = '.csv';
          break;
        case 'duckdb':
          filters.push({ name: 'DuckDB Database', extensions: ['duckdb', 'db'] });
          defaultExtension = '.duckdb';
          break;
      }

      const defaultPath =
        options.defaultPath ||
        `data-model-export-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}${defaultExtension}`;

      const result = await dialog.showSaveDialog({
        title: 'Export Database',
        defaultPath,
        filters,
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // Write the data to file
      const dataToWrite =
        typeof options.data === 'string' ? options.data : Buffer.from(options.data);

      await writeFile(result.filePath, dataToWrite);
      console.log(`[Electron] DuckDB export saved to: ${result.filePath}`);

      return { success: true, filePath: result.filePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] DuckDB export failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Import database file from native filesystem
 * This allows loading database content from local files into the browser
 */
ipcMain.handle(
  'duckdb:import',
  async (
    _event,
    options: {
      formats?: ('json' | 'csv' | 'duckdb')[];
    }
  ) => {
    try {
      const filters: Electron.FileFilter[] = [];
      const formats = options.formats || ['json', 'csv'];

      if (formats.includes('json')) {
        filters.push({ name: 'JSON Files', extensions: ['json'] });
      }
      if (formats.includes('csv')) {
        filters.push({ name: 'CSV Files', extensions: ['csv'] });
      }
      if (formats.includes('duckdb')) {
        filters.push({ name: 'DuckDB Database', extensions: ['duckdb', 'db'] });
      }
      filters.push({ name: 'All Files', extensions: ['*'] });

      const result = await dialog.showOpenDialog({
        title: 'Import Database',
        filters,
        properties: ['openFile'],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePaths[0];
      if (!filePath) {
        return { success: false, error: 'No file selected' };
      }
      const content = await readFile(filePath);
      const extension = path.extname(filePath).toLowerCase();

      // Determine format from extension
      let format: 'json' | 'csv' | 'duckdb' | 'unknown' = 'unknown';
      if (extension === '.json') format = 'json';
      else if (extension === '.csv') format = 'csv';
      else if (extension === '.duckdb' || extension === '.db') format = 'duckdb';

      console.log(`[Electron] DuckDB import from: ${filePath} (format: ${format})`);

      return {
        success: true,
        filePath,
        format,
        content: content.toString('utf-8'),
        size: content.length,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] DuckDB import failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Get database file info (size, modification date, etc.)
 */
ipcMain.handle('duckdb:file-info', async (_event, filePath: string) => {
  try {
    const { stat } = await import('fs/promises');
    const stats = await stat(filePath);
    return {
      success: true,
      size: stats.size,
      created: stats.birthtime.toISOString(),
      modified: stats.mtime.toISOString(),
      isFile: stats.isFile(),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
});

/**
 * Check if a database file exists
 */
ipcMain.handle('duckdb:file-exists', async (_event, filePath: string) => {
  return existsSync(filePath);
});

/**
 * Delete a database file
 */
ipcMain.handle('duckdb:delete-file', async (_event, filePath: string) => {
  try {
    await unlink(filePath);
    console.log(`[Electron] Deleted database file: ${filePath}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Failed to delete database file:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Create a backup of a database file
 */
ipcMain.handle(
  'duckdb:backup',
  async (_event, options: { sourcePath: string; backupPath?: string }) => {
    try {
      const { copyFile } = await import('fs/promises');
      const backupPath =
        options.backupPath ||
        `${options.sourcePath}.backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;

      await copyFile(options.sourcePath, backupPath);
      console.log(`[Electron] Database backup created: ${backupPath}`);

      return { success: true, backupPath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Database backup failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// ============================================================================
// Git-related IPC handlers
// ============================================================================

// Lazy-load simple-git to avoid startup penalty
let simpleGitModule: typeof import('simple-git') | null = null;
async function getSimpleGit() {
  if (!simpleGitModule) {
    simpleGitModule = await import('simple-git');
  }
  return simpleGitModule.default;
}

/**
 * Get git status for a workspace
 * Supports workspaces that are subdirectories of a git repo
 */
ipcMain.handle('git:status', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    // Check if this path is inside a git repo (including parent directories)
    // checkIsRepo('root') returns true if any parent directory contains .git
    const isRepo = await git.checkIsRepo('root');
    if (!isRepo) {
      return {
        isGitRepo: false,
        currentBranch: null,
        files: [],
        ahead: 0,
        behind: 0,
        remoteName: null,
        remoteUrl: null,
        hasConflicts: false,
        conflictFiles: [],
        gitRoot: null,
      };
    }

    // Get the git root directory (may be different from workspacePath)
    const gitRoot = await git.revparse(['--show-toplevel']);

    // Get status
    const status = await git.status();

    // Get remote info
    let remoteName: string | null = null;
    let remoteUrl: string | null = null;
    try {
      const remotes = await git.getRemotes(true);
      const origin = remotes.find((r) => r.name === 'origin') || remotes[0];
      if (origin) {
        remoteName = origin.name;
        remoteUrl = origin.refs?.fetch || origin.refs?.push || null;
      }
    } catch {
      // No remotes configured
    }

    // Parse file changes
    const files: Array<{
      path: string;
      status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
      staged: boolean;
      oldPath?: string;
    }> = [];

    // Staged files
    for (const file of status.staged) {
      files.push({ path: file, status: 'added', staged: true });
    }
    for (const file of status.modified) {
      // Check if also staged
      const isStaged = status.staged.includes(file);
      if (!files.find((f) => f.path === file)) {
        files.push({ path: file, status: 'modified', staged: isStaged });
      }
    }
    for (const file of status.deleted) {
      files.push({ path: file, status: 'deleted', staged: status.staged.includes(file) });
    }
    for (const file of status.renamed) {
      files.push({ path: file.to, status: 'renamed', staged: true, oldPath: file.from });
    }
    for (const file of status.not_added) {
      files.push({ path: file, status: 'untracked', staged: false });
    }
    // Also include created files
    for (const file of status.created) {
      if (!files.find((f) => f.path === file)) {
        files.push({ path: file, status: 'added', staged: true });
      }
    }

    // Check for conflicts
    const hasConflicts = status.conflicted.length > 0;

    return {
      isGitRepo: true,
      currentBranch: status.current,
      files,
      ahead: status.ahead,
      behind: status.behind,
      remoteName,
      remoteUrl,
      hasConflicts,
      conflictFiles: status.conflicted,
      gitRoot: gitRoot.trim(),
    };
  } catch (error) {
    console.error('[Electron] Git status failed:', error);
    return {
      isGitRepo: false,
      currentBranch: null,
      files: [],
      ahead: 0,
      behind: 0,
      remoteName: null,
      remoteUrl: null,
      hasConflicts: false,
      conflictFiles: [],
      gitRoot: null,
    };
  }
});

/**
 * Stage specific files
 */
ipcMain.handle('git:add', async (_event, workspacePath: string, files: string[]) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    await git.add(files);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git add failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Stage all changes
 */
ipcMain.handle('git:add-all', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    await git.add('-A');
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git add all failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Create a commit
 */
ipcMain.handle('git:commit', async (_event, workspacePath: string, message: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    const result = await git.commit(message);
    return { success: true, hash: result.commit };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git commit failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Get commit history
 */
ipcMain.handle(
  'git:log',
  async (_event, workspacePath: string, options?: { maxCount?: number; file?: string }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const logOptions: Record<string, string | number> = {};
      if (options?.maxCount) {
        logOptions['--max-count'] = options.maxCount;
      }
      if (options?.file) {
        logOptions['--follow'] = '';
      }

      const log = options?.file
        ? await git.log({ file: options.file, maxCount: options.maxCount || 50 })
        : await git.log({ maxCount: options?.maxCount || 50 });

      return log.all.map((entry) => ({
        hash: entry.hash,
        hashShort: entry.hash.substring(0, 7),
        message: entry.message,
        author: entry.author_name,
        authorEmail: entry.author_email,
        date: entry.date,
      }));
    } catch (error) {
      console.error('[Electron] Git log failed:', error);
      return [];
    }
  }
);

/**
 * Get diff output
 */
ipcMain.handle(
  'git:diff',
  async (
    _event,
    workspacePath: string,
    options?: { staged?: boolean; file?: string; commit?: string }
  ) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const args: string[] = [];

      if (options?.commit) {
        // Diff for a specific commit
        args.push(`${options.commit}^`, options.commit);
      } else if (options?.staged) {
        args.push('--cached');
      }

      if (options?.file) {
        args.push('--', options.file);
      }

      const diff = await git.diff(args);
      return diff;
    } catch (error) {
      console.error('[Electron] Git diff failed:', error);
      return '';
    }
  }
);

/**
 * Get diff for a specific file
 */
ipcMain.handle('git:diff-file', async (_event, workspacePath: string, filePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    const diff = await git.diff(['--', filePath]);
    return diff;
  } catch (error) {
    console.error('[Electron] Git diff file failed:', error);
    return '';
  }
});

/**
 * Discard changes (checkout/clean)
 */
ipcMain.handle(
  'git:discard',
  async (_event, workspacePath: string, options?: { files?: string[] }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      if (options?.files && options.files.length > 0) {
        // Discard specific files
        await git.checkout(['--', ...options.files]);
      } else {
        // Discard all changes
        await git.checkout(['--', '.']);
        // Also clean untracked files
        await git.clean('fd');
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git discard failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Initialize a new git repository
 */
ipcMain.handle('git:init', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    await git.init();
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git init failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

// ============================================================================
// Phase 3: Branch Management
// ============================================================================

/**
 * List all branches (local and remote)
 */
ipcMain.handle('git:branches', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    const branchSummary = await git.branch(['-a', '-v']);

    const branches = {
      current: branchSummary.current,
      local: [] as Array<{
        name: string;
        commit: string;
        label: string;
        current: boolean;
      }>,
      remote: [] as Array<{
        name: string;
        commit: string;
        remoteName: string;
        branchName: string;
      }>,
    };

    for (const [name, data] of Object.entries(branchSummary.branches)) {
      if (name.startsWith('remotes/')) {
        // Remote branch
        const parts = name.replace('remotes/', '').split('/');
        const remoteName = parts[0];
        const branchName = parts.slice(1).join('/');
        // Skip HEAD pointer
        if (branchName !== 'HEAD') {
          branches.remote.push({
            name,
            commit: data.commit,
            remoteName: remoteName || '',
            branchName,
          });
        }
      } else {
        // Local branch
        branches.local.push({
          name,
          commit: data.commit,
          label: data.label || '',
          current: data.current,
        });
      }
    }

    return { success: true, ...branches };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git branches failed:', errorMessage);
    return { success: false, error: errorMessage, current: '', local: [], remote: [] };
  }
});

/**
 * Create a new branch
 */
ipcMain.handle(
  'git:branch-create',
  async (
    _event,
    workspacePath: string,
    branchName: string,
    options?: { checkout?: boolean; startPoint?: string }
  ) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      if (options?.checkout) {
        // Create and checkout in one operation
        const args = ['-b', branchName];
        if (options.startPoint) {
          args.push(options.startPoint);
        }
        await git.checkout(args);
      } else {
        // Just create the branch
        const args = [branchName];
        if (options?.startPoint) {
          args.push(options.startPoint);
        }
        await git.branch(args);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git branch create failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Switch to a branch
 */
ipcMain.handle('git:branch-checkout', async (_event, workspacePath: string, branchName: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    await git.checkout(branchName);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git checkout failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Delete a branch
 */
ipcMain.handle(
  'git:branch-delete',
  async (_event, workspacePath: string, branchName: string, options?: { force?: boolean }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const args = options?.force ? ['-D', branchName] : ['-d', branchName];
      await git.branch(args);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git branch delete failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Rename a branch
 */
ipcMain.handle(
  'git:branch-rename',
  async (_event, workspacePath: string, oldName: string, newName: string) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);
      await git.branch(['-m', oldName, newName]);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git branch rename failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// ============================================================================
// Phase 4: Remote Operations
// ============================================================================

/**
 * List remotes
 */
ipcMain.handle('git:remotes', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    const remotes = await git.getRemotes(true);

    return {
      success: true,
      remotes: remotes.map((r) => ({
        name: r.name,
        fetchUrl: r.refs?.fetch || null,
        pushUrl: r.refs?.push || null,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git remotes failed:', errorMessage);
    return { success: false, error: errorMessage, remotes: [] };
  }
});

/**
 * Add a remote
 */
ipcMain.handle(
  'git:remote-add',
  async (_event, workspacePath: string, name: string, url: string) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);
      await git.addRemote(name, url);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git remote add failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Remove a remote
 */
ipcMain.handle('git:remote-remove', async (_event, workspacePath: string, name: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);
    await git.removeRemote(name);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git remote remove failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Fetch from remote
 */
ipcMain.handle(
  'git:fetch',
  async (_event, workspacePath: string, options?: { remote?: string; prune?: boolean }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const fetchOptions: string[] = [];
      if (options?.prune) {
        fetchOptions.push('--prune');
      }

      if (options?.remote) {
        await git.fetch(options.remote, undefined, fetchOptions);
      } else {
        await git.fetch(fetchOptions);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git fetch failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Pull from remote
 */
ipcMain.handle(
  'git:pull',
  async (_event, workspacePath: string, options?: { remote?: string; branch?: string }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const pullResult = await git.pull(options?.remote, options?.branch);

      return {
        success: true,
        summary: {
          changes: pullResult.summary.changes,
          insertions: pullResult.summary.insertions,
          deletions: pullResult.summary.deletions,
        },
        files: pullResult.files,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git pull failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Push to remote
 */
ipcMain.handle(
  'git:push',
  async (
    _event,
    workspacePath: string,
    options?: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean }
  ) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const pushOptions: string[] = [];
      if (options?.setUpstream) {
        pushOptions.push('-u');
      }
      if (options?.force) {
        pushOptions.push('--force');
      }

      if (options?.remote && options?.branch) {
        await git.push(options.remote, options.branch, pushOptions);
      } else if (options?.remote) {
        await git.push(options.remote, undefined, pushOptions);
      } else {
        await git.push(pushOptions);
      }

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git push failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Get tracking branch info
 */
ipcMain.handle('git:tracking', async (_event, workspacePath: string, branchName?: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    // Get current branch if not specified
    const status = await git.status();
    const branch = branchName || status.current;

    // Get tracking info using rev-parse
    try {
      const upstream = await git.revparse([`${branch}@{upstream}`, '--abbrev-ref']);
      const parts = upstream.trim().split('/');
      const remoteName = parts[0];
      const remoteBranch = parts.slice(1).join('/');

      return {
        success: true,
        hasUpstream: true,
        remoteName: remoteName || null,
        remoteBranch: remoteBranch || null,
        ahead: status.ahead,
        behind: status.behind,
      };
    } catch {
      // No upstream configured
      return {
        success: true,
        hasUpstream: false,
        remoteName: null,
        remoteBranch: null,
        ahead: 0,
        behind: 0,
      };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git tracking failed:', errorMessage);
    return { success: false, error: errorMessage, hasUpstream: false };
  }
});

/**
 * Set upstream tracking branch
 */
ipcMain.handle(
  'git:set-upstream',
  async (_event, workspacePath: string, remote: string, branch: string) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      // Get current branch
      const status = await git.status();
      const currentBranch = status.current;

      // Set upstream
      await git.branch(['--set-upstream-to', `${remote}/${branch}`, currentBranch || 'HEAD']);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git set upstream failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// ============================================================================
// Phase 5: Advanced Features - Stash, Cherry-pick, Rebase
// ============================================================================

/**
 * List all stashes
 */
ipcMain.handle('git:stash-list', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    const stashList = await git.stashList();

    return {
      success: true,
      stashes: stashList.all.map((stash, index) => ({
        index,
        hash: stash.hash,
        message: stash.message,
        date: stash.date,
      })),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git stash list failed:', errorMessage);
    return { success: false, error: errorMessage, stashes: [] };
  }
});

/**
 * Save changes to stash
 */
ipcMain.handle(
  'git:stash-save',
  async (
    _event,
    workspacePath: string,
    options?: { message?: string; includeUntracked?: boolean; keepIndex?: boolean }
  ) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const args: string[] = ['push'];

      if (options?.includeUntracked) {
        args.push('--include-untracked');
      }
      if (options?.keepIndex) {
        args.push('--keep-index');
      }
      if (options?.message) {
        args.push('-m', options.message);
      }

      await git.stash(args);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git stash save failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Apply a stash (keep it in stash list)
 */
ipcMain.handle('git:stash-apply', async (_event, workspacePath: string, stashIndex?: number) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    const stashRef = stashIndex !== undefined ? `stash@{${stashIndex}}` : undefined;
    const args: string[] = ['apply'];
    if (stashRef) {
      args.push(stashRef);
    }

    await git.stash(args);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git stash apply failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Pop a stash (apply and remove from stash list)
 */
ipcMain.handle('git:stash-pop', async (_event, workspacePath: string, stashIndex?: number) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    const stashRef = stashIndex !== undefined ? `stash@{${stashIndex}}` : undefined;
    const args: string[] = ['pop'];
    if (stashRef) {
      args.push(stashRef);
    }

    await git.stash(args);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git stash pop failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Drop a stash
 */
ipcMain.handle('git:stash-drop', async (_event, workspacePath: string, stashIndex?: number) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    const stashRef = stashIndex !== undefined ? `stash@{${stashIndex}}` : undefined;
    const args: string[] = ['drop'];
    if (stashRef) {
      args.push(stashRef);
    }

    await git.stash(args);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git stash drop failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Clear all stashes
 */
ipcMain.handle('git:stash-clear', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    await git.stash(['clear']);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git stash clear failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Show stash diff
 */
ipcMain.handle('git:stash-show', async (_event, workspacePath: string, stashIndex?: number) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    const stashRef = stashIndex !== undefined ? `stash@{${stashIndex}}` : 'stash@{0}';

    // Get the diff for the stash
    const diff = await git.diff([stashRef + '^', stashRef]);

    return { success: true, diff };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git stash show failed:', errorMessage);
    return { success: false, error: errorMessage, diff: '' };
  }
});

/**
 * Cherry-pick a commit
 */
ipcMain.handle(
  'git:cherry-pick',
  async (_event, workspacePath: string, commitHash: string, options?: { noCommit?: boolean }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const args: string[] = [commitHash];
      if (options?.noCommit) {
        args.unshift('-n');
      }

      await git.raw(['cherry-pick', ...args]);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git cherry-pick failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Abort cherry-pick
 */
ipcMain.handle('git:cherry-pick-abort', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    await git.raw(['cherry-pick', '--abort']);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git cherry-pick abort failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Continue cherry-pick after resolving conflicts
 */
ipcMain.handle('git:cherry-pick-continue', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    await git.raw(['cherry-pick', '--continue']);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git cherry-pick continue failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Start interactive rebase
 */
ipcMain.handle(
  'git:rebase-start',
  async (
    _event,
    workspacePath: string,
    options: { onto?: string; branch?: string; interactive?: boolean; commits?: number }
  ) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const args: string[] = [];

      if (options.interactive) {
        args.push('-i');
      }

      if (options.onto) {
        args.push('--onto', options.onto);
      }

      if (options.commits) {
        // Rebase last N commits
        args.push(`HEAD~${options.commits}`);
      } else if (options.branch) {
        args.push(options.branch);
      }

      // For interactive rebase in non-interactive mode, we need to set the editor
      // to a no-op command so it doesn't hang waiting for user input
      if (options.interactive) {
        // Set GIT_SEQUENCE_EDITOR to cat so it uses the default todo list
        await git.env('GIT_SEQUENCE_EDITOR', 'cat');
      }

      await git.rebase(args);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git rebase start failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Continue rebase after resolving conflicts
 */
ipcMain.handle('git:rebase-continue', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    await git.rebase(['--continue']);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git rebase continue failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Abort rebase
 */
ipcMain.handle('git:rebase-abort', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    await git.rebase(['--abort']);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git rebase abort failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Skip current commit during rebase
 */
ipcMain.handle('git:rebase-skip', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    await git.rebase(['--skip']);

    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git rebase skip failed:', errorMessage);
    return { success: false, error: errorMessage };
  }
});

/**
 * Get rebase status (check if rebase is in progress)
 */
ipcMain.handle('git:rebase-status', async (_event, workspacePath: string) => {
  try {
    const simpleGit = await getSimpleGit();
    const git = simpleGit(workspacePath);

    // Check for rebase-merge or rebase-apply directories
    const gitDir = await git.revparse(['--git-dir']);
    const { existsSync } = await import('fs');
    const rebaseMerge = existsSync(path.join(workspacePath, gitDir.trim(), 'rebase-merge'));
    const rebaseApply = existsSync(path.join(workspacePath, gitDir.trim(), 'rebase-apply'));

    const isRebasing = rebaseMerge || rebaseApply;

    let currentStep = 0;
    let totalSteps = 0;

    if (isRebasing) {
      try {
        const { readFile } = await import('fs/promises');
        const baseDir = rebaseMerge
          ? path.join(workspacePath, gitDir.trim(), 'rebase-merge')
          : path.join(workspacePath, gitDir.trim(), 'rebase-apply');

        const msgNumFile = path.join(baseDir, 'msgnum');
        const endFile = path.join(baseDir, 'end');

        if (existsSync(msgNumFile)) {
          currentStep = parseInt(await readFile(msgNumFile, 'utf-8'), 10);
        }
        if (existsSync(endFile)) {
          totalSteps = parseInt(await readFile(endFile, 'utf-8'), 10);
        }
      } catch {
        // Ignore errors reading progress files
      }
    }

    return {
      success: true,
      isRebasing,
      currentStep,
      totalSteps,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Electron] Git rebase status failed:', errorMessage);
    return { success: false, error: errorMessage, isRebasing: false };
  }
});

/**
 * Reset to a specific commit
 */
ipcMain.handle(
  'git:reset',
  async (
    _event,
    workspacePath: string,
    commitHash: string,
    options?: { mode?: 'soft' | 'mixed' | 'hard' }
  ) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const mode = options?.mode || 'mixed';
      await git.reset([`--${mode}`, commitHash]);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git reset failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

/**
 * Revert a commit (create a new commit that undoes the changes)
 */
ipcMain.handle(
  'git:revert',
  async (_event, workspacePath: string, commitHash: string, options?: { noCommit?: boolean }) => {
    try {
      const simpleGit = await getSimpleGit();
      const git = simpleGit(workspacePath);

      const args: string[] = [commitHash];
      if (options?.noCommit) {
        args.unshift('-n');
      }

      await git.revert(args);

      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[Electron] Git revert failed:', errorMessage);
      return { success: false, error: errorMessage };
    }
  }
);

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
