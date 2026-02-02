/**
 * GitHub API Client
 * Wrapper around GitHub REST API with rate limiting and error handling
 */

import { githubAuth } from './githubAuth';
import type {
  GitHubApiError,
  GitHubApiResponse,
  GitHubRateLimit,
  GitHubRepository,
  GitHubBranch,
  GitHubCommit,
  GitHubCommitDetail,
  GitHubContent,
  GitHubPullRequest,
  GitHubUser,
  CreateBranchParams,
  CreatePullRequestParams,
  UpdateFileParams,
} from '@/types/github';

const API_BASE = 'https://api.github.com';
const API_VERSION = '2022-11-28';

/**
 * Rate limit tracking
 */
let rateLimit: GitHubRateLimit = {
  limit: 5000,
  remaining: 5000,
  reset: 0,
  used: 0,
};

/**
 * Get current rate limit status
 */
export function getRateLimit(): GitHubRateLimit {
  return { ...rateLimit };
}

/**
 * Check if we're rate limited
 */
export function isRateLimited(): boolean {
  if (rateLimit.remaining <= 0) {
    const now = Math.floor(Date.now() / 1000);
    return now < rateLimit.reset;
  }
  return false;
}

/**
 * Update rate limit from response headers
 */
function updateRateLimit(headers: Headers): void {
  const limit = headers.get('x-ratelimit-limit');
  const remaining = headers.get('x-ratelimit-remaining');
  const reset = headers.get('x-ratelimit-reset');
  const used = headers.get('x-ratelimit-used');

  if (limit) rateLimit.limit = parseInt(limit, 10);
  if (remaining) rateLimit.remaining = parseInt(remaining, 10);
  if (reset) rateLimit.reset = parseInt(reset, 10);
  if (used) rateLimit.used = parseInt(used, 10);
}

/**
 * Build request headers
 */
function buildHeaders(additionalHeaders?: Record<string, string>): Headers {
  const headers = new Headers({
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': API_VERSION,
    ...additionalHeaders,
  });

  const token = githubAuth.getToken();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  return headers;
}

/**
 * Parse error response
 */
async function parseError(response: Response): Promise<GitHubApiError> {
  try {
    return await response.json();
  } catch {
    return { message: `HTTP ${response.status}: ${response.statusText}` };
  }
}

/**
 * Generic API request function
 */
async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
  additionalHeaders?: Record<string, string>
): Promise<GitHubApiResponse<T>> {
  if (isRateLimited()) {
    const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString();
    throw new Error(`Rate limited. Resets at ${resetTime}`);
  }

  if (!githubAuth.isAuthenticated()) {
    throw new Error('Not authenticated with GitHub');
  }

  const url = path.startsWith('http') ? path : `${API_BASE}${path}`;
  const headers = buildHeaders(additionalHeaders);

  const options: RequestInit = {
    method,
    headers,
  };

  if (body) {
    options.body = JSON.stringify(body);
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, options);
  updateRateLimit(response.headers);

  if (!response.ok) {
    const error = await parseError(response);
    throw new Error(error.message);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {
      data: null as T,
      status: response.status,
      headers: {
        etag: response.headers.get('etag') || undefined,
        link: response.headers.get('link') || undefined,
      },
    };
  }

  const data = await response.json();

  return {
    data,
    status: response.status,
    headers: {
      'x-ratelimit-limit': response.headers.get('x-ratelimit-limit') || undefined,
      'x-ratelimit-remaining': response.headers.get('x-ratelimit-remaining') || undefined,
      'x-ratelimit-reset': response.headers.get('x-ratelimit-reset') || undefined,
      'x-ratelimit-used': response.headers.get('x-ratelimit-used') || undefined,
      etag: response.headers.get('etag') || undefined,
      link: response.headers.get('link') || undefined,
    },
  };
}

// ============================================================================
// User API
// ============================================================================

export async function getCurrentUser(): Promise<GitHubUser> {
  const response = await apiRequest<GitHubUser>('GET', '/user');
  return response.data;
}

// ============================================================================
// Repository API
// ============================================================================

export async function listUserRepos(options?: {
  type?: 'all' | 'owner' | 'public' | 'private' | 'member';
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  per_page?: number;
  page?: number;
}): Promise<GitHubRepository[]> {
  const params = new URLSearchParams();
  if (options?.type) params.set('type', options.type);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.direction) params.set('direction', options.direction);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/user/repos${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubRepository[]>('GET', path);
  return response.data;
}

export async function getRepository(owner: string, repo: string): Promise<GitHubRepository> {
  const response = await apiRequest<GitHubRepository>('GET', `/repos/${owner}/${repo}`);
  return response.data;
}

export async function searchRepositories(
  query: string,
  options?: {
    sort?: 'stars' | 'forks' | 'help-wanted-issues' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }
): Promise<{ total_count: number; items: GitHubRepository[] }> {
  const params = new URLSearchParams({ q: query });
  if (options?.sort) params.set('sort', options.sort);
  if (options?.order) params.set('order', options.order);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const response = await apiRequest<{ total_count: number; items: GitHubRepository[] }>(
    'GET',
    `/search/repositories?${params.toString()}`
  );
  return response.data;
}

// ============================================================================
// Branch API
// ============================================================================

export async function listBranches(
  owner: string,
  repo: string,
  options?: { per_page?: number; page?: number }
): Promise<GitHubBranch[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/branches${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubBranch[]>('GET', path);
  return response.data;
}

export async function getBranch(
  owner: string,
  repo: string,
  branch: string
): Promise<GitHubBranch> {
  const response = await apiRequest<GitHubBranch>(
    'GET',
    `/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`
  );
  return response.data;
}

export async function createBranch(
  owner: string,
  repo: string,
  params: CreateBranchParams
): Promise<{ ref: string; object: { sha: string } }> {
  const response = await apiRequest<{ ref: string; object: { sha: string } }>(
    'POST',
    `/repos/${owner}/${repo}/git/refs`,
    params
  );
  return response.data;
}

export async function deleteBranch(owner: string, repo: string, branch: string): Promise<void> {
  await apiRequest<void>(
    'DELETE',
    `/repos/${owner}/${repo}/git/refs/heads/${encodeURIComponent(branch)}`
  );
}

// ============================================================================
// Commit API
// ============================================================================

export async function listCommits(
  owner: string,
  repo: string,
  options?: {
    sha?: string;
    path?: string;
    author?: string;
    since?: string;
    until?: string;
    per_page?: number;
    page?: number;
  }
): Promise<Array<{ sha: string; commit: GitHubCommit }>> {
  const params = new URLSearchParams();
  if (options?.sha) params.set('sha', options.sha);
  if (options?.path) params.set('path', options.path);
  if (options?.author) params.set('author', options.author);
  if (options?.since) params.set('since', options.since);
  if (options?.until) params.set('until', options.until);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/commits${query ? `?${query}` : ''}`;

  const response = await apiRequest<Array<{ sha: string; commit: GitHubCommit }>>('GET', path);
  return response.data;
}

export async function getCommit(
  owner: string,
  repo: string,
  sha: string
): Promise<GitHubCommitDetail> {
  const response = await apiRequest<GitHubCommitDetail>(
    'GET',
    `/repos/${owner}/${repo}/commits/${sha}`
  );
  return response.data;
}

// ============================================================================
// Content API
// ============================================================================

export async function getContent(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<GitHubContent | GitHubContent[]> {
  const params = new URLSearchParams();
  if (ref) params.set('ref', ref);

  const query = params.toString();
  const apiPath = `/repos/${owner}/${repo}/contents/${path}${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubContent | GitHubContent[]>('GET', apiPath);
  return response.data;
}

export async function createOrUpdateFile(
  owner: string,
  repo: string,
  path: string,
  params: UpdateFileParams
): Promise<{ content: GitHubContent; commit: GitHubCommit }> {
  const response = await apiRequest<{ content: GitHubContent; commit: GitHubCommit }>(
    'PUT',
    `/repos/${owner}/${repo}/contents/${path}`,
    params
  );
  return response.data;
}

export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  params: { message: string; sha: string; branch?: string }
): Promise<{ commit: GitHubCommit }> {
  const response = await apiRequest<{ commit: GitHubCommit }>(
    'DELETE',
    `/repos/${owner}/${repo}/contents/${path}`,
    params
  );
  return response.data;
}

// ============================================================================
// Pull Request API
// ============================================================================

export async function listPullRequests(
  owner: string,
  repo: string,
  options?: {
    state?: 'open' | 'closed' | 'all';
    head?: string;
    base?: string;
    sort?: 'created' | 'updated' | 'popularity' | 'long-running';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  }
): Promise<GitHubPullRequest[]> {
  const params = new URLSearchParams();
  if (options?.state) params.set('state', options.state);
  if (options?.head) params.set('head', options.head);
  if (options?.base) params.set('base', options.base);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.direction) params.set('direction', options.direction);
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/pulls${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubPullRequest[]>('GET', path);
  return response.data;
}

export async function getPullRequest(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubPullRequest> {
  const response = await apiRequest<GitHubPullRequest>(
    'GET',
    `/repos/${owner}/${repo}/pulls/${pullNumber}`
  );
  return response.data;
}

export async function createPullRequest(
  owner: string,
  repo: string,
  params: CreatePullRequestParams
): Promise<GitHubPullRequest> {
  const response = await apiRequest<GitHubPullRequest>(
    'POST',
    `/repos/${owner}/${repo}/pulls`,
    params
  );
  return response.data;
}

export async function updatePullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  params: Partial<{
    title: string;
    body: string;
    state: 'open' | 'closed';
    base: string;
  }>
): Promise<GitHubPullRequest> {
  const response = await apiRequest<GitHubPullRequest>(
    'PATCH',
    `/repos/${owner}/${repo}/pulls/${pullNumber}`,
    params
  );
  return response.data;
}

export async function mergePullRequest(
  owner: string,
  repo: string,
  pullNumber: number,
  options?: {
    commit_title?: string;
    commit_message?: string;
    merge_method?: 'merge' | 'squash' | 'rebase';
    sha?: string;
  }
): Promise<{ sha: string; merged: boolean; message: string }> {
  const response = await apiRequest<{ sha: string; merged: boolean; message: string }>(
    'PUT',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    options
  );
  return response.data;
}

// ============================================================================
// Comparison API
// ============================================================================

export async function compareBranches(
  owner: string,
  repo: string,
  base: string,
  head: string
): Promise<{
  status: 'ahead' | 'behind' | 'identical' | 'diverged';
  ahead_by: number;
  behind_by: number;
  total_commits: number;
  commits: Array<{ sha: string; commit: GitHubCommit }>;
  files: Array<{
    sha: string;
    filename: string;
    status: string;
    additions: number;
    deletions: number;
    changes: number;
  }>;
}> {
  const response = await apiRequest<{
    status: 'ahead' | 'behind' | 'identical' | 'diverged';
    ahead_by: number;
    behind_by: number;
    total_commits: number;
    commits: Array<{ sha: string; commit: GitHubCommit }>;
    files: Array<{
      sha: string;
      filename: string;
      status: string;
      additions: number;
      deletions: number;
      changes: number;
    }>;
  }>('GET', `/repos/${owner}/${repo}/compare/${base}...${head}`);
  return response.data;
}

// ============================================================================
// Export API object
// ============================================================================

export const githubApi = {
  // User
  getCurrentUser,
  // Repository
  listUserRepos,
  getRepository,
  searchRepositories,
  // Branch
  listBranches,
  getBranch,
  createBranch,
  deleteBranch,
  // Commit
  listCommits,
  getCommit,
  // Content
  getContent,
  createOrUpdateFile,
  deleteFile,
  // Pull Request
  listPullRequests,
  getPullRequest,
  createPullRequest,
  updatePullRequest,
  mergePullRequest,
  // Comparison
  compareBranches,
  // Rate Limit
  getRateLimit,
  isRateLimited,
};
