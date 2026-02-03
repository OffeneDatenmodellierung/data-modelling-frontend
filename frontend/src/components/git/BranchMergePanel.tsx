/**
 * Branch Merge Panel Component
 * Allows merging branches together in GitHub repo mode
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubBranch } from '@/types/github';

export interface BranchMergePanelProps {
  className?: string;
}

export const BranchMergePanel: React.FC<BranchMergePanelProps> = ({ className = '' }) => {
  const workspace = useGitHubRepoStore((state) => state.workspace);
  const switchBranch = useGitHubRepoStore((state) => state.switchBranch);

  const [isExpanded, setIsExpanded] = useState(false);
  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [isMerging, setIsMerging] = useState(false);

  // Merge form state
  const [baseBranch, setBaseBranch] = useState('');
  const [headBranch, setHeadBranch] = useState('');
  const [commitMessage, setCommitMessage] = useState('');

  // Quick action states
  const [quickAction, setQuickAction] = useState<'none' | 'update-current' | 'update-main'>('none');

  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(
    null
  );

  // Load branches when panel expands
  useEffect(() => {
    if (isExpanded && workspace) {
      loadBranches();
    }
  }, [isExpanded, workspace]);

  // Set defaults when branches load
  useEffect(() => {
    if (branches.length > 0 && workspace) {
      // Default base to current branch
      setBaseBranch(workspace.branch);
      // Default head to main/master if not current
      const mainBranch = branches.find((b) => b.name === 'main' || b.name === 'master');
      if (mainBranch && mainBranch.name !== workspace.branch) {
        setHeadBranch(mainBranch.name);
      } else {
        // Pick first branch that's not current
        const otherBranch = branches.find((b) => b.name !== workspace.branch);
        setHeadBranch(otherBranch?.name || '');
      }
    }
  }, [branches, workspace]);

  const loadBranches = useCallback(async () => {
    if (!workspace) return;

    setIsLoadingBranches(true);
    try {
      const branchList = await githubApi.listBranches(workspace.owner, workspace.repo);
      setBranches(branchList);
    } catch (err) {
      console.error('Failed to load branches:', err);
      setMessage({ type: 'error', text: 'Failed to load branches' });
    } finally {
      setIsLoadingBranches(false);
    }
  }, [workspace]);

  const handleMerge = useCallback(async () => {
    if (!workspace || !baseBranch || !headBranch) return;

    if (baseBranch === headBranch) {
      setMessage({ type: 'error', text: 'Cannot merge a branch into itself' });
      return;
    }

    setIsMerging(true);
    setMessage(null);

    try {
      const result = await githubApi.mergeBranches(workspace.owner, workspace.repo, {
        base: baseBranch,
        head: headBranch,
        commit_message: commitMessage || `Merge ${headBranch} into ${baseBranch}`,
      });

      if (result.merged) {
        setMessage({
          type: 'success',
          text: `Successfully merged ${headBranch} into ${baseBranch}`,
        });

        // If we merged into current branch, refresh the workspace
        if (baseBranch === workspace.branch) {
          // Trigger a reload by switching to the same branch
          await switchBranch(workspace.branch);
        }

        // Clear form
        setCommitMessage('');
        setQuickAction('none');
      } else {
        setMessage({ type: 'info', text: result.message || 'Merge completed' });
      }
    } catch (err: any) {
      // Handle specific error cases
      if (err?.response?.status === 409) {
        setMessage({
          type: 'error',
          text: 'Merge conflict: The branches have conflicting changes that must be resolved manually.',
        });
      } else if (err?.response?.status === 404) {
        setMessage({ type: 'error', text: 'Branch not found. Please refresh the branch list.' });
      } else {
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to merge branches',
        });
      }
    } finally {
      setIsMerging(false);
    }
  }, [workspace, baseBranch, headBranch, commitMessage, switchBranch]);

  // Quick action handlers
  const handleQuickAction = useCallback(
    (action: 'update-current' | 'update-main') => {
      if (!workspace) return;

      const mainBranch = branches.find((b) => b.name === 'main' || b.name === 'master')?.name;

      if (action === 'update-current' && mainBranch) {
        // Update current branch with main
        setBaseBranch(workspace.branch);
        setHeadBranch(mainBranch);
        setCommitMessage(`Merge ${mainBranch} into ${workspace.branch}`);
        setQuickAction('update-current');
      } else if (action === 'update-main' && mainBranch) {
        // Update main with current branch
        setBaseBranch(mainBranch);
        setHeadBranch(workspace.branch);
        setCommitMessage(`Merge ${workspace.branch} into ${mainBranch}`);
        setQuickAction('update-main');
      }
    },
    [workspace, branches]
  );

  // Only show in GitHub repo mode
  if (!workspace) {
    return null;
  }

  const mainBranch = branches.find((b) => b.name === 'main' || b.name === 'master')?.name;
  const isOnMain = workspace.branch === mainBranch;

  return (
    <div className={className}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-3 py-2 flex items-center justify-between bg-gray-50 hover:bg-gray-100 border-b"
      >
        <span className="text-sm font-medium text-gray-700">Merge Branches</span>
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-3 py-3 space-y-4">
          {/* Message */}
          {message && (
            <div
              className={`px-3 py-2 text-xs rounded ${
                message.type === 'success'
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : message.type === 'error'
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {message.text}
            </div>
          )}

          {/* Quick Actions */}
          {mainBranch && (
            <div className="space-y-2">
              <span className="text-xs font-medium text-gray-600">Quick Actions</span>
              <div className="flex gap-2">
                {!isOnMain && (
                  <button
                    onClick={() => handleQuickAction('update-current')}
                    disabled={isMerging || isLoadingBranches}
                    className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                      quickAction === 'update-current'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Update Current</div>
                    <div className="text-gray-500 mt-0.5">
                      {mainBranch} → {workspace.branch}
                    </div>
                  </button>
                )}
                {!isOnMain && (
                  <button
                    onClick={() => handleQuickAction('update-main')}
                    disabled={isMerging || isLoadingBranches}
                    className={`flex-1 px-3 py-2 text-xs rounded border transition-colors ${
                      quickAction === 'update-main'
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">Merge to {mainBranch}</div>
                    <div className="text-gray-500 mt-0.5">
                      {workspace.branch} → {mainBranch}
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Manual Merge Form */}
          <div className="space-y-3 pt-2 border-t">
            <span className="text-xs font-medium text-gray-600">Custom Merge</span>

            {/* Base Branch (target) */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Merge into (base)</label>
              <select
                value={baseBranch}
                onChange={(e) => {
                  setBaseBranch(e.target.value);
                  setQuickAction('none');
                }}
                disabled={isLoadingBranches || isMerging}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select branch...</option>
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                    {branch.name === workspace.branch ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Head Branch (source) */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Merge from (head)</label>
              <select
                value={headBranch}
                onChange={(e) => {
                  setHeadBranch(e.target.value);
                  setQuickAction('none');
                }}
                disabled={isLoadingBranches || isMerging}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">Select branch...</option>
                {branches.map((branch) => (
                  <option key={branch.name} value={branch.name}>
                    {branch.name}
                    {branch.name === workspace.branch ? ' (current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Commit Message */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Commit message (optional)</label>
              <input
                type="text"
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder={`Merge ${headBranch || 'branch'} into ${baseBranch || 'branch'}`}
                disabled={isMerging}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            {/* Merge Preview */}
            {baseBranch && headBranch && baseBranch !== headBranch && (
              <div className="flex items-center justify-center gap-2 py-2 text-xs text-gray-600">
                <code className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{headBranch}</code>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
                <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">{baseBranch}</code>
              </div>
            )}

            {/* Merge Button */}
            <button
              onClick={handleMerge}
              disabled={isMerging || !baseBranch || !headBranch || baseBranch === headBranch}
              className="w-full px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isMerging ? (
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
                  Merging...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                    <path
                      fillRule="evenodd"
                      d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
                    />
                  </svg>
                  Merge Branches
                </>
              )}
            </button>
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-500 pt-2 border-t">
            Merging combines changes from one branch into another. If there are conflicts, you'll
            need to resolve them manually.
          </p>
        </div>
      )}
    </div>
  );
};

export default BranchMergePanel;
