/**
 * Pull Requests Panel Component
 * Integrates GitHub PR functionality into the Electron Git Panel
 * Uses GitHub API when authenticated, shows connection prompt otherwise
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  useGitHubStore,
  selectIsAuthenticated,
  selectIsConnected,
  selectConnectionInfo,
  selectPullRequests,
  selectIsLoadingPRs,
  selectPRError,
  selectSelectedPR,
  selectShowPRDetailPanel,
} from '@/stores/githubStore';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { useShallow } from 'zustand/react/shallow';
import { githubApi } from '@/services/github/githubApi';
import { githubAuth } from '@/services/github/githubAuth';
import type { GitHubPullRequest } from '@/types/github';
import { GitHubPRDetailPanel } from '@/components/github/GitHubPRDetailPanel';

export interface PullRequestsPanelProps {
  className?: string;
}

type PRFilter = 'open' | 'closed' | 'all';

export const PullRequestsPanel: React.FC<PullRequestsPanelProps> = ({ className = '' }) => {
  const isAuthenticatedFromStore = useGitHubStore(selectIsAuthenticated);
  const isConnectedFromStore = useGitHubStore(selectIsConnected);
  const connectionInfo = useGitHubStore(selectConnectionInfo);
  const pullRequests = useGitHubStore(selectPullRequests);
  const isLoading = useGitHubStore(selectIsLoadingPRs);
  const error = useGitHubStore(selectPRError);
  const selectedPR = useGitHubStore(selectSelectedPR);
  const showDetailPanel = useGitHubStore(selectShowPRDetailPanel);

  // Use shallow comparison for store actions and state to prevent infinite loops
  const {
    connection: connectionFromStore,
    setPullRequests,
    setLoadingPRs,
    setPRError,
    setSelectedPR,
    setShowAuthDialog,
    setShowConnectDialog,
  } = useGitHubStore(
    useShallow((state) => ({
      connection: state.connection,
      setPullRequests: state.setPullRequests,
      setLoadingPRs: state.setLoadingPRs,
      setPRError: state.setPRError,
      setSelectedPR: state.setSelectedPR,
      setShowAuthDialog: state.setShowAuthDialog,
      setShowConnectDialog: state.setShowConnectDialog,
    }))
  );

  // Also check githubRepoStore for connection info (used when opening from URL)
  const repoWorkspace = useGitHubRepoStore(useShallow((state) => state.workspace));

  // Check authentication from both store and auth service directly
  // (auth service may have a valid token before store is initialized)
  const isAuthenticated = isAuthenticatedFromStore || githubAuth.isAuthenticated();

  // Use connection from either store
  const connection = useMemo(() => {
    if (connectionFromStore) return connectionFromStore;
    if (repoWorkspace) {
      return {
        owner: repoWorkspace.owner,
        repo: repoWorkspace.repo,
        branch: repoWorkspace.branch,
      };
    }
    return null;
  }, [connectionFromStore, repoWorkspace]);

  const isConnected = isConnectedFromStore || repoWorkspace !== null;

  const [filter, setFilter] = useState<PRFilter>('open');

  // Load pull requests
  const loadPullRequests = useCallback(async () => {
    if (!connection) return;

    setLoadingPRs(true);
    setPRError(null);

    try {
      const prs = await githubApi.listPullRequests(connection.owner, connection.repo, {
        state: filter,
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
      });
      setPullRequests(prs);
    } catch (err) {
      setPRError(err instanceof Error ? err.message : 'Failed to load pull requests');
    }
  }, [connection, filter, setPullRequests, setLoadingPRs, setPRError]);

  // Load PRs when filter changes or connection established
  // Note: We intentionally exclude loadPullRequests from dependencies to prevent infinite loops.
  // The loadPullRequests callback is recreated when connection changes, but we only want to
  // trigger loading when isConnected or filter actually changes, not when the callback reference changes.
  useEffect(() => {
    if (isConnected) {
      loadPullRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, filter]);

  // Handle PR click
  const handlePRClick = useCallback(
    (pr: GitHubPullRequest) => {
      setSelectedPR(pr);
    },
    [setSelectedPR]
  );

  // Get status color
  const getStatusColor = (pr: GitHubPullRequest): string => {
    if (pr.merged) return 'text-purple-600 bg-purple-50';
    if (pr.state === 'closed') return 'text-red-600 bg-red-50';
    if (pr.draft) return 'text-gray-600 bg-gray-100';
    return 'text-green-600 bg-green-50';
  };

  // Get status text
  const getStatusText = (pr: GitHubPullRequest): string => {
    if (pr.merged) return 'Merged';
    if (pr.state === 'closed') return 'Closed';
    if (pr.draft) return 'Draft';
    return 'Open';
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) return 'just now';
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-3">
            Sign in to GitHub to view and manage pull requests
          </p>
          <button
            onClick={() => setShowAuthDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
          >
            Sign in to GitHub
          </button>
        </div>
      </div>
    );
  }

  // Not connected to a repo
  if (!isConnected) {
    return (
      <div className={`p-4 ${className}`}>
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-gray-300 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-3">
            Connect to a GitHub repository to view pull requests
          </p>
          <button
            onClick={() => setShowConnectDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Connect Repository
          </button>
        </div>
      </div>
    );
  }

  // Show PR detail panel if a PR is selected
  if (showDetailPanel && selectedPR) {
    return <GitHubPRDetailPanel className={className} />;
  }

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium text-gray-700">Pull Requests</span>
            <p className="text-xs text-gray-500">{connectionInfo?.fullName}</p>
          </div>
          <button
            onClick={loadPullRequests}
            disabled={isLoading}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-50"
            title="Refresh"
          >
            <svg
              className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mt-2 flex gap-1">
          {(['open', 'closed', 'all'] as PRFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                filter === f
                  ? 'bg-gray-900 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && pullRequests.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
        ) : error ? (
          <div className="p-4 text-center text-red-600 text-sm">{error}</div>
        ) : pullRequests.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            No {filter === 'all' ? '' : filter} pull requests found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pullRequests.map((pr) => (
              <button
                key={pr.id}
                onClick={() => handlePRClick(pr)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${
                  selectedPR?.number === pr.number ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-2">
                  {/* PR icon */}
                  <div className={`p-1 rounded ${getStatusColor(pr)}`}>
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                      <path
                        fillRule="evenodd"
                        d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
                      />
                    </svg>
                  </div>

                  {/* PR info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-medium text-gray-900 truncate">{pr.title}</span>
                    </div>

                    <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-500">
                      <span className={`px-1 py-0.5 rounded text-xs ${getStatusColor(pr)}`}>
                        {getStatusText(pr)}
                      </span>
                      <span>#{pr.number}</span>
                      <span>•</span>
                      <span>{formatDate(pr.updated_at)}</span>
                    </div>

                    {/* Branch info */}
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <code className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-xs truncate max-w-[80px]">
                        {pr.head.ref}
                      </code>
                      <span className="text-gray-400">→</span>
                      <code className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded text-xs truncate max-w-[80px]">
                        {pr.base.ref}
                      </code>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {pullRequests.length > 0 && (
        <div className="px-3 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {pullRequests.length} pull request{pullRequests.length !== 1 ? 's' : ''}
          </p>
        </div>
      )}
    </div>
  );
};
