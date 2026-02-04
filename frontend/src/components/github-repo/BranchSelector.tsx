/**
 * Branch Selector Component
 *
 * Allows users to select a branch from a repository.
 * Also supports creating a new branch.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubBranch } from '@/types/github';

export interface BranchSelectorProps {
  owner: string;
  repo: string;
  defaultBranch: string;
  onSelect: (branch: string) => void;
  onBack: () => void;
  onCancel: () => void;
  className?: string;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  owner,
  repo,
  defaultBranch,
  onSelect,
  onBack,
  onCancel,
  className = '',
}) => {
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState(defaultBranch);
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState('');
  const [isCreatingBranch, setIsCreatingBranch] = useState(false);

  // Load branches on mount
  useEffect(() => {
    loadBranches();
  }, [owner, repo]);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const branchList = await githubApi.listBranches(owner, repo, { per_page: 100 });
      setBranches(branchList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo]);

  const handleSelect = useCallback(() => {
    onSelect(selectedBranch);
  }, [selectedBranch, onSelect]);

  const handleCreateBranch = useCallback(async () => {
    if (!newBranchName.trim()) return;

    setIsCreatingBranch(true);
    setError(null);

    try {
      // Get the SHA of the currently selected branch
      const sourceBranch = branches.find((b) => b.name === selectedBranch);
      if (!sourceBranch) {
        throw new Error('Source branch not found');
      }

      // Create the new branch
      await githubApi.createBranch(owner, repo, {
        ref: `refs/heads/${newBranchName.trim()}`,
        sha: sourceBranch.commit.sha,
      });

      // Select the new branch
      setSelectedBranch(newBranchName.trim());
      setShowCreateBranch(false);
      setNewBranchName('');

      // Reload branches to include the new one
      await loadBranches();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsCreatingBranch(false);
    }
  }, [newBranchName, selectedBranch, branches, owner, repo, loadBranches]);

  return (
    <div className={`bg-white rounded-lg shadow-lg max-h-[70vh] flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">Select Branch</h3>
      </div>

      {/* Repo info */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="font-medium text-gray-900">
          {owner}/{repo}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Loading */}
        {isLoading && (
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
            <span className="ml-2 text-gray-600">Loading branches...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Branch list */}
        {!isLoading && branches.length > 0 && (
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
                    {branch.name === defaultBranch && (
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

        {/* Create new branch */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {!showCreateBranch ? (
            <button
              onClick={() => setShowCreateBranch(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Create new branch from {selectedBranch}
            </button>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  New branch name (from {selectedBranch})
                </label>
                <input
                  type="text"
                  value={newBranchName}
                  onChange={(e) => setNewBranchName(e.target.value)}
                  placeholder="feature/my-new-branch"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleCreateBranch();
                    } else if (e.key === 'Escape') {
                      setShowCreateBranch(false);
                      setNewBranchName('');
                    }
                  }}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateBranch(false);
                    setNewBranchName('');
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateBranch}
                  disabled={!newBranchName.trim() || isCreatingBranch}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isCreatingBranch ? (
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
                      Creating...
                    </>
                  ) : (
                    'Create Branch'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSelect}
          disabled={!selectedBranch}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Continue
        </button>
      </div>
    </div>
  );
};
