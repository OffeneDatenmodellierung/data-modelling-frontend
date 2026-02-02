/**
 * GitHub PR Conflict Panel Component
 * Display conflict status and update branch functionality for pull requests
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectPRConflictInfo,
  selectIsLoadingConflictInfo,
} from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubPullRequest, GitHubPRConflictInfo } from '@/types/github';

export interface GitHubPRConflictPanelProps {
  pullRequest: GitHubPullRequest;
  className?: string;
  onUpdated?: () => void;
}

export const GitHubPRConflictPanel: React.FC<GitHubPRConflictPanelProps> = ({
  pullRequest,
  className = '',
  onUpdated,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connection = useGitHubStore((state) => state.connection);
  const conflictInfo = useGitHubStore(selectPRConflictInfo(pullRequest.number));
  const isLoadingGlobal = useGitHubStore(selectIsLoadingConflictInfo);

  const setPRConflictInfo = useGitHubStore((state) => state.setPRConflictInfo);
  const setLoadingConflictInfo = useGitHubStore((state) => state.setLoadingConflictInfo);

  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setPRConflictInfo(pullRequest.number, info);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conflict info');
    } finally {
      setIsLoading(false);
      setLoadingConflictInfo(false);
    }
  }, [connection, pullRequest.number, setPRConflictInfo, setLoadingConflictInfo]);

  // Load on mount
  useEffect(() => {
    if (isConnected && !conflictInfo) {
      loadConflictInfo();
    }
  }, [isConnected, conflictInfo, loadConflictInfo]);

  // Update branch
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

          {/* Update branch button */}
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

          {/* Conflict resolution hint */}
          {conflictInfo.hasConflicts && (
            <div className="mt-3 p-2 bg-red-100 rounded text-xs text-red-700">
              <p className="font-medium">Resolve conflicts locally:</p>
              <code className="block mt-1 p-1 bg-red-200 rounded font-mono text-xs">
                git checkout {pullRequest.head.ref}
                <br />
                git merge {pullRequest.base.ref}
              </code>
              <p className="mt-1">Then push the resolved changes.</p>
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
