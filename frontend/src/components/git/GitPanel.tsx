/**
 * Git Panel Component
 * Main panel for version control operations (Option A from design)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';
import { runWorkspaceValidation } from '@/utils/workspaceValidation';
import { GitFileList } from './GitFileList';
import { GitHistoryList } from './GitHistoryList';
import { DiffViewer } from './DiffViewer';
import { BranchSelector } from './BranchSelector';
import { BranchCreateDialog } from './BranchCreateDialog';
import { RemoteOperationsPanel } from './RemoteOperationsPanel';
import { StashPanel } from './StashPanel';
import { CherryPickDialog, CherryPickConflictPanel } from './CherryPickDialog';
import { RebasePanel, RebaseStatusIndicator } from './RebasePanel';
import { TagPanel } from './TagPanel';
import { PullRequestsPanel } from './PullRequestsPanel';
import { ValidationConfirmDialog } from '@/components/common/ValidationConfirmDialog';
import { useGitHubStore, selectIsAuthenticated } from '@/stores/githubStore';
import {
  useGitHubRepoStore,
  selectPendingChanges,
  selectSyncStatus,
} from '@/stores/githubRepoStore';
import { offlineQueueService } from '@/services/github/offlineQueueService';
import type { PendingChange } from '@/types/github-repo';
import * as Diff from 'diff';

type TabType = 'changes' | 'history' | 'remotes' | 'prs' | 'advanced';

export interface GitPanelProps {
  className?: string;
}

export const GitPanel: React.FC<GitPanelProps> = ({ className = '' }) => {
  const {
    status,
    isLoading,
    error,
    isPanelOpen,
    commits,
    isLoadingHistory,
    diffContent,
    isLoadingDiff,
    selectedCommit,
    showBranchSelector,
    isFetching,
    isPulling,
    isPushing,
    isRebasing,
    isCherryPicking,
    stashes,
  } = useGitStore();

  const isGitHubAuthenticated = useGitHubStore(selectIsAuthenticated);

  // Check if we're in GitHub repo mode (opened from URL)
  const githubRepoWorkspace = useGitHubRepoStore((state) => state.workspace);
  const isGitHubRepoMode = githubRepoWorkspace !== null;

  // GitHub repo mode pending changes
  const pendingChanges = useGitHubRepoStore(selectPendingChanges);
  const syncStatus = useGitHubRepoStore(selectSyncStatus);
  const isSyncing = syncStatus === 'syncing';

  // In GitHub repo mode, default to PRs tab since local git features aren't available
  const [activeTab, setActiveTab] = useState<TabType>(isGitHubRepoMode ? 'prs' : 'changes');

  // Auto-open panel once when entering GitHub repo mode
  const hasAutoOpenedRef = React.useRef(false);
  useEffect(() => {
    if (isGitHubRepoMode && !hasAutoOpenedRef.current) {
      hasAutoOpenedRef.current = true;
      useGitStore.getState().setPanelOpen(true);
    }
    // Reset when leaving GitHub repo mode
    if (!isGitHubRepoMode) {
      hasAutoOpenedRef.current = false;
    }
  }, [isGitHubRepoMode]);
  const [cherryPickCommit, setCherryPickCommit] = useState<typeof selectedCommit>(null);
  const [showCherryPickDialog, setShowCherryPickDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [showValidationConfirm, setShowValidationConfirm] = useState(false);
  const [validationErrorCount, setValidationErrorCount] = useState(0);
  const [validationWarningCount, setValidationWarningCount] = useState(0);

  // GitHub repo mode: selected pending change for diff viewing
  const [selectedPendingChange, setSelectedPendingChange] = useState<PendingChange | null>(null);
  const [pendingChangeDiff, setPendingChangeDiff] = useState<string | null>(null);
  const [isLoadingPendingDiff, setIsLoadingPendingDiff] = useState(false);

  const isRemoteOperationInProgress = isFetching || isPulling || isPushing;

  // Generate diff when a pending change is selected
  const handleSelectPendingChange = useCallback(
    async (change: PendingChange) => {
      // Toggle off if already selected
      if (selectedPendingChange?.id === change.id) {
        setSelectedPendingChange(null);
        setPendingChangeDiff(null);
        return;
      }

      setSelectedPendingChange(change);
      setIsLoadingPendingDiff(true);
      setPendingChangeDiff(null);

      try {
        const workspaceId = githubRepoWorkspace?.id;
        if (!workspaceId) return;

        // Get the original cached content
        const cachedFile = await offlineQueueService.getCachedFile(workspaceId, change.path);
        const originalContent = cachedFile?.content || '';
        const newContent = change.content || '';

        // Generate unified diff with context lines
        const diff = Diff.createPatch(
          change.path,
          originalContent,
          newContent,
          'original',
          'modified',
          { context: 5 } // 5 lines of context
        );

        setPendingChangeDiff(diff);
      } catch (error) {
        console.error('[GitPanel] Failed to generate diff:', error);
        setPendingChangeDiff(null);
      } finally {
        setIsLoadingPendingDiff(false);
      }
    },
    [selectedPendingChange, githubRepoWorkspace]
  );

  // Clear selected pending change when changes list updates
  useEffect(() => {
    if (selectedPendingChange) {
      const stillExists = pendingChanges.some((c) => c.id === selectedPendingChange.id);
      if (!stillExists) {
        setSelectedPendingChange(null);
        setPendingChangeDiff(null);
      }
    }
  }, [pendingChanges, selectedPendingChange]);

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history' && commits.length === 0 && status.isGitRepo) {
      gitService.loadHistory();
    }
  }, [activeTab, commits.length, status.isGitRepo]);

  // Load diff when file is selected
  useEffect(() => {
    if (selectedFile) {
      gitService.getFileDiff(selectedFile);
    } else if (activeTab === 'changes' && status.files.length > 0) {
      gitService.getDiff();
    }
  }, [selectedFile, activeTab, status.files.length]);

  // Perform the actual commit
  const performCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;

    setIsCommitting(true);
    const result = await gitService.commit(commitMessage.trim());
    setIsCommitting(false);

    if (result.success) {
      setCommitMessage('');
    }
  }, [commitMessage]);

  // Handle commit with validation check
  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;

    // Run validation before commit
    const validationResult = await runWorkspaceValidation();

    if (validationResult.hasErrors || validationResult.hasWarnings) {
      // Store validation counts and show confirmation dialog
      setValidationErrorCount(validationResult.errorCount);
      setValidationWarningCount(validationResult.warningCount);
      setShowValidationConfirm(true);
    } else {
      // No validation issues, proceed with commit
      await performCommit();
    }
  }, [commitMessage, performCommit]);

  // Handle confirmation to commit despite validation issues
  const handleConfirmCommit = useCallback(async () => {
    setShowValidationConfirm(false);
    await performCommit();
  }, [performCommit]);

  // Handle viewing validation issues
  const handleViewValidationIssues = useCallback(() => {
    setShowValidationConfirm(false);
    // The ValidationWarnings component in the header will show the issues
    // We could add additional logic here to scroll to or highlight the ValidationWarnings panel
  }, []);

  const handleDiscardAll = useCallback(async () => {
    if (!window.confirm('Discard all changes? This cannot be undone.')) {
      return;
    }
    await gitService.discardChanges();
  }, []);

  const handleRefresh = useCallback(() => {
    gitService.refreshStatus();
    if (activeTab === 'history') {
      gitService.loadHistory();
    }
    if (activeTab === 'remotes') {
      gitService.loadRemotes();
    }
    if (activeTab === 'advanced') {
      gitService.loadStashes();
      gitService.loadTags();
      gitService.loadRebaseStatus();
    }
  }, [activeTab]);

  const handleCherryPick = useCallback((commit: typeof selectedCommit) => {
    setCherryPickCommit(commit);
    setShowCherryPickDialog(true);
  }, []);

  const handleInitRepo = useCallback(async () => {
    await gitService.initRepository();
  }, []);

  const handleToggleBranchSelector = useCallback(() => {
    useGitStore.getState().setShowBranchSelector(!showBranchSelector);
  }, [showBranchSelector]);

  const handleCreateBranch = useCallback(() => {
    useGitStore.getState().setShowCreateBranchDialog(true);
  }, []);

  if (!isPanelOpen) {
    return null;
  }

  // Not a git repo and not in GitHub repo mode - show init option
  if (!status.isGitRepo && !isGitHubRepoMode) {
    return (
      <div className={`w-80 border-l border-gray-200 bg-white flex flex-col ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Version Control</h2>
          <button
            onClick={() => useGitStore.getState().setPanelOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Collapse panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <svg
            className="w-12 h-12 text-gray-300 mb-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <p className="text-sm text-gray-600 mb-4">This workspace is not a Git repository.</p>
          <button
            onClick={handleInitRepo}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Initialize Repository
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-80 border-l border-gray-200 bg-white flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900">Version Control</h2>
          {isLoading && (
            <svg className="w-4 h-4 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleRefresh}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Refresh"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
          <button
            onClick={() => useGitStore.getState().setPanelOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Collapse panel"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Branch Info */}
      <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 relative">
        <div className="flex items-center justify-between">
          <button
            onClick={handleToggleBranchSelector}
            className="flex items-center gap-2 text-sm hover:bg-gray-100 rounded px-2 py-1 -ml-2"
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
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <span className="font-medium text-gray-700">{status.currentBranch || 'HEAD'}</span>
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
          </button>
          <div className="flex items-center gap-2">
            {status.remoteName && (
              <span className="text-xs text-gray-500">
                {status.ahead > 0 && <span className="text-green-600">↑{status.ahead}</span>}
                {status.behind > 0 && (
                  <span className="text-orange-600 ml-1">↓{status.behind}</span>
                )}
              </span>
            )}
            {isRemoteOperationInProgress && (
              <svg className="w-4 h-4 text-blue-500 animate-spin" fill="none" viewBox="0 0 24 24">
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
            )}
          </div>
        </div>
        <RebaseStatusIndicator className="mt-1" />
        <BranchSelector onCreateBranch={handleCreateBranch} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('changes')}
          className={`flex-1 px-2 py-2 text-xs font-medium ${
            activeTab === 'changes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Changes
          {/* Show count from pending changes in GitHub repo mode, otherwise local git status */}
          {(isGitHubRepoMode ? pendingChanges.length : status.files.length) > 0 && (
            <span className="ml-1 px-1 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {isGitHubRepoMode ? pendingChanges.length : status.files.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-2 py-2 text-xs font-medium ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('prs')}
          className={`flex-1 px-2 py-2 text-xs font-medium ${
            activeTab === 'prs'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          PRs
          {isGitHubAuthenticated && (
            <span className="ml-1 w-1.5 h-1.5 bg-green-500 rounded-full inline-block" />
          )}
        </button>
        <button
          onClick={() => setActiveTab('remotes')}
          className={`flex-1 px-2 py-2 text-xs font-medium ${
            activeTab === 'remotes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sync
        </button>
        <button
          onClick={() => setActiveTab('advanced')}
          className={`flex-1 px-2 py-2 text-xs font-medium ${
            activeTab === 'advanced'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          More
          {(stashes.length > 0 || isRebasing || isCherryPicking) && (
            <span className="ml-1 w-1.5 h-1.5 bg-amber-500 rounded-full inline-block" />
          )}
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="px-4 py-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'changes' ? (
          isGitHubRepoMode ? (
            /* GitHub Repo Mode - Show pending changes */
            <>
              <div className="flex-1 overflow-y-auto">
                {pendingChanges.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                    <svg
                      className="w-12 h-12 text-gray-300 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm">No pending changes</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Changes will appear here when you edit the workspace
                    </p>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-100">
                    {pendingChanges.map((change: PendingChange) => (
                      <li
                        key={change.id}
                        className={`px-3 py-2 flex items-center gap-2 hover:bg-gray-50 cursor-pointer ${
                          selectedPendingChange?.id === change.id
                            ? 'bg-blue-50 border-l-2 border-blue-500'
                            : ''
                        }`}
                        onClick={() => handleSelectPendingChange(change)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            handleSelectPendingChange(change);
                          }
                        }}
                        role="button"
                        tabIndex={0}
                      >
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded text-xs font-bold ${
                            change.action === 'create'
                              ? 'text-green-600 bg-green-100'
                              : change.action === 'update'
                                ? 'text-yellow-600 bg-yellow-100'
                                : 'text-red-600 bg-red-100'
                          }`}
                        >
                          {change.action === 'create'
                            ? '+'
                            : change.action === 'update'
                              ? '~'
                              : '-'}
                        </span>
                        <span className="flex-1 text-sm text-gray-700 truncate" title={change.path}>
                          {change.path}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(change.timestamp).toLocaleTimeString()}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Diff viewer for selected pending change */}
              {selectedPendingChange && (
                <div className="h-64 border-t border-gray-200 overflow-hidden flex flex-col">
                  <DiffViewer
                    diff={pendingChangeDiff || ''}
                    isLoading={isLoadingPendingDiff}
                    fileName={selectedPendingChange.path}
                  />
                </div>
              )}

              {/* Sync section for GitHub repo mode */}
              {pendingChanges.length > 0 && (
                <div className="border-t border-gray-200 p-3">
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        if (!commitMessage.trim()) return;
                        await useGitHubRepoStore.getState().pushChanges(commitMessage.trim());
                        setCommitMessage('');
                      }}
                      disabled={!commitMessage.trim() || isSyncing}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSyncing ? 'Syncing...' : 'Commit & Push'}
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Local Git Mode - Show local git status */
            <>
              {/* File list */}
              <div className="flex-1 overflow-y-auto">
                {status.files.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                    <svg
                      className="w-12 h-12 text-gray-300 mb-2"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="text-sm">No changes</p>
                  </div>
                ) : (
                  <GitFileList
                    files={status.files}
                    selectedFile={selectedFile}
                    onSelectFile={setSelectedFile}
                  />
                )}
              </div>

              {/* Diff viewer */}
              {(selectedFile || status.files.length > 0) && diffContent && (
                <div className="h-48 border-t border-gray-200 overflow-hidden">
                  <DiffViewer
                    diff={diffContent}
                    isLoading={isLoadingDiff}
                    fileName={selectedFile || undefined}
                  />
                </div>
              )}

              {/* Commit section */}
              {status.files.length > 0 && (
                <div className="border-t border-gray-200 p-3">
                  <textarea
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    placeholder="Commit message..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={2}
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={handleCommit}
                      disabled={!commitMessage.trim() || isCommitting}
                      className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isCommitting ? 'Committing...' : 'Commit'}
                    </button>
                    <button
                      onClick={handleDiscardAll}
                      className="px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-md hover:bg-red-50"
                      title="Discard all changes"
                    >
                      Discard
                    </button>
                  </div>
                </div>
              )}
            </>
          )
        ) : activeTab === 'history' ? (
          /* History tab */
          <div className="flex-1 overflow-y-auto">
            {isLoadingHistory ? (
              <div className="flex items-center justify-center h-32">
                <svg className="w-6 h-6 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
            ) : commits.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 p-4">
                <svg
                  className="w-12 h-12 text-gray-300 mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-sm">No commits yet</p>
              </div>
            ) : (
              <GitHistoryList
                commits={commits}
                selectedCommit={selectedCommit}
                onSelectCommit={(commit) => useGitStore.getState().setSelectedCommit(commit)}
                onCherryPick={handleCherryPick}
                onRevert={async (commit) => {
                  if (
                    window.confirm(
                      `Revert commit "${commit.message}"? This will create a new commit undoing the changes.`
                    )
                  ) {
                    await gitService.revert(commit.hash);
                  }
                }}
              />
            )}
          </div>
        ) : activeTab === 'prs' ? (
          /* Pull Requests tab */
          <PullRequestsPanel className="flex-1" />
        ) : activeTab === 'advanced' ? (
          /* Advanced tab - Stash, Tags, Rebase, Cherry-pick */
          <div className="flex-1 overflow-y-auto">
            {/* Cherry-pick conflict panel */}
            <CherryPickConflictPanel className="px-3 pt-3" />

            {/* Stash Panel */}
            <div className="border-b">
              <StashPanel />
            </div>

            {/* Tag Panel */}
            <div className="border-b">
              <TagPanel />
            </div>

            {/* Rebase Panel */}
            <div>
              <div className="px-3 py-2 border-b bg-gray-50">
                <span className="text-sm font-medium text-gray-700">Rebase</span>
              </div>
              <RebasePanel />
            </div>
          </div>
        ) : (
          /* Remotes/Sync tab */
          <div className="flex-1 overflow-y-auto">
            <RemoteOperationsPanel />
          </div>
        )}
      </div>

      {/* Branch Create Dialog */}
      <BranchCreateDialog />

      {/* Cherry-pick Dialog */}
      <CherryPickDialog
        open={showCherryPickDialog}
        onOpenChange={setShowCherryPickDialog}
        commit={cherryPickCommit}
      />

      {/* Validation Confirmation Dialog */}
      <ValidationConfirmDialog
        isOpen={showValidationConfirm}
        onClose={() => setShowValidationConfirm(false)}
        onConfirm={handleConfirmCommit}
        onViewIssues={handleViewValidationIssues}
        errorCount={validationErrorCount}
        warningCount={validationWarningCount}
        title="Validation Issues Found"
        message="There are validation issues in the workspace. Do you want to commit anyway?"
        confirmLabel="Commit"
      />
    </div>
  );
};
