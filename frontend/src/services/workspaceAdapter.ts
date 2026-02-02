/**
 * Workspace Adapter Service
 *
 * Provides a unified interface for working with both local folder
 * and GitHub repository workspaces.
 */

import type { WorkspaceInfo, RecentWorkspace } from '@/types/github-repo';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { offlineQueueService } from '@/services/github/offlineQueueService';

// ============================================================================
// Types
// ============================================================================

export type WorkspaceType = 'local' | 'github';

export interface WorkspaceAdapter {
  type: WorkspaceType;

  // File operations
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  listFiles(path?: string): Promise<string[]>;

  // Metadata
  getWorkspaceInfo(): WorkspaceInfo;

  // Sync (GitHub only)
  sync?(): Promise<void>;
  hasPendingChanges?(): boolean;
  getPendingChangeCount?(): number;
}

// ============================================================================
// GitHub Workspace Adapter
// ============================================================================

export function createGitHubWorkspaceAdapter(): WorkspaceAdapter | null {
  const store = useGitHubRepoStore.getState();
  const { workspace, pendingChanges } = store;

  if (!workspace) {
    return null;
  }

  return {
    type: 'github',

    async readFile(path: string): Promise<string> {
      return store.readFile(path);
    },

    async writeFile(path: string, content: string): Promise<void> {
      return store.writeFile(path, content);
    },

    async deleteFile(path: string): Promise<void> {
      return store.deleteFile(path);
    },

    async listFiles(_path?: string): Promise<string[]> {
      // Refresh file tree and return it
      await store.refreshFileTree();
      return useGitHubRepoStore.getState().fileTree;
    },

    getWorkspaceInfo(): WorkspaceInfo {
      return {
        type: 'github',
        displayName: workspace.workspacePath
          ? `${workspace.owner}/${workspace.repo} - ${workspace.workspaceName}`
          : `${workspace.owner}/${workspace.repo}`,
        owner: workspace.owner,
        repo: workspace.repo,
        branch: workspace.branch,
      };
    },

    async sync(): Promise<void> {
      return store.sync();
    },

    hasPendingChanges(): boolean {
      return pendingChanges.length > 0;
    },

    getPendingChangeCount(): number {
      return pendingChanges.length;
    },
  };
}

// ============================================================================
// Local Workspace Adapter (placeholder - integrates with existing system)
// ============================================================================

export interface LocalWorkspaceContext {
  directoryHandle?: FileSystemDirectoryHandle;
  path?: string;
}

export function createLocalWorkspaceAdapter(
  _context: LocalWorkspaceContext
): WorkspaceAdapter | null {
  // This is a placeholder that would integrate with the existing
  // browserFileService for File System Access API in browser,
  // or Node.js fs for Electron.
  //
  // The actual implementation would depend on the current workspace
  // state in the main app.

  return null;
}

// ============================================================================
// Recent Workspaces
// ============================================================================

/**
 * Get recent workspaces from IndexedDB
 */
export async function getRecentWorkspaces(limit = 10): Promise<RecentWorkspace[]> {
  return offlineQueueService.getRecentWorkspaces(limit);
}

/**
 * Add a workspace to recent list
 */
export async function addToRecentWorkspaces(workspace: RecentWorkspace): Promise<void> {
  return offlineQueueService.addRecentWorkspace(workspace);
}

/**
 * Remove a workspace from recent list
 */
export async function removeFromRecentWorkspaces(workspaceId: string): Promise<void> {
  return offlineQueueService.removeRecentWorkspace(workspaceId);
}

/**
 * Clear all recent workspaces
 */
export async function clearRecentWorkspaces(): Promise<void> {
  return offlineQueueService.clearRecentWorkspaces();
}

// ============================================================================
// Workspace Detection
// ============================================================================

/**
 * Determine if the current app is running in GitHub repo mode
 */
export function isGitHubRepoMode(): boolean {
  const store = useGitHubRepoStore.getState();
  return store.workspace !== null;
}

/**
 * Get the current workspace adapter (if any)
 */
export function getCurrentWorkspaceAdapter(): WorkspaceAdapter | null {
  if (isGitHubRepoMode()) {
    return createGitHubWorkspaceAdapter();
  }
  // Local workspace adapter would be returned here
  return null;
}

// ============================================================================
// Exports
// ============================================================================

export const workspaceAdapterService = {
  createGitHubWorkspaceAdapter,
  createLocalWorkspaceAdapter,
  getRecentWorkspaces,
  addToRecentWorkspaces,
  removeFromRecentWorkspaces,
  clearRecentWorkspaces,
  isGitHubRepoMode,
  getCurrentWorkspaceAdapter,
};
