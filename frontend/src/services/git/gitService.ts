/**
 * Git Service
 * High-level git operations that integrate with the gitStore
 */

import { useGitStore, GitCommit, GitStatus, GitFileChange } from '@/stores/gitStore';
import { getPlatform } from '@/services/platform/platform';
import type {
  GitLogOptions,
  GitDiffOptions,
  GitDiscardOptions,
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
