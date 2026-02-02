/**
 * Branch Switcher Component
 * Dropdown for switching between branches with PR branch quick-switch
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectCurrentBranch,
  selectPreviousBranch,
  selectIsSwitchingBranch,
  selectCanSwitchBack,
  selectSelectedPR,
} from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubBranch } from '@/types/github';

export interface BranchSwitcherProps {
  className?: string;
  showPRBranchSwitch?: boolean;
}

export const BranchSwitcher: React.FC<BranchSwitcherProps> = ({
  className = '',
  showPRBranchSwitch = true,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connection = useGitHubStore((state) => state.connection);
  const currentBranch = useGitHubStore(selectCurrentBranch);
  const previousBranch = useGitHubStore(selectPreviousBranch);
  const isSwitching = useGitHubStore(selectIsSwitchingBranch);
  const canSwitchBack = useGitHubStore(selectCanSwitchBack);
  const selectedPR = useGitHubStore(selectSelectedPR);

  const switchToBranch = useGitHubStore((state) => state.switchToBranch);
  const switchToPRBranch = useGitHubStore((state) => state.switchToPRBranch);
  const switchBack = useGitHubStore((state) => state.switchBack);

  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Get the effective current branch
  const effectiveBranch = currentBranch || connection?.branch || 'main';

  // Check if we're on the PR branch
  const isOnPRBranch = selectedPR && effectiveBranch === selectedPR.head.ref;

  // Load branches
  const loadBranches = useCallback(async () => {
    if (!connection) return;

    setIsLoading(true);
    try {
      const data = await githubApi.listBranches(connection.owner, connection.repo, {
        per_page: 100,
      });
      setBranches(data);
    } catch (error) {
      console.error('Failed to load branches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [connection]);

  // Load branches when dropdown opens
  useEffect(() => {
    if (isOpen && branches.length === 0) {
      loadBranches();
    }
  }, [isOpen, branches.length, loadBranches]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter branches by search
  const filteredBranches = branches.filter((branch) =>
    branch.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Handle branch selection
  const handleSelectBranch = async (branchName: string) => {
    setIsOpen(false);
    setSearchQuery('');
    await switchToBranch(branchName);
  };

  // Handle switch to PR branch
  const handleSwitchToPR = async () => {
    if (!selectedPR) return;
    await switchToPRBranch(selectedPR);
  };

  // Handle switch back
  const handleSwitchBack = async () => {
    await switchBack();
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Main button */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isSwitching}
          className="flex items-center gap-2 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <code className="font-mono text-xs">{effectiveBranch}</code>
          {isSwitching ? (
            <svg className="w-4 h-4 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          )}
        </button>

        {/* Quick switch buttons */}
        {showPRBranchSwitch && selectedPR && !isOnPRBranch && (
          <button
            onClick={handleSwitchToPR}
            disabled={isSwitching}
            className="px-2 py-1.5 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-lg hover:bg-blue-100 disabled:opacity-50"
            title={`Switch to PR branch: ${selectedPR.head.ref}`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                <path
                  fillRule="evenodd"
                  d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"
                />
              </svg>
              PR
            </span>
          </button>
        )}

        {canSwitchBack && (
          <button
            onClick={handleSwitchBack}
            disabled={isSwitching}
            className="px-2 py-1.5 text-xs bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100 disabled:opacity-50"
            title={`Switch back to: ${previousBranch}`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                />
              </svg>
              Back
            </span>
          </button>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-64 bg-white border border-gray-200 rounded-lg shadow-lg">
          {/* Search */}
          <div className="p-2 border-b border-gray-100">
            <input
              type="text"
              placeholder="Find a branch..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
          </div>

          {/* Branch list */}
          <div className="max-h-64 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-gray-500 text-sm">Loading branches...</div>
            ) : filteredBranches.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                {searchQuery ? 'No branches found' : 'No branches available'}
              </div>
            ) : (
              <div className="py-1">
                {/* Default branch */}
                {connection?.branch && (
                  <div className="px-2 py-1 text-xs text-gray-500 font-medium">Default</div>
                )}
                {connection?.branch &&
                  filteredBranches.some((b) => b.name === connection.branch) && (
                    <BranchItem
                      branch={filteredBranches.find((b) => b.name === connection.branch)!}
                      isSelected={effectiveBranch === connection.branch}
                      isDefault
                      onClick={() => handleSelectBranch(connection.branch)}
                    />
                  )}

                {/* Other branches */}
                <div className="px-2 py-1 text-xs text-gray-500 font-medium">Branches</div>
                {filteredBranches
                  .filter((b) => b.name !== connection?.branch)
                  .map((branch) => (
                    <BranchItem
                      key={branch.name}
                      branch={branch}
                      isSelected={effectiveBranch === branch.name}
                      isPRBranch={selectedPR?.head.ref === branch.name}
                      onClick={() => handleSelectBranch(branch.name)}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-gray-100">
            <button
              onClick={loadBranches}
              disabled={isLoading}
              className="w-full px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 rounded flex items-center justify-center gap-1"
            >
              <svg
                className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`}
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
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Branch Item
// ============================================================================

interface BranchItemProps {
  branch: GitHubBranch;
  isSelected: boolean;
  isDefault?: boolean;
  isPRBranch?: boolean;
  onClick: () => void;
}

const BranchItem: React.FC<BranchItemProps> = ({
  branch,
  isSelected,
  isDefault,
  isPRBranch,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
        isSelected ? 'bg-blue-50' : ''
      }`}
    >
      {/* Check mark for selected */}
      <span className="w-4">
        {isSelected && (
          <svg
            className="w-4 h-4 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>

      {/* Branch icon */}
      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
        />
      </svg>

      {/* Branch name */}
      <span
        className={`flex-1 font-mono text-xs truncate ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}
      >
        {branch.name}
      </span>

      {/* Badges */}
      {isDefault && (
        <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">default</span>
      )}
      {isPRBranch && (
        <span className="px-1.5 py-0.5 text-[10px] bg-blue-100 text-blue-600 rounded">PR</span>
      )}
      {branch.protected && (
        <svg className="w-3 h-3 text-yellow-500" fill="currentColor" viewBox="0 0 16 16">
          <path
            fillRule="evenodd"
            d="M8 0a8 8 0 100 16A8 8 0 008 0zM3.5 5a4.5 4.5 0 119 0v.5a.5.5 0 01-1 0V5a3.5 3.5 0 10-7 0v2.5a.5.5 0 01-.5.5H3a.5.5 0 010-1h1V5zm5 6.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
          />
        </svg>
      )}
    </button>
  );
};

export default BranchSwitcher;
