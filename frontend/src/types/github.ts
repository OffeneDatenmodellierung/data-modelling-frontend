/**
 * GitHub API Types
 * TypeScript interfaces for GitHub entities
 */

// ============================================================================
// Authentication
// ============================================================================

export interface GitHubUser {
  id: number;
  login: string;
  name: string | null;
  email: string | null;
  avatar_url: string;
  html_url: string;
  type: 'User' | 'Organization';
}

export interface GitHubAuthState {
  isAuthenticated: boolean;
  user: GitHubUser | null;
  token: string | null;
  tokenType: 'pat' | 'github_app' | null;
  scopes: string[];
  expiresAt: string | null;
}

// ============================================================================
// Repository
// ============================================================================

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  ssh_url: string;
  default_branch: string;
  private: boolean;
  fork: boolean;
  archived: boolean;
  disabled: boolean;
  owner: GitHubUser;
  permissions?: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
  created_at: string;
  updated_at: string;
  pushed_at: string;
}

export interface GitHubRepositoryConnection {
  owner: string;
  repo: string;
  branch: string;
  path?: string; // Subdirectory path if workspace is in a subfolder
  lastSyncedAt?: string;
}

// ============================================================================
// Branch
// ============================================================================

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubBranchProtection {
  enabled: boolean;
  required_status_checks: {
    strict: boolean;
    contexts: string[];
  } | null;
}

// ============================================================================
// Commit
// ============================================================================

export interface GitHubCommit {
  sha: string;
  message: string;
  html_url: string;
  author: {
    name: string;
    email: string;
    date: string;
  } | null;
  committer: {
    name: string;
    email: string;
    date: string;
  } | null;
  parents: Array<{
    sha: string;
    url: string;
  }>;
}

export interface GitHubCommitDetail extends GitHubCommit {
  stats: {
    additions: number;
    deletions: number;
    total: number;
  };
  files: Array<{
    sha: string;
    filename: string;
    status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
    additions: number;
    deletions: number;
    changes: number;
    patch?: string;
  }>;
}

// ============================================================================
// File Content
// ============================================================================

export interface GitHubContent {
  type: 'file' | 'dir' | 'symlink' | 'submodule';
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  download_url: string | null;
  content?: string; // Base64 encoded for files
  encoding?: 'base64';
}

export interface GitHubFileContent extends GitHubContent {
  type: 'file';
  content: string;
  encoding: 'base64';
}

// ============================================================================
// Pull Request
// ============================================================================

export interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  draft: boolean;
  merged: boolean;
  merged_at: string | null;
  mergeable: boolean | null;
  mergeable_state: 'unknown' | 'clean' | 'unstable' | 'dirty' | 'blocked';
  head: {
    ref: string;
    sha: string;
    repo: GitHubRepository | null;
  };
  base: {
    ref: string;
    sha: string;
    repo: GitHubRepository;
  };
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  requested_reviewers: GitHubUser[];
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
}

export interface GitHubPullRequestReview {
  id: number;
  user: GitHubUser;
  body: string | null;
  state: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | 'DISMISSED' | 'PENDING';
  html_url: string;
  submitted_at: string;
}

export interface GitHubPullRequestComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  html_url: string;
  path?: string;
  position?: number;
  line?: number;
}

// ============================================================================
// Issue
// ============================================================================

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: 'open' | 'closed';
  html_url: string;
  user: GitHubUser;
  assignees: GitHubUser[];
  labels: Array<{
    id: number;
    name: string;
    color: string;
  }>;
  milestone: {
    id: number;
    number: number;
    title: string;
    state: 'open' | 'closed';
  } | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface GitHubApiError {
  message: string;
  documentation_url?: string;
  errors?: Array<{
    resource: string;
    field: string;
    code: string;
    message?: string;
  }>;
}

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number; // Unix timestamp
  used: number;
}

export interface GitHubApiResponse<T> {
  data: T;
  status: number;
  headers: {
    'x-ratelimit-limit'?: string;
    'x-ratelimit-remaining'?: string;
    'x-ratelimit-reset'?: string;
    'x-ratelimit-used'?: string;
    etag?: string;
    link?: string;
  };
}

// ============================================================================
// Create/Update Types
// ============================================================================

export interface CreateBranchParams {
  ref: string; // Branch name (refs/heads/branch-name)
  sha: string; // SHA of commit to branch from
}

export interface CreateCommitParams {
  message: string;
  tree: string; // SHA of tree object
  parents: string[]; // SHA of parent commits
  author?: {
    name: string;
    email: string;
    date?: string;
  };
}

export interface CreatePullRequestParams {
  title: string;
  body?: string;
  head: string; // Branch containing changes
  base: string; // Branch to merge into
  draft?: boolean;
  maintainer_can_modify?: boolean;
}

export interface UpdateFileParams {
  message: string;
  content: string; // Base64 encoded
  sha?: string; // Required for updates, omit for creates
  branch?: string;
  author?: {
    name: string;
    email: string;
  };
}

// ============================================================================
// Workspace Integration
// ============================================================================

export interface GitHubWorkspaceConfig {
  connection: GitHubRepositoryConnection | null;
  syncEnabled: boolean;
  autoCommit: boolean;
  commitPrefix: string;
}
