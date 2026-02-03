/**
 * GitHub Branch Create Dialog Component
 * Dialog for creating new branches in GitHub repo mode
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';

export interface GitHubBranchCreateDialogProps {
  open: boolean;
  onClose: () => void;
  onBranchCreated?: (branchName: string) => void;
}

export const GitHubBranchCreateDialog: React.FC<GitHubBranchCreateDialogProps> = ({
  open,
  onClose,
  onBranchCreated,
}) => {
  const workspace = useGitHubRepoStore((state) => state.workspace);
  const createBranch = useGitHubRepoStore((state) => state.createBranch);

  const [branchName, setBranchName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentBranch = workspace?.branch || 'main';
  const isProtectedBranch = currentBranch === 'main' || currentBranch === 'master';

  // Focus input when dialog opens
  useEffect(() => {
    if (open && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setBranchName('');
      setError(null);
    }
  }, [open]);

  const validateBranchName = useCallback((name: string): string | null => {
    if (!name.trim()) {
      return 'Branch name is required';
    }
    if (name.includes(' ')) {
      return 'Branch name cannot contain spaces';
    }
    if (name.startsWith('-')) {
      return 'Branch name cannot start with a hyphen';
    }
    if (name.includes('..')) {
      return 'Branch name cannot contain ".."';
    }
    // eslint-disable-next-line no-useless-escape
    if (/[~^:?*\[\]\\]/.test(name)) {
      return 'Branch name contains invalid characters';
    }
    return null;
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const validationError = validateBranchName(branchName);
      if (validationError) {
        setError(validationError);
        return;
      }

      setIsCreating(true);
      setError(null);

      try {
        await createBranch(branchName.trim(), currentBranch);
        onBranchCreated?.(branchName.trim());
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to create branch');
      } finally {
        setIsCreating(false);
      }
    },
    [branchName, currentBranch, createBranch, validateBranchName, onClose, onBranchCreated]
  );

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        onKeyDown={(e) => e.key === 'Escape' && onClose()}
        role="button"
        tabIndex={0}
        aria-label="Close dialog"
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Branch</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
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

        {/* Warning for protected branches */}
        {isProtectedBranch && (
          <div className="mx-4 mt-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-md">
            <div className="flex items-start gap-2">
              <svg
                className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-sm font-medium text-amber-800">
                  You&apos;re on the {currentBranch} branch
                </p>
                <p className="text-xs text-amber-700 mt-1">
                  Create a new branch to make changes. Direct commits to {currentBranch} may be
                  restricted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Branch name input */}
          <div className="mb-4">
            <label
              htmlFor="gh-branch-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Branch name
            </label>
            <input
              ref={inputRef}
              id="gh-branch-name"
              type="text"
              value={branchName}
              onChange={(e) => {
                setBranchName(e.target.value);
                setError(null);
              }}
              placeholder="feature/my-new-feature"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="off"
            />
          </div>

          {/* Source branch info */}
          <div className="mb-4 text-sm text-gray-600">
            <span>New branch will be created from </span>
            <span className="font-medium text-gray-900">{currentBranch}</span>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !branchName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create & Switch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
