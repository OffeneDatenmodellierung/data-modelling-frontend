/**
 * Git Panel Component
 * Main panel for version control operations (Option A from design)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useGitStore } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';
import { GitFileList } from './GitFileList';
import { GitHistoryList } from './GitHistoryList';
import { DiffViewer } from './DiffViewer';
import { BranchSelector } from './BranchSelector';
import { BranchCreateDialog } from './BranchCreateDialog';
import { RemoteOperationsPanel } from './RemoteOperationsPanel';

type TabType = 'changes' | 'history' | 'remotes';

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
  } = useGitStore();

  const [activeTab, setActiveTab] = useState<TabType>('changes');
  const [commitMessage, setCommitMessage] = useState('');
  const [isCommitting, setIsCommitting] = useState(false);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const isRemoteOperationInProgress = isFetching || isPulling || isPushing;

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

  const handleCommit = useCallback(async () => {
    if (!commitMessage.trim()) return;

    setIsCommitting(true);
    const result = await gitService.commit(commitMessage.trim());
    setIsCommitting(false);

    if (result.success) {
      setCommitMessage('');
    }
  }, [commitMessage]);

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
  }, [activeTab]);

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

  // Not a git repo - show init option
  if (!status.isGitRepo) {
    return (
      <div className={`w-80 border-l border-gray-200 bg-white flex flex-col ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-sm font-semibold text-gray-900">Version Control</h2>
          <button
            onClick={() => useGitStore.getState().setPanelOpen(false)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Close panel"
          >
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
            title="Close panel"
          >
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
        <BranchSelector onCreateBranch={handleCreateBranch} />
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('changes')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'changes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Changes
          {status.files.length > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
              {status.files.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          History
        </button>
        <button
          onClick={() => setActiveTab('remotes')}
          className={`flex-1 px-3 py-2 text-sm font-medium ${
            activeTab === 'remotes'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Sync
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
              />
            )}
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
    </div>
  );
};
