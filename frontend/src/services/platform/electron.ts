/**
 * Electron-specific platform implementations
 */

import { getPlatform } from './platform';

// Electron dialog options types
export interface OpenDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
}

export interface SaveDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
}

export interface OpenDialogReturnValue {
  canceled: boolean;
  filePaths: string[];
}

export interface SaveDialogReturnValue {
  canceled: boolean;
  filePath?: string;
}

// DuckDB IPC types
export interface DuckDBExportOptions {
  data: ArrayBuffer | string;
  defaultPath?: string;
  format: 'json' | 'csv' | 'duckdb';
}

export interface DuckDBExportResult {
  success: boolean;
  filePath?: string;
  canceled?: boolean;
  error?: string;
}

export interface DuckDBImportOptions {
  formats?: ('json' | 'csv' | 'duckdb')[];
}

export interface DuckDBImportResult {
  success: boolean;
  filePath?: string;
  format?: 'json' | 'csv' | 'duckdb' | 'unknown';
  content?: string;
  size?: number;
  canceled?: boolean;
  error?: string;
}

export interface DuckDBFileInfo {
  success: boolean;
  size?: number;
  created?: string;
  modified?: string;
  isFile?: boolean;
  error?: string;
}

export interface DuckDBBackupOptions {
  sourcePath: string;
  backupPath?: string;
}

export interface DuckDBBackupResult {
  success: boolean;
  backupPath?: string;
  error?: string;
}

// Git IPC types
export interface GitStatusResult {
  isGitRepo: boolean;
  currentBranch: string | null;
  files: Array<{
    path: string;
    status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
    staged: boolean;
    oldPath?: string;
  }>;
  ahead: number;
  behind: number;
  remoteName: string | null;
  remoteUrl: string | null;
  hasConflicts: boolean;
  conflictFiles: string[];
}

export interface GitCommitResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface GitLogOptions {
  maxCount?: number;
  file?: string;
}

export interface GitLogEntry {
  hash: string;
  hashShort: string;
  message: string;
  author: string;
  authorEmail: string;
  date: string;
}

export interface GitDiffOptions {
  staged?: boolean;
  file?: string;
  commit?: string;
}

export interface GitDiscardOptions {
  files?: string[]; // If empty, discard all changes
}

declare global {
  interface Window {
    electronAPI?: {
      // File operations
      readFile: (path: string) => Promise<string>;
      writeFile: (path: string, data: string) => Promise<void>;
      ensureDirectory: (path: string) => Promise<boolean>;
      readDirectory: (path: string) => Promise<Array<{ name: string; path: string }>>;
      deleteFile: (path: string) => Promise<void>;
      showOpenDialog: (options: OpenDialogOptions) => Promise<OpenDialogReturnValue>;
      showSaveDialog: (options: SaveDialogOptions) => Promise<SaveDialogReturnValue>;
      openExternal: (url: string) => Promise<void>;
      closeApp: () => Promise<void>;
      // DuckDB operations
      duckdbExport: (options: DuckDBExportOptions) => Promise<DuckDBExportResult>;
      duckdbImport: (options?: DuckDBImportOptions) => Promise<DuckDBImportResult>;
      duckdbFileInfo: (filePath: string) => Promise<DuckDBFileInfo>;
      duckdbFileExists: (filePath: string) => Promise<boolean>;
      duckdbDeleteFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
      duckdbBackup: (options: DuckDBBackupOptions) => Promise<DuckDBBackupResult>;
      // Git operations
      gitStatus: (workspacePath: string) => Promise<GitStatusResult>;
      gitAdd: (
        workspacePath: string,
        files: string[]
      ) => Promise<{ success: boolean; error?: string }>;
      gitAddAll: (workspacePath: string) => Promise<{ success: boolean; error?: string }>;
      gitCommit: (workspacePath: string, message: string) => Promise<GitCommitResult>;
      gitLog: (workspacePath: string, options?: GitLogOptions) => Promise<GitLogEntry[]>;
      gitDiff: (workspacePath: string, options?: GitDiffOptions) => Promise<string>;
      gitDiffFile: (workspacePath: string, filePath: string) => Promise<string>;
      gitDiscard: (
        workspacePath: string,
        options?: GitDiscardOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitInit: (workspacePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}

/**
 * Electron file operations using native file system
 */
export const electronFileService = {
  /**
   * Read file using Electron API
   */
  async readFile(path: string): Promise<string> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.readFile(path);
  },

  /**
   * Write file using Electron API
   */
  async writeFile(path: string, data: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.writeFile(path, data);
  },

  /**
   * Ensure directory exists (create if it doesn't)
   */
  async ensureDirectory(path: string): Promise<boolean> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.ensureDirectory(path);
  },

  /**
   * Read directory contents
   */
  async readDirectory(path: string): Promise<Array<{ name: string; path: string }>> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.readDirectory(path);
  },

  /**
   * Delete a file
   */
  async deleteFile(path: string): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.deleteFile(path);
  },

  /**
   * Show open file dialog
   */
  async showOpenDialog(options: OpenDialogOptions): Promise<OpenDialogReturnValue> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.showOpenDialog(options);
  },

  /**
   * Show save file dialog
   */
  async showSaveDialog(options: SaveDialogOptions): Promise<SaveDialogReturnValue> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }
    return window.electronAPI.showSaveDialog(options);
  },
};

/**
 * Close the Electron application
 */
export async function closeElectronApp(): Promise<void> {
  if (!window.electronAPI) {
    throw new Error('Electron API not available. Please ensure you are running in Electron.');
  }

  // Check if closeApp function exists
  if (typeof window.electronAPI.closeApp !== 'function') {
    console.error(
      '[closeElectronApp] closeApp function not found on electronAPI. Available methods:',
      Object.keys(window.electronAPI)
    );
    throw new Error(
      'closeApp function not available. The Electron preload script may need to be rebuilt. Run: npm run build:electron'
    );
  }

  return window.electronAPI.closeApp();
}

/**
 * Electron platform detection
 */
export function isElectronPlatform(): boolean {
  return getPlatform() === 'electron';
}
