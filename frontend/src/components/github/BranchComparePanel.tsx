/**
 * Branch Compare Panel Component
 * Compare two branches, view differences, and merge/update
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectBranchComparison,
  selectIsLoadingComparison,
  selectComparisonError,
} from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { BranchComparison } from '@/types/github';

export interface BranchComparePanelProps {
  baseBranch: string;
  headBranch: string;
  onClose?: () => void;
  onMergeComplete?: () => void;
  className?: string;
}

export const BranchComparePanel: React.FC<BranchComparePanelProps> = ({
  baseBranch,
  headBranch,
  onClose,
  onMergeComplete: _onMergeComplete,
  className = '',
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connection = useGitHubStore((state) => state.connection);
  const comparison = useGitHubStore(selectBranchComparison);
  const isLoading = useGitHubStore(selectIsLoadingComparison);
  const error = useGitHubStore(selectComparisonError);

  const setBranchComparison = useGitHubStore((state) => state.setBranchComparison);
  const setLoadingComparison = useGitHubStore((state) => state.setLoadingComparison);
  const setComparisonError = useGitHubStore((state) => state.setComparisonError);

  const [activeTab, setActiveTab] = useState<'commits' | 'files'>('commits');
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  // Load comparison data
  const loadComparison = useCallback(async () => {
    if (!connection) return;

    setLoadingComparison(true);
    setComparisonError(null);

    try {
      const data = await githubApi.compareBranches(
        connection.owner,
        connection.repo,
        baseBranch,
        headBranch
      );

      const branchComparison: BranchComparison = {
        status: data.status,
        aheadBy: data.ahead_by,
        behindBy: data.behind_by,
        totalCommits: data.total_commits,
        commits: data.commits.map((c) => ({
          sha: c.sha,
          shortSha: c.sha.substring(0, 7),
          message: c.commit.message?.split('\n')[0] || 'No message',
          author: c.commit.author?.name || 'Unknown',
          date: c.commit.author?.date || '',
        })),
        files: data.files.map((f) => ({
          filename: f.filename,
          status: f.status,
          additions: f.additions,
          deletions: f.deletions,
        })),
      };

      setBranchComparison(branchComparison);
    } catch (err) {
      setComparisonError(err instanceof Error ? err.message : 'Failed to compare branches');
    }
  }, [
    connection,
    baseBranch,
    headBranch,
    setBranchComparison,
    setLoadingComparison,
    setComparisonError,
  ]);

  // Load comparison on mount
  useEffect(() => {
    if (isConnected) {
      loadComparison();
    }
  }, [isConnected, loadComparison]);

  // Toggle file expansion
  const toggleFile = (filename: string) => {
    setExpandedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(filename)) {
        next.delete(filename);
      } else {
        next.add(filename);
      }
      return next;
    });
  };

  // Format relative time
  const formatRelativeTime = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  // Get status indicator
  const getStatusIndicator = () => {
    if (!comparison) return null;

    switch (comparison.status) {
      case 'identical':
        return (
          <div className="flex items-center gap-2 text-green-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
            <span>Branches are identical</span>
          </div>
        );
      case 'ahead':
        return (
          <div className="text-blue-600">
            <span className="font-medium">{comparison.aheadBy}</span> commit
            {comparison.aheadBy !== 1 ? 's' : ''} ahead
          </div>
        );
      case 'behind':
        return (
          <div className="text-orange-600">
            <span className="font-medium">{comparison.behindBy}</span> commit
            {comparison.behindBy !== 1 ? 's' : ''} behind
          </div>
        );
      case 'diverged':
        return (
          <div className="flex items-center gap-4">
            <span className="text-blue-600">
              <span className="font-medium">{comparison.aheadBy}</span> ahead
            </span>
            <span className="text-orange-600">
              <span className="font-medium">{comparison.behindBy}</span> behind
            </span>
          </div>
        );
    }
  };

  if (!isConnected) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Compare Branches</h2>
          {onClose && (
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600">
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

        {/* Branch comparison visual */}
        <div className="mt-3 flex items-center justify-center gap-3">
          <code className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-sm font-mono">
            {baseBranch}
          </code>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M14 5l7 7m0 0l-7 7m7-7H3"
            />
          </svg>
          <code className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-sm font-mono">
            {headBranch}
          </code>
        </div>

        {/* Status indicator */}
        {!isLoading && comparison && (
          <div className="mt-3 flex items-center justify-center text-sm">
            {getStatusIndicator()}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <svg className="w-8 h-8 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
        ) : error ? (
          <div className="flex-1 flex items-center justify-center p-4">
            <div className="text-center">
              <div className="text-red-600 mb-2">{error}</div>
              <button onClick={loadComparison} className="text-sm text-blue-600 hover:underline">
                Retry
              </button>
            </div>
          </div>
        ) : comparison ? (
          <>
            {/* Tabs */}
            <div className="px-4 border-b border-gray-200">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('commits')}
                  className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'commits'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Commits
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                    {comparison.commits.length}
                  </span>
                </button>
                <button
                  onClick={() => setActiveTab('files')}
                  className={`py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'files'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Files
                  <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                    {comparison.files.length}
                  </span>
                </button>
              </div>
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto">
              {activeTab === 'commits' ? (
                <CommitsTab commits={comparison.commits} formatRelativeTime={formatRelativeTime} />
              ) : (
                <FilesTab
                  files={comparison.files}
                  expandedFiles={expandedFiles}
                  onToggleFile={toggleFile}
                />
              )}
            </div>
          </>
        ) : null}
      </div>

      {/* Footer - Summary and actions */}
      {comparison && comparison.status !== 'identical' && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          {/* Summary */}
          <div className="mb-3 flex items-center justify-center gap-4 text-sm">
            <span className="text-gray-600">
              <span className="font-medium">{comparison.files.length}</span> file
              {comparison.files.length !== 1 ? 's' : ''} changed
            </span>
            <span className="text-green-600">
              +{comparison.files.reduce((sum, f) => sum + f.additions, 0)}
            </span>
            <span className="text-red-600">
              -{comparison.files.reduce((sum, f) => sum + f.deletions, 0)}
            </span>
          </div>

          {/* Info about updating */}
          {comparison.behindBy > 0 && (
            <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
              <strong>{headBranch}</strong> is {comparison.behindBy} commit
              {comparison.behindBy !== 1 ? 's' : ''} behind <strong>{baseBranch}</strong>. Consider
              updating your branch.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Commits Tab
// ============================================================================

interface CommitsTabProps {
  commits: BranchComparison['commits'];
  formatRelativeTime: (date: string) => string;
}

const CommitsTab: React.FC<CommitsTabProps> = ({ commits, formatRelativeTime }) => {
  if (commits.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No commits to show</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {commits.map((commit) => (
        <div key={commit.sha} className="px-4 py-3 hover:bg-gray-50">
          <div className="flex items-start gap-3">
            {/* Commit icon */}
            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>

            <div className="flex-1 min-w-0">
              {/* Commit message */}
              <p className="text-sm font-medium text-gray-900 truncate">{commit.message}</p>

              {/* Meta info */}
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                <code className="font-mono text-blue-600">{commit.shortSha}</code>
                <span>•</span>
                <span>{commit.author}</span>
                <span>•</span>
                <span>{formatRelativeTime(commit.date)}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Files Tab
// ============================================================================

interface FilesTabProps {
  files: BranchComparison['files'];
  expandedFiles: Set<string>;
  onToggleFile: (filename: string) => void;
}

const FilesTab: React.FC<FilesTabProps> = ({ files, expandedFiles, onToggleFile }) => {
  if (files.length === 0) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p>No files changed</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'added':
        return 'text-green-600 bg-green-50';
      case 'removed':
        return 'text-red-600 bg-red-50';
      case 'modified':
        return 'text-yellow-600 bg-yellow-50';
      case 'renamed':
        return 'text-blue-600 bg-blue-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {files.map((file) => (
        <div key={file.filename} className="hover:bg-gray-50">
          <button
            onClick={() => onToggleFile(file.filename)}
            className="w-full px-4 py-2 flex items-center gap-2 text-left"
          >
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${
                expandedFiles.has(file.filename) ? 'rotate-90' : ''
              }`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>

            <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor(file.status)}`}>
              {file.status}
            </span>

            <span className="flex-1 font-mono text-sm text-gray-900 truncate">{file.filename}</span>

            <span className="text-xs text-green-600">+{file.additions}</span>
            <span className="text-xs text-red-600">-{file.deletions}</span>
          </button>
        </div>
      ))}
    </div>
  );
};

export default BranchComparePanel;
