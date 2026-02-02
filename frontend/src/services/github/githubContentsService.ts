/**
 * GitHub Contents Service
 *
 * Higher-level service for working with GitHub repository contents.
 * Wraps the GitHub API with caching, batching, and workspace-specific operations.
 */

import { githubApi } from './githubApi';
import type {
  GitHubFileContent,
  GitHubDirectoryEntry,
  GitHubTree,
  GitHubTreeEntry,
  GitHubCommitResult,
  FileChange,
  DetectedWorkspace,
} from '@/types/github-repo';
import yaml from 'js-yaml';

// ============================================================================
// Types
// ============================================================================

export interface FileContent {
  path: string;
  content: string;
  sha: string;
  size: number;
}

export interface DirectoryEntry {
  name: string;
  path: string;
  type: 'file' | 'dir';
  sha: string;
  size?: number;
}

export interface CommitResult {
  sha: string;
  message: string;
  url: string;
}

// ============================================================================
// File Operations
// ============================================================================

/**
 * Get the content of a single file
 */
export async function getFile(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<FileContent> {
  const content = await githubApi.getContent(owner, repo, path, ref);

  if (Array.isArray(content)) {
    throw new Error(`Path "${path}" is a directory, not a file`);
  }

  const fileContent = content as GitHubFileContent;
  if (fileContent.type !== 'file') {
    throw new Error(`Path "${path}" is not a file (type: ${fileContent.type})`);
  }

  if (!fileContent.content) {
    throw new Error(`File "${path}" has no content`);
  }

  // Decode base64 content
  const decodedContent = decodeBase64(fileContent.content);

  return {
    path: fileContent.path,
    content: decodedContent,
    sha: fileContent.sha,
    size: fileContent.size,
  };
}

/**
 * Get the contents of a directory
 */
export async function getDirectory(
  owner: string,
  repo: string,
  path: string,
  ref?: string
): Promise<DirectoryEntry[]> {
  const content = await githubApi.getContent(owner, repo, path || '', ref);

  if (!Array.isArray(content)) {
    throw new Error(`Path "${path}" is a file, not a directory`);
  }

  return (content as GitHubDirectoryEntry[]).map((entry) => ({
    name: entry.name,
    path: entry.path,
    type: entry.type === 'dir' ? 'dir' : 'file',
    sha: entry.sha,
    size: entry.size,
  }));
}

/**
 * Get the full repository tree (efficient for initial load)
 */
export async function getTree(
  owner: string,
  repo: string,
  sha: string,
  recursive = true
): Promise<GitHubTreeEntry[]> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${sha}${recursive ? '?recursive=1' : ''}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get tree: ${response.status}`);
  }

  const data: GitHubTree = await response.json();

  if (data.truncated) {
    console.warn('Repository tree was truncated due to size');
  }

  return data.tree;
}

/**
 * Get all files matching a pattern from the tree
 */
export async function getFilesFromTree(
  owner: string,
  repo: string,
  sha: string,
  pattern?: RegExp
): Promise<string[]> {
  const tree = await getTree(owner, repo, sha, true);

  return tree
    .filter((entry) => entry.type === 'blob')
    .filter((entry) => !pattern || pattern.test(entry.path))
    .map((entry) => entry.path);
}

// ============================================================================
// Workspace Detection
// ============================================================================

/**
 * Detect workspaces in a repository by scanning for *.workspace.yaml files
 * Checks the root directory and first-level subdirectories
 */
export async function detectWorkspaces(
  owner: string,
  repo: string,
  ref?: string
): Promise<DetectedWorkspace[]> {
  const workspaces: DetectedWorkspace[] = [];

  try {
    // Get the branch info to get the tree SHA
    const branch = await githubApi.getBranch(owner, repo, ref || 'HEAD');
    const tree = await getTree(owner, repo, branch.commit.sha, true);

    // Find all .workspace.yaml files
    const workspaceFiles = tree
      .filter((entry) => entry.type === 'blob' && entry.path.endsWith('.workspace.yaml'))
      .map((entry) => entry.path);

    // Filter to only include workspaces at root or one level deep
    const validWorkspaceFiles = workspaceFiles.filter((path) => {
      const parts = path.split('/');
      // Root level: just the filename (e.g., "myworkspace.workspace.yaml")
      // One level deep: folder/filename (e.g., "project1/myworkspace.workspace.yaml")
      return parts.length <= 2;
    });

    // Load each workspace file to get the name and description
    for (const filePath of validWorkspaceFiles) {
      try {
        const file = await getFile(owner, repo, filePath, ref);
        const content = yaml.load(file.content) as { name?: string; description?: string };

        // Determine the workspace path (folder containing the workspace file)
        const pathParts = filePath.split('/');
        const workspacePath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : '';

        workspaces.push({
          path: workspacePath,
          workspaceFile: filePath,
          name:
            content.name ||
            pathParts[pathParts.length - 1]?.replace('.workspace.yaml', '') ||
            'Unnamed',
          description: content.description,
        });
      } catch (error) {
        console.warn(`Failed to load workspace file ${filePath}:`, error);
      }
    }
  } catch (error) {
    console.error('Failed to detect workspaces:', error);
  }

  return workspaces;
}

/**
 * Get files within a specific workspace path
 */
export async function getWorkspaceFiles(
  owner: string,
  repo: string,
  workspacePath: string,
  ref?: string
): Promise<string[]> {
  const branch = await githubApi.getBranch(owner, repo, ref || 'HEAD');
  const tree = await getTree(owner, repo, branch.commit.sha, true);

  // Filter to files within the workspace path
  const prefix = workspacePath ? `${workspacePath}/` : '';

  return tree
    .filter((entry) => entry.type === 'blob')
    .filter((entry) => {
      if (!workspacePath) {
        // Root workspace - include all files
        return true;
      }
      // Subdirectory workspace - only include files in that directory
      return entry.path.startsWith(prefix);
    })
    .map((entry) => {
      // Return path relative to workspace
      if (workspacePath && entry.path.startsWith(prefix)) {
        return entry.path.substring(prefix.length);
      }
      return entry.path;
    });
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Create a new file
 */
export async function createFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string
): Promise<CommitResult> {
  const result = await githubApi.createOrUpdateFile(owner, repo, path, {
    message,
    content: encodeBase64(content),
    branch,
  });

  return {
    sha: result.commit.sha,
    message: result.commit.message,
    url: result.commit.html_url,
  };
}

/**
 * Update an existing file
 */
export async function updateFile(
  owner: string,
  repo: string,
  path: string,
  content: string,
  sha: string,
  message: string,
  branch: string
): Promise<CommitResult> {
  const result = await githubApi.createOrUpdateFile(owner, repo, path, {
    message,
    content: encodeBase64(content),
    sha,
    branch,
  });

  return {
    sha: result.commit.sha,
    message: result.commit.message,
    url: result.commit.html_url,
  };
}

/**
 * Delete a file
 */
export async function deleteFile(
  owner: string,
  repo: string,
  path: string,
  sha: string,
  message: string,
  branch: string
): Promise<CommitResult> {
  const result = await githubApi.deleteFile(owner, repo, path, {
    message,
    sha,
    branch,
  });

  return {
    sha: result.commit.sha,
    message: result.commit.message,
    url: result.commit.html_url,
  };
}

/**
 * Commit multiple files in a single commit using Git Data API
 * This is more efficient than making multiple individual commits
 */
export async function commitMultipleFiles(
  owner: string,
  repo: string,
  changes: FileChange[],
  message: string,
  branch: string
): Promise<CommitResult> {
  // 1. Get the current commit SHA for the branch
  const branchData = await githubApi.getBranch(owner, repo, branch);
  const baseSha = branchData.commit.sha;

  // 2. Get the base tree
  const baseTree = await getTreeSha(owner, repo, baseSha);

  // 3. Create blobs for new/updated files
  const treeItems: Array<{
    path: string;
    mode: '100644' | '100755' | '040000' | '160000' | '120000';
    type: 'blob' | 'tree' | 'commit';
    sha?: string | null;
    content?: string;
  }> = [];

  for (const change of changes) {
    if (change.action === 'delete') {
      // For deletions, we set sha to null
      treeItems.push({
        path: change.path,
        mode: '100644',
        type: 'blob',
        sha: null,
      });
    } else {
      // For creates/updates, include the content directly
      treeItems.push({
        path: change.path,
        mode: '100644',
        type: 'blob',
        content: change.content || '',
      });
    }
  }

  // 4. Create a new tree
  const newTree = await createTree(owner, repo, treeItems, baseTree);

  // 5. Create a new commit
  const newCommit = await createCommit(owner, repo, message, newTree, [baseSha]);

  // 6. Update the branch reference
  await updateRef(owner, repo, `heads/${branch}`, newCommit);

  return {
    sha: newCommit,
    message,
    url: `https://github.com/${owner}/${repo}/commit/${newCommit}`,
  };
}

// ============================================================================
// Git Data API Helpers
// ============================================================================

async function getTreeSha(owner: string, repo: string, commitSha: string): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/commits/${commitSha}`;

  const response = await fetch(url, {
    headers: buildAuthHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get commit: ${response.status}`);
  }

  const data: { tree: { sha: string } } = await response.json();
  return data.tree.sha;
}

async function createTree(
  owner: string,
  repo: string,
  tree: Array<{
    path: string;
    mode: '100644' | '100755' | '040000' | '160000' | '120000';
    type: 'blob' | 'tree' | 'commit';
    sha?: string | null;
    content?: string;
  }>,
  baseTree: string
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/trees`;

  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      base_tree: baseTree,
      tree,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create tree: ${error.message || response.status}`);
  }

  const data: { sha: string } = await response.json();
  return data.sha;
}

async function createCommit(
  owner: string,
  repo: string,
  message: string,
  treeSha: string,
  parents: string[]
): Promise<string> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/commits`;

  const response = await fetch(url, {
    method: 'POST',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      message,
      tree: treeSha,
      parents,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to create commit: ${error.message || response.status}`);
  }

  const data: GitHubCommitResult = await response.json();
  return data.sha;
}

async function updateRef(owner: string, repo: string, ref: string, sha: string): Promise<void> {
  const url = `https://api.github.com/repos/${owner}/${repo}/git/refs/${ref}`;

  const response = await fetch(url, {
    method: 'PATCH',
    headers: buildAuthHeaders(),
    body: JSON.stringify({
      sha,
      force: false,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Failed to update ref: ${error.message || response.status}`);
  }
}

// ============================================================================
// Helpers
// ============================================================================

function buildAuthHeaders(): HeadersInit {
  // Get token from github_auth storage (same key as githubAuth.ts)
  const storedAuth = localStorage.getItem('github_auth');
  if (!storedAuth) {
    throw new Error('Not authenticated with GitHub');
  }

  try {
    const authData = JSON.parse(storedAuth);
    const token = authData.token;
    if (!token) {
      throw new Error('No token found in GitHub auth data');
    }

    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    };
  } catch (e) {
    throw new Error('Invalid GitHub auth data in storage');
  }
}

/**
 * Decode base64 content (handles Unicode)
 */
function decodeBase64(base64: string): string {
  // Remove newlines that GitHub adds
  const cleanBase64 = base64.replace(/\n/g, '');

  // Use TextDecoder to handle UTF-8 properly
  const binaryString = atob(cleanBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return new TextDecoder('utf-8').decode(bytes);
}

/**
 * Encode content as base64 (handles Unicode)
 */
function encodeBase64(content: string): string {
  const bytes = new TextEncoder().encode(content);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i] as number);
  }
  return btoa(binary);
}

// ============================================================================
// Exports
// ============================================================================

export const githubContentsService = {
  // Read operations
  getFile,
  getDirectory,
  getTree,
  getFilesFromTree,

  // Workspace detection
  detectWorkspaces,
  getWorkspaceFiles,

  // Write operations
  createFile,
  updateFile,
  deleteFile,
  commitMultipleFiles,
};
