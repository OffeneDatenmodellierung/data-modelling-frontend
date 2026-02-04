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
// GitHub App Configuration
// ============================================================================

export interface GitHubAppConfig {
  clientId: string;
  appName: string;
  description?: string;
  // The URL where the app was installed (for reference)
  installationUrl?: string;
}

export interface GitHubAppAuthMethod {
  type: 'github_app';
  config: GitHubAppConfig;
}

export interface GitHubPATAuthMethod {
  type: 'pat';
}

export type GitHubAuthMethod = GitHubAppAuthMethod | GitHubPATAuthMethod;

export interface GitHubAuthConfig {
  // The preferred auth method (can be overridden by user)
  preferredMethod: 'pat' | 'github_app';
  // Available GitHub App configurations (org admins can configure these)
  availableApps: GitHubAppConfig[];
  // Whether to allow PAT as fallback when no app is configured
  allowPATFallback: boolean;
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
  commit_id?: string;
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
  // For review comments
  pull_request_review_id?: number;
  diff_hunk?: string;
  original_position?: number;
  commit_id?: string;
  original_commit_id?: string;
  in_reply_to_id?: number;
}

// Issue comment (also used for PR general comments)
export interface GitHubIssueComment {
  id: number;
  body: string;
  user: GitHubUser;
  created_at: string;
  updated_at: string;
  html_url: string;
  author_association?: string;
}

// PR file changed
export interface GitHubPRFile {
  sha: string;
  filename: string;
  status: 'added' | 'removed' | 'modified' | 'renamed' | 'copied' | 'changed' | 'unchanged';
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  previous_filename?: string;
}

// Create review params
export interface CreatePRReviewParams {
  body?: string;
  event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  comments?: Array<{
    path: string;
    position?: number;
    body: string;
    line?: number;
    side?: 'LEFT' | 'RIGHT';
    start_line?: number;
    start_side?: 'LEFT' | 'RIGHT';
  }>;
}

// Review request params
export interface RequestReviewersParams {
  reviewers?: string[];
  team_reviewers?: string[];
}

// Merge params
export interface MergePRParams {
  commit_title?: string;
  commit_message?: string;
  merge_method?: 'merge' | 'squash' | 'rebase';
  sha?: string;
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
// Tag
// ============================================================================

export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
  node_id: string;
}

export interface GitHubAnnotatedTag {
  tag: string;
  sha: string;
  url: string;
  message: string;
  tagger: {
    name: string;
    email: string;
    date: string;
  };
  object: {
    type: string;
    sha: string;
    url: string;
  };
}

export interface CreateTagParams {
  tag: string;
  message: string;
  object: string; // SHA of commit to tag
  type: 'commit' | 'tree' | 'blob';
  tagger?: {
    name: string;
    email: string;
    date?: string;
  };
}

// ============================================================================
// Blame
// ============================================================================

export interface GitHubBlameLine {
  lineNumber: number;
  content: string;
  commit: {
    sha: string;
    shortSha: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
  };
}

export interface GitHubBlameHunk {
  lines: GitHubBlameLine[];
  commit: {
    sha: string;
    shortSha: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
  };
  startLine: number;
  endLine: number;
}

export interface GitHubBlameResult {
  path: string;
  hunks: GitHubBlameHunk[];
  lines: GitHubBlameLine[];
}

// ============================================================================
// PR Conflict / Update
// ============================================================================

export interface GitHubPRConflictInfo {
  hasConflicts: boolean;
  mergeable: boolean | null;
  mergeableState: 'unknown' | 'clean' | 'unstable' | 'dirty' | 'blocked';
  conflictingFiles?: string[];
  behindBy: number;
  aheadBy: number;
}

export interface GitHubUpdateBranchResult {
  message: string;
  url: string;
}

// ============================================================================
// PR Review Workflow Types
// ============================================================================

/**
 * A pending review comment that hasn't been submitted yet
 */
export interface PendingReviewComment {
  id: string;
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  body: string;
  startLine?: number;
  startSide?: 'LEFT' | 'RIGHT';
}

/**
 * A thread of review comments on a specific line
 */
export interface ReviewThread {
  id: string;
  path: string;
  line: number;
  side: 'LEFT' | 'RIGHT';
  originalLine?: number;
  isResolved: boolean;
  isOutdated: boolean;
  isCollapsed: boolean;
  comments: GitHubPullRequestComment[];
}

/**
 * A single line in a diff view
 */
export interface DiffLine {
  type: 'addition' | 'deletion' | 'context' | 'hunk' | 'header';
  content: string;
  oldLineNumber?: number;
  newLineNumber?: number;
  threads?: ReviewThread[];
}

/**
 * A hunk (section) of a diff
 */
export interface DiffHunk {
  header: string;
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

/**
 * A parsed file diff with structured data
 */
export interface ParsedFileDiff {
  filename: string;
  previousFilename?: string;
  status: 'added' | 'modified' | 'removed' | 'renamed' | 'copied';
  additions: number;
  deletions: number;
  isBinary: boolean;
  hunks: DiffHunk[];
}

/**
 * Branch comparison result
 */
export interface BranchComparison {
  status: 'ahead' | 'behind' | 'identical' | 'diverged';
  aheadBy: number;
  behindBy: number;
  totalCommits: number;
  commits: Array<{
    sha: string;
    shortSha: string;
    message: string;
    author: string;
    authorAvatar?: string;
    date: string;
  }>;
  files: Array<{
    filename: string;
    status: string;
    additions: number;
    deletions: number;
  }>;
  mergeBaseCommit?: string;
}

/**
 * Review event types
 */
export type ReviewEvent = 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';

/**
 * Pending review state (for collecting inline comments before submission)
 */
export interface PendingReview {
  prNumber: number;
  comments: PendingReviewComment[];
  startedAt: string;
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
