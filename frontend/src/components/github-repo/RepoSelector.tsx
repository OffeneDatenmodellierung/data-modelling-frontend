/**
 * Repository Selector Component
 *
 * Allows users to browse their GitHub repositories or enter a URL
 * to select a repository to open in GitHub repo mode.
 *
 * Supports type-ahead search - when user types 4+ characters, searches
 * GitHub API for matching repositories (useful for large orgs with 1000s of repos).
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useGitHubStore, selectIsAuthenticated } from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubRepository } from '@/types/github';

export interface RepoSelectorProps {
  onSelect: (owner: string, repo: string, defaultBranch: string) => void;
  onCancel: () => void;
  className?: string;
}

const MIN_SEARCH_LENGTH = 4;
const SEARCH_DEBOUNCE_MS = 300;

export const RepoSelector: React.FC<RepoSelectorProps> = ({
  onSelect,
  onCancel,
  className = '',
}) => {
  const isAuthenticated = useGitHubStore(selectIsAuthenticated);
  const { repositories, isLoadingRepos } = useGitHubStore();

  const [mode, setMode] = useState<'browse' | 'url'>('browse');
  const [searchQuery, setSearchQuery] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [isLoadingUrl, setIsLoadingUrl] = useState(false);

  // Type-ahead search state
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<GitHubRepository[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load repos on mount if authenticated
  useEffect(() => {
    if (isAuthenticated && repositories.length === 0) {
      loadRepositories();
    }
  }, [isAuthenticated]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);

  const loadRepositories = useCallback(async () => {
    useGitHubStore.getState().setLoadingRepos(true);
    try {
      const repos = await githubApi.listUserRepos({
        type: 'all',
        sort: 'pushed',
        direction: 'desc',
        per_page: 100,
      });
      useGitHubStore.getState().setRepositories(repos);
    } catch (error) {
      console.error('Failed to load repositories:', error);
      useGitHubStore.getState().setLoadingRepos(false);
    }
  }, []);

  // Type-ahead search function
  const searchRepositories = useCallback(async (query: string) => {
    if (query.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      // Search for repositories matching the query
      // Include user's repos and repos they have access to
      const result = await githubApi.searchRepositories(`${query} in:name`, {
        sort: 'updated',
        order: 'desc',
        per_page: 30,
      });
      setSearchResults(result.items);
    } catch (error) {
      console.error('Failed to search repositories:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Handle search input with debounce
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // Clear previous timeout
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }

      // If query is short, just filter locally
      if (value.length < MIN_SEARCH_LENGTH) {
        setSearchResults([]);
        setHasSearched(false);
        return;
      }

      // Debounce the API search
      searchTimeoutRef.current = setTimeout(() => {
        searchRepositories(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [searchRepositories]
  );

  const handleRepoSelect = useCallback(
    (repo: GitHubRepository) => {
      onSelect(repo.owner.login, repo.name, repo.default_branch);
    },
    [onSelect]
  );

  const parseGitHubUrl = useCallback((url: string): { owner: string; repo: string } | null => {
    // Support various GitHub URL formats
    const patterns = [
      /^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?(?:\/.*)?$/,
      /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/,
      /^([^/]+)\/([^/]+)$/, // owner/repo format
    ];

    for (const pattern of patterns) {
      const match = url.trim().match(pattern);
      if (match) {
        return { owner: match[1] as string, repo: match[2] as string };
      }
    }
    return null;
  }, []);

  const handleUrlSubmit = useCallback(async () => {
    setUrlError(null);
    const parsed = parseGitHubUrl(repoUrl);

    if (!parsed) {
      setUrlError(
        'Invalid GitHub repository URL or format. Use: owner/repo or https://github.com/owner/repo'
      );
      return;
    }

    setIsLoadingUrl(true);
    try {
      const repo = await githubApi.getRepository(parsed.owner, parsed.repo);
      onSelect(repo.owner.login, repo.name, repo.default_branch);
    } catch (error) {
      setUrlError(
        error instanceof Error
          ? error.message
          : 'Failed to access repository. Check the URL and your permissions.'
      );
    } finally {
      setIsLoadingUrl(false);
    }
  }, [repoUrl, parseGitHubUrl, onSelect]);

  // Determine which repos to display
  const displayedRepos = useMemo(() => {
    // If we have search results from API, show those
    if (hasSearched && searchQuery.length >= MIN_SEARCH_LENGTH) {
      return searchResults;
    }

    // Otherwise filter local repos
    if (!searchQuery.trim()) return repositories;
    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query)
    );
  }, [repositories, searchQuery, searchResults, hasSearched]);

  // Check if we should show "search hint" message
  const showSearchHint = useMemo(() => {
    return (
      searchQuery.length > 0 &&
      searchQuery.length < MIN_SEARCH_LENGTH &&
      displayedRepos.length === 0
    );
  }, [searchQuery, displayedRepos]);

  if (!isAuthenticated) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">GitHub Not Connected</h3>
        <p className="text-gray-600 mb-4">
          You need to connect your GitHub account to browse repositories.
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={() => useGitHubStore.getState().setShowAuthDialog(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
          >
            Connect GitHub
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg max-h-[70vh] flex flex-col ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900">Select Repository</h3>
      </div>

      {/* Mode selector */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'browse'}
              onChange={() => setMode('browse')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Browse My Repositories</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="mode"
              checked={mode === 'url'}
              onChange={() => setMode('url')}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm font-medium text-gray-700">Enter Repository URL</span>
          </label>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {mode === 'browse' && (
          <>
            {/* Search */}
            <div className="mb-4">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search repositories... (type 4+ chars to search GitHub)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {isSearching && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg
                      className="w-4 h-4 animate-spin text-gray-400"
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
                  </div>
                )}
              </div>
              {searchQuery.length >= MIN_SEARCH_LENGTH && hasSearched && !isSearching && (
                <p className="mt-1 text-xs text-gray-500">
                  Showing results from GitHub search ({searchResults.length} found)
                </p>
              )}
            </div>

            {/* Loading initial repos */}
            {isLoadingRepos && !searchQuery && (
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
                <span className="ml-2 text-gray-600">Loading repositories...</span>
              </div>
            )}

            {/* Search hint */}
            {showSearchHint && (
              <div className="text-center py-8 text-gray-500">
                <p>No local repositories match your search.</p>
                <p className="text-sm mt-1">
                  Type {MIN_SEARCH_LENGTH - searchQuery.length} more character
                  {MIN_SEARCH_LENGTH - searchQuery.length !== 1 ? 's' : ''} to search GitHub.
                </p>
              </div>
            )}

            {/* No results */}
            {!isLoadingRepos && !isSearching && !showSearchHint && displayedRepos.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'No repositories match your search' : 'No repositories found'}
              </div>
            )}

            {/* Repository list */}
            {!isLoadingRepos && displayedRepos.length > 0 && (
              <div className="space-y-2">
                {displayedRepos.map((repo) => (
                  <button
                    key={repo.id}
                    onClick={() => handleRepoSelect(repo)}
                    className="w-full text-left p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900 truncate">
                            {repo.full_name}
                          </span>
                          {repo.private && (
                            <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                              Private
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="mt-1 text-sm text-gray-500 truncate">{repo.description}</p>
                        )}
                        <div className="mt-1 text-xs text-gray-400">
                          Updated {new Date(repo.pushed_at).toLocaleDateString()}
                        </div>
                      </div>
                      <svg
                        className="w-5 h-5 text-gray-400 flex-shrink-0 ml-2"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        )}

        {mode === 'url' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Repository URL or owner/repo
              </label>
              <input
                type="text"
                value={repoUrl}
                onChange={(e) => {
                  setRepoUrl(e.target.value);
                  setUrlError(null);
                }}
                placeholder="https://github.com/owner/repo or owner/repo"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUrlSubmit();
                  }
                }}
              />
              {urlError && <p className="mt-1 text-sm text-red-600">{urlError}</p>}
            </div>
            <button
              onClick={handleUrlSubmit}
              disabled={!repoUrl.trim() || isLoadingUrl}
              className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoadingUrl ? (
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
                  Loading...
                </>
              ) : (
                'Open Repository'
              )}
            </button>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};
