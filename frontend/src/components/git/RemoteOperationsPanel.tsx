/**
 * Remote Operations Panel Component
 * Panel for fetch, pull, push, and remote management
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

export interface RemoteOperationsPanelProps {
  className?: string;
}

export const RemoteOperationsPanel: React.FC<RemoteOperationsPanelProps> = ({ className = '' }) => {
  const { status, remotes, isFetching, isPulling, isPushing, isLoadingRemotes } = useGitStore();
  const [showAddRemote, setShowAddRemote] = useState(false);
  const [newRemoteName, setNewRemoteName] = useState('origin');
  const [newRemoteUrl, setNewRemoteUrl] = useState('');
  const [isAddingRemote, setIsAddingRemote] = useState(false);

  // Load remotes when panel mounts
  useEffect(() => {
    if (status.isGitRepo) {
      gitService.loadRemotes();
    }
  }, [status.isGitRepo]);

  const handleFetch = useCallback(async () => {
    await gitService.fetch({ prune: true });
  }, []);

  const handlePull = useCallback(async () => {
    await gitService.pull();
  }, []);

  const handlePush = useCallback(async () => {
    // If no upstream, set it with push
    if (!status.remoteName && remotes.length > 0) {
      await gitService.push({
        remote: remotes[0]?.name || 'origin',
        branch: status.currentBranch || undefined,
        setUpstream: true,
      });
    } else {
      await gitService.push();
    }
  }, [status.remoteName, status.currentBranch, remotes]);

  const handleAddRemote = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newRemoteName.trim() || !newRemoteUrl.trim()) return;

      setIsAddingRemote(true);
      const success = await gitService.addRemote(newRemoteName.trim(), newRemoteUrl.trim());
      setIsAddingRemote(false);

      if (success) {
        setShowAddRemote(false);
        setNewRemoteName('origin');
        setNewRemoteUrl('');
      }
    },
    [newRemoteName, newRemoteUrl]
  );

  const handleRemoveRemote = useCallback(async (name: string) => {
    if (!window.confirm(`Remove remote "${name}"?`)) return;
    await gitService.removeRemote(name);
  }, []);

  const isOperationInProgress = isFetching || isPulling || isPushing;

  return (
    <div className={`border-t border-gray-200 ${className}`}>
      {/* Sync buttons */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          {/* Fetch */}
          <button
            onClick={handleFetch}
            disabled={isOperationInProgress || remotes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Fetch from remote"
          >
            {isFetching ? (
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
            Fetch
          </button>

          {/* Pull */}
          <button
            onClick={handlePull}
            disabled={isOperationInProgress || remotes.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Pull from remote"
          >
            {isPulling ? (
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              </svg>
            )}
            Pull
            {status.behind > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-orange-100 text-orange-700 rounded-full">
                {status.behind}
              </span>
            )}
          </button>

          {/* Push */}
          <button
            onClick={handlePush}
            disabled={isOperationInProgress || (remotes.length === 0 && !status.remoteName)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={remotes.length === 0 ? 'Add a remote first' : 'Push to remote'}
          >
            {isPushing ? (
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
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 10l7-7m0 0l7 7m-7-7v18"
                />
              </svg>
            )}
            Push
            {status.ahead > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                {status.ahead}
              </span>
            )}
          </button>
        </div>

        {/* Upstream info */}
        {status.remoteName && (
          <div className="mt-2 text-xs text-gray-500">
            Tracking: {status.remoteName}/{status.currentBranch}
          </div>
        )}
        {!status.remoteName && remotes.length > 0 && (
          <div className="mt-2 text-xs text-orange-600">
            No upstream branch set. Push will set upstream to {remotes[0]?.name || 'origin'}/
            {status.currentBranch}
          </div>
        )}
      </div>

      {/* Remote list */}
      <div className="px-4 py-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500 uppercase">Remotes</span>
          <button
            onClick={() => setShowAddRemote(!showAddRemote)}
            className="text-xs text-blue-600 hover:text-blue-700"
          >
            {showAddRemote ? 'Cancel' : '+ Add'}
          </button>
        </div>

        {/* Add remote form */}
        {showAddRemote && (
          <form onSubmit={handleAddRemote} className="mb-3 p-3 bg-gray-50 rounded-md">
            <div className="mb-2">
              <input
                type="text"
                value={newRemoteName}
                onChange={(e) => setNewRemoteName(e.target.value)}
                placeholder="Remote name (e.g., origin)"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div className="mb-2">
              <input
                type="text"
                value={newRemoteUrl}
                onChange={(e) => setNewRemoteUrl(e.target.value)}
                placeholder="Repository URL"
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <button
              type="submit"
              disabled={isAddingRemote || !newRemoteName.trim() || !newRemoteUrl.trim()}
              className="w-full px-2 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isAddingRemote ? 'Adding...' : 'Add Remote'}
            </button>
          </form>
        )}

        {/* Remote list */}
        {isLoadingRemotes ? (
          <div className="flex items-center justify-center py-4">
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          </div>
        ) : remotes.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-4">No remotes configured</div>
        ) : (
          <div className="space-y-2">
            {remotes.map((remote) => (
              <div
                key={remote.name}
                className="flex items-start justify-between p-2 bg-gray-50 rounded"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <svg
                      className="w-4 h-4 text-gray-400 flex-shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                      />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">{remote.name}</span>
                  </div>
                  {remote.fetchUrl && (
                    <div className="mt-1 text-xs text-gray-500 truncate" title={remote.fetchUrl}>
                      {remote.fetchUrl}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleRemoveRemote(remote.name)}
                  className="p-1 text-gray-400 hover:text-red-600 rounded flex-shrink-0"
                  title="Remove remote"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
