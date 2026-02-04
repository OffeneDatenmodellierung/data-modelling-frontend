/**
 * CherryPickDialog Component
 * Dialog for cherry-picking commits and handling conflicts
 */

import React, { useState, useCallback } from 'react';
import { useGitStore, GitCommit } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

interface CherryPickDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  commit: GitCommit | null;
}

export const CherryPickDialog: React.FC<CherryPickDialogProps> = ({
  open,
  onOpenChange,
  commit,
}) => {
  const { isCherryPicking, cherryPickConflicts } = useGitStore();
  const [noCommit, setNoCommit] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCherryPick = useCallback(async () => {
    if (!commit) return;

    setIsProcessing(true);
    const result = await gitService.cherryPick(commit.hash, { noCommit });
    setIsProcessing(false);

    if (result.success) {
      onOpenChange(false);
    }
    // If there are conflicts, the dialog stays open to show them
  }, [commit, noCommit, onOpenChange]);

  const handleAbort = useCallback(async () => {
    setIsProcessing(true);
    const success = await gitService.cherryPickAbort();
    setIsProcessing(false);

    if (success) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const handleContinue = useCallback(async () => {
    setIsProcessing(true);
    const result = await gitService.cherryPickContinue();
    setIsProcessing(false);

    if (result.success) {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const hasConflicts = cherryPickConflicts.length > 0;

  if (!open || (!commit && !isCherryPicking)) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Modal backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => !hasConflicts && onOpenChange(false)}
      />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <svg
              className="w-5 h-5 text-pink-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
              />
            </svg>
            {hasConflicts ? 'Cherry-pick Conflicts' : 'Cherry-pick Commit'}
          </h2>
          {!hasConflicts && (
            <button
              onClick={() => onOpenChange(false)}
              className="p-1 text-gray-400 hover:text-gray-600 rounded"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Commit Info */}
          {commit && !hasConflicts && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono bg-gray-100 px-2 py-1 rounded">
                  {commit.hashShort}
                </span>
                <span className="text-sm text-gray-500">{commit.author}</span>
              </div>
              <p className="text-sm text-gray-900">{commit.message}</p>
            </div>
          )}

          {/* Options */}
          {!hasConflicts && (
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={noCommit}
                onChange={(e) => setNoCommit(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">
                Stage changes only (do not create commit)
              </span>
            </label>
          )}

          {/* Conflict Alert */}
          {hasConflicts && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex items-start gap-3">
                <svg
                  className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
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
                  <h4 className="text-sm font-medium text-red-800">Merge Conflicts</h4>
                  <p className="text-sm text-red-700 mt-1">
                    The following files have conflicts that need to be resolved:
                  </p>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {cherryPickConflicts.map((file) => (
                      <li key={file} className="text-sm font-mono text-red-700">
                        {file}
                      </li>
                    ))}
                  </ul>
                  <p className="text-sm text-red-700 mt-2">
                    Resolve the conflicts in your editor, stage the changes, then click Continue.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
          {hasConflicts ? (
            <>
              <button
                onClick={handleAbort}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Processing...' : 'Continue'}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => onOpenChange(false)}
                disabled={isProcessing}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCherryPick}
                disabled={isProcessing || !commit}
                className="px-4 py-2 text-sm font-medium text-white bg-pink-600 rounded-md hover:bg-pink-700 disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
                {isProcessing ? 'Cherry-picking...' : 'Cherry-pick'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * Inline Cherry-pick conflict panel (for use in GitPanel)
 */
interface CherryPickConflictPanelProps {
  className?: string;
}

export const CherryPickConflictPanel: React.FC<CherryPickConflictPanelProps> = ({
  className = '',
}) => {
  const { isCherryPicking, cherryPickConflicts } = useGitStore();
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isCherryPicking || cherryPickConflicts.length === 0) {
    return null;
  }

  const handleAbort = async () => {
    setIsProcessing(true);
    await gitService.cherryPickAbort();
    setIsProcessing(false);
  };

  const handleContinue = async () => {
    setIsProcessing(true);
    await gitService.cherryPickContinue();
    setIsProcessing(false);
  };

  return (
    <div className={className}>
      <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-3">
        <div className="flex items-start gap-2">
          <svg
            className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
            />
          </svg>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-red-800">Cherry-pick in Progress</h4>
            <p className="text-xs text-red-700 mt-1">
              Conflicts in {cherryPickConflicts.length} file(s)
            </p>
            <ul className="list-disc list-inside mt-1 space-y-0.5">
              {cherryPickConflicts.slice(0, 3).map((file) => (
                <li key={file} className="text-xs font-mono text-red-700 truncate">
                  {file}
                </li>
              ))}
              {cherryPickConflicts.length > 3 && (
                <li className="text-xs text-red-700">
                  ...and {cherryPickConflicts.length - 3} more
                </li>
              )}
            </ul>
            <div className="flex gap-2 mt-2">
              <button
                onClick={handleAbort}
                disabled={isProcessing}
                className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
              >
                Abort
              </button>
              <button
                onClick={handleContinue}
                disabled={isProcessing}
                className="px-2 py-1 text-xs font-medium text-white bg-blue-600 rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
