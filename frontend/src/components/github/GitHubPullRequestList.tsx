/**
 * GitHub Pull Request List Component
 * Display and manage pull requests for the connected repository
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubStore, selectIsConnected, selectConnectionInfo } from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubPullRequest } from '@/types/github';

export interface GitHubPullRequestListProps {
  className?: string;
  onPRSelect?: (pr: GitHubPullRequest) => void;
}

type PRFilter = 'open' | 'closed' | 'all';

export const GitHubPullRequestList: React.FC<GitHubPullRequestListProps> = ({
  className = '',
  onPRSelect,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connectionInfo = useGitHubStore(selectConnectionInfo);
  const connection = useGitHubStore((state) => state.connection);

  const [pullRequests, setPullRequests] = useState<GitHubPullRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<PRFilter>('open');
  const [selectedPR, setSelectedPR] = useState<number | null>(null);

  // Load pull requests
  const loadPullRequests = useCallback(async () => {
    if (!connection) return;

    setIsLoading(true);
    setError(null);

    try {
      const prs = await githubApi.listPullRequests(connection.owner, connection.repo, {
        state: filter,
        sort: 'updated',
        direction: 'desc',
        per_page: 30,
      });
      setPullRequests(prs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load pull requests');
    } finally {
      setIsLoading(false);
    }
  }, [connection, filter]);

  // Load PRs on mount/filter change
  useEffect(() => {
    if (isConnected) {
      loadPullRequests();
    }
  }, [isConnected, loadPullRequests]);

  // Handle PR click
  const handlePRClick = useCallback(
    (pr: GitHubPullRequest) => {
      setSelectedPR(pr.number);
      onPRSelect?.(pr);
    },
    [onPRSelect]
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
      if (diffHours === 0) {
        return 'just now';
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isConnected) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Connect a GitHub repository to view pull requests
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Pull Requests</h3>
            <p className="text-xs text-gray-500">{connectionInfo?.fullName}</p>
          </div>
          <button
            onClick={loadPullRequests}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
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
        <div className="mt-3 flex gap-1">
          {(['open', 'closed', 'all'] as PRFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
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
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : pullRequests.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            No {filter === 'all' ? '' : filter} pull requests found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {pullRequests.map((pr) => (
              <button
                key={pr.id}
                onClick={() => handlePRClick(pr)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                  selectedPR === pr.number ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* PR icon */}
                  <div className={`p-1 rounded ${getStatusColor(pr)}`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                      <path
                        fillRule="evenodd"
                        d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
                      />
                    </svg>
                  </div>

                  {/* PR info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{pr.title}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(pr)}`}>
                        {getStatusText(pr)}
                      </span>
                    </div>

                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span>#{pr.number}</span>
                      <span>•</span>
                      <span>{pr.user.login}</span>
                      <span>•</span>
                      <span>{formatDate(pr.updated_at)}</span>
                    </div>

                    {/* Branch info */}
                    <div className="mt-1 flex items-center gap-1 text-xs">
                      <code className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded">
                        {pr.head.ref}
                      </code>
                      <span className="text-gray-400">→</span>
                      <code className="px-1 py-0.5 bg-gray-100 text-gray-700 rounded">
                        {pr.base.ref}
                      </code>
                    </div>

                    {/* Labels */}
                    {pr.labels.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {pr.labels.slice(0, 3).map((label) => (
                          <span
                            key={label.id}
                            className="px-1.5 py-0.5 text-xs rounded"
                            style={{
                              backgroundColor: `#${label.color}20`,
                              color: `#${label.color}`,
                            }}
                          >
                            {label.name}
                          </span>
                        ))}
                        {pr.labels.length > 3 && (
                          <span className="px-1.5 py-0.5 text-xs text-gray-400">
                            +{pr.labels.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Link */}
                  <a
                    href={pr.html_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="p-1 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                  </a>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {pullRequests.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Showing {pullRequests.length} pull requests
          </p>
        </div>
      )}
    </div>
  );
};
