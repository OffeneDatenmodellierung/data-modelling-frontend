/**
 * Git Service
 * High-level git operations that integrate with the gitStore
 */

import {
  useGitStore,
  GitCommit,
  GitStatus,
  GitFileChange,
  GitBranch,
  GitRemoteBranch,
  GitRemote,
} from '@/stores/gitStore';
import { getPlatform } from '@/services/platform/platform';
import type {
  GitLogOptions,
  GitDiffOptions,
  GitDiscardOptions,
  GitBranchCreateOptions,
  GitBranchDeleteOptions,
  GitFetchOptions,
  GitPullOptions,
  GitPushOptions,
} from '@/services/platform/electron';

class GitService {
  private refreshInterval: ReturnType<typeof setInterval> | null = null;
  private autoRefreshEnabled = false;

  /**
   * Check if git operations are available (Electron only)
   */
  isAvailable(): boolean {
    return getPlatform() === 'electron' && !!window.electronAPI;
  }

  /**
   * Refresh git status for the current workspace
   */
  async refreshStatus(): Promise<void> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return;
    }

    store.setLoading(true);

    try {
      const result = await window.electronAPI!.gitStatus(workspacePath);

      const status: GitStatus = {
        isGitRepo: result.isGitRepo,
        currentBranch: result.currentBranch,
        isDirty: result.files.length > 0,
        files: result.files as GitFileChange[],
        ahead: result.ahead,
        behind: result.behind,
        remoteName: result.remoteName,
        remoteUrl: result.remoteUrl,
        hasConflicts: result.hasConflicts,
        conflictFiles: result.conflictFiles,
        gitRoot: result.gitRoot,
      };

      store.setStatus(status);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to get git status';
      store.setError(message);
      console.error('[GitService] refreshStatus failed:', error);
    }
  }

  /**
   * Set the workspace path and refresh status
   */
  async setWorkspacePath(path: string | null): Promise<void> {
    const store = useGitStore.getState();
    store.setWorkspacePath(path);

    if (path) {
      await this.refreshStatus();
    } else {
      store.reset();
    }
  }

  /**
   * Stage specific files
   */
  async stageFiles(files: string[]): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitAdd(workspacePath, files);
      if (result.success) {
        await this.refreshStatus();
        return true;
      }
      store.setError(result.error || 'Failed to stage files');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stage files';
      store.setError(message);
      return false;
    }
  }

  /**
   * Stage all changes
   */
  async stageAll(): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitAddAll(workspacePath);
      if (result.success) {
        await this.refreshStatus();
        return true;
      }
      store.setError(result.error || 'Failed to stage all files');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to stage all files';
      store.setError(message);
      return false;
    }
  }

  /**
   * Create a commit
   */
  async commit(message: string): Promise<{ success: boolean; hash?: string }> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return { success: false };
    }

    // First stage all changes
    const stageResult = await this.stageAll();
    if (!stageResult) {
      return { success: false };
    }

    try {
      const result = await window.electronAPI!.gitCommit(workspacePath, message);
      if (result.success) {
        await this.refreshStatus();
        await this.loadHistory(); // Refresh history after commit
        return { success: true, hash: result.hash };
      }
      store.setError(result.error || 'Failed to commit');
      return { success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to commit';
      store.setError(message);
      return { success: false };
    }
  }

  /**
   * Load commit history
   */
  async loadHistory(options?: GitLogOptions): Promise<void> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return;
    }

    store.setLoadingHistory(true);

    try {
      const entries = await window.electronAPI!.gitLog(workspacePath, options);

      const commits: GitCommit[] = entries.map((entry) => ({
        hash: entry.hash,
        hashShort: entry.hashShort,
        message: entry.message,
        author: entry.author,
        authorEmail: entry.authorEmail,
        date: new Date(entry.date),
      }));

      store.setCommits(commits);
    } catch (error) {
      console.error('[GitService] loadHistory failed:', error);
      store.setLoadingHistory(false);
    }
  }

  /**
   * Get diff for working directory changes
   */
  async getDiff(options?: GitDiffOptions): Promise<string> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return '';
    }

    store.setLoadingDiff(true);

    try {
      const diff = await window.electronAPI!.gitDiff(workspacePath, options);
      store.setDiffContent(diff);
      return diff;
    } catch (error) {
      console.error('[GitService] getDiff failed:', error);
      store.setLoadingDiff(false);
      return '';
    }
  }

  /**
   * Get diff for a specific file
   */
  async getFileDiff(filePath: string): Promise<string> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return '';
    }

    try {
      const diff = await window.electronAPI!.gitDiffFile(workspacePath, filePath);
      return diff;
    } catch (error) {
      console.error('[GitService] getFileDiff failed:', error);
      return '';
    }
  }

  /**
   * Discard changes
   */
  async discardChanges(options?: GitDiscardOptions): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitDiscard(workspacePath, options);
      if (result.success) {
        await this.refreshStatus();
        return true;
      }
      store.setError(result.error || 'Failed to discard changes');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to discard changes';
      store.setError(message);
      return false;
    }
  }

  /**
   * Initialize a new git repository
   */
  async initRepository(): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitInit(workspacePath);
      if (result.success) {
        await this.refreshStatus();
        return true;
      }
      store.setError(result.error || 'Failed to initialize repository');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to initialize repository';
      store.setError(message);
      return false;
    }
  }

  // ============================================================================
  // Phase 3: Branch Management
  // ============================================================================

  /**
   * Load all branches (local and remote)
   */
  async loadBranches(): Promise<void> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return;
    }

    store.setLoadingBranches(true);

    try {
      const result = await window.electronAPI!.gitBranches(workspacePath);

      if (result.success) {
        const branches: GitBranch[] = result.local.map((b) => ({
          name: b.name,
          commit: b.commit,
          label: b.label,
          current: b.current,
        }));

        const remoteBranches: GitRemoteBranch[] = result.remote.map((b) => ({
          name: b.name,
          commit: b.commit,
          remoteName: b.remoteName,
          branchName: b.branchName,
        }));

        store.setBranches(branches, remoteBranches);
      } else {
        store.setLoadingBranches(false);
        console.error('[GitService] loadBranches failed:', result.error);
      }
    } catch (error) {
      console.error('[GitService] loadBranches failed:', error);
      store.setLoadingBranches(false);
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(branchName: string, options?: GitBranchCreateOptions): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitBranchCreate(workspacePath, branchName, options);

      if (result.success) {
        await this.refreshStatus();
        await this.loadBranches();
        return true;
      }

      store.setError(result.error || 'Failed to create branch');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create branch';
      store.setError(message);
      return false;
    }
  }

  /**
   * Switch to a branch
   */
  async checkoutBranch(branchName: string): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    // Check for uncommitted changes
    if (store.status.files.length > 0) {
      store.setError('Please commit or discard changes before switching branches');
      return false;
    }

    try {
      const result = await window.electronAPI!.gitBranchCheckout(workspacePath, branchName);

      if (result.success) {
        await this.refreshStatus();
        await this.loadBranches();
        return true;
      }

      store.setError(result.error || 'Failed to switch branch');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to switch branch';
      store.setError(message);
      return false;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchName: string, options?: GitBranchDeleteOptions): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    // Don't delete current branch
    if (store.status.currentBranch === branchName) {
      store.setError('Cannot delete the current branch');
      return false;
    }

    try {
      const result = await window.electronAPI!.gitBranchDelete(workspacePath, branchName, options);

      if (result.success) {
        await this.loadBranches();
        return true;
      }

      store.setError(result.error || 'Failed to delete branch');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete branch';
      store.setError(message);
      return false;
    }
  }

  /**
   * Rename a branch
   */
  async renameBranch(oldName: string, newName: string): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitBranchRename(workspacePath, oldName, newName);

      if (result.success) {
        await this.refreshStatus();
        await this.loadBranches();
        return true;
      }

      store.setError(result.error || 'Failed to rename branch');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to rename branch';
      store.setError(message);
      return false;
    }
  }

  // ============================================================================
  // Phase 4: Remote Operations
  // ============================================================================

  /**
   * Load remotes
   */
  async loadRemotes(): Promise<void> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return;
    }

    store.setLoadingRemotes(true);

    try {
      const result = await window.electronAPI!.gitRemotes(workspacePath);

      if (result.success) {
        const remotes: GitRemote[] = result.remotes.map((r) => ({
          name: r.name,
          fetchUrl: r.fetchUrl,
          pushUrl: r.pushUrl,
        }));
        store.setRemotes(remotes);
      } else {
        store.setLoadingRemotes(false);
        console.error('[GitService] loadRemotes failed:', result.error);
      }
    } catch (error) {
      console.error('[GitService] loadRemotes failed:', error);
      store.setLoadingRemotes(false);
    }
  }

  /**
   * Add a remote
   */
  async addRemote(name: string, url: string): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitRemoteAdd(workspacePath, name, url);

      if (result.success) {
        await this.loadRemotes();
        return true;
      }

      store.setError(result.error || 'Failed to add remote');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add remote';
      store.setError(message);
      return false;
    }
  }

  /**
   * Remove a remote
   */
  async removeRemote(name: string): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitRemoteRemove(workspacePath, name);

      if (result.success) {
        await this.loadRemotes();
        return true;
      }

      store.setError(result.error || 'Failed to remove remote');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to remove remote';
      store.setError(message);
      return false;
    }
  }

  /**
   * Fetch from remote
   */
  async fetch(options?: GitFetchOptions): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    store.setFetching(true);

    try {
      const result = await window.electronAPI!.gitFetch(workspacePath, options);

      store.setFetching(false);

      if (result.success) {
        await this.refreshStatus();
        await this.loadBranches();
        return true;
      }

      store.setError(result.error || 'Failed to fetch');
      return false;
    } catch (error) {
      store.setFetching(false);
      const message = error instanceof Error ? error.message : 'Failed to fetch';
      store.setError(message);
      return false;
    }
  }

  /**
   * Pull from remote
   */
  async pull(options?: GitPullOptions): Promise<{
    success: boolean;
    summary?: { changes: number; insertions: number; deletions: number };
  }> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return { success: false };
    }

    store.setPulling(true);

    try {
      const result = await window.electronAPI!.gitPull(workspacePath, options);

      store.setPulling(false);

      if (result.success) {
        await this.refreshStatus();
        await this.loadHistory();
        return { success: true, summary: result.summary };
      }

      store.setError(result.error || 'Failed to pull');
      return { success: false };
    } catch (error) {
      store.setPulling(false);
      const message = error instanceof Error ? error.message : 'Failed to pull';
      store.setError(message);
      return { success: false };
    }
  }

  /**
   * Push to remote
   */
  async push(options?: GitPushOptions): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    store.setPushing(true);

    try {
      const result = await window.electronAPI!.gitPush(workspacePath, options);

      store.setPushing(false);

      if (result.success) {
        await this.refreshStatus();
        return true;
      }

      store.setError(result.error || 'Failed to push');
      return false;
    } catch (error) {
      store.setPushing(false);
      const message = error instanceof Error ? error.message : 'Failed to push';
      store.setError(message);
      return false;
    }
  }

  /**
   * Set upstream tracking branch
   */
  async setUpstream(remote: string, branch: string): Promise<boolean> {
    const store = useGitStore.getState();
    const workspacePath = store.workspacePath;

    if (!workspacePath || !this.isAvailable()) {
      return false;
    }

    try {
      const result = await window.electronAPI!.gitSetUpstream(workspacePath, remote, branch);

      if (result.success) {
        await this.refreshStatus();
        return true;
      }

      store.setError(result.error || 'Failed to set upstream');
      return false;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to set upstream';
      store.setError(message);
      return false;
    }
  }

  /**
   * Enable auto-refresh of git status
   */
  enableAutoRefresh(intervalMs = 5000): void {
    if (this.autoRefreshEnabled) {
      return;
    }

    this.autoRefreshEnabled = true;
    this.refreshInterval = setInterval(() => {
      const store = useGitStore.getState();
      if (store.workspacePath && !store.isLoading) {
        this.refreshStatus();
      }
    }, intervalMs);
  }

  /**
   * Disable auto-refresh
   */
  disableAutoRefresh(): void {
    this.autoRefreshEnabled = false;
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  /**
   * Get file status icon and color
   */
  getFileStatusDisplay(status: GitFileChange['status']): {
    icon: string;
    color: string;
    label: string;
  } {
    switch (status) {
      case 'modified':
        return { icon: 'M', color: 'text-yellow-600', label: 'Modified' };
      case 'added':
        return { icon: 'A', color: 'text-green-600', label: 'Added' };
      case 'deleted':
        return { icon: 'D', color: 'text-red-600', label: 'Deleted' };
      case 'renamed':
        return { icon: 'R', color: 'text-blue-600', label: 'Renamed' };
      case 'untracked':
        return { icon: 'U', color: 'text-gray-500', label: 'Untracked' };
      default:
        return { icon: '?', color: 'text-gray-400', label: 'Unknown' };
    }
  }

  /**
   * Format relative time for commits
   */
  formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString();
  }
}

// Export singleton instance
export const gitService = new GitService();
