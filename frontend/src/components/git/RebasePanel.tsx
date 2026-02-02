/**
 * RebasePanel Component
 * UI for managing git rebase operations
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useGitStore, selectIsInRebase, selectRebaseProgress } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

interface RebasePanelProps {
  className?: string;
}

export const RebasePanel: React.FC<RebasePanelProps> = ({ className = '' }) => {
  const { branches, remoteBranches, rebaseStatus, status } = useGitStore();
  const isInRebase = useGitStore(selectIsInRebase);
  const rebaseProgress = useGitStore(selectRebaseProgress);

  const [showStartDialog, setShowStartDialog] = useState(false);
  const [upstream, setUpstream] = useState('');
  const [autostash, setAutostash] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load rebase status on mount
  useEffect(() => {
    if (status.isGitRepo) {
      gitService.loadRebaseStatus();
    }
  }, [status.isGitRepo]);

  const handleStartRebase = useCallback(async () => {
    if (!upstream) return;

    setIsProcessing(true);
    const result = await gitService.rebaseStart(upstream, { autostash });
    setIsProcessing(false);

    if (result.success || result.hasConflicts) {
      setShowStartDialog(false);
      setUpstream('');
    }
  }, [upstream, autostash]);

  const handleContinue = useCallback(async () => {
    setIsProcessing(true);
    await gitService.rebaseContinue();
    setIsProcessing(false);
  }, []);

  const handleAbort = useCallback(async () => {
    setIsProcessing(true);
    await gitService.rebaseAbort();
    setIsProcessing(false);
  }, []);

  const handleSkip = useCallback(async () => {
    setIsProcessing(true);
    await gitService.rebaseSkip();
    setIsProcessing(false);
  }, []);

  // Get available branches for rebase target
  const availableBranches = [
    ...branches.filter((b) => !b.current).map((b) => ({ value: b.name, label: b.name })),
    ...remoteBranches.map((b) => ({ value: b.name, label: b.name })),
  ];

  const hasConflicts = rebaseStatus.conflictFiles && rebaseStatus.conflictFiles.length > 0;

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Rebase In Progress */}
      {isInRebase ? (
        <RebaseInProgressPanel
          rebaseStatus={rebaseStatus}
          rebaseProgress={rebaseProgress}
          hasConflicts={!!hasConflicts}
          isProcessing={isProcessing}
          onContinue={handleContinue}
          onAbort={handleAbort}
          onSkip={handleSkip}
        />
      ) : (
        <div className="p-4 space-y-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Rebase your branch onto another branch</span>
          </div>

          <button
            onClick={() => setShowStartDialog(true)}
            disabled={status.files.length > 0 && !autostash}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Start Rebase
          </button>

          {status.files.length > 0 && (
            <p className="text-xs text-gray-500">
              You have uncommitted changes. Enable autostash to rebase anyway.
            </p>
          )}
        </div>
      )}

      {/* Start Rebase Dialog */}
      {showStartDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowStartDialog(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-blue-600"
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
                Start Rebase
              </h2>
              <button
                onClick={() => setShowStartDialog(false)}
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
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-gray-600">
                Rebase the current branch ({status.currentBranch || 'HEAD'}) onto another branch.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rebase onto</label>
                <select
                  value={upstream}
                  onChange={(e) => setUpstream(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select target branch...</option>
                  {availableBranches.map((branch) => (
                    <option key={branch.value} value={branch.value}>
                      {branch.label}
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={autostash}
                  onChange={(e) => setAutostash(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">
                  Automatically stash and restore uncommitted changes
                </span>
              </label>
            </div>

            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowStartDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStartRebase}
                disabled={!upstream || isProcessing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isProcessing ? 'Starting...' : 'Start Rebase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface RebaseInProgressPanelProps {
  rebaseStatus: {
    isRebasing: boolean;
    currentCommit?: string;
    headName?: string;
    onto?: string;
    done?: number;
    remaining?: number;
    conflictFiles?: string[];
  };
  rebaseProgress: { done: number; remaining: number; total: number } | null;
  hasConflicts: boolean;
  isProcessing: boolean;
  onContinue: () => void;
  onAbort: () => void;
  onSkip: () => void;
}

const RebaseInProgressPanel: React.FC<RebaseInProgressPanelProps> = ({
  rebaseStatus,
  rebaseProgress,
  hasConflicts,
  isProcessing,
  onContinue,
  onAbort,
  onSkip,
}) => {
  const progressPercent = rebaseProgress
    ? Math.round((rebaseProgress.done / rebaseProgress.total) * 100)
    : 0;

  return (
    <div className="p-4 space-y-4">
      {/* Status Header */}
      <div className="flex items-center gap-2">
        <svg
          className="w-4 h-4 text-amber-600 animate-spin"
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
        <span className="text-sm font-medium text-gray-900">Rebase in Progress</span>
      </div>

      {/* Progress */}
      {rebaseProgress && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-gray-500">
            <span>
              Commit {rebaseProgress.done} of {rebaseProgress.total}
            </span>
            <span>{progressPercent}%</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Rebase Info */}
      {rebaseStatus.headName && rebaseStatus.onto && (
        <div className="text-xs text-gray-500">
          Rebasing{' '}
          <span className="font-mono bg-gray-100 px-1 rounded">{rebaseStatus.headName}</span> onto{' '}
          <span className="font-mono bg-gray-100 px-1 rounded">{rebaseStatus.onto}</span>
        </div>
      )}

      {/* Conflicts Alert */}
      {hasConflicts && (
        <div className="bg-red-50 border border-red-200 rounded-md p-3">
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
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <div className="flex-1">
              <h4 className="text-sm font-medium text-red-800">Merge Conflicts</h4>
              <p className="text-xs text-red-700 mt-1">
                Resolve conflicts in {rebaseStatus.conflictFiles?.length} file(s):
              </p>
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                {rebaseStatus.conflictFiles?.slice(0, 3).map((file) => (
                  <li key={file} className="text-xs font-mono text-red-700 truncate">
                    {file}
                  </li>
                ))}
                {(rebaseStatus.conflictFiles?.length || 0) > 3 && (
                  <li className="text-xs text-red-700">
                    ...and {(rebaseStatus.conflictFiles?.length || 0) - 3} more
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={onAbort}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
          Abort
        </button>
        <button
          onClick={onSkip}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 5l7 7-7 7M5 5l7 7-7 7"
            />
          </svg>
          Skip
        </button>
        <button
          onClick={onContinue}
          disabled={isProcessing}
          className="flex-1 px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
            />
          </svg>
          Continue
        </button>
      </div>

      {hasConflicts && (
        <p className="text-xs text-gray-500">
          Resolve the conflicts, stage the files, then click Continue.
        </p>
      )}
    </div>
  );
};

/**
 * Compact rebase status indicator for use in other panels
 */
interface RebaseStatusIndicatorProps {
  className?: string;
}

export const RebaseStatusIndicator: React.FC<RebaseStatusIndicatorProps> = ({ className = '' }) => {
  const isInRebase = useGitStore(selectIsInRebase);
  const rebaseProgress = useGitStore(selectRebaseProgress);

  if (!isInRebase) {
    return null;
  }

  return (
    <div className={`flex items-center gap-2 text-amber-600 ${className}`}>
      <svg className="w-3 h-3 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      <span className="text-xs">
        Rebasing
        {rebaseProgress && ` (${rebaseProgress.done}/${rebaseProgress.total})`}
      </span>
    </div>
  );
};
