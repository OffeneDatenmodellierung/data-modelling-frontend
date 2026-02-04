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
  // Git-related operations
  // ============================================================================

  /**
   * Get git status for a workspace
   * Supports workspaces that are subdirectories of a git repo
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
    gitRoot: string | null;
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

  // ============================================================================
  // Phase 3: Branch Management
  // ============================================================================

  /**
   * List all branches (local and remote)
   */
  gitBranches: async (
    workspacePath: string
  ): Promise<{
    success: boolean;
    error?: string;
    current: string;
    local: Array<{ name: string; commit: string; label: string; current: boolean }>;
    remote: Array<{ name: string; commit: string; remoteName: string; branchName: string }>;
  }> => {
    return await ipcRenderer.invoke('git:branches', workspacePath);
  },

  /**
   * Create a new branch
   */
  gitBranchCreate: async (
    workspacePath: string,
    branchName: string,
    options?: { checkout?: boolean; startPoint?: string }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:branch-create', workspacePath, branchName, options);
  },

  /**
   * Switch to a branch
   */
  gitBranchCheckout: async (
    workspacePath: string,
    branchName: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:branch-checkout', workspacePath, branchName);
  },

  /**
   * Delete a branch
   */
  gitBranchDelete: async (
    workspacePath: string,
    branchName: string,
    options?: { force?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:branch-delete', workspacePath, branchName, options);
  },

  /**
   * Rename a branch
   */
  gitBranchRename: async (
    workspacePath: string,
    oldName: string,
    newName: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:branch-rename', workspacePath, oldName, newName);
  },

  // ============================================================================
  // Phase 4: Remote Operations
  // ============================================================================

  /**
   * List remotes
   */
  gitRemotes: async (
    workspacePath: string
  ): Promise<{
    success: boolean;
    error?: string;
    remotes: Array<{ name: string; fetchUrl: string | null; pushUrl: string | null }>;
  }> => {
    return await ipcRenderer.invoke('git:remotes', workspacePath);
  },

  /**
   * Add a remote
   */
  gitRemoteAdd: async (
    workspacePath: string,
    name: string,
    url: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:remote-add', workspacePath, name, url);
  },

  /**
   * Remove a remote
   */
  gitRemoteRemove: async (
    workspacePath: string,
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:remote-remove', workspacePath, name);
  },

  /**
   * Fetch from remote
   */
  gitFetch: async (
    workspacePath: string,
    options?: { remote?: string; prune?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:fetch', workspacePath, options);
  },

  /**
   * Pull from remote
   */
  gitPull: async (
    workspacePath: string,
    options?: { remote?: string; branch?: string }
  ): Promise<{
    success: boolean;
    error?: string;
    summary?: { changes: number; insertions: number; deletions: number };
    files?: string[];
  }> => {
    return await ipcRenderer.invoke('git:pull', workspacePath, options);
  },

  /**
   * Push to remote
   */
  gitPush: async (
    workspacePath: string,
    options?: { remote?: string; branch?: string; setUpstream?: boolean; force?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:push', workspacePath, options);
  },

  /**
   * Get tracking branch info
   */
  gitTracking: async (
    workspacePath: string,
    branchName?: string
  ): Promise<{
    success: boolean;
    error?: string;
    hasUpstream: boolean;
    remoteName: string | null;
    remoteBranch: string | null;
    ahead: number;
    behind: number;
  }> => {
    return await ipcRenderer.invoke('git:tracking', workspacePath, branchName);
  },

  /**
   * Set upstream tracking branch
   */
  gitSetUpstream: async (
    workspacePath: string,
    remote: string,
    branch: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:set-upstream', workspacePath, remote, branch);
  },

  // ============================================================================
  // Phase 5: Advanced Operations - Stash
  // ============================================================================

  /**
   * List all stashes
   */
  gitStashList: async (
    workspacePath: string
  ): Promise<{
    success: boolean;
    error?: string;
    stashes: Array<{
      index: number;
      hash: string;
      message: string;
      date: string;
      branch: string;
    }>;
  }> => {
    return await ipcRenderer.invoke('git:stash-list', workspacePath);
  },

  /**
   * Save changes to stash
   */
  gitStashSave: async (
    workspacePath: string,
    options?: { message?: string; includeUntracked?: boolean; keepIndex?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:stash-save', workspacePath, options);
  },

  /**
   * Apply a stash (keeps the stash)
   */
  gitStashApply: async (
    workspacePath: string,
    stashIndex?: number
  ): Promise<{ success: boolean; error?: string; hasConflicts?: boolean }> => {
    return await ipcRenderer.invoke('git:stash-apply', workspacePath, stashIndex);
  },

  /**
   * Pop a stash (removes from stash list)
   */
  gitStashPop: async (
    workspacePath: string,
    stashIndex?: number
  ): Promise<{ success: boolean; error?: string; hasConflicts?: boolean }> => {
    return await ipcRenderer.invoke('git:stash-pop', workspacePath, stashIndex);
  },

  /**
   * Drop a specific stash
   */
  gitStashDrop: async (
    workspacePath: string,
    stashIndex: number
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:stash-drop', workspacePath, stashIndex);
  },

  /**
   * Clear all stashes
   */
  gitStashClear: async (workspacePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:stash-clear', workspacePath);
  },

  /**
   * Show stash contents
   */
  gitStashShow: async (
    workspacePath: string,
    stashIndex?: number
  ): Promise<{ success: boolean; error?: string; diff: string; files: string[] }> => {
    return await ipcRenderer.invoke('git:stash-show', workspacePath, stashIndex);
  },

  // ============================================================================
  // Phase 5: Advanced Operations - Cherry-pick
  // ============================================================================

  /**
   * Cherry-pick a commit
   */
  gitCherryPick: async (
    workspacePath: string,
    commitHash: string,
    options?: { noCommit?: boolean; mainline?: number }
  ): Promise<{
    success: boolean;
    error?: string;
    hash?: string;
    hasConflicts?: boolean;
    conflictFiles?: string[];
  }> => {
    return await ipcRenderer.invoke('git:cherry-pick', workspacePath, commitHash, options);
  },

  /**
   * Abort cherry-pick
   */
  gitCherryPickAbort: async (
    workspacePath: string
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:cherry-pick-abort', workspacePath);
  },

  /**
   * Continue cherry-pick after resolving conflicts
   */
  gitCherryPickContinue: async (
    workspacePath: string
  ): Promise<{
    success: boolean;
    error?: string;
    hash?: string;
    hasConflicts?: boolean;
    conflictFiles?: string[];
  }> => {
    return await ipcRenderer.invoke('git:cherry-pick-continue', workspacePath);
  },

  // ============================================================================
  // Phase 5: Advanced Operations - Rebase
  // ============================================================================

  /**
   * Start a rebase
   */
  gitRebaseStart: async (
    workspacePath: string,
    upstream: string,
    options?: { interactive?: boolean; autosquash?: boolean; autostash?: boolean }
  ): Promise<{ success: boolean; error?: string; hasConflicts?: boolean }> => {
    return await ipcRenderer.invoke('git:rebase-start', workspacePath, upstream, options);
  },

  /**
   * Continue rebase after resolving conflicts
   */
  gitRebaseContinue: async (
    workspacePath: string
  ): Promise<{ success: boolean; error?: string; hasConflicts?: boolean }> => {
    return await ipcRenderer.invoke('git:rebase-continue', workspacePath);
  },

  /**
   * Abort rebase
   */
  gitRebaseAbort: async (workspacePath: string): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:rebase-abort', workspacePath);
  },

  /**
   * Skip current commit during rebase
   */
  gitRebaseSkip: async (
    workspacePath: string
  ): Promise<{ success: boolean; error?: string; hasConflicts?: boolean }> => {
    return await ipcRenderer.invoke('git:rebase-skip', workspacePath);
  },

  /**
   * Get rebase status
   */
  gitRebaseStatus: async (
    workspacePath: string
  ): Promise<{
    success: boolean;
    error?: string;
    isRebasing: boolean;
    currentCommit?: string;
    headName?: string;
    onto?: string;
    done?: number;
    remaining?: number;
    conflictFiles?: string[];
  }> => {
    return await ipcRenderer.invoke('git:rebase-status', workspacePath);
  },

  // ============================================================================
  // Phase 5: Advanced Operations - Reset & Revert
  // ============================================================================

  /**
   * Reset to a specific commit
   */
  gitReset: async (
    workspacePath: string,
    commitHash: string,
    options?: { mode: 'soft' | 'mixed' | 'hard' }
  ): Promise<{ success: boolean; error?: string }> => {
    return await ipcRenderer.invoke('git:reset', workspacePath, commitHash, options);
  },

  /**
   * Revert a commit (creates a new commit that undoes the changes)
   */
  gitRevert: async (
    workspacePath: string,
    commitHash: string,
    options?: { noCommit?: boolean; mainline?: number }
  ): Promise<{
    success: boolean;
    error?: string;
    hash?: string;
    hasConflicts?: boolean;
    conflictFiles?: string[];
  }> => {
    return await ipcRenderer.invoke('git:revert', workspacePath, commitHash, options);
  },
});
