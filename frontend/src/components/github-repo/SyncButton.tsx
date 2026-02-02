/**
 * Sync Button Component
 *
 * Button for manually syncing changes with GitHub.
 * Shows different states: idle, syncing, error, conflict.
 */

import React, { useState, useCallback } from 'react';
import {
  useGitHubRepoStore,
  selectSyncStatus,
  selectHasPendingChanges,
  selectIsOnline,
  selectHasConflicts,
  selectPendingChangeCount,
} from '@/stores/githubRepoStore';

export interface SyncButtonProps {
  className?: string;
  showLabel?: boolean;
  onConflictClick?: () => void;
}

export const SyncButton: React.FC<SyncButtonProps> = ({
  className = '',
  showLabel = true,
  onConflictClick,
}) => {
  const syncStatus = useGitHubRepoStore(selectSyncStatus);
  const hasPendingChanges = useGitHubRepoStore(selectHasPendingChanges);
  const pendingCount = useGitHubRepoStore(selectPendingChangeCount);
  const isOnline = useGitHubRepoStore(selectIsOnline);
  const hasConflicts = useGitHubRepoStore(selectHasConflicts);
  const { sync, clearError } = useGitHubRepoStore();

  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  const handleSync = useCallback(async () => {
    if (hasConflicts && onConflictClick) {
      onConflictClick();
      return;
    }

    if (hasPendingChanges) {
      setShowCommitDialog(true);
      return;
    }

    // No pending changes, just pull latest
    try {
      await sync();
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }, [hasConflicts, hasPendingChanges, onConflictClick, sync]);

  const handleCommitAndSync = useCallback(async () => {
    const message = commitMessage.trim() || 'Update from Data Modeller';
    setShowCommitDialog(false);
    setCommitMessage('');

    try {
      await useGitHubRepoStore.getState().pushChanges(message);
    } catch (error) {
      console.error('Push failed:', error);
    }
  }, [commitMessage]);

  const isSyncing = syncStatus === 'syncing';
  const isError = syncStatus === 'error';
  const isConflict = syncStatus === 'conflict';
  const isDisabled = !isOnline || isSyncing;

  // Determine button appearance
  let buttonClass = 'bg-blue-600 hover:bg-blue-700 text-white';
  let icon = (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
  let label = 'Sync';

  if (isSyncing) {
    buttonClass = 'bg-blue-600 text-white cursor-wait';
    icon = (
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
    );
    label = 'Syncing...';
  } else if (isConflict) {
    buttonClass = 'bg-orange-600 hover:bg-orange-700 text-white';
    icon = (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
    );
    label = 'Resolve Conflicts';
  } else if (isError) {
    buttonClass = 'bg-red-600 hover:bg-red-700 text-white';
    icon = (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    );
    label = 'Retry Sync';
  } else if (!isOnline) {
    buttonClass = 'bg-gray-400 text-white cursor-not-allowed';
    label = 'Offline';
  } else if (hasPendingChanges) {
    label = `Sync (${pendingCount})`;
  }

  return (
    <>
      <button
        onClick={isError ? clearError : handleSync}
        disabled={isDisabled}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 ${buttonClass} ${className}`}
        title={!isOnline ? 'Cannot sync while offline' : undefined}
      >
        {icon}
        {showLabel && <span>{label}</span>}
      </button>

      {/* Commit message dialog */}
      {showCommitDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCommitDialog(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Commit Changes</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter a commit message for your {pendingCount} pending change
              {pendingCount !== 1 ? 's' : ''}.
            </p>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              placeholder="Update from Data Modeller"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              /* eslint-disable-next-line jsx-a11y/no-autofocus */
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  handleCommitAndSync();
                }
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowCommitDialog(false);
                  setCommitMessage('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCommitAndSync}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Commit & Push
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
