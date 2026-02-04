/**
 * Git Status Indicator Component
 * Compact status display for toolbar showing branch and change count
 * Works in both Electron (local git) and GitHub repo mode (remote)
 */

import React from 'react';
import { useGitStore } from '@/stores/gitStore';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { useGitHubStore, selectPullRequests } from '@/stores/githubStore';
import { gitService } from '@/services/git/gitService';

export interface GitStatusIndicatorProps {
  className?: string;
}

export const GitStatusIndicator: React.FC<GitStatusIndicatorProps> = ({ className = '' }) => {
  const { status, isPanelOpen, isLoading, isFetching, isPulling, isPushing } = useGitStore();
  const githubRepoWorkspace = useGitHubRepoStore((state) => state.workspace);
  const isGitHubRepoMode = githubRepoWorkspace !== null;
  const pullRequests = useGitHubStore(selectPullRequests);
  const openPRCount = pullRequests.filter((pr) => pr.state === 'open' && !pr.draft).length;

  const isRemoteOperationInProgress = isFetching || isPulling || isPushing;

  // Show in GitHub repo mode even if local git service is not available
  if (!gitService.isAvailable() && !isGitHubRepoMode) {
    return null;
  }

  const handleClick = () => {
    useGitStore.getState().togglePanel();
  };

  // GitHub repo mode - show simplified indicator with PR count
  if (isGitHubRepoMode) {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors ${
          isPanelOpen
            ? 'bg-blue-100 text-blue-700'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        } ${className}`}
        title={`GitHub: ${githubRepoWorkspace.owner}/${githubRepoWorkspace.repo} @ ${githubRepoWorkspace.branch}${openPRCount > 0 ? ` (${openPRCount} open PRs)` : ''}`}
      >
        {/* GitHub icon */}
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
          <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
        </svg>
        {/* Branch name */}
        <span className="font-medium max-w-24 truncate">{githubRepoWorkspace.branch}</span>
        {/* PR count badge */}
        {openPRCount > 0 && (
          <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-700">
            {openPRCount} PR{openPRCount !== 1 ? 's' : ''}
          </span>
        )}
      </button>
    );
  }

  // Not a git repo (local mode)
  if (!status.isGitRepo) {
    return (
      <button
        onClick={handleClick}
        className={`flex items-center gap-1.5 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded ${className}`}
        title="Initialize Git repository"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
        <span className="text-xs">No Git</span>
      </button>
    );
  }

  const changeCount = status.files.length;
  const hasConflicts = status.hasConflicts;

  return (
    <button
      onClick={handleClick}
      className={`flex items-center gap-1.5 px-2 py-1 text-sm rounded transition-colors ${
        isPanelOpen
          ? 'bg-blue-100 text-blue-700'
          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
      } ${className}`}
      title={`Branch: ${status.currentBranch}${changeCount > 0 ? ` (${changeCount} changes)` : ''}`}
    >
      {/* Git branch icon */}
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M13 10V3L4 14h7v7l9-11h-7z"
        />
      </svg>

      {/* Branch name */}
      <span className="font-medium max-w-24 truncate">{status.currentBranch || 'HEAD'}</span>

      {/* Loading indicator */}
      {(isLoading || isRemoteOperationInProgress) && (
        <svg
          className={`w-3 h-3 animate-spin ${isRemoteOperationInProgress ? 'text-blue-500' : 'text-gray-400'}`}
          fill="none"
          viewBox="0 0 24 24"
        >
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
      )}

      {/* Change count badge */}
      {changeCount > 0 && !isLoading && !isRemoteOperationInProgress && (
        <span
          className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
            hasConflicts ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
          }`}
        >
          {hasConflicts ? '!' : changeCount}
        </span>
      )}

      {/* Remote operation indicator */}
      {isRemoteOperationInProgress && (
        <span className="text-xs text-blue-600">
          {isPulling ? 'Pulling' : isPushing ? 'Pushing' : 'Fetching'}
        </span>
      )}

      {/* Sync status */}
      {status.remoteName &&
        (status.ahead > 0 || status.behind > 0) &&
        !isLoading &&
        !isRemoteOperationInProgress && (
          <span className="flex items-center gap-0.5 text-xs">
            {status.ahead > 0 && <span className="text-green-600">↑{status.ahead}</span>}
            {status.behind > 0 && <span className="text-orange-600">↓{status.behind}</span>}
          </span>
        )}
    </button>
  );
};
