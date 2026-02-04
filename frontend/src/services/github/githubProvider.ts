/**
 * GitHub Provider
 * Implements git operations via GitHub API for browser environments
 * Mirrors the local git provider interface but uses REST API
 */

import { githubApi } from './githubApi';
import { githubAuth } from './githubAuth';
import { useGitHubStore } from '@/stores/githubStore';
import type {
  GitHubContent,
  GitHubCommit,
  GitHubBranch,
  GitHubRepositoryConnection,
} from '@/types/github';

// ============================================================================
// Types matching local git provider
// ============================================================================

export interface GitHubFileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed';
  content?: string;
  oldPath?: string;
}

export interface GitHubProviderStatus {
  isConnected: boolean;
  currentBranch: string | null;
  owner: string | null;
  repo: string | null;
  ahead: number;
  behind: number;
  lastSyncedAt: string | null;
}

export interface GitHubProviderCommit {
  sha: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
}

// ============================================================================
// File Content Cache
// ============================================================================

interface CachedFile {
  path: string;
  sha: string;
  content: string;
  fetchedAt: number;
}

const fileCache = new Map<string, CachedFile>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(owner: string, repo: string, branch: string, path: string): string {
  return `${owner}/${repo}/${branch}/${path}`;
}

function getCachedFile(
  owner: string,
  repo: string,
  branch: string,
  path: string
): CachedFile | null {
  const key = getCacheKey(owner, repo, branch, path);
  const cached = fileCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return cached;
  }
  return null;
}

function setCachedFile(
  owner: string,
  repo: string,
  branch: string,
  path: string,
  sha: string,
  content: string
): void {
  const key = getCacheKey(owner, repo, branch, path);
  fileCache.set(key, { path, sha, content, fetchedAt: Date.now() });
}

function clearCache(): void {
  fileCache.clear();
}

// ============================================================================
// GitHub Provider Class
// ============================================================================

class GitHubProvider {
  /**
   * Check if GitHub provider is available and configured
   */
  isAvailable(): boolean {
    return githubAuth.isAuthenticated();
  }

  /**
   * Get the current connection
   */
  getConnection(): GitHubRepositoryConnection | null {
    return useGitHubStore.getState().connection;
  }

  /**
   * Get provider status
   */
  async getStatus(): Promise<GitHubProviderStatus> {
    const connection = this.getConnection();

    if (!connection) {
      return {
        isConnected: false,
        currentBranch: null,
        owner: null,
        repo: null,
        ahead: 0,
        behind: 0,
        lastSyncedAt: null,
      };
    }

    // Could optionally fetch comparison with default branch
    return {
      isConnected: true,
      currentBranch: connection.branch,
      owner: connection.owner,
      repo: connection.repo,
      ahead: 0,
      behind: 0,
      lastSyncedAt: connection.lastSyncedAt || null,
    };
  }

  // ==========================================================================
  // Branch Operations
  // ==========================================================================

  /**
   * List all branches
   */
  async listBranches(): Promise<GitHubBranch[]> {
    const connection = this.getConnection();
    if (!connection) throw new Error('No repository connected');

    return await githubApi.listBranches(connection.owner, connection.repo, {
      per_page: 100,
    });
  }

  /**
   * Get current branch
   */
  async getCurrentBranch(): Promise<GitHubBranch | null> {
    const connection = this.getConnection();
    if (!connection) return null;

    try {
      return await githubApi.getBranch(connection.owner, connection.repo, connection.branch);
    } catch {
      return null;
    }
  }

  /**
   * Create a new branch
   */
  async createBranch(name: string, fromBranch?: string): Promise<boolean> {
    const connection = this.getConnection();
    if (!connection) throw new Error('No repository connected');

    try {
      // Get SHA of source branch
      const sourceBranch = fromBranch || connection.branch;
      const branch = await githubApi.getBranch(connection.owner, connection.repo, sourceBranch);

      // Create new branch
      await githubApi.createBranch(connection.owner, connection.repo, {
        ref: `refs/heads/${name}`,
        sha: branch.commit.sha,
      });

      return true;
    } catch (error) {
      console.error('[GitHubProvider] Failed to create branch:', error);
      return false;
    }
  }

  /**
   * Switch to a different branch
   */
  async switchBranch(branchName: string): Promise<boolean> {
    const connection = this.getConnection();
    if (!connection) throw new Error('No repository connected');

    try {
      // Verify branch exists
      await githubApi.getBranch(connection.owner, connection.repo, branchName);

      // Update connection
      useGitHubStore.getState().setConnection({
        ...connection,
        branch: branchName,
      });

      // Clear file cache when switching branches
      clearCache();

      return true;
    } catch (error) {
      console.error('[GitHubProvider] Failed to switch branch:', error);
      return false;
    }
  }

  /**
   * Delete a branch
   */
  async deleteBranch(branchName: string): Promise<boolean> {
    const connection = this.getConnection();
    if (!connection) throw new Error('No repository connected');

    try {
      await githubApi.deleteBranch(connection.owner, connection.repo, branchName);
      return true;
    } catch (error) {
      console.error('[GitHubProvider] Failed to delete branch:', error);
      return false;
    }
  }

  // ==========================================================================
  // Commit Operations
  // ==========================================================================

  /**
   * List commits on current branch
   */
  async listCommits(options?: { limit?: number }): Promise<GitHubProviderCommit[]> {
    const connection = this.getConnection();
    if (!connection) throw new Error('No repository connected');

    const commits = await githubApi.listCommits(connection.owner, connection.repo, {
      sha: connection.branch,
      per_page: options?.limit || 30,
    });

    return commits.map((c) => ({
      sha: c.sha,
      message: c.commit.message,
      author: c.commit.author?.name || 'Unknown',
      authorEmail: c.commit.author?.email || '',
      date: new Date(c.commit.author?.date || Date.now()),
    }));
  }

  /**
   * Get a specific commit
   */
  async getCommit(sha: string): Promise<GitHubCommit | null> {
    const connection = this.getConnection();
    if (!connection) return null;

    try {
      const commit = await githubApi.getCommit(connection.owner, connection.repo, sha);
      return commit;
    } catch {
      return null;
    }
  }

  // ==========================================================================
  // File Operations
  // ==========================================================================

  /**
   * Get file content from repository
   */
  async getFileContent(path: string): Promise<string | null> {
    const connection = this.getConnection();
    if (!connection) return null;

    // Check cache first
    const cached = getCachedFile(connection.owner, connection.repo, connection.branch, path);
    if (cached) {
      return cached.content;
    }

    try {
      const content = await githubApi.getContent(
        connection.owner,
        connection.repo,
        path,
        connection.branch
      );

      // Handle file content
      if (!Array.isArray(content) && content.type === 'file' && content.content) {
        const decodedContent = atob(content.content);
        setCachedFile(
          connection.owner,
          connection.repo,
          connection.branch,
          path,
          content.sha,
          decodedContent
        );
        return decodedContent;
      }

      return null;
    } catch (error) {
      console.error('[GitHubProvider] Failed to get file:', error);
      return null;
    }
  }

  /**
   * List directory contents
   */
  async listDirectory(path: string = ''): Promise<GitHubContent[]> {
    const connection = this.getConnection();
    if (!connection) return [];

    try {
      const content = await githubApi.getContent(
        connection.owner,
        connection.repo,
        path,
        connection.branch
      );

      if (Array.isArray(content)) {
        return content;
      }

      return [];
    } catch (error) {
      console.error('[GitHubProvider] Failed to list directory:', error);
      return [];
    }
  }

  /**
   * Create or update a file
   */
  async saveFile(
    path: string,
    content: string,
    message: string
  ): Promise<{ success: boolean; sha?: string; error?: string }> {
    const connection = this.getConnection();
    if (!connection) return { success: false, error: 'No repository connected' };

    try {
      // Get existing file SHA if updating
      let existingSha: string | undefined;
      const cached = getCachedFile(connection.owner, connection.repo, connection.branch, path);
      if (cached) {
        existingSha = cached.sha;
      } else {
        try {
          const existing = await githubApi.getContent(
            connection.owner,
            connection.repo,
            path,
            connection.branch
          );
          if (!Array.isArray(existing) && existing.sha) {
            existingSha = existing.sha;
          }
        } catch {
          // File doesn't exist, that's fine for creates
        }
      }

      // Create/update file
      const result = await githubApi.createOrUpdateFile(connection.owner, connection.repo, path, {
        message,
        content: btoa(content),
        sha: existingSha,
        branch: connection.branch,
      });

      // Update cache
      setCachedFile(
        connection.owner,
        connection.repo,
        connection.branch,
        path,
        result.content.sha,
        content
      );

      // Update last synced timestamp
      useGitHubStore.getState().setConnection({
        ...connection,
        lastSyncedAt: new Date().toISOString(),
      });

      return { success: true, sha: result.content.sha };
    } catch (error) {
      console.error('[GitHubProvider] Failed to save file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save file',
      };
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(path: string, message: string): Promise<{ success: boolean; error?: string }> {
    const connection = this.getConnection();
    if (!connection) return { success: false, error: 'No repository connected' };

    try {
      // Get file SHA
      const existing = await githubApi.getContent(
        connection.owner,
        connection.repo,
        path,
        connection.branch
      );

      if (Array.isArray(existing) || !existing.sha) {
        return { success: false, error: 'File not found' };
      }

      await githubApi.deleteFile(connection.owner, connection.repo, path, {
        message,
        sha: existing.sha,
        branch: connection.branch,
      });

      // Clear from cache
      const key = getCacheKey(connection.owner, connection.repo, connection.branch, path);
      fileCache.delete(key);

      return { success: true };
    } catch (error) {
      console.error('[GitHubProvider] Failed to delete file:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete file',
      };
    }
  }

  /**
   * Save multiple files in a single commit
   * Note: GitHub API requires sequential commits for multiple files
   * For true atomic commits, use the Git Data API (trees/blobs)
   */
  async saveMultipleFiles(
    files: Array<{ path: string; content: string }>,
    message: string
  ): Promise<{ success: boolean; error?: string }> {
    const connection = this.getConnection();
    if (!connection) return { success: false, error: 'No repository connected' };

    try {
      // For simplicity, save files sequentially
      // TODO: Use Git Data API for atomic multi-file commits
      for (let i = 0; i < files.length; i++) {
        const file = files[i]!;
        const commitMessage = i === 0 ? message : `${message} (${i + 1}/${files.length})`;
        const result = await this.saveFile(file.path, file.content, commitMessage);
        if (!result.success) {
          return { success: false, error: `Failed to save ${file.path}: ${result.error}` };
        }
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save files',
      };
    }
  }

  // ==========================================================================
  // Comparison Operations
  // ==========================================================================

  /**
   * Compare two branches
   */
  async compareBranches(base: string, head: string) {
    const connection = this.getConnection();
    if (!connection) throw new Error('No repository connected');

    return await githubApi.compareBranches(connection.owner, connection.repo, base, head);
  }

  // ==========================================================================
  // Utility Methods
  // ==========================================================================

  /**
   * Clear all cached data
   */
  clearCache(): void {
    clearCache();
  }

  /**
   * Refresh connection status
   */
  async refresh(): Promise<void> {
    // Clear cache and re-fetch any needed data
    this.clearCache();
    useGitHubStore.getState().updateRateLimit();
  }
}

// Export singleton instance
export const githubProvider = new GitHubProvider();
