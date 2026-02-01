/**
 * Git Status Indicator Component
 * Compact status display for toolbar showing branch and change count
 */

import React from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

export interface GitStatusIndicatorProps {
  className?: string;
}

export const GitStatusIndicator: React.FC<GitStatusIndicatorProps> = ({ className = '' }) => {
  const { status, isPanelOpen, isLoading, isFetching, isPulling, isPushing } = useGitStore();

  const isRemoteOperationInProgress = isFetching || isPulling || isPushing;

  // Don't show if git service is not available
  if (!gitService.isAvailable()) {
    return null;
  }

  const handleClick = () => {
    useGitStore.getState().togglePanel();
  };

  // Not a git repo
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
