/**
 * Cache Management Panel Component
 * Allows users to view and purge cached branch data
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';

export interface CacheManagementPanelProps {
  className?: string;
}

export const CacheManagementPanel: React.FC<CacheManagementPanelProps> = ({ className = '' }) => {
  const workspace = useGitHubRepoStore((state) => state.workspace);
  const listCachedBranches = useGitHubRepoStore((state) => state.listCachedBranches);
  const purgeBranchCache = useGitHubRepoStore((state) => state.purgeBranchCache);
  const purgeAllStaleBranches = useGitHubRepoStore((state) => state.purgeAllStaleBranches);

  const [isExpanded, setIsExpanded] = useState(false);
  const [cachedBranches, setCachedBranches] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPurging, setIsPurging] = useState(false);
  const [isPurgingAll, setIsPurgingAll] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load cached branches when panel expands
  useEffect(() => {
    if (isExpanded && workspace) {
      loadCachedBranches();
    }
  }, [isExpanded, workspace]);

  const loadCachedBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const branches = await listCachedBranches();
      setCachedBranches(branches);
    } catch (err) {
      console.error('Failed to load cached branches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [listCachedBranches]);

  const handlePurgeBranch = useCallback(
    async (branch: string) => {
      if (workspace?.branch === branch) {
        setMessage({ type: 'error', text: 'Cannot purge the current branch' });
        return;
      }

      setIsPurging(true);
      setMessage(null);
      try {
        await purgeBranchCache(branch);
        setCachedBranches((prev) => prev.filter((b) => b !== branch));
        setMessage({ type: 'success', text: `Purged cache for branch: ${branch}` });
      } catch (err) {
        setMessage({
          type: 'error',
          text: `Failed to purge: ${err instanceof Error ? err.message : 'Unknown error'}`,
        });
      } finally {
        setIsPurging(false);
      }
    },
    [purgeBranchCache, workspace?.branch]
  );

  const handlePurgeAllStale = useCallback(async () => {
    setIsPurgingAll(true);
    setMessage(null);
    try {
      const result = await purgeAllStaleBranches();
      if (result.purged.length > 0) {
        setCachedBranches((prev) => prev.filter((b) => !result.purged.includes(b)));
        setMessage({
          type: 'success',
          text: `Purged ${result.purged.length} stale branch${result.purged.length !== 1 ? 'es' : ''}: ${result.purged.join(', ')}`,
        });
      } else {
        setMessage({ type: 'success', text: 'No stale branches found' });
      }
      if (result.errors.length > 0) {
        setMessage({
          type: 'error',
          text: `Failed to purge: ${result.errors.join(', ')}`,
        });
      }
    } catch (err) {
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to purge stale branches',
      });
    } finally {
      setIsPurgingAll(false);
    }
  }, [purgeAllStaleBranches]);

  // Only show in GitHub repo mode
  if (!workspace) {
    return null;
  }

  return (
    <div className={className}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 border-b"
      >
        <span className="text-sm font-medium text-gray-700">Cache Management</span>
        <div className="flex items-center gap-2">
          {cachedBranches.length > 0 && (
            <span className="text-xs text-gray-500">
              {cachedBranches.length} branch{cachedBranches.length !== 1 ? 'es' : ''}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 py-2 space-y-3">
          {/* Message */}
          {message && (
            <div
              className={`px-3 py-2 text-xs rounded ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Purge All Stale Button */}
          <button
            onClick={handlePurgeAllStale}
            disabled={isPurgingAll || isLoading}
            className="w-full px-3 py-2 text-sm bg-orange-50 text-orange-700 border border-orange-200 rounded hover:bg-orange-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isPurgingAll ? (
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
                Checking remote...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Purge All Stale Branches
              </>
            )}
          </button>
          <p className="text-xs text-gray-500">
            Removes cached data for branches that no longer exist on the remote repository.
          </p>

          {/* Cached Branches List */}
          <div className="border-t pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-600">Cached Branches</span>
              <button
                onClick={loadCachedBranches}
                disabled={isLoading}
                className="text-xs text-blue-600 hover:underline disabled:opacity-50"
              >
                Refresh
              </button>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-4">
                <svg className="w-5 h-5 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
              </div>
            ) : cachedBranches.length === 0 ? (
              <p className="text-xs text-gray-500 text-center py-2">No cached branches</p>
            ) : (
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {cachedBranches.map((branch) => (
                  <div
                    key={branch}
                    className="flex items-center justify-between px-2 py-1.5 bg-gray-50 rounded text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
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
                          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                        />
                      </svg>
                      <span className="truncate font-mono text-xs">{branch}</span>
                      {workspace?.branch === branch && (
                        <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                          current
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handlePurgeBranch(branch)}
                      disabled={isPurging || workspace?.branch === branch}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      title={workspace?.branch === branch ? 'Cannot purge current branch' : 'Purge cache'}
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
      )}
    </div>
  );
};

export default CacheManagementPanel;
