/**
 * GitHub Repository Selector Component
 * Dialog for selecting a GitHub repository to connect to
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { useGitHubStore, selectIsAuthenticated } from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubRepository, GitHubBranch } from '@/types/github';

export interface GitHubRepoSelectorProps {
  className?: string;
  onConnect?: (owner: string, repo: string, branch: string) => void;
}

type Step = 'repos' | 'branches';

export const GitHubRepoSelector: React.FC<GitHubRepoSelectorProps> = ({
  className = '',
  onConnect,
}) => {
  const { showConnectDialog, isConnecting, connectionError, repositories, isLoadingRepos } =
    useGitHubStore();
  const isAuthenticated = useGitHubStore(selectIsAuthenticated);

  const [step, setStep] = useState<Step>('repos');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepository | null>(null);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [localError, setLocalError] = useState<string | null>(null);

  // Load repos on dialog open
  useEffect(() => {
    if (showConnectDialog && isAuthenticated && repositories.length === 0) {
      loadRepositories();
    }
  }, [showConnectDialog, isAuthenticated]);

  // Reset state when dialog opens
  useEffect(() => {
    if (showConnectDialog) {
      setStep('repos');
      setSearchQuery('');
      setSelectedRepo(null);
      setBranches([]);
      setSelectedBranch('');
      setLocalError(null);
    }
  }, [showConnectDialog]);

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
      setLocalError(error instanceof Error ? error.message : 'Failed to load repositories');
      useGitHubStore.getState().setLoadingRepos(false);
    }
  }, []);

  const loadBranches = useCallback(async (repo: GitHubRepository) => {
    setIsLoadingBranches(true);
    setLocalError(null);
    try {
      const branchList = await githubApi.listBranches(repo.owner.login, repo.name, {
        per_page: 100,
      });
      setBranches(branchList);
      // Pre-select default branch
      setSelectedBranch(repo.default_branch);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Failed to load branches');
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  const handleClose = useCallback(() => {
    useGitHubStore.getState().setShowConnectDialog(false);
  }, []);

  const handleRepoSelect = useCallback(
    (repo: GitHubRepository) => {
      setSelectedRepo(repo);
      setStep('branches');
      loadBranches(repo);
    },
    [loadBranches]
  );

  const handleBack = useCallback(() => {
    setStep('repos');
    setSelectedRepo(null);
    setBranches([]);
    setSelectedBranch('');
    setLocalError(null);
  }, []);

  const handleConnect = useCallback(async () => {
    if (!selectedRepo || !selectedBranch) return;

    useGitHubStore.getState().setConnecting(true);
    useGitHubStore.getState().setConnectionError(null);

    try {
      // Set the connection
      useGitHubStore.getState().setConnection({
        owner: selectedRepo.owner.login,
        repo: selectedRepo.name,
        branch: selectedBranch,
      });
      useGitHubStore.getState().setConnectedRepo(selectedRepo);
      useGitHubStore.getState().setConnecting(false);

      // Callback
      onConnect?.(selectedRepo.owner.login, selectedRepo.name, selectedBranch);

      // Close dialog
      handleClose();
    } catch (error) {
      useGitHubStore
        .getState()
        .setConnectionError(error instanceof Error ? error.message : 'Failed to connect');
    }
  }, [selectedRepo, selectedBranch, onConnect, handleClose]);

  // Filter repos by search query
  const filteredRepos = useMemo(() => {
    if (!searchQuery.trim()) return repositories;
    const query = searchQuery.toLowerCase();
    return repositories.filter(
      (repo) =>
        repo.name.toLowerCase().includes(query) ||
        repo.full_name.toLowerCase().includes(query) ||
        repo.description?.toLowerCase().includes(query)
    );
  }, [repositories, searchQuery]);

  if (!showConnectDialog) {
    return null;
  }

  // Show auth dialog if not authenticated
  if (!isAuthenticated) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
        <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-6 text-center">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">GitHub Not Connected</h2>
          <p className="text-gray-600 mb-4">You need to connect your GitHub account first.</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                handleClose();
                useGitHubStore.getState().setShowAuthDialog(true);
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
            >
              Connect GitHub
            </button>
          </div>
        </div>
      </div>
    );
  }

  const error = localError || connectionError;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-xl mx-4 max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {step === 'branches' && (
              <button
                onClick={handleBack}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
              </button>
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {step === 'repos' ? 'Select Repository' : 'Select Branch'}
            </h2>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {step === 'repos' && (
            <>
              {/* Search */}
              <div className="mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search repositories..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Loading */}
              {isLoadingRepos && (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="w-6 h-6 animate-spin text-gray-400"
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
                  <span className="ml-2 text-gray-600">Loading repositories...</span>
                </div>
              )}

              {/* Repository list */}
              {!isLoadingRepos && filteredRepos.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  {searchQuery ? 'No repositories match your search' : 'No repositories found'}
                </div>
              )}

              {!isLoadingRepos && filteredRepos.length > 0 && (
                <div className="space-y-2">
                  {filteredRepos.map((repo) => (
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
                            <p className="mt-1 text-sm text-gray-500 truncate">
                              {repo.description}
                            </p>
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

          {step === 'branches' && selectedRepo && (
            <>
              {/* Selected repo info */}
              <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                <div className="font-medium text-gray-900">{selectedRepo.full_name}</div>
                {selectedRepo.description && (
                  <p className="text-sm text-gray-500 mt-1">{selectedRepo.description}</p>
                )}
              </div>

              {/* Loading branches */}
              {isLoadingBranches && (
                <div className="flex items-center justify-center py-8">
                  <svg
                    className="w-6 h-6 animate-spin text-gray-400"
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
                  <span className="ml-2 text-gray-600">Loading branches...</span>
                </div>
              )}

              {/* Branch list */}
              {!isLoadingBranches && branches.length > 0 && (
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <label
                      key={branch.name}
                      className={`flex items-center gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedBranch === branch.name
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="branch"
                        value={branch.name}
                        checked={selectedBranch === branch.name}
                        onChange={(e) => setSelectedBranch(e.target.value)}
                        className="w-4 h-4 text-blue-600"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{branch.name}</span>
                          {branch.name === selectedRepo.default_branch && (
                            <span className="px-1.5 py-0.5 text-xs bg-green-100 text-green-700 rounded">
                              default
                            </span>
                          )}
                          {branch.protected && (
                            <span className="px-1.5 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded">
                              protected
                            </span>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Error message */}
          {error && (
            <div className="mt-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        {step === 'branches' && (
          <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={isConnecting || !selectedBranch}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isConnecting ? (
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
                  Connecting...
                </>
              ) : (
                'Connect Repository'
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
