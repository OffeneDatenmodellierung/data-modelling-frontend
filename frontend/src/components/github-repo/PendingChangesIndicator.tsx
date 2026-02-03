/**
 * Pending Changes Indicator Component
 *
 * Shows the number of pending (unsynced) changes in the current workspace.
 * Clicking shows a list of the changes.
 */

import React, { useState } from 'react';
import {
  useGitHubRepoStore,
  selectPendingChanges,
  selectHasPendingChanges,
  selectSyncStatus,
} from '@/stores/githubRepoStore';
import type { PendingChange } from '@/types/github-repo';

export interface PendingChangesIndicatorProps {
  className?: string;
  showList?: boolean;
}

const actionIcons: Record<PendingChange['action'], string> = {
  create: '+',
  update: '~',
  delete: '-',
};

const actionColors: Record<PendingChange['action'], string> = {
  create: 'text-green-600 bg-green-100',
  update: 'text-yellow-600 bg-yellow-100',
  delete: 'text-red-600 bg-red-100',
};

export const PendingChangesIndicator: React.FC<PendingChangesIndicatorProps> = ({
  className = '',
  showList = true,
}) => {
  const pendingChanges = useGitHubRepoStore(selectPendingChanges);
  const hasPendingChanges = useGitHubRepoStore(selectHasPendingChanges);
  const syncStatus = useGitHubRepoStore(selectSyncStatus);
  const [isExpanded, setIsExpanded] = useState(false);

  if (!hasPendingChanges) {
    return null;
  }

  const count = pendingChanges.length;
  const isSyncing = syncStatus === 'syncing';

  return (
    <div className={`relative ${className}`}>
      {/* Badge button */}
      <button
        onClick={() => showList && setIsExpanded(!isExpanded)}
        disabled={isSyncing}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors ${
          isSyncing
            ? 'bg-blue-100 text-blue-700 cursor-wait'
            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
        } ${!showList ? 'cursor-default' : ''}`}
      >
        {isSyncing ? (
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
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        )}
        <span>
          {count} pending change{count !== 1 ? 's' : ''}
        </span>
        {showList && (
          <svg
            className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown list */}
      {showList && isExpanded && (
        <>
          {/* Backdrop */}
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Dropdown backdrop */}
          <div className="fixed inset-0 z-10" onClick={() => setIsExpanded(false)} />

          {/* List */}
          <div className="absolute right-0 top-full mt-1 z-20 w-80 max-h-64 overflow-y-auto bg-white rounded-lg shadow-lg border border-gray-200">
            <div className="px-3 py-2 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900">Pending Changes</h4>
              <p className="text-xs text-gray-500">These changes will be committed when you sync</p>
            </div>
            <ul className="divide-y divide-gray-100">
              {pendingChanges.map((change) => (
                <li key={change.id} className="px-3 py-2 flex items-center gap-2">
                  <span
                    className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${actionColors[change.action]}`}
                  >
                    {actionIcons[change.action]}
                  </span>
                  <span className="flex-1 text-sm text-gray-700 truncate" title={change.path}>
                    {change.path}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(change.timestamp).toLocaleTimeString()}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
};
