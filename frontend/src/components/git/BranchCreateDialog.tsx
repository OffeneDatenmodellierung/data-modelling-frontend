/**
 * Branch Create Dialog Component
 * Dialog for creating new branches
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

export interface BranchCreateDialogProps {
  className?: string;
}

export const BranchCreateDialog: React.FC<BranchCreateDialogProps> = ({ className = '' }) => {
  const { status, branches, showCreateBranchDialog } = useGitStore();
  const [branchName, setBranchName] = useState('');
  const [startPoint, setStartPoint] = useState('');
  const [checkoutAfterCreate, setCheckoutAfterCreate] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (showCreateBranchDialog && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showCreateBranchDialog]);

  // Reset form when dialog opens
  useEffect(() => {
    if (showCreateBranchDialog) {
      setBranchName('');
      setStartPoint('');
      setCheckoutAfterCreate(true);
      setError(null);
    }
  }, [showCreateBranchDialog]);

  const handleClose = useCallback(() => {
    useGitStore.getState().setShowCreateBranchDialog(false);
  }, []);

  const validateBranchName = useCallback(
    (name: string): string | null => {
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
      if (branches.some((b) => b.name === name)) {
        return 'A branch with this name already exists';
      }
      return null;
    },
    [branches]
  );

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

      const success = await gitService.createBranch(branchName.trim(), {
        checkout: checkoutAfterCreate,
        startPoint: startPoint.trim() || undefined,
      });

      setIsCreating(false);

      if (success) {
        handleClose();
      }
    },
    [branchName, checkoutAfterCreate, startPoint, validateBranchName, handleClose]
  );

  if (!showCreateBranchDialog) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Branch</h2>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Branch name input */}
          <div className="mb-4">
            <label htmlFor="branch-name" className="block text-sm font-medium text-gray-700 mb-1">
              Branch name
            </label>
            <input
              ref={inputRef}
              id="branch-name"
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

          {/* Start point (optional) */}
          <div className="mb-4">
            <label htmlFor="start-point" className="block text-sm font-medium text-gray-700 mb-1">
              Start from (optional)
            </label>
            <select
              id="start-point"
              value={startPoint}
              onChange={(e) => setStartPoint(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Current branch ({status.currentBranch || 'HEAD'})</option>
              {branches.map((branch) => (
                <option key={branch.name} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              The new branch will be created from this point
            </p>
          </div>

          {/* Checkout option */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={checkoutAfterCreate}
                onChange={(e) => setCheckoutAfterCreate(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Switch to the new branch after creation</span>
            </label>
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
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !branchName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
