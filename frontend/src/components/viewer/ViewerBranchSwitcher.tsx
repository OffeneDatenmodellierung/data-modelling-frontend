/**
 * Viewer Branch Switcher
 * Lightweight branch dropdown for viewer mode that navigates via URL.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { githubApi } from '@/services/github/githubApi';
import { getViewerConfig } from '@/services/viewerMode';
import type { GitHubBranch } from '@/types/github';

export interface ViewerBranchSwitcherProps {
  owner: string;
  repo: string;
  currentBranch: string;
  workspacePath: string;
}

export const ViewerBranchSwitcher: React.FC<ViewerBranchSwitcherProps> = ({
  owner,
  repo,
  currentBranch,
  workspacePath,
}) => {
  const navigate = useNavigate();
  const config = getViewerConfig();
  const defaultBranch = config.branch || 'main';

  const [isOpen, setIsOpen] = useState(false);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const loadBranches = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await githubApi.listBranches(owner, repo, { per_page: 100 });
      setBranches(data);
    } catch (error) {
      console.error('[ViewerBranchSwitcher] Failed to load branches:', error);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo]);

  // Load branches when dropdown opens
  useEffect(() => {
    if (isOpen && branches.length === 0) {
      loadBranches();
    }
  }, [isOpen, branches.length, loadBranches]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectBranch = (branchName: string) => {
    setIsOpen(false);
    setSearchQuery('');
    if (branchName === currentBranch) return;

    const path = workspacePath || '_root_';
    navigate(`/workspace/github/${owner}/${repo}/${branchName}/${path}`);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 transition-colors"
        title="Switch branch"
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
        <code className="font-mono text-xs text-gray-700">{currentBranch}</code>
        <svg
          className="w-3.5 h-3.5 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

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
                {/* Default branch first */}
                {filteredBranches.some((b) => b.name === defaultBranch) && (
                  <>
                    <div className="px-2 py-1 text-xs text-gray-500 font-medium">Default</div>
                    <BranchItem
                      name={defaultBranch}
                      isSelected={currentBranch === defaultBranch}
                      isDefault
                      onClick={() => handleSelectBranch(defaultBranch)}
                    />
                  </>
                )}

                {/* Other branches */}
                <div className="px-2 py-1 text-xs text-gray-500 font-medium">Branches</div>
                {filteredBranches
                  .filter((b) => b.name !== defaultBranch)
                  .map((branch) => (
                    <BranchItem
                      key={branch.name}
                      name={branch.name}
                      isSelected={currentBranch === branch.name}
                      onClick={() => handleSelectBranch(branch.name)}
                    />
                  ))}
              </div>
            )}
          </div>

          {/* Refresh */}
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
  name: string;
  isSelected: boolean;
  isDefault?: boolean;
  onClick: () => void;
}

const BranchItem: React.FC<BranchItemProps> = ({ name, isSelected, isDefault, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 ${
      isSelected ? 'bg-blue-50' : ''
    }`}
  >
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
    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
      />
    </svg>
    <span
      className={`flex-1 font-mono text-xs truncate ${isSelected ? 'text-blue-700 font-medium' : 'text-gray-700'}`}
    >
      {name}
    </span>
    {isDefault && (
      <span className="px-1.5 py-0.5 text-[10px] bg-gray-100 text-gray-600 rounded">default</span>
    )}
  </button>
);
