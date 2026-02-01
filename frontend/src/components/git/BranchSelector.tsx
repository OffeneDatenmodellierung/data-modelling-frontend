/**
 * Branch Selector Component
 * Dropdown for switching between branches
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

export interface BranchSelectorProps {
  className?: string;
  onCreateBranch?: () => void;
}

export const BranchSelector: React.FC<BranchSelectorProps> = ({
  className = '',
  onCreateBranch,
}) => {
  const { status, branches, remoteBranches, isLoadingBranches, showBranchSelector } = useGitStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load branches when dropdown opens
  useEffect(() => {
    if (showBranchSelector && status.isGitRepo) {
      gitService.loadBranches();
    }
  }, [showBranchSelector, status.isGitRepo]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (showBranchSelector && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showBranchSelector]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showBranchSelector) {
      return;
    }

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        useGitStore.getState().setShowBranchSelector(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showBranchSelector]);

  const handleClose = useCallback(() => {
    useGitStore.getState().setShowBranchSelector(false);
    setSearchQuery('');
  }, []);

  const handleCheckout = useCallback(
    async (branchName: string) => {
      const success = await gitService.checkoutBranch(branchName);
      if (success) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleDelete = useCallback(async (branchName: string, force: boolean = false) => {
    if (
      !window.confirm(`Delete branch "${branchName}"?${force ? ' This will force delete.' : ''}`)
    ) {
      return;
    }
    setIsDeleting(branchName);
    await gitService.deleteBranch(branchName, { force });
    setIsDeleting(null);
  }, []);

  // Filter branches by search query
  const filteredLocalBranches = branches.filter((b) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredRemoteBranches = remoteBranches.filter((b) =>
    b.branchName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!showBranchSelector) {
    return null;
  }

  return (
    <div
      ref={dropdownRef}
      className={`absolute top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg z-50 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200">
        <span className="text-sm font-medium text-gray-700">Switch branch</span>
        <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-gray-200">
        <input
          ref={inputRef}
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter branches..."
          className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Branch list */}
      <div className="max-h-64 overflow-y-auto">
        {isLoadingBranches ? (
          <div className="flex items-center justify-center py-4">
            <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
        ) : (
          <>
            {/* Local branches */}
            {filteredLocalBranches.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                  Local branches
                </div>
                {filteredLocalBranches.map((branch) => (
                  <div
                    key={branch.name}
                    className={`flex items-center justify-between px-3 py-2 hover:bg-gray-50 ${
                      branch.current ? 'bg-blue-50' : ''
                    }`}
                  >
                    <button
                      onClick={() => !branch.current && handleCheckout(branch.name)}
                      disabled={branch.current}
                      className={`flex items-center gap-2 flex-1 text-left ${
                        branch.current
                          ? 'text-blue-600 cursor-default'
                          : 'text-gray-700 hover:text-gray-900'
                      }`}
                    >
                      {branch.current && (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                      <span className={`text-sm ${branch.current ? 'font-medium' : ''}`}>
                        {branch.name}
                      </span>
                    </button>
                    {!branch.current && (
                      <button
                        onClick={() => handleDelete(branch.name)}
                        disabled={isDeleting === branch.name}
                        className="p-1 text-gray-400 hover:text-red-600 rounded"
                        title="Delete branch"
                      >
                        {isDeleting === branch.name ? (
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
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        )}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Remote branches */}
            {filteredRemoteBranches.length > 0 && (
              <div>
                <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">
                  Remote branches
                </div>
                {filteredRemoteBranches.map((branch) => (
                  <button
                    key={branch.name}
                    onClick={() => handleCheckout(branch.branchName)}
                    className="flex items-center gap-2 w-full px-3 py-2 text-left text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  >
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
                        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                      />
                    </svg>
                    <span className="text-sm">
                      {branch.remoteName}/{branch.branchName}
                    </span>
                  </button>
                ))}
              </div>
            )}

            {/* No results */}
            {filteredLocalBranches.length === 0 && filteredRemoteBranches.length === 0 && (
              <div className="px-3 py-4 text-sm text-gray-500 text-center">No branches found</div>
            )}
          </>
        )}
      </div>

      {/* Create branch button */}
      <div className="border-t border-gray-200 p-2">
        <button
          onClick={() => {
            handleClose();
            onCreateBranch?.();
          }}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Create new branch
        </button>
      </div>
    </div>
  );
};
