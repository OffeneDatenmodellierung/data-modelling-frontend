/**
 * PR List Panel Component
 * Collapsible sidebar panel for browsing and filtering pull requests
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectPullRequests,
  selectIsLoadingPRs,
  selectPRError,
  selectSelectedPR,
} from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubPullRequest } from '@/types/github';

export interface PRListPanelProps {
  className?: string;
  onSelectPR?: (pr: GitHubPullRequest) => void;
}

type PRState = 'open' | 'closed' | 'all';
type SortField = 'created' | 'updated' | 'popularity';
type SortDirection = 'asc' | 'desc';

export const PRListPanel: React.FC<PRListPanelProps> = ({ className = '', onSelectPR }) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connection = useGitHubStore((state) => state.connection);
  const pullRequests = useGitHubStore(selectPullRequests);
  const isLoading = useGitHubStore(selectIsLoadingPRs);
  const error = useGitHubStore(selectPRError);
  const selectedPR = useGitHubStore(selectSelectedPR);

  const setPullRequests = useGitHubStore((state) => state.setPullRequests);
  const setLoadingPRs = useGitHubStore((state) => state.setLoadingPRs);
  const setPRError = useGitHubStore((state) => state.setPRError);
  const setSelectedPR = useGitHubStore((state) => state.setSelectedPR);

  // Filters
  const [stateFilter, setStateFilter] = useState<PRState>('open');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('updated');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [showFilters, setShowFilters] = useState(false);

  // Load PRs
  const loadPRs = useCallback(async () => {
    if (!connection) return;

    setLoadingPRs(true);
    setPRError(null);

    try {
      const prs = await githubApi.listPullRequests(connection.owner, connection.repo, {
        state: stateFilter,
        sort: sortField,
        direction: sortDirection,
        per_page: 50,
      });
      setPullRequests(prs);
    } catch (err) {
      setPRError(err instanceof Error ? err.message : 'Failed to load pull requests');
    }
  }, [
    connection,
    stateFilter,
    sortField,
    sortDirection,
    setPullRequests,
    setLoadingPRs,
    setPRError,
  ]);

  // Load PRs on mount and when filters change
  useEffect(() => {
    if (isConnected) {
      loadPRs();
    }
  }, [isConnected, loadPRs]);

  // Filter PRs by search query
  const filteredPRs = useMemo(() => {
    if (!searchQuery.trim()) return pullRequests;

    const query = searchQuery.toLowerCase();
    return pullRequests.filter(
      (pr) =>
        pr.title.toLowerCase().includes(query) ||
        pr.number.toString().includes(query) ||
        pr.user.login.toLowerCase().includes(query) ||
        pr.head.ref.toLowerCase().includes(query)
    );
  }, [pullRequests, searchQuery]);

  // Handle PR selection
  const handleSelectPR = (pr: GitHubPullRequest) => {
    setSelectedPR(pr);
    onSelectPR?.(pr);
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (!isConnected) {
    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        <div className="p-4 text-center text-gray-500">
          <p>Connect to a GitHub repository to view pull requests.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white border-r border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Pull Requests</h2>
          <button
            onClick={loadPRs}
            disabled={isLoading}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
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

        {/* Search */}
        <div className="mt-2 relative">
          <input
            type="text"
            placeholder="Search PRs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        {/* Filter toggles */}
        <div className="mt-2 flex items-center gap-2">
          <div className="flex rounded-md border border-gray-300 overflow-hidden">
            {(['open', 'closed', 'all'] as PRState[]).map((state) => (
              <button
                key={state}
                onClick={() => setStateFilter(state)}
                className={`px-2 py-1 text-xs font-medium ${
                  stateFilter === state
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {state.charAt(0).toUpperCase() + state.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded ${showFilters ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}
            title="More filters"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </button>
        </div>

        {/* Extended filters */}
        {showFilters && (
          <div className="mt-2 p-2 bg-gray-100 rounded-md space-y-2">
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600">Sort:</label>
              <select
                value={sortField}
                onChange={(e) => setSortField(e.target.value as SortField)}
                className="flex-1 text-xs border border-gray-300 rounded px-2 py-1"
              >
                <option value="updated">Updated</option>
                <option value="created">Created</option>
                <option value="popularity">Popularity</option>
              </select>
              <button
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="p-1 text-gray-500 hover:bg-gray-200 rounded"
                title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
              >
                {sortDirection === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* PR List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && filteredPRs.length === 0 ? (
          <div className="flex items-center justify-center py-12">
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
          <div className="p-4 text-center text-red-600">
            <p className="text-sm">{error}</p>
            <button onClick={loadPRs} className="mt-2 text-xs text-blue-600 hover:underline">
              Retry
            </button>
          </div>
        ) : filteredPRs.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="text-sm">No pull requests found</p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="mt-1 text-xs text-blue-600 hover:underline"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredPRs.map((pr) => (
              <PRListItem
                key={pr.id}
                pr={pr}
                isSelected={selectedPR?.id === pr.id}
                onClick={() => handleSelectPR(pr)}
                formatRelativeTime={formatRelativeTime}
              />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
        <p className="text-xs text-gray-500">
          {filteredPRs.length} of {pullRequests.length} PRs
          {searchQuery && ' (filtered)'}
        </p>
      </div>
    </div>
  );
};

// ============================================================================
// PR List Item
// ============================================================================

interface PRListItemProps {
  pr: GitHubPullRequest;
  isSelected: boolean;
  onClick: () => void;
  formatRelativeTime: (date: string) => string;
}

const PRListItem: React.FC<PRListItemProps> = ({ pr, isSelected, onClick, formatRelativeTime }) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
        isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {/* Status indicator */}
        <PRStatusIndicator pr={pr} />

        <div className="flex-1 min-w-0">
          {/* Title and number */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-mono text-gray-500">#{pr.number}</span>
            <h3 className="text-sm font-medium text-gray-900 truncate">{pr.title}</h3>
          </div>

          {/* Meta info */}
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
            <img src={pr.user.avatar_url} alt={pr.user.login} className="w-4 h-4 rounded-full" />
            <span>{pr.user.login}</span>
            <span>•</span>
            <span>{formatRelativeTime(pr.updated_at)}</span>
          </div>

          {/* Branch info */}
          <div className="mt-1.5 flex items-center gap-1 text-xs">
            <code className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
              {pr.head.ref}
            </code>
            <span className="text-gray-400">→</span>
            <code className="px-1 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">
              {pr.base.ref}
            </code>
          </div>

          {/* Labels */}
          {pr.labels.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {pr.labels.slice(0, 3).map((label) => (
                <span
                  key={label.id}
                  className="px-1.5 py-0.5 text-[10px] rounded-full"
                  style={{
                    backgroundColor: `#${label.color}20`,
                    color: `#${label.color}`,
                    border: `1px solid #${label.color}40`,
                  }}
                >
                  {label.name}
                </span>
              ))}
              {pr.labels.length > 3 && (
                <span className="text-[10px] text-gray-400">+{pr.labels.length - 3}</span>
              )}
            </div>
          )}
        </div>
      </div>
    </button>
  );
};

// ============================================================================
// PR Status Indicator
// ============================================================================

const PRStatusIndicator: React.FC<{ pr: GitHubPullRequest }> = ({ pr }) => {
  if (pr.merged) {
    return (
      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-purple-100">
        <svg className="w-3 h-3 text-purple-600" fill="currentColor" viewBox="0 0 16 16">
          <path
            fillRule="evenodd"
            d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
          />
        </svg>
      </div>
    );
  }

  if (pr.state === 'closed') {
    return (
      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100">
        <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 16 16">
          <path d="M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z" />
        </svg>
      </div>
    );
  }

  if (pr.draft) {
    return (
      <div className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-200">
        <svg className="w-3 h-3 text-gray-600" fill="currentColor" viewBox="0 0 16 16">
          <path
            fillRule="evenodd"
            d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
          />
        </svg>
      </div>
    );
  }

  // Open PR
  return (
    <div className="w-5 h-5 flex items-center justify-center rounded-full bg-green-100">
      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 16 16">
        <path
          fillRule="evenodd"
          d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
        />
      </svg>
    </div>
  );
};

export default PRListPanel;
