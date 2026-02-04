/**
 * GitHub Commit History Component
 * Display commit history for the connected repository
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubStore, selectIsConnected, selectConnectionInfo } from '@/stores/githubStore';
import { githubProvider, type GitHubProviderCommit } from '@/services/github/githubProvider';

export interface GitHubCommitHistoryProps {
  className?: string;
  onCommitSelect?: (commit: GitHubProviderCommit) => void;
  limit?: number;
}

export const GitHubCommitHistory: React.FC<GitHubCommitHistoryProps> = ({
  className = '',
  onCommitSelect,
  limit = 30,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connectionInfo = useGitHubStore(selectConnectionInfo);

  const [commits, setCommits] = useState<GitHubProviderCommit[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  // Load commits
  const loadCommits = useCallback(async () => {
    if (!isConnected) return;

    setIsLoading(true);
    setError(null);

    try {
      const commitList = await githubProvider.listCommits({ limit });
      setCommits(commitList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load commits');
    } finally {
      setIsLoading(false);
    }
  }, [isConnected, limit]);

  // Load commits on mount/connection change
  useEffect(() => {
    loadCommits();
  }, [loadCommits]);

  // Handle commit click
  const handleCommitClick = useCallback(
    (commit: GitHubProviderCommit) => {
      setSelectedCommit(commit.sha);
      onCommitSelect?.(commit);
    },
    [onCommitSelect]
  );

  // Format date
  const formatDate = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
      }
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    }

    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;

    return date.toLocaleDateString();
  };

  // Get author initials
  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isConnected) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Connect a GitHub repository to view commit history
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-gray-900">Commit History</h3>
          <p className="text-xs text-gray-500">{connectionInfo?.branch}</p>
        </div>
        <button
          onClick={loadCommits}
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

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && commits.length === 0 ? (
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
        ) : commits.length === 0 ? (
          <div className="p-4 text-center text-gray-500">No commits found</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {commits.map((commit) => (
              <button
                key={commit.sha}
                onClick={() => handleCommitClick(commit)}
                className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                  selectedCommit === commit.sha ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Author avatar */}
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                    {getInitials(commit.author)}
                  </div>

                  {/* Commit info */}
                  <div className="flex-1 min-w-0">
                    {/* Message */}
                    <p className="text-sm text-gray-900 truncate">
                      {commit.message.split('\n')[0]}
                    </p>

                    {/* Meta */}
                    <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-medium">{commit.author}</span>
                      <span>committed {formatDate(commit.date)}</span>
                    </div>
                  </div>

                  {/* SHA */}
                  <div className="flex-shrink-0">
                    <code className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded font-mono">
                      {commit.sha.slice(0, 7)}
                    </code>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      {commits.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            Showing {commits.length} most recent commits
          </p>
        </div>
      )}
    </div>
  );
};
