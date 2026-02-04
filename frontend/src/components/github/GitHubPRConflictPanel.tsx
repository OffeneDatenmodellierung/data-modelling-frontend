/**
 * GitHub PR Conflict Panel Component
 * Display conflict status and update branch functionality for pull requests
 * Supports both local git mode (useGitHubStore) and repo mode (useGitHubRepoStore)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectPRConflictInfo,
  selectIsLoadingConflictInfo,
} from '@/stores/githubStore';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { useShallow } from 'zustand/react/shallow';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubPullRequest, GitHubPRConflictInfo } from '@/types/github';
import { MergeConflictResolver, type ConflictFile } from '../git/MergeConflictResolver';

export interface GitHubPRConflictPanelProps {
  pullRequest: GitHubPullRequest;
  className?: string;
  onUpdated?: () => void;
}

interface ConflictResolutionState {
  files: ConflictFile[];
  currentFileIndex: number;
  resolvedFiles: Map<string, string>;
}

export const GitHubPRConflictPanel: React.FC<GitHubPRConflictPanelProps> = ({
  pullRequest,
  className = '',
  onUpdated,
}) => {
  // Local git mode state
  const isConnectedFromLocalStore = useGitHubStore(selectIsConnected);
  const connectionFromLocalStore = useGitHubStore((state) => state.connection);
  const conflictInfoFromStore = useGitHubStore(selectPRConflictInfo(pullRequest.number));
  const isLoadingGlobal = useGitHubStore(selectIsLoadingConflictInfo);
  const setPRConflictInfo = useGitHubStore((state) => state.setPRConflictInfo);
  const setLoadingConflictInfo = useGitHubStore((state) => state.setLoadingConflictInfo);

  // Repo mode state
  const repoWorkspace = useGitHubRepoStore(
    useShallow((state) => ({
      owner: state.workspace?.owner ?? null,
      repo: state.workspace?.repo ?? null,
      branch: state.workspace?.branch ?? null,
      hasWorkspace: state.workspace !== null,
    }))
  );

  // Determine effective connection (prefer local store, fallback to repo workspace)
  const connection = useMemo(() => {
    if (connectionFromLocalStore) return connectionFromLocalStore;
    if (repoWorkspace.hasWorkspace && repoWorkspace.owner && repoWorkspace.repo) {
      return {
        owner: repoWorkspace.owner,
        repo: repoWorkspace.repo,
        branch: repoWorkspace.branch,
      };
    }
    return null;
  }, [connectionFromLocalStore, repoWorkspace]);

  const isConnected = isConnectedFromLocalStore || repoWorkspace.hasWorkspace;

  // Local state for conflict info (used in repo mode when store doesn't have it)
  const [localConflictInfo, setLocalConflictInfo] = useState<GitHubPRConflictInfo | null>(null);
  const conflictInfo = conflictInfoFromStore || localConflictInfo;

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conflict resolution state
  const [conflictResolution, setConflictResolution] = useState<ConflictResolutionState | null>(
    null
  );
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);

  // Load conflict info
  const loadConflictInfo = useCallback(async () => {
    if (!connection) return;

    setIsLoading(true);
    setLoadingConflictInfo(true);
    setError(null);

    try {
      const info = await githubApi.getPRConflictInfo(
        connection.owner,
        connection.repo,
        pullRequest.number
      );

      // Store in appropriate place
      if (connectionFromLocalStore) {
        setPRConflictInfo(pullRequest.number, info);
      } else {
        setLocalConflictInfo(info);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conflict info');
    } finally {
      setIsLoading(false);
      setLoadingConflictInfo(false);
    }
  }, [
    connection,
    connectionFromLocalStore,
    pullRequest.number,
    setPRConflictInfo,
    setLoadingConflictInfo,
  ]);

  // Load on mount
  useEffect(() => {
    if (isConnected && !conflictInfo) {
      loadConflictInfo();
    }
  }, [isConnected, conflictInfo, loadConflictInfo]);

  // Update branch (when no conflicts, just behind)
  const handleUpdateBranch = useCallback(async () => {
    if (!connection) return;

    setIsUpdating(true);
    setError(null);

    try {
      await githubApi.updatePullRequestBranch(
        connection.owner,
        connection.repo,
        pullRequest.number
      );
      // Reload conflict info after update
      await loadConflictInfo();
      onUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update branch');
    } finally {
      setIsUpdating(false);
    }
  }, [connection, pullRequest.number, loadConflictInfo, onUpdated]);

  // Load conflicting files for resolution
  const loadConflictingFiles = useCallback(async () => {
    if (!connection) return;

    setIsLoadingConflicts(true);
    setError(null);

    try {
      // First, check if we have known conflicting files from the conflict info
      let filesToResolve: string[] = [];

      if (conflictInfo?.conflictingFiles && conflictInfo.conflictingFiles.length > 0) {
        // Use the known conflicting files
        filesToResolve = conflictInfo.conflictingFiles;
      } else {
        // Fallback: Get files that were modified in BOTH branches
        // by comparing head to base AND looking for files with status 'modified'
        const comparison = await githubApi.compareBranches(
          connection.owner,
          connection.repo,
          pullRequest.base.ref,
          pullRequest.head.ref
        );

        // Only consider files that are modified (not added/removed) as potential conflicts
        // Files that are added only exist in one branch, removed files only exist in the other
        // True conflicts occur when the same file is modified differently in both branches
        const modifiedFiles = (comparison.files || []).filter(
          (f) => f.status === 'modified' || f.status === 'changed'
        );

        if (modifiedFiles.length === 0) {
          setError(
            'Could not identify conflicting files. The conflict may involve added/deleted files. Please resolve locally using:\n\ngit checkout ' +
              pullRequest.head.ref +
              '\ngit merge ' +
              pullRequest.base.ref
          );
          setIsLoadingConflicts(false);
          return;
        }

        filesToResolve = modifiedFiles.map((f) => f.filename);
      }

      if (filesToResolve.length === 0) {
        setError('No conflicting files identified. Please resolve conflicts locally.');
        setIsLoadingConflicts(false);
        return;
      }

      // Fetch content for each conflicting file from both branches
      const conflictFiles: ConflictFile[] = [];

      for (const filename of filesToResolve) {
        try {
          // Get content from base branch (theirs - what we're merging into)
          let baseContent = '';
          let baseExists = true;
          try {
            const baseResult = await githubApi.getFileContentAsString(
              connection.owner,
              connection.repo,
              filename,
              pullRequest.base.ref
            );
            baseContent = baseResult.content;
          } catch {
            // File doesn't exist in base (new file in PR)
            baseContent = '';
            baseExists = false;
          }

          // Get content from head branch (ours - PR branch)
          let headContent = '';
          let headExists = true;
          try {
            const headResult = await githubApi.getFileContentAsString(
              connection.owner,
              connection.repo,
              filename,
              pullRequest.head.ref
            );
            headContent = headResult.content;
          } catch {
            // File doesn't exist in head (deleted in PR)
            headContent = '';
            headExists = false;
          }

          // Add to conflict files if they differ
          if (baseContent !== headContent) {
            conflictFiles.push({
              path: filename,
              oursContent: headContent, // PR branch is "ours"
              theirsContent: baseContent, // Base branch is "theirs"
              // Store metadata about existence for UI
              oursExists: headExists,
              theirsExists: baseExists,
            } as ConflictFile);
          }
        } catch (err) {
          console.warn(`Could not load file ${filename} for conflict resolution:`, err);
        }
      }

      if (conflictFiles.length === 0) {
        setError('Could not load conflicting files. Please resolve conflicts locally.');
        setIsLoadingConflicts(false);
        return;
      }

      setConflictResolution({
        files: conflictFiles,
        currentFileIndex: 0,
        resolvedFiles: new Map(),
      });
      setShowConflictResolver(true);
    } catch (err) {
      console.error('Failed to load conflicting files:', err);
      setError(err instanceof Error ? err.message : 'Failed to load conflicting files');
    } finally {
      setIsLoadingConflicts(false);
    }
  }, [connection, pullRequest, conflictInfo]);

  // Handle file resolution
  const handleFileResolved = useCallback(
    (resolvedContent: string) => {
      if (!conflictResolution) return;

      const currentFile = conflictResolution.files[conflictResolution.currentFileIndex];
      if (!currentFile) return;

      const newResolvedFiles = new Map(conflictResolution.resolvedFiles);
      newResolvedFiles.set(currentFile.path, resolvedContent);

      // Move to next file or finish
      if (conflictResolution.currentFileIndex < conflictResolution.files.length - 1) {
        setConflictResolution({
          ...conflictResolution,
          currentFileIndex: conflictResolution.currentFileIndex + 1,
          resolvedFiles: newResolvedFiles,
        });
      } else {
        // All files resolved - commit them
        commitResolvedFiles(newResolvedFiles);
      }
    },
    [conflictResolution]
  );

  // Commit resolved files to the PR branch
  const commitResolvedFiles = useCallback(
    async (resolvedFiles: Map<string, string>) => {
      if (!connection) return;

      setShowConflictResolver(false);
      setIsCommitting(true);
      setError(null);

      try {
        // Commit each resolved file to the PR's head branch
        for (const [path, content] of resolvedFiles) {
          // Get the current file SHA from the head branch
          const fileContent = await githubApi.getContent(
            connection.owner,
            connection.repo,
            path,
            pullRequest.head.ref
          );

          if (Array.isArray(fileContent)) {
            throw new Error(`Path "${path}" is a directory`);
          }

          // Update the file on the head branch
          await githubApi.createOrUpdateFile(connection.owner, connection.repo, path, {
            message: `Resolve merge conflict in ${path}`,
            content: btoa(unescape(encodeURIComponent(content))), // Handle UTF-8 properly
            sha: fileContent.sha,
            branch: pullRequest.head.ref,
          });
        }

        // Reload conflict info
        await loadConflictInfo();
        onUpdated?.();
      } catch (err) {
        console.error('Failed to commit resolved files:', err);
        setError(err instanceof Error ? err.message : 'Failed to commit resolved files');
      } finally {
        setIsCommitting(false);
        setConflictResolution(null);
      }
    },
    [connection, pullRequest.head.ref, loadConflictInfo, onUpdated]
  );

  // Cancel conflict resolution
  const handleCancelConflictResolution = useCallback(() => {
    setShowConflictResolver(false);
    setConflictResolution(null);
  }, []);

  if (!isConnected) {
    return null;
  }

  // Get status color
  const getStatusColor = (info: GitHubPRConflictInfo): string => {
    if (info.hasConflicts) return 'text-red-600 bg-red-50 border-red-200';
    if (info.mergeableState === 'clean') return 'text-green-600 bg-green-50 border-green-200';
    if (info.mergeableState === 'unstable') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    if (info.mergeableState === 'blocked') return 'text-orange-600 bg-orange-50 border-orange-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  // Get status icon
  const getStatusIcon = (info: GitHubPRConflictInfo) => {
    if (info.hasConflicts) {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    if (info.mergeableState === 'clean') {
      return (
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
          clipRule="evenodd"
        />
      </svg>
    );
  };

  // Get status text
  const getStatusText = (info: GitHubPRConflictInfo): string => {
    if (info.hasConflicts) return 'Has Conflicts';
    switch (info.mergeableState) {
      case 'clean':
        return 'Ready to merge';
      case 'unstable':
        return 'Checks pending';
      case 'blocked':
        return 'Blocked';
      case 'dirty':
        return 'Has conflicts';
      default:
        return 'Checking...';
    }
  };

  // Show conflict resolver modal
  if (showConflictResolver && conflictResolution) {
    const currentFile = conflictResolution.files[conflictResolution.currentFileIndex];
    if (!currentFile) {
      return null;
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-[90vw] h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* Modal header */}
          <div className="px-4 py-3 bg-gray-100 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Resolving conflicts: {conflictResolution.currentFileIndex + 1} of{' '}
                {conflictResolution.files.length}
              </span>
              <div className="flex gap-1">
                {conflictResolution.files.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx < conflictResolution.currentFileIndex
                        ? 'bg-green-500'
                        : idx === conflictResolution.currentFileIndex
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleCancelConflictResolution}
              className="text-gray-500 hover:text-gray-700"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Conflict resolver */}
          <div className="flex-1 overflow-hidden">
            <MergeConflictResolver
              file={currentFile}
              oursBranch={pullRequest.head.ref}
              theirsBranch={pullRequest.base.ref}
              onResolve={handleFileResolved}
              onCancel={handleCancelConflictResolution}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      {isLoading || isLoadingGlobal ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200">
          <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-500">Checking merge status...</span>
        </div>
      ) : isCommitting ? (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg border border-blue-200">
          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-blue-600">Committing resolved files...</span>
        </div>
      ) : error ? (
        <div className="flex items-center justify-between px-3 py-2 bg-red-50 rounded-lg border border-red-200">
          <span className="text-sm text-red-600">{error}</span>
          <button
            onClick={loadConflictInfo}
            className="text-xs text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      ) : conflictInfo ? (
        <div className={`px-3 py-2 rounded-lg border ${getStatusColor(conflictInfo)}`}>
          {/* Status row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {getStatusIcon(conflictInfo)}
              <span className="text-sm font-medium">{getStatusText(conflictInfo)}</span>
            </div>
            <button
              onClick={loadConflictInfo}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Refresh"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>

          {/* Branch info */}
          <div className="mt-2 flex items-center gap-4 text-xs">
            {conflictInfo.aheadBy > 0 && (
              <span className="text-green-600">
                {conflictInfo.aheadBy} commit{conflictInfo.aheadBy !== 1 ? 's' : ''} ahead
              </span>
            )}
            {conflictInfo.behindBy > 0 && (
              <span className="text-orange-600">
                {conflictInfo.behindBy} commit{conflictInfo.behindBy !== 1 ? 's' : ''} behind
              </span>
            )}
          </div>

          {/* Conflicting files */}
          {conflictInfo.conflictingFiles && conflictInfo.conflictingFiles.length > 0 && (
            <div className="mt-2">
              <p className="text-xs font-medium text-red-700 mb-1">Conflicting files:</p>
              <ul className="text-xs text-red-600 space-y-0.5">
                {conflictInfo.conflictingFiles.map((file) => (
                  <li key={file} className="font-mono">
                    {file}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Update branch button (when behind but no conflicts) */}
          {conflictInfo.behindBy > 0 && !conflictInfo.hasConflicts && (
            <div className="mt-3">
              <button
                onClick={handleUpdateBranch}
                disabled={isUpdating}
                className="w-full px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isUpdating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Updating...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Update branch with {pullRequest.base.ref}
                  </>
                )}
              </button>
              <p className="mt-1 text-xs text-gray-500 text-center">
                Merge the latest changes from {pullRequest.base.ref} into this branch
              </p>
            </div>
          )}

          {/* Conflict resolution button */}
          {conflictInfo.hasConflicts && (
            <div className="mt-3 space-y-2">
              <button
                onClick={loadConflictingFiles}
                disabled={isLoadingConflicts}
                className="w-full px-3 py-1.5 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoadingConflicts ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Loading conflicts...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z" />
                    </svg>
                    Resolve Conflicts
                  </>
                )}
              </button>

              <div className="p-2 bg-red-100 rounded text-xs text-red-700">
                <p className="font-medium">Or resolve locally:</p>
                <code className="block mt-1 p-1 bg-red-200 rounded font-mono text-xs">
                  git checkout {pullRequest.head.ref}
                  <br />
                  git merge {pullRequest.base.ref}
                </code>
                <p className="mt-1">Then push the resolved changes.</p>
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

// ============================================================================
// Compact Conflict Badge (for list views)
// ============================================================================

export interface GitHubPRConflictBadgeProps {
  pullRequest: GitHubPullRequest;
  className?: string;
}

export const GitHubPRConflictBadge: React.FC<GitHubPRConflictBadgeProps> = ({
  pullRequest,
  className = '',
}) => {
  // Use the PR's built-in mergeable info for a quick badge
  const getMergeableStatus = () => {
    if (pullRequest.mergeable === false || pullRequest.mergeable_state === 'dirty') {
      return { text: 'Conflicts', color: 'bg-red-100 text-red-700' };
    }
    if (pullRequest.mergeable_state === 'clean') {
      return { text: 'Ready', color: 'bg-green-100 text-green-700' };
    }
    if (pullRequest.mergeable_state === 'unstable') {
      return { text: 'Unstable', color: 'bg-yellow-100 text-yellow-700' };
    }
    if (pullRequest.mergeable_state === 'blocked') {
      return { text: 'Blocked', color: 'bg-orange-100 text-orange-700' };
    }
    if (pullRequest.mergeable === null) {
      return { text: 'Checking', color: 'bg-gray-100 text-gray-600' };
    }
    return null;
  };

  const status = getMergeableStatus();
  if (!status) return null;

  return (
    <span className={`px-1.5 py-0.5 text-xs rounded ${status.color} ${className}`}>
      {status.text}
    </span>
  );
};
