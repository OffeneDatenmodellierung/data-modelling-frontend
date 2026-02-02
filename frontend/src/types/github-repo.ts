/**
 * GitHub Repository Mode Types
 *
 * Types for working with GitHub repositories directly via the Contents API,
 * supporting both online and offline workflows.
 */

export interface GitHubRepoWorkspace {
  id: string; // `${owner}/${repo}/${branch}/${workspacePath}`
  owner: string;
  repo: string;
  branch: string;
  defaultBranch: string;
  workspacePath: string; // Path to workspace folder (empty string for root)
  workspaceName: string; // Name from workspace.yaml
  lastSyncedAt: Date | null;
  openedAt: Date;
}

/**
 * Detected workspace in a repository
 * Used when scanning a repo for available workspaces
 */
export interface DetectedWorkspace {
  path: string; // Path to the folder containing workspace.yaml (empty for root)
  workspaceFile: string; // Full path to the .workspace.yaml file
  name: string; // Workspace name extracted from the file
  description?: string; // Optional description
}

export interface PendingChange {
  id: string;
  workspaceId: string;
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string;
  timestamp: Date;
  baseSha?: string; // For updates, the SHA of the file when we read it
}

export interface FileCache {
  workspaceId: string;
  path: string;
  content: string;
  sha: string;
  cachedAt: Date;
}

export type SyncStatus = 'idle' | 'syncing' | 'error' | 'offline' | 'conflict';

export interface SyncError {
  message: string;
  code?: string;
  conflictingFiles?: string[];
}

export interface ConflictInfo {
  path: string;
  localContent: string;
  remoteContent: string;
  remoteSha: string;
  localSha: string;
}

export type ConflictResolution = 'keep-local' | 'use-remote' | 'manual';

export interface ResolvedConflict {
  path: string;
  resolution: ConflictResolution;
  mergedContent?: string; // For manual resolution
}

// GitHub API response types
export interface GitHubFileContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  content?: string; // Base64 encoded for files
  encoding?: string;
  download_url?: string;
}

export interface GitHubDirectoryEntry {
  name: string;
  path: string;
  sha: string;
  size: number;
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  download_url?: string;
}

export interface GitHubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  sha: string;
  size?: number;
}

export interface GitHubTree {
  sha: string;
  tree: GitHubTreeEntry[];
  truncated: boolean;
}

export interface GitHubCommitResult {
  sha: string;
  message: string;
  tree: { sha: string };
  parents: { sha: string }[];
}

export interface GitHubRef {
  ref: string;
  object: {
    sha: string;
    type: string;
  };
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
  };
  protected: boolean;
}

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  description: string | null;
  private: boolean;
  default_branch: string;
  updated_at: string;
  pushed_at: string;
  html_url: string;
}

// File change for batch commits
export interface FileChange {
  path: string;
  action: 'create' | 'update' | 'delete';
  content?: string; // Required for create/update
}

// Workspace info for UI display
export interface WorkspaceInfo {
  type: 'local' | 'github';
  displayName: string;
  path?: string; // For local
  owner?: string; // For github
  repo?: string; // For github
  branch?: string; // For github
}

// Recent workspace entry (stored in localStorage)
export interface RecentWorkspace {
  id: string;
  type: 'local' | 'github';
  displayName: string;
  lastOpened: Date;
  // Local-specific
  path?: string;
  // GitHub-specific
  owner?: string;
  repo?: string;
  branch?: string;
  workspacePath?: string; // Path within repo to workspace folder
  workspaceName?: string; // Name of the workspace
}
