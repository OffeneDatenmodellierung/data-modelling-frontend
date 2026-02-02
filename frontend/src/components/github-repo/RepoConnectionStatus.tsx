/**
 * Repository Connection Status Component
 *
 * Shows the current connection status for the GitHub repository workspace,
 * including online/offline state and sync status.
 */

import React from 'react';
import {
  useGitHubRepoStore,
  selectWorkspace,
  selectSyncStatus,
  selectIsOnline,
} from '@/stores/githubRepoStore';
import type { SyncStatus } from '@/types/github-repo';

export interface RepoConnectionStatusProps {
  className?: string;
  showBranch?: boolean;
  compact?: boolean;
}

const statusConfig: Record<SyncStatus, { color: string; icon: string; label: string }> = {
  idle: { color: 'text-green-600 bg-green-100', icon: '●', label: 'Connected' },
  syncing: { color: 'text-blue-600 bg-blue-100', icon: '↻', label: 'Syncing...' },
  offline: { color: 'text-yellow-600 bg-yellow-100', icon: '○', label: 'Offline' },
  error: { color: 'text-red-600 bg-red-100', icon: '!', label: 'Sync Error' },
  conflict: { color: 'text-orange-600 bg-orange-100', icon: '⚠', label: 'Conflicts' },
};

export const RepoConnectionStatus: React.FC<RepoConnectionStatusProps> = ({
  className = '',
  showBranch = true,
  compact = false,
}) => {
  const workspace = useGitHubRepoStore(selectWorkspace);
  const syncStatus = useGitHubRepoStore(selectSyncStatus);
  const isOnline = useGitHubRepoStore(selectIsOnline);

  if (!workspace) {
    return null;
  }

  // Use offline status if not online, regardless of syncStatus
  const effectiveStatus = isOnline ? syncStatus : 'offline';
  const config = statusConfig[effectiveStatus];

  if (compact) {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <span className={`w-2 h-2 rounded-full ${config.color.split(' ')[0]}`}>
          {effectiveStatus === 'syncing' && (
            <svg className="w-2 h-2 animate-spin" viewBox="0 0 24 24">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
              />
            </svg>
          )}
        </span>
        <span className="text-sm text-gray-700 truncate max-w-[200px]">
          {workspace.owner}/{workspace.repo}
          {workspace.workspacePath && ` / ${workspace.workspaceName}`}
        </span>
        {showBranch && <span className="text-xs text-gray-500">@ {workspace.branch}</span>}
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.color} ${className}`}>
      {/* Status indicator */}
      {effectiveStatus === 'syncing' ? (
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
        <span className="text-sm font-bold">{config.icon}</span>
      )}

      {/* Repository info */}
      <div className="flex items-center gap-1.5 text-sm">
        <span className="font-medium">
          {workspace.owner}/{workspace.repo}
          {workspace.workspacePath && (
            <span className="font-normal text-gray-600"> / {workspace.workspaceName}</span>
          )}
        </span>
        {showBranch && (
          <>
            <span className="text-gray-500">@</span>
            <span>{workspace.branch}</span>
          </>
        )}
      </div>

      {/* Status label */}
      <span className="text-xs opacity-75">({config.label})</span>
    </div>
  );
};
