import { contextBridge, ipcRenderer, shell } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // File system operations
  readFile: async (path: string): Promise<string> => {
    return await ipcRenderer.invoke('read-file', path);
  },
  writeFile: async (path: string, data: string): Promise<void> => {
    return await ipcRenderer.invoke('write-file', path, data);
  },
  ensureDirectory: async (path: string): Promise<boolean> => {
    return await ipcRenderer.invoke('ensure-directory', path);
  },
  readDirectory: async (path: string): Promise<Array<{ name: string; path: string }>> => {
    return await ipcRenderer.invoke('read-directory', path);
  },
  deleteFile: async (path: string): Promise<void> => {
    return await ipcRenderer.invoke('delete-file', path);
  },
  showOpenDialog: async (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
    properties?: Array<'openFile' | 'openDirectory' | 'multiSelections'>;
  }): Promise<{ canceled: boolean; filePaths: string[] }> => {
    return await ipcRenderer.invoke('show-open-dialog', options);
  },
  showSaveDialog: async (options: {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<{ canceled: boolean; filePath?: string }> => {
    return await ipcRenderer.invoke('show-save-dialog', options);
  },
  // Open external URL in system browser
  openExternal: async (url: string): Promise<void> => {
    shell.openExternal(url);
  },
  // Close the application
  closeApp: async (): Promise<void> => {
    return await ipcRenderer.invoke('close-app');
  },

  // ============================================================================
  // DuckDB-related operations
  // ============================================================================

  /**
   * Export database data to a native file
   */
  duckdbExport: async (options: {
    data: ArrayBuffer | string;
    defaultPath?: string;
    format: 'json' | 'csv' | 'duckdb';
  }): Promise<{ success: boolean; filePath?: string; canceled?: boolean; error?: string }> => {
    return await ipcRenderer.invoke('duckdb:export', options);
  },

  /**
   * Import database file from native filesystem
   */
  duckdbImport: async (options?: {
    formats?: ('json' | 'csv' | 'duckdb')[];
  }): Promise<{
    success: boolean;
    filePath?: string;
    format?: 'json' | 'csv' | 'duckdb' | 'unknown';
    content?: string;
    size?: number;
    canceled?: boolean;
    error?: string;
  }> => {
    return await ipcRenderer.invoke('duckdb:import', options || {});
  },

  /**
   * Get database file info
   */
  duckdbFileInfo: async (
    filePath: string
  ): Promise<{
    success: boolean;
    size?: number;
    created?: string;
    modified?: string;
    isFile?: boolean;
    error?: string;
  }> => {
    return await ipcRenderer.invoke('duckdb:file-info', filePath);
  },

  /**
   * Check if database file exists
   */
  duckdbFileExists: async (filePath: string): Promise<boolean> => {
    return await ipcRenderer.invoke('duckdb:file-exists', filePath);
  },

  /**
   * Delete a database file
   */
  duckdbDeleteFile: async (filePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('duckdb:delete-file', filePath);
  },

  /**
   * Create a backup of a database file
   */
  duckdbBackup: async (options: {
    sourcePath: string;
    backupPath?: string;
  }): Promise<{ success: boolean; backupPath?: string; error?: string }> => {
    return await ipcRenderer.invoke('duckdb:backup', options);
  },

  // ============================================================================
  // Git-related operations
  // ============================================================================

  /**
   * Get git status for a workspace
   */
  gitStatus: async (
    workspacePath: string
  ): Promise<{
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
  }> => {
    return await ipcRenderer.invoke('git:status', workspacePath);
  },

  /**
   * Stage specific files
   */
  gitAdd: async (
    workspacePath: string,
    files: string[]
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:add', workspacePath, files);
  },

  /**
   * Stage all changes
   */
  gitAddAll: async (workspacePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:add-all', workspacePath);
  },

  /**
   * Create a commit
   */
  gitCommit: async (
    workspacePath: string,
    message: string
  ): Promise<{ success: boolean; hash?: string; error?: string }> => {
    return await ipcRenderer.invoke('git:commit', workspacePath, message);
  },

  /**
   * Get commit history
   */
  gitLog: async (
    workspacePath: string,
    options?: { maxCount?: number; file?: string }
  ): Promise<
    Array<{
      hash: string;
      hashShort: string;
      message: string;
      author: string;
      authorEmail: string;
      date: string;
    }>
  > => {
    return await ipcRenderer.invoke('git:log', workspacePath, options);
  },

  /**
   * Get diff output
   */
  gitDiff: async (
    workspacePath: string,
    options?: { staged?: boolean; file?: string; commit?: string }
  ): Promise<string> => {
    return await ipcRenderer.invoke('git:diff', workspacePath, options);
  },

  /**
   * Get diff for a specific file
   */
  gitDiffFile: async (workspacePath: string, filePath: string): Promise<string> => {
    return await ipcRenderer.invoke('git:diff-file', workspacePath, filePath);
  },

  /**
   * Discard changes
   */
  gitDiscard: async (
    workspacePath: string,
    options?: { files?: string[] }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:discard', workspacePath, options);
  },

  /**
   * Initialize a new git repository
   */
  gitInit: async (workspacePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:init', workspacePath);
  },
});
