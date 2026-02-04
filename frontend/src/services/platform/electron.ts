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
  gitRoot: string | null; // The root of the git repo (may be parent of workspace)
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

// Phase 3: Branch Management Types
export interface GitBranchInfo {
  name: string;
  commit: string;
  label: string;
  current: boolean;
}

export interface GitRemoteBranchInfo {
  name: string;
  commit: string;
  remoteName: string;
  branchName: string;
}

export interface GitBranchesResult {
  success: boolean;
  error?: string;
  current: string;
  local: GitBranchInfo[];
  remote: GitRemoteBranchInfo[];
}

export interface GitBranchCreateOptions {
  checkout?: boolean;
  startPoint?: string;
}

export interface GitBranchDeleteOptions {
  force?: boolean;
}

// Phase 4: Remote Operations Types
export interface GitRemoteInfo {
  name: string;
  fetchUrl: string | null;
  pushUrl: string | null;
}

export interface GitRemotesResult {
  success: boolean;
  error?: string;
  remotes: GitRemoteInfo[];
}

export interface GitFetchOptions {
  remote?: string;
  prune?: boolean;
}

export interface GitPullOptions {
  remote?: string;
  branch?: string;
}

export interface GitPullResult {
  success: boolean;
  error?: string;
  summary?: {
    changes: number;
    insertions: number;
    deletions: number;
  };
  files?: string[];
}

export interface GitPushOptions {
  remote?: string;
  branch?: string;
  setUpstream?: boolean;
  force?: boolean;
}

export interface GitTrackingResult {
  success: boolean;
  error?: string;
  hasUpstream: boolean;
  remoteName: string | null;
  remoteBranch: string | null;
  ahead: number;
  behind: number;
}

// Phase 5: Advanced Git Operations Types

// Stash Types
export interface GitStashEntry {
  index: number;
  hash: string;
  message: string;
  date: string;
  branch: string;
}

export interface GitStashListResult {
  success: boolean;
  error?: string;
  stashes: GitStashEntry[];
}

export interface GitStashSaveOptions {
  message?: string;
  includeUntracked?: boolean;
  keepIndex?: boolean;
}

export interface GitStashShowResult {
  success: boolean;
  error?: string;
  diff: string;
  files: string[];
}

// Cherry-pick Types
export interface GitCherryPickOptions {
  noCommit?: boolean;
  mainline?: number; // For merge commits
}

export interface GitCherryPickResult {
  success: boolean;
  error?: string;
  hash?: string;
  hasConflicts?: boolean;
  conflictFiles?: string[];
}

// Rebase Types
export interface GitRebaseOptions {
  interactive?: boolean;
  autosquash?: boolean;
  autostash?: boolean;
}

export interface GitRebaseStatusResult {
  success: boolean;
  error?: string;
  isRebasing: boolean;
  currentCommit?: string;
  headName?: string;
  onto?: string;
  done?: number;
  remaining?: number;
  conflictFiles?: string[];
}

// Reset Types
export interface GitResetOptions {
  mode: 'soft' | 'mixed' | 'hard';
}

export interface GitResetResult {
  success: boolean;
  error?: string;
}

// Revert Types
export interface GitRevertOptions {
  noCommit?: boolean;
  mainline?: number; // For merge commits
}

export interface GitRevertResult {
  success: boolean;
  error?: string;
  hash?: string;
  hasConflicts?: boolean;
  conflictFiles?: string[];
}

// Phase 6: Tag Types
export interface GitTag {
  name: string;
  hash: string;
  message?: string;
  tagger?: string;
  taggerEmail?: string;
  date?: string;
  isAnnotated: boolean;
}

export interface GitTagListResult {
  success: boolean;
  error?: string;
  tags: GitTag[];
}

export interface GitTagCreateOptions {
  message?: string; // If provided, creates an annotated tag
  commit?: string; // SHA to tag (defaults to HEAD)
  force?: boolean; // Overwrite existing tag
}

export interface GitTagDeleteOptions {
  remote?: string; // Also delete from remote
}

export interface GitTagPushOptions {
  remote?: string;
  allTags?: boolean;
}

// Phase 6: Blame Types
export interface GitBlameLine {
  lineNumber: number;
  content: string;
  commit: {
    hash: string;
    hashShort: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
  };
  isOriginal: boolean; // True if this line hasn't changed since the file was created
}

export interface GitBlameResult {
  success: boolean;
  error?: string;
  lines: GitBlameLine[];
  filePath: string;
}

export interface GitBlameOptions {
  startLine?: number;
  endLine?: number;
  commit?: string; // Blame at specific commit (defaults to HEAD)
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
      // Phase 3: Branch Management
      gitBranches: (workspacePath: string) => Promise<GitBranchesResult>;
      gitBranchCreate: (
        workspacePath: string,
        branchName: string,
        options?: GitBranchCreateOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitBranchCheckout: (
        workspacePath: string,
        branchName: string
      ) => Promise<{ success: boolean; error?: string }>;
      gitBranchDelete: (
        workspacePath: string,
        branchName: string,
        options?: GitBranchDeleteOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitBranchRename: (
        workspacePath: string,
        oldName: string,
        newName: string
      ) => Promise<{ success: boolean; error?: string }>;
      // Phase 4: Remote Operations
      gitRemotes: (workspacePath: string) => Promise<GitRemotesResult>;
      gitRemoteAdd: (
        workspacePath: string,
        name: string,
        url: string
      ) => Promise<{ success: boolean; error?: string }>;
      gitRemoteRemove: (
        workspacePath: string,
        name: string
      ) => Promise<{ success: boolean; error?: string }>;
      gitFetch: (
        workspacePath: string,
        options?: GitFetchOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitPull: (workspacePath: string, options?: GitPullOptions) => Promise<GitPullResult>;
      gitPush: (
        workspacePath: string,
        options?: GitPushOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitTracking: (workspacePath: string, branchName?: string) => Promise<GitTrackingResult>;
      gitSetUpstream: (
        workspacePath: string,
        remote: string,
        branch: string
      ) => Promise<{ success: boolean; error?: string }>;
      // Phase 5: Advanced Operations - Stash
      gitStashList: (workspacePath: string) => Promise<GitStashListResult>;
      gitStashSave: (
        workspacePath: string,
        options?: GitStashSaveOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitStashApply: (
        workspacePath: string,
        stashIndex?: number
      ) => Promise<{ success: boolean; error?: string; hasConflicts?: boolean }>;
      gitStashPop: (
        workspacePath: string,
        stashIndex?: number
      ) => Promise<{ success: boolean; error?: string; hasConflicts?: boolean }>;
      gitStashDrop: (
        workspacePath: string,
        stashIndex: number
      ) => Promise<{ success: boolean; error?: string }>;
      gitStashClear: (workspacePath: string) => Promise<{ success: boolean; error?: string }>;
      gitStashShow: (workspacePath: string, stashIndex?: number) => Promise<GitStashShowResult>;
      // Phase 5: Advanced Operations - Cherry-pick
      gitCherryPick: (
        workspacePath: string,
        commitHash: string,
        options?: GitCherryPickOptions
      ) => Promise<GitCherryPickResult>;
      gitCherryPickAbort: (workspacePath: string) => Promise<{ success: boolean; error?: string }>;
      gitCherryPickContinue: (workspacePath: string) => Promise<GitCherryPickResult>;
      // Phase 5: Advanced Operations - Rebase
      gitRebaseStart: (
        workspacePath: string,
        upstream: string,
        options?: GitRebaseOptions
      ) => Promise<{ success: boolean; error?: string; hasConflicts?: boolean }>;
      gitRebaseContinue: (
        workspacePath: string
      ) => Promise<{ success: boolean; error?: string; hasConflicts?: boolean }>;
      gitRebaseAbort: (workspacePath: string) => Promise<{ success: boolean; error?: string }>;
      gitRebaseSkip: (
        workspacePath: string
      ) => Promise<{ success: boolean; error?: string; hasConflicts?: boolean }>;
      gitRebaseStatus: (workspacePath: string) => Promise<GitRebaseStatusResult>;
      // Phase 5: Advanced Operations - Reset & Revert
      gitReset: (
        workspacePath: string,
        commitHash: string,
        options?: GitResetOptions
      ) => Promise<GitResetResult>;
      gitRevert: (
        workspacePath: string,
        commitHash: string,
        options?: GitRevertOptions
      ) => Promise<GitRevertResult>;
      // Phase 6: Tag Operations
      gitTagList: (workspacePath: string) => Promise<GitTagListResult>;
      gitTagCreate: (
        workspacePath: string,
        tagName: string,
        options?: GitTagCreateOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitTagDelete: (
        workspacePath: string,
        tagName: string,
        options?: GitTagDeleteOptions
      ) => Promise<{ success: boolean; error?: string }>;
      gitTagPush: (
        workspacePath: string,
        tagName?: string,
        options?: GitTagPushOptions
      ) => Promise<{ success: boolean; error?: string }>;
      // Phase 6: Blame Operations
      gitBlame: (
        workspacePath: string,
        filePath: string,
        options?: GitBlameOptions
      ) => Promise<GitBlameResult>;
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
