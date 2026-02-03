/**
 * GitHub Repository Workspace Store
 *
 * Zustand store for managing GitHub repository workspace state,
 * including file operations, offline queue, and sync status.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  GitHubRepoWorkspace,
  PendingChange,
  FileCache,
  SyncStatus,
  SyncError,
  ConflictInfo,
  ResolvedConflict,
  FileChange,
  DetectedWorkspace,
} from '@/types/github-repo';
import { githubContentsService } from '@/services/github/githubContentsService';
import { offlineQueueService, generateChangeId } from '@/services/github/offlineQueueService';
import { githubApi } from '@/services/github/githubApi';

// ============================================================================
// Types
// ============================================================================

export interface GitHubRepoState {
  // Current workspace
  workspace: GitHubRepoWorkspace | null;

  // Sync state
  syncStatus: SyncStatus;
  syncError: SyncError | null;
  pendingChanges: PendingChange[];

  // Conflict state
  conflicts: ConflictInfo[];

  // Online detection
  isOnline: boolean;

  // Loading states
  isLoading: boolean;
  isOpeningRepo: boolean;
  isDetectingWorkspaces: boolean;

  // Detected workspaces (for selection)
  detectedWorkspaces: DetectedWorkspace[];

  // File tree (for navigation)
  fileTree: string[];

  // Actions - Workspace
  openWorkspace: (
    owner: string,
    repo: string,
    branch: string,
    workspacePath: string,
    workspaceName: string
  ) => Promise<void>;
  detectWorkspaces: (owner: string, repo: string, branch: string) => Promise<DetectedWorkspace[]>;
  closeRepo: () => void;
  refreshFileTree: () => Promise<void>;

  // Actions - File operations
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;

  // Actions - Sync
  sync: () => Promise<void>;
  pullLatest: () => Promise<void>;
  pushChanges: (message: string) => Promise<void>;
  resolveConflicts: (resolutions: ResolvedConflict[]) => Promise<void>;

  // Actions - Branch
  switchBranch: (branch: string) => Promise<void>;
  createBranch: (name: string, fromBranch?: string) => Promise<void>;

  // Actions - State management
  setOnline: (isOnline: boolean) => void;
  loadPendingChanges: () => Promise<void>;
  clearError: () => void;
  clearDetectedWorkspaces: () => void;

  // Actions - Staging
  stageChange: (changeId: string) => Promise<void>;
  unstageChange: (changeId: string) => Promise<void>;
  stageAllChanges: () => Promise<void>;
  unstageAllChanges: () => Promise<void>;

  // Actions - Reset
  reset: () => void;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate a workspace ID from repo info including workspace path
 */
function generateWorkspaceId(
  owner: string,
  repo: string,
  branch: string,
  workspacePath: string
): string {
  const pathPart = workspacePath || '_root_';
  return `${owner}/${repo}/${branch}/${pathPart}`;
}

/**
 * Get the full path for a file within a workspace
 */
function getFullPath(workspacePath: string, relativePath: string): string {
  if (!workspacePath) return relativePath;
  return `${workspacePath}/${relativePath}`;
}

// ============================================================================
// Initial State
// ============================================================================

const initialState = {
  workspace: null as GitHubRepoWorkspace | null,
  syncStatus: 'idle' as SyncStatus,
  syncError: null as SyncError | null,
  pendingChanges: [] as PendingChange[],
  conflicts: [] as ConflictInfo[],
  isOnline: navigator.onLine,
  isLoading: false,
  isOpeningRepo: false,
  isDetectingWorkspaces: false,
  detectedWorkspaces: [] as DetectedWorkspace[],
  fileTree: [] as string[],
};

// ============================================================================
// Store
// ============================================================================

export const useGitHubRepoStore = create<GitHubRepoState>()(
  devtools(
    (set, get) => ({
      ...initialState,

      // ========================================================================
      // Workspace Actions
      // ========================================================================

      detectWorkspaces: async (owner: string, repo: string, branch: string) => {
        set({ isDetectingWorkspaces: true, syncError: null });

        try {
          const workspaces = await githubContentsService.detectWorkspaces(owner, repo, branch);
          set({ detectedWorkspaces: workspaces, isDetectingWorkspaces: false });
          return workspaces;
        } catch (error) {
          set({
            isDetectingWorkspaces: false,
            syncError: {
              message: error instanceof Error ? error.message : 'Failed to detect workspaces',
            },
          });
          throw error;
        }
      },

      openWorkspace: async (
        owner: string,
        repo: string,
        branch: string,
        workspacePath: string,
        workspaceName: string
      ) => {
        set({ isOpeningRepo: true, syncError: null });

        try {
          // Get repository info
          const repoInfo = await githubApi.getRepository(owner, repo);

          // Create workspace ID (includes workspace path)
          const workspaceId = generateWorkspaceId(owner, repo, branch, workspacePath);

          // Check for existing workspace data
          const existingWorkspace = await offlineQueueService.getWorkspace(workspaceId);

          const workspace: GitHubRepoWorkspace = existingWorkspace || {
            id: workspaceId,
            owner,
            repo,
            branch,
            defaultBranch: repoInfo.default_branch,
            workspacePath,
            workspaceName,
            lastSyncedAt: null,
            openedAt: new Date(),
          };

          // Save workspace
          await offlineQueueService.saveWorkspace(workspace);

          // Add to recent workspaces
          await offlineQueueService.addRecentWorkspace({
            id: workspaceId,
            type: 'github',
            displayName: workspacePath ? `${owner}/${repo} - ${workspaceName}` : `${owner}/${repo}`,
            lastOpened: new Date(),
            owner,
            repo,
            branch,
            workspacePath,
            workspaceName,
          });

          // Load pending changes
          const pendingChanges = await offlineQueueService.getPendingChanges(workspaceId);

          set({
            workspace,
            pendingChanges,
            isOpeningRepo: false,
            detectedWorkspaces: [], // Clear after opening
          });

          // Refresh file tree
          await get().refreshFileTree();
        } catch (error) {
          set({
            isOpeningRepo: false,
            syncError: {
              message: error instanceof Error ? error.message : 'Failed to open workspace',
            },
          });
          throw error;
        }
      },

      closeRepo: () => {
        set({
          ...initialState,
          isOnline: navigator.onLine,
        });
      },

      refreshFileTree: async () => {
        const { workspace, isOnline } = get();
        if (!workspace) return;

        set({ isLoading: true });

        try {
          if (isOnline) {
            // Get files within the workspace path
            const files = await githubContentsService.getWorkspaceFiles(
              workspace.owner,
              workspace.repo,
              workspace.workspacePath,
              workspace.branch
            );

            set({ fileTree: files, isLoading: false });
          } else {
            // Use cached files when offline
            const cachedFiles = await offlineQueueService.getCachedFiles(workspace.id);
            set({
              fileTree: cachedFiles.map((f) => f.path),
              isLoading: false,
            });
          }
        } catch (error) {
          set({
            isLoading: false,
            syncError: {
              message: error instanceof Error ? error.message : 'Failed to load file tree',
            },
          });
        }
      },

      // ========================================================================
      // File Operations
      // ========================================================================

      readFile: async (path: string) => {
        const { workspace, isOnline, pendingChanges } = get();
        if (!workspace) throw new Error('No workspace open');

        // Check for pending changes first (using relative path)
        const pendingChange = pendingChanges.find((c) => c.path === path && c.action !== 'delete');
        if (pendingChange?.content !== undefined) {
          return pendingChange.content;
        }

        // Check cache
        const cached = await offlineQueueService.getCachedFile(workspace.id, path);

        // Get the full path for GitHub API
        const fullPath = getFullPath(workspace.workspacePath, path);

        if (isOnline) {
          try {
            // Fetch from GitHub
            const file = await githubContentsService.getFile(
              workspace.owner,
              workspace.repo,
              fullPath,
              workspace.branch
            );

            // Update cache (with relative path)
            const fileCache: FileCache = {
              workspaceId: workspace.id,
              path, // Store with relative path
              content: file.content,
              sha: file.sha,
              cachedAt: new Date(),
            };
            await offlineQueueService.cacheFile(fileCache);

            return file.content;
          } catch (error) {
            // Fall back to cache if fetch fails
            if (cached) {
              console.warn(`Failed to fetch ${path}, using cached version`);
              return cached.content;
            }
            throw error;
          }
        } else {
          // Offline - use cache
          if (cached) {
            return cached.content;
          }
          throw new Error(`File "${path}" not available offline`);
        }
      },

      writeFile: async (path: string, content: string) => {
        const { workspace, pendingChanges } = get();
        if (!workspace) throw new Error('No workspace open');

        // Get the current SHA if we have it cached
        const cached = await offlineQueueService.getCachedFile(workspace.id, path);
        const isNewFile = !cached;

        // Check if content has actually changed
        // Compare against cached content (original from GitHub) or existing pending change
        const existingPendingChange = pendingChanges.find(
          (c) => c.path === path && c.workspaceId === workspace.id
        );

        // If content matches the cached version (no change from original), remove any pending change
        if (cached && content === cached.content) {
          if (existingPendingChange) {
            await offlineQueueService.removePendingChange(existingPendingChange.id);
            const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
            set({ pendingChanges: updatedChanges });
          }
          return; // No change needed
        }

        // If content matches existing pending change, no update needed
        if (existingPendingChange && content === existingPendingChange.content) {
          return; // Already have this change queued
        }

        // Create pending change (with relative path)
        const change: PendingChange = {
          id: generateChangeId(),
          workspaceId: workspace.id,
          path, // Relative path
          action: isNewFile ? 'create' : 'update',
          content,
          timestamp: new Date(),
          baseSha: cached?.sha,
        };

        // Add to queue
        await offlineQueueService.addPendingChange(change);

        // NOTE: Do NOT update the cache here - the cache should preserve the ORIGINAL
        // content from GitHub so we can compare against it for diffs. The cache is only
        // updated after a successful commit to GitHub (in pushChanges).

        // Reload pending changes
        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges: updatedChanges });
      },

      deleteFile: async (path: string) => {
        const { workspace } = get();
        if (!workspace) throw new Error('No workspace open');

        // Get the current SHA
        const cached = await offlineQueueService.getCachedFile(workspace.id, path);
        if (!cached) {
          throw new Error(`Cannot delete "${path}" - file not found`);
        }

        // Create pending change
        const change: PendingChange = {
          id: generateChangeId(),
          workspaceId: workspace.id,
          path,
          action: 'delete',
          timestamp: new Date(),
          baseSha: cached.sha,
        };

        // Add to queue
        await offlineQueueService.addPendingChange(change);

        // Reload pending changes
        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges: updatedChanges });
      },

      // ========================================================================
      // Sync Operations
      // ========================================================================

      sync: async () => {
        const { workspace, isOnline, pendingChanges } = get();
        if (!workspace) throw new Error('No workspace open');
        if (!isOnline) {
          set({ syncStatus: 'offline' });
          return;
        }

        set({ syncStatus: 'syncing', syncError: null, conflicts: [] });

        try {
          // First, pull latest to check for conflicts
          await get().pullLatest();

          // If there are pending changes, push them
          if (pendingChanges.length > 0) {
            await get().pushChanges('Sync changes from Data Modeller');
          }

          // Update last synced time
          const updatedWorkspace = {
            ...workspace,
            lastSyncedAt: new Date(),
          };
          await offlineQueueService.saveWorkspace(updatedWorkspace);

          set({
            workspace: updatedWorkspace,
            syncStatus: 'idle',
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Sync failed';
          set({
            syncStatus: 'error',
            syncError: { message },
          });
          throw error;
        }
      },

      pullLatest: async () => {
        const { workspace, pendingChanges, isOnline } = get();
        if (!workspace) throw new Error('No workspace open');
        if (!isOnline) return;

        set({ isLoading: true });

        try {
          // For each pending change, check if the remote file has changed
          const conflicts: ConflictInfo[] = [];

          for (const change of pendingChanges) {
            if (change.action === 'delete') continue;

            const fullPath = getFullPath(workspace.workspacePath, change.path);

            try {
              const remoteFile = await githubContentsService.getFile(
                workspace.owner,
                workspace.repo,
                fullPath,
                workspace.branch
              );

              // If the remote SHA differs from our base SHA, there's a conflict
              if (change.baseSha && remoteFile.sha !== change.baseSha) {
                conflicts.push({
                  path: change.path,
                  localContent: change.content || '',
                  remoteContent: remoteFile.content,
                  remoteSha: remoteFile.sha,
                  localSha: change.baseSha,
                });
              }
            } catch {
              // File might not exist on remote (new file), that's okay
            }
          }

          if (conflicts.length > 0) {
            set({
              conflicts,
              syncStatus: 'conflict',
              isLoading: false,
            });
            return;
          }

          // Refresh file tree
          await get().refreshFileTree();

          set({ isLoading: false });
        } catch (error) {
          set({
            isLoading: false,
            syncError: {
              message: error instanceof Error ? error.message : 'Failed to pull latest',
            },
          });
          throw error;
        }
      },

      pushChanges: async (message: string) => {
        const { workspace, pendingChanges, isOnline } = get();
        if (!workspace) throw new Error('No workspace open');
        if (!isOnline) {
          set({ syncStatus: 'offline' });
          return;
        }

        // Only commit staged changes
        const stagedChanges = pendingChanges.filter((c) => c.staged);
        if (stagedChanges.length === 0) return;

        set({ syncStatus: 'syncing' });

        try {
          // Convert staged changes to file changes with full paths
          const fileChanges: FileChange[] = stagedChanges.map((change) => ({
            path: getFullPath(workspace.workspacePath, change.path),
            action: change.action,
            content: change.content,
          }));

          // Commit staged changes
          await githubContentsService.commitMultipleFiles(
            workspace.owner,
            workspace.repo,
            fileChanges,
            message,
            workspace.branch
          );

          // Remove only the staged changes from pending
          for (const change of stagedChanges) {
            await offlineQueueService.removePendingChange(change.id);
          }

          // Refresh cache with new SHAs for committed files
          for (const change of stagedChanges) {
            if (change.action !== 'delete' && change.content) {
              const fullPath = getFullPath(workspace.workspacePath, change.path);
              const file = await githubContentsService.getFile(
                workspace.owner,
                workspace.repo,
                fullPath,
                workspace.branch
              );
              await offlineQueueService.cacheFile({
                workspaceId: workspace.id,
                path: change.path, // Store with relative path
                content: file.content,
                sha: file.sha,
                cachedAt: new Date(),
              });
            }
          }

          // Reload pending changes (there may be unstaged ones remaining)
          const remainingChanges = await offlineQueueService.getPendingChanges(workspace.id);
          set({
            pendingChanges: remainingChanges,
            syncStatus: 'idle',
          });

          // Refresh file tree
          await get().refreshFileTree();
        } catch (error) {
          set({
            syncStatus: 'error',
            syncError: {
              message: error instanceof Error ? error.message : 'Failed to push changes',
            },
          });
          throw error;
        }
      },

      resolveConflicts: async (resolutions: ResolvedConflict[]) => {
        const { workspace, pendingChanges } = get();
        if (!workspace) throw new Error('No workspace open');

        // Process each resolution
        for (const resolution of resolutions) {
          const pendingChange = pendingChanges.find((c) => c.path === resolution.path);
          if (!pendingChange) continue;

          if (resolution.resolution === 'use-remote') {
            // Remove the pending change, keep remote version
            await offlineQueueService.removePendingChange(pendingChange.id);
          } else if (resolution.resolution === 'keep-local') {
            // Update the base SHA to the remote SHA so we can push
            const conflict = get().conflicts.find((c) => c.path === resolution.path);
            if (conflict) {
              const updatedChange: PendingChange = {
                ...pendingChange,
                baseSha: conflict.remoteSha,
              };
              await offlineQueueService.addPendingChange(updatedChange);
            }
          } else if (resolution.resolution === 'manual' && resolution.mergedContent) {
            // Use the manually merged content
            const conflict = get().conflicts.find((c) => c.path === resolution.path);
            if (conflict) {
              const updatedChange: PendingChange = {
                ...pendingChange,
                content: resolution.mergedContent,
                baseSha: conflict.remoteSha,
              };
              await offlineQueueService.addPendingChange(updatedChange);
            }
          }
        }

        // Reload pending changes
        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({
          pendingChanges: updatedChanges,
          conflicts: [],
          syncStatus: 'idle',
        });
      },

      // ========================================================================
      // Branch Operations
      // ========================================================================

      switchBranch: async (branch: string) => {
        const { workspace } = get();
        if (!workspace) throw new Error('No workspace open');

        // Close current workspace and open with new branch
        await get().openWorkspace(
          workspace.owner,
          workspace.repo,
          branch,
          workspace.workspacePath,
          workspace.workspaceName
        );
      },

      createBranch: async (name: string, fromBranch?: string) => {
        const { workspace, isOnline } = get();
        if (!workspace) throw new Error('No workspace open');
        if (!isOnline) throw new Error('Cannot create branch while offline');

        const sourceBranch = fromBranch || workspace.branch;

        // Get the SHA of the source branch
        const branch = await githubApi.getBranch(workspace.owner, workspace.repo, sourceBranch);

        // Create the new branch
        await githubApi.createBranch(workspace.owner, workspace.repo, {
          ref: `refs/heads/${name}`,
          sha: branch.commit.sha,
        });

        // Switch to the new branch
        await get().switchBranch(name);
      },

      // ========================================================================
      // State Management
      // ========================================================================

      setOnline: (isOnline: boolean) => {
        const currentStatus = get().syncStatus;
        set({
          isOnline,
          syncStatus: !isOnline ? 'offline' : currentStatus === 'offline' ? 'idle' : currentStatus,
        });
      },

      loadPendingChanges: async () => {
        const { workspace } = get();
        if (!workspace) return;

        const pendingChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges });
      },

      clearError: () => {
        set({ syncError: null, syncStatus: 'idle' });
      },

      clearDetectedWorkspaces: () => {
        set({ detectedWorkspaces: [] });
      },

      // ========================================================================
      // Staging Actions
      // ========================================================================

      stageChange: async (changeId: string) => {
        const { workspace, pendingChanges } = get();
        if (!workspace) return;

        const change = pendingChanges.find((c) => c.id === changeId);
        if (!change) return;

        const updatedChange: PendingChange = { ...change, staged: true };
        await offlineQueueService.addPendingChange(updatedChange);

        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges: updatedChanges });
      },

      unstageChange: async (changeId: string) => {
        const { workspace, pendingChanges } = get();
        if (!workspace) return;

        const change = pendingChanges.find((c) => c.id === changeId);
        if (!change) return;

        const updatedChange: PendingChange = { ...change, staged: false };
        await offlineQueueService.addPendingChange(updatedChange);

        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges: updatedChanges });
      },

      stageAllChanges: async () => {
        const { workspace, pendingChanges } = get();
        if (!workspace) return;

        for (const change of pendingChanges) {
          if (!change.staged) {
            const updatedChange: PendingChange = { ...change, staged: true };
            await offlineQueueService.addPendingChange(updatedChange);
          }
        }

        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges: updatedChanges });
      },

      unstageAllChanges: async () => {
        const { workspace, pendingChanges } = get();
        if (!workspace) return;

        for (const change of pendingChanges) {
          if (change.staged) {
            const updatedChange: PendingChange = { ...change, staged: false };
            await offlineQueueService.addPendingChange(updatedChange);
          }
        }

        const updatedChanges = await offlineQueueService.getPendingChanges(workspace.id);
        set({ pendingChanges: updatedChanges });
      },

      reset: () => {
        set({
          ...initialState,
          isOnline: navigator.onLine,
        });
      },
    }),
    { name: 'github-repo-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectWorkspace = (state: GitHubRepoState) => state.workspace;

export const selectIsRepoOpen = (state: GitHubRepoState) => state.workspace !== null;

export const selectSyncStatus = (state: GitHubRepoState) => state.syncStatus;

export const selectPendingChanges = (state: GitHubRepoState) => state.pendingChanges;

export const selectPendingChangeCount = (state: GitHubRepoState) => state.pendingChanges.length;

export const selectHasPendingChanges = (state: GitHubRepoState) => state.pendingChanges.length > 0;

export const selectIsOnline = (state: GitHubRepoState) => state.isOnline;

export const selectConflicts = (state: GitHubRepoState) => state.conflicts;

export const selectHasConflicts = (state: GitHubRepoState) => state.conflicts.length > 0;

export const selectFileTree = (state: GitHubRepoState) => state.fileTree;

export const selectIsLoading = (state: GitHubRepoState) => state.isLoading;

export const selectSyncError = (state: GitHubRepoState) => state.syncError;

export const selectDetectedWorkspaces = (state: GitHubRepoState) => state.detectedWorkspaces;

export const selectIsDetectingWorkspaces = (state: GitHubRepoState) => state.isDetectingWorkspaces;

export const selectWorkspaceDisplayName = (state: GitHubRepoState) => {
  if (!state.workspace) return null;
  if (state.workspace.workspacePath) {
    return `${state.workspace.owner}/${state.workspace.repo} - ${state.workspace.workspaceName}`;
  }
  return `${state.workspace.owner}/${state.workspace.repo}`;
};

export const selectWorkspaceBranch = (state: GitHubRepoState) => {
  return state.workspace?.branch || null;
};

export const selectWorkspacePath = (state: GitHubRepoState) => {
  return state.workspace?.workspacePath || '';
};

// Staging selectors - these return derived values
// Note: Components using array selectors should use shallow comparison or useMemo
export const selectStagedChanges = (state: GitHubRepoState) =>
  state.pendingChanges.filter((c) => c.staged);

export const selectUnstagedChanges = (state: GitHubRepoState) =>
  state.pendingChanges.filter((c) => !c.staged);

export const selectStagedChangeCount = (state: GitHubRepoState) =>
  state.pendingChanges.filter((c) => c.staged).length;

export const selectUnstagedChangeCount = (state: GitHubRepoState) =>
  state.pendingChanges.filter((c) => !c.staged).length;

export const selectHasStagedChanges = (state: GitHubRepoState) =>
  state.pendingChanges.some((c) => c.staged);
