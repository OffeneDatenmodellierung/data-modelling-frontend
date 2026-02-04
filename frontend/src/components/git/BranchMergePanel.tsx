/**
 * Branch Merge Panel Component
 * Allows merging branches together in GitHub repo mode
 * Includes conflict resolution UI
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubBranch } from '@/types/github';
import { MergeConflictResolver, type ConflictFile } from './MergeConflictResolver';

export interface BranchMergePanelProps {
  className?: string;
}

interface ConflictState {
  baseBranch: string;
  headBranch: string;
  files: ConflictFile[];
  currentFileIndex: number;
  resolvedFiles: Map<string, string>; // path -> resolved content
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

  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | 'conflict';
    text: string;
  } | null>(null);

  // Conflict resolution state
  const [conflictState, setConflictState] = useState<ConflictState | null>(null);
  const [isLoadingConflicts, setIsLoadingConflicts] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);

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

  // Load conflicting files for resolution
  const loadConflictingFiles = useCallback(async () => {
    if (!workspace || !baseBranch || !headBranch) return;

    setIsLoadingConflicts(true);
    try {
      // Get the comparison between branches to find changed files
      const comparison = await githubApi.compareBranches(
        workspace.owner,
        workspace.repo,
        baseBranch,
        headBranch
      );

      // Get all changed files that might have conflicts
      const changedFiles = comparison.files || [];

      // For each changed file, fetch both versions
      const conflictFiles: ConflictFile[] = [];

      for (const file of changedFiles) {
        // Skip deleted files
        if (file.status === 'removed') continue;

        try {
          const contents = await githubApi.getConflictFileContents(
            workspace.owner,
            workspace.repo,
            file.filename,
            baseBranch,
            headBranch
          );

          conflictFiles.push({
            path: file.filename,
            oursContent: contents.oursContent,
            theirsContent: contents.theirsContent,
          });
        } catch (err) {
          // File might not exist in one branch (added/deleted)
          console.warn(`Could not load file ${file.filename} for conflict resolution:`, err);
        }
      }

      if (conflictFiles.length === 0) {
        setMessage({
          type: 'error',
          text: 'Could not identify conflicting files. Please resolve conflicts locally.',
        });
        return;
      }

      setConflictState({
        baseBranch,
        headBranch,
        files: conflictFiles,
        currentFileIndex: 0,
        resolvedFiles: new Map(),
      });
      setShowConflictResolver(true);
    } catch (err) {
      console.error('Failed to load conflicting files:', err);
      setMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to load conflicting files',
      });
    } finally {
      setIsLoadingConflicts(false);
    }
  }, [workspace, baseBranch, headBranch]);

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
    } catch (err: unknown) {
      // Handle specific error cases
      const errorObj = err as { response?: { status?: number } };
      if (errorObj?.response?.status === 409) {
        setMessage({
          type: 'conflict',
          text: 'Merge conflict detected. Click "Resolve Conflicts" to manually resolve the differences.',
        });
      } else if (errorObj?.response?.status === 404) {
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

  // Handle file resolution
  const handleFileResolved = useCallback(
    (resolvedContent: string) => {
      if (!conflictState) return;

      const currentFile = conflictState.files[conflictState.currentFileIndex];
      if (!currentFile) return;

      const newResolvedFiles = new Map(conflictState.resolvedFiles);
      newResolvedFiles.set(currentFile.path, resolvedContent);

      // Move to next file or finish
      if (conflictState.currentFileIndex < conflictState.files.length - 1) {
        setConflictState({
          ...conflictState,
          currentFileIndex: conflictState.currentFileIndex + 1,
          resolvedFiles: newResolvedFiles,
        });
      } else {
        // All files resolved - commit them
        commitResolvedFiles(newResolvedFiles);
      }
    },
    [conflictState]
  );

  // Commit resolved files
  const commitResolvedFiles = useCallback(
    async (resolvedFiles: Map<string, string>) => {
      if (!workspace || !conflictState) return;

      setShowConflictResolver(false);
      setIsMerging(true);
      setMessage({ type: 'info', text: 'Committing resolved files...' });

      try {
        // Commit each resolved file to the base branch
        for (const [path, content] of resolvedFiles) {
          // Get the current file SHA
          const fileContent = await githubApi.getContent(
            workspace.owner,
            workspace.repo,
            path,
            conflictState.baseBranch
          );

          if (Array.isArray(fileContent)) {
            throw new Error(`Path "${path}" is a directory`);
          }

          // Update the file
          await githubApi.createOrUpdateFile(workspace.owner, workspace.repo, path, {
            message: `Resolve merge conflict in ${path}`,
            content: btoa(content), // Base64 encode
            sha: fileContent.sha,
            branch: conflictState.baseBranch,
          });
        }

        // Now try the merge again
        const result = await githubApi.mergeBranches(workspace.owner, workspace.repo, {
          base: conflictState.baseBranch,
          head: conflictState.headBranch,
          commit_message:
            commitMessage ||
            `Merge ${conflictState.headBranch} into ${conflictState.baseBranch} (conflicts resolved)`,
        });

        if (result.merged) {
          setMessage({
            type: 'success',
            text: `Conflicts resolved and merged ${conflictState.headBranch} into ${conflictState.baseBranch}`,
          });

          // If we merged into current branch, refresh the workspace
          if (conflictState.baseBranch === workspace.branch) {
            await switchBranch(workspace.branch);
          }

          // Clear form
          setCommitMessage('');
          setQuickAction('none');
        } else {
          setMessage({
            type: 'info',
            text: 'Conflicts resolved. Files updated on base branch.',
          });
        }
      } catch (err) {
        console.error('Failed to commit resolved files:', err);
        setMessage({
          type: 'error',
          text: err instanceof Error ? err.message : 'Failed to commit resolved files',
        });
      } finally {
        setIsMerging(false);
        setConflictState(null);
      }
    },
    [workspace, conflictState, commitMessage, switchBranch]
  );

  // Cancel conflict resolution
  const handleCancelConflictResolution = useCallback(() => {
    setShowConflictResolver(false);
    setConflictState(null);
  }, []);

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

  // Show conflict resolver modal
  if (showConflictResolver && conflictState) {
    const currentFile = conflictState.files[conflictState.currentFileIndex];
    if (!currentFile) {
      return null;
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="w-[90vw] h-[85vh] bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          {/* Modal header */}
          <div className="px-4 py-3 bg-gray-100 border-b flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">
                Resolving conflicts: {conflictState.currentFileIndex + 1} of{' '}
                {conflictState.files.length}
              </span>
              <div className="flex gap-1">
                {conflictState.files.map((_, idx) => (
                  <span
                    key={idx}
                    className={`w-2 h-2 rounded-full ${
                      idx < conflictState.currentFileIndex
                        ? 'bg-green-500'
                        : idx === conflictState.currentFileIndex
                          ? 'bg-blue-500'
                          : 'bg-gray-300'
                    }`}
                  />
                ))}
              </div>
            </div>
            <button
              onClick={handleCancelConflictResolution}
              className="text-gray-500 hover:text-gray-700"
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

          {/* Conflict resolver */}
          <div className="flex-1 overflow-hidden">
            <MergeConflictResolver
              file={currentFile}
              oursBranch={conflictState.baseBranch}
              theirsBranch={conflictState.headBranch}
              onResolve={handleFileResolved}
              onCancel={handleCancelConflictResolution}
            />
          </div>
        </div>
      </div>
    );
  }

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
                    : message.type === 'conflict'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200'
                      : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              <div>{message.text}</div>
              {message.type === 'conflict' && (
                <button
                  onClick={loadConflictingFiles}
                  disabled={isLoadingConflicts}
                  className="mt-2 px-3 py-1.5 bg-orange-600 text-white text-xs rounded hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                >
                  {isLoadingConflicts ? (
                    <>
                      <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
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
                      Loading conflicts...
                    </>
                  ) : (
                    <>
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M8 0a8 8 0 1 1 0 16A8 8 0 0 1 8 0zM4.5 7.5a.5.5 0 0 0 0 1h5.793l-2.147 2.146a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 1 0-.708.708L10.293 7.5H4.5z" />
                      </svg>
                      Resolve Conflicts
                    </>
                  )}
                </button>
              )}
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
                  setMessage(null);
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
                  setMessage(null);
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
                <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                  {baseBranch}
                </code>
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
            Merging combines changes from one branch into another. If there are conflicts, you can
            resolve them using the built-in conflict resolver.
          </p>
        </div>
      )}
    </div>
  );
};

export default BranchMergePanel;
