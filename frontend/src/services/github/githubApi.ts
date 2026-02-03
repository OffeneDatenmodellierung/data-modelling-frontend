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
  GitHubPullRequestReview,
  GitHubPullRequestComment,
  GitHubIssueComment,
  GitHubPRFile,
  GitHubUser,
  GitHubTag,
  GitHubAnnotatedTag,
  CreateBranchParams,
  CreatePullRequestParams,
  CreateTagParams,
  CreatePRReviewParams,
  RequestReviewersParams,
  MergePRParams,
  UpdateFileParams,
  GitHubBlameResult,
  GitHubBlameLine,
  GitHubBlameHunk,
  GitHubPRConflictInfo,
  GitHubUpdateBranchResult,
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
  options?: MergePRParams
): Promise<{ sha: string; merged: boolean; message: string }> {
  const response = await apiRequest<{ sha: string; merged: boolean; message: string }>(
    'PUT',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/merge`,
    options
  );
  return response.data;
}

// ============================================================================
// Pull Request Files API
// ============================================================================

export async function listPRFiles(
  owner: string,
  repo: string,
  pullNumber: number,
  options?: { per_page?: number; page?: number }
): Promise<GitHubPRFile[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/pulls/${pullNumber}/files${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubPRFile[]>('GET', path);
  return response.data;
}

// ============================================================================
// Pull Request Comments API (Issue Comments - general discussion)
// ============================================================================

export async function listPRComments(
  owner: string,
  repo: string,
  pullNumber: number,
  options?: { per_page?: number; page?: number; since?: string }
): Promise<GitHubIssueComment[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));
  if (options?.since) params.set('since', options.since);

  const query = params.toString();
  // PRs use the issues endpoint for general comments
  const path = `/repos/${owner}/${repo}/issues/${pullNumber}/comments${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubIssueComment[]>('GET', path);
  return response.data;
}

export async function createPRComment(
  owner: string,
  repo: string,
  pullNumber: number,
  body: string
): Promise<GitHubIssueComment> {
  const response = await apiRequest<GitHubIssueComment>(
    'POST',
    `/repos/${owner}/${repo}/issues/${pullNumber}/comments`,
    { body }
  );
  return response.data;
}

export async function updatePRComment(
  owner: string,
  repo: string,
  commentId: number,
  body: string
): Promise<GitHubIssueComment> {
  const response = await apiRequest<GitHubIssueComment>(
    'PATCH',
    `/repos/${owner}/${repo}/issues/comments/${commentId}`,
    { body }
  );
  return response.data;
}

export async function deletePRComment(
  owner: string,
  repo: string,
  commentId: number
): Promise<void> {
  await apiRequest<void>('DELETE', `/repos/${owner}/${repo}/issues/comments/${commentId}`);
}

// ============================================================================
// Pull Request Review Comments API (inline code comments)
// ============================================================================

export async function listPRReviewComments(
  owner: string,
  repo: string,
  pullNumber: number,
  options?: {
    per_page?: number;
    page?: number;
    since?: string;
    sort?: 'created' | 'updated';
    direction?: 'asc' | 'desc';
  }
): Promise<GitHubPullRequestComment[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));
  if (options?.since) params.set('since', options.since);
  if (options?.sort) params.set('sort', options.sort);
  if (options?.direction) params.set('direction', options.direction);

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/pulls/${pullNumber}/comments${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubPullRequestComment[]>('GET', path);
  return response.data;
}

export async function createPRReviewComment(
  owner: string,
  repo: string,
  pullNumber: number,
  params: {
    body: string;
    commit_id: string;
    path: string;
    line?: number;
    side?: 'LEFT' | 'RIGHT';
    start_line?: number;
    start_side?: 'LEFT' | 'RIGHT';
    in_reply_to?: number;
  }
): Promise<GitHubPullRequestComment> {
  const response = await apiRequest<GitHubPullRequestComment>(
    'POST',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/comments`,
    params
  );
  return response.data;
}

export async function updatePRReviewComment(
  owner: string,
  repo: string,
  commentId: number,
  body: string
): Promise<GitHubPullRequestComment> {
  const response = await apiRequest<GitHubPullRequestComment>(
    'PATCH',
    `/repos/${owner}/${repo}/pulls/comments/${commentId}`,
    { body }
  );
  return response.data;
}

export async function deletePRReviewComment(
  owner: string,
  repo: string,
  commentId: number
): Promise<void> {
  await apiRequest<void>('DELETE', `/repos/${owner}/${repo}/pulls/comments/${commentId}`);
}

// ============================================================================
// Pull Request Reviews API
// ============================================================================

export async function listPRReviews(
  owner: string,
  repo: string,
  pullNumber: number,
  options?: { per_page?: number; page?: number }
): Promise<GitHubPullRequestReview[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubPullRequestReview[]>('GET', path);
  return response.data;
}

export async function getPRReview(
  owner: string,
  repo: string,
  pullNumber: number,
  reviewId: number
): Promise<GitHubPullRequestReview> {
  const response = await apiRequest<GitHubPullRequestReview>(
    'GET',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}`
  );
  return response.data;
}

export async function createPRReview(
  owner: string,
  repo: string,
  pullNumber: number,
  params: CreatePRReviewParams
): Promise<GitHubPullRequestReview> {
  const response = await apiRequest<GitHubPullRequestReview>(
    'POST',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews`,
    params
  );
  return response.data;
}

export async function submitPRReview(
  owner: string,
  repo: string,
  pullNumber: number,
  reviewId: number,
  params: { body?: string; event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT' }
): Promise<GitHubPullRequestReview> {
  const response = await apiRequest<GitHubPullRequestReview>(
    'POST',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}/events`,
    params
  );
  return response.data;
}

export async function dismissPRReview(
  owner: string,
  repo: string,
  pullNumber: number,
  reviewId: number,
  message: string
): Promise<GitHubPullRequestReview> {
  const response = await apiRequest<GitHubPullRequestReview>(
    'PUT',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}/dismissals`,
    { message }
  );
  return response.data;
}

export async function listReviewCommentsForReview(
  owner: string,
  repo: string,
  pullNumber: number,
  reviewId: number,
  options?: { per_page?: number; page?: number }
): Promise<GitHubPullRequestComment[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/pulls/${pullNumber}/reviews/${reviewId}/comments${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubPullRequestComment[]>('GET', path);
  return response.data;
}

// ============================================================================
// Pull Request Reviewers API
// ============================================================================

export async function requestReviewers(
  owner: string,
  repo: string,
  pullNumber: number,
  params: RequestReviewersParams
): Promise<GitHubPullRequest> {
  const response = await apiRequest<GitHubPullRequest>(
    'POST',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    params
  );
  return response.data;
}

export async function removeReviewers(
  owner: string,
  repo: string,
  pullNumber: number,
  params: RequestReviewersParams
): Promise<GitHubPullRequest> {
  const response = await apiRequest<GitHubPullRequest>(
    'DELETE',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`,
    params
  );
  return response.data;
}

export async function listRequestedReviewers(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<{ users: GitHubUser[]; teams: Array<{ id: number; name: string; slug: string }> }> {
  const response = await apiRequest<{
    users: GitHubUser[];
    teams: Array<{ id: number; name: string; slug: string }>;
  }>('GET', `/repos/${owner}/${repo}/pulls/${pullNumber}/requested_reviewers`);
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
// Tag API
// ============================================================================

export async function listTags(
  owner: string,
  repo: string,
  options?: { per_page?: number; page?: number }
): Promise<GitHubTag[]> {
  const params = new URLSearchParams();
  if (options?.per_page) params.set('per_page', String(options.per_page));
  if (options?.page) params.set('page', String(options.page));

  const query = params.toString();
  const path = `/repos/${owner}/${repo}/tags${query ? `?${query}` : ''}`;

  const response = await apiRequest<GitHubTag[]>('GET', path);
  return response.data;
}

export async function getTag(
  owner: string,
  repo: string,
  tagSha: string
): Promise<GitHubAnnotatedTag> {
  const response = await apiRequest<GitHubAnnotatedTag>(
    'GET',
    `/repos/${owner}/${repo}/git/tags/${tagSha}`
  );
  return response.data;
}

export async function createAnnotatedTag(
  owner: string,
  repo: string,
  params: CreateTagParams
): Promise<GitHubAnnotatedTag> {
  // First create the tag object
  const tagResponse = await apiRequest<GitHubAnnotatedTag>(
    'POST',
    `/repos/${owner}/${repo}/git/tags`,
    params
  );

  // Then create the reference pointing to the tag
  await apiRequest<{ ref: string; object: { sha: string } }>(
    'POST',
    `/repos/${owner}/${repo}/git/refs`,
    {
      ref: `refs/tags/${params.tag}`,
      sha: tagResponse.data.sha,
    }
  );

  return tagResponse.data;
}

export async function createLightweightTag(
  owner: string,
  repo: string,
  tagName: string,
  commitSha: string
): Promise<{ ref: string; object: { sha: string } }> {
  const response = await apiRequest<{ ref: string; object: { sha: string } }>(
    'POST',
    `/repos/${owner}/${repo}/git/refs`,
    {
      ref: `refs/tags/${tagName}`,
      sha: commitSha,
    }
  );
  return response.data;
}

export async function deleteTag(owner: string, repo: string, tagName: string): Promise<void> {
  await apiRequest<void>(
    'DELETE',
    `/repos/${owner}/${repo}/git/refs/tags/${encodeURIComponent(tagName)}`
  );
}

// ============================================================================
// Blame API (via GraphQL)
// ============================================================================

/**
 * Get blame information for a file using GitHub's GraphQL API
 * The REST API doesn't support blame, so we use GraphQL
 */
export async function getBlame(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<GitHubBlameResult> {
  const query = `
    query GetBlame($owner: String!, $repo: String!, $path: String!, $ref: String!) {
      repository(owner: $owner, name: $repo) {
        object(expression: $ref) {
          ... on Commit {
            blame(path: $path) {
              ranges {
                startingLine
                endingLine
                commit {
                  oid
                  abbreviatedOid
                  message
                  author {
                    name
                    email
                    date
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  const variables = {
    owner,
    repo,
    path,
    ref: ref || 'HEAD',
  };

  const response = await graphqlRequest<{
    repository: {
      object: {
        blame: {
          ranges: Array<{
            startingLine: number;
            endingLine: number;
            commit: {
              oid: string;
              abbreviatedOid: string;
              message: string;
              author: {
                name: string;
                email: string;
                date: string;
              };
            };
          }>;
        };
      } | null;
    };
  }>(query, variables);

  const blameData = response.data?.repository?.object?.blame;
  if (!blameData) {
    throw new Error(`Could not get blame for ${path}`);
  }

  const hunks: GitHubBlameHunk[] = blameData.ranges.map((range) => ({
    startLine: range.startingLine,
    endLine: range.endingLine,
    commit: {
      sha: range.commit.oid,
      shortSha: range.commit.abbreviatedOid,
      author: range.commit.author.name,
      authorEmail: range.commit.author.email,
      date: range.commit.author.date,
      message: range.commit.message,
    },
    lines: [], // Will be populated when we fetch file content
  }));

  // To get actual line content, we need to fetch the file
  const fileContent = await getContent(owner, repo, path, ref);
  const lines: string[] = [];

  if (!Array.isArray(fileContent) && fileContent.type === 'file' && fileContent.content) {
    const decodedContent = atob(fileContent.content.replace(/\n/g, ''));
    lines.push(...decodedContent.split('\n'));
  }

  // Map lines to blame info
  const blameLines: GitHubBlameLine[] = [];
  for (let i = 0; i < lines.length; i++) {
    const lineNumber = i + 1;
    const hunk = hunks.find((h) => lineNumber >= h.startLine && lineNumber <= h.endLine);
    if (hunk) {
      const blameLine: GitHubBlameLine = {
        lineNumber,
        content: lines[i] ?? '',
        commit: hunk.commit,
      };
      blameLines.push(blameLine);
      hunk.lines.push(blameLine);
    }
  }

  return {
    path,
    hunks,
    lines: blameLines,
  };
}

/**
 * GraphQL request helper
 */
async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<{ data: T }> {
  if (isRateLimited()) {
    const resetTime = new Date(rateLimit.reset * 1000).toLocaleTimeString();
    throw new Error(`Rate limited. Resets at ${resetTime}`);
  }

  if (!githubAuth.isAuthenticated()) {
    throw new Error('Not authenticated with GitHub');
  }

  const token = githubAuth.getToken();
  const response = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query, variables }),
  });

  updateRateLimit(response.headers);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || `GraphQL request failed: ${response.status}`);
  }

  const result = await response.json();
  if (result.errors) {
    throw new Error(result.errors[0]?.message || 'GraphQL request failed');
  }

  return result;
}

// ============================================================================
// PR Conflict Detection & Update
// ============================================================================

/**
 * Get detailed conflict information for a pull request
 */
export async function getPRConflictInfo(
  owner: string,
  repo: string,
  pullNumber: number
): Promise<GitHubPRConflictInfo> {
  // Get the PR details
  const pr = await getPullRequest(owner, repo, pullNumber);

  // Compare base and head to get ahead/behind info
  let aheadBy = 0;
  let behindBy = 0;

  try {
    const comparison = await compareBranches(owner, repo, pr.base.ref, pr.head.ref);
    aheadBy = comparison.ahead_by;
    behindBy = comparison.behind_by;
  } catch {
    // Comparison might fail if branches are unrelated
  }

  const hasConflicts = pr.mergeable === false || pr.mergeable_state === 'dirty';

  // Get conflicting files if there are conflicts
  let conflictingFiles: string[] | undefined;
  if (hasConflicts) {
    // GitHub doesn't directly expose conflicting files via API
    // We can try to get them via the merge status check
    // For now, we'll leave this undefined as GitHub doesn't expose this easily
    conflictingFiles = undefined;
  }

  return {
    hasConflicts,
    mergeable: pr.mergeable,
    mergeableState: pr.mergeable_state,
    conflictingFiles,
    behindBy,
    aheadBy,
  };
}

/**
 * Update a pull request branch with the latest changes from base
 * This uses the "Update branch" button functionality
 */
export async function updatePullRequestBranch(
  owner: string,
  repo: string,
  pullNumber: number,
  expectedHeadSha?: string
): Promise<GitHubUpdateBranchResult> {
  const body: { expected_head_sha?: string } = {};
  if (expectedHeadSha) {
    body.expected_head_sha = expectedHeadSha;
  }

  const response = await apiRequest<GitHubUpdateBranchResult>(
    'PUT',
    `/repos/${owner}/${repo}/pulls/${pullNumber}/update-branch`,
    body
  );
  return response.data;
}

// ============================================================================
// Branch Merge API
// ============================================================================

export interface MergeBranchParams {
  /** The name of the base branch that the head will be merged into */
  base: string;
  /** The head to merge. Can be a branch name or a commit SHA */
  head: string;
  /** Commit message for the merge commit */
  commit_message?: string;
}

export interface MergeBranchResult {
  sha: string;
  merged: boolean;
  message: string;
}

/**
 * Merge a branch into another branch
 * This performs a merge via the GitHub API (like "git merge")
 *
 * Common use cases:
 * - Update main with changes from a feature branch
 * - Update a feature branch with changes from main
 */
export async function mergeBranches(
  owner: string,
  repo: string,
  params: MergeBranchParams
): Promise<MergeBranchResult> {
  const response = await apiRequest<MergeBranchResult>('POST', `/repos/${owner}/${repo}/merges`, {
    base: params.base,
    head: params.head,
    commit_message: params.commit_message,
  });
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
  // Pull Request - Basic
  listPullRequests,
  getPullRequest,
  createPullRequest,
  updatePullRequest,
  mergePullRequest,
  // Pull Request - Files
  listPRFiles,
  // Pull Request - Comments (general discussion)
  listPRComments,
  createPRComment,
  updatePRComment,
  deletePRComment,
  // Pull Request - Review Comments (inline code comments)
  listPRReviewComments,
  createPRReviewComment,
  updatePRReviewComment,
  deletePRReviewComment,
  // Pull Request - Reviews
  listPRReviews,
  getPRReview,
  createPRReview,
  submitPRReview,
  dismissPRReview,
  listReviewCommentsForReview,
  // Pull Request - Reviewers
  requestReviewers,
  removeReviewers,
  listRequestedReviewers,
  // Comparison
  compareBranches,
  // Tags
  listTags,
  getTag,
  createAnnotatedTag,
  createLightweightTag,
  deleteTag,
  // Blame
  getBlame,
  // PR Conflicts
  getPRConflictInfo,
  updatePullRequestBranch,
  // Branch merging
  mergeBranches,
  // Rate Limit
  getRateLimit,
  isRateLimited,
};
