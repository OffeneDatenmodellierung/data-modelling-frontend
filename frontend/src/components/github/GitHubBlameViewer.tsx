/**
 * GitHub Blame Viewer Component
 * Display blame/annotate information for a file
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectConnectionInfo,
  selectBlameResult,
  selectBlameFilePath,
  selectIsLoadingBlame,
  selectBlameError,
} from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubBlameLine } from '@/types/github';

export interface GitHubBlameViewerProps {
  className?: string;
  initialFilePath?: string;
}

export const GitHubBlameViewer: React.FC<GitHubBlameViewerProps> = ({
  className = '',
  initialFilePath,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connectionInfo = useGitHubStore(selectConnectionInfo);
  const connection = useGitHubStore((state) => state.connection);
  const blameResult = useGitHubStore(selectBlameResult);
  const blameFilePath = useGitHubStore(selectBlameFilePath);
  const isLoading = useGitHubStore(selectIsLoadingBlame);
  const error = useGitHubStore(selectBlameError);

  const setBlameResult = useGitHubStore((state) => state.setBlameResult);
  const setLoadingBlame = useGitHubStore((state) => state.setLoadingBlame);
  const setBlameError = useGitHubStore((state) => state.setBlameError);
  const clearBlame = useGitHubStore((state) => state.clearBlame);

  const [filePath, setFilePath] = useState(initialFilePath || '');
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);

  // Load blame for a file
  const loadBlame = useCallback(async () => {
    if (!connection || !filePath.trim()) return;

    setLoadingBlame(true);
    setBlameError(null);

    try {
      const result = await githubApi.getBlame(
        connection.owner,
        connection.repo,
        filePath.trim(),
        connection.branch
      );
      setBlameResult(result, filePath.trim());
    } catch (err) {
      setBlameError(err instanceof Error ? err.message : 'Failed to load blame');
    }
  }, [connection, filePath, setBlameResult, setLoadingBlame, setBlameError]);

  // Generate consistent color for author
  const getAuthorColor = useCallback((author: string): string => {
    let hash = 0;
    for (let i = 0; i < author.length; i++) {
      hash = author.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colors: string[] = [
      'bg-blue-100 text-blue-800',
      'bg-green-100 text-green-800',
      'bg-purple-100 text-purple-800',
      'bg-orange-100 text-orange-800',
      'bg-pink-100 text-pink-800',
      'bg-cyan-100 text-cyan-800',
      'bg-yellow-100 text-yellow-800',
      'bg-indigo-100 text-indigo-800',
    ];
    const index = Math.abs(hash) % colors.length;
    return colors[index] as string;
  }, []);

  // Calculate author statistics
  const authorStats = useMemo(() => {
    if (!blameResult) return [];

    const stats = new Map<string, { count: number; email: string }>();
    for (const line of blameResult.lines) {
      const existing = stats.get(line.commit.author) || {
        count: 0,
        email: line.commit.authorEmail,
      };
      stats.set(line.commit.author, { count: existing.count + 1, email: existing.email });
    }

    return Array.from(stats.entries())
      .map(([author, data]) => ({
        author,
        email: data.email,
        count: data.count,
        percentage: Math.round((data.count / blameResult.lines.length) * 100),
      }))
      .sort((a, b) => b.count - a.count);
  }, [blameResult]);

  // Get selected line details
  const selectedLineDetails = useMemo(() => {
    if (!blameResult || selectedLine === null) return null;
    return blameResult.lines.find((l) => l.lineNumber === selectedLine);
  }, [blameResult, selectedLine]);

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return (
      date.toLocaleDateString() +
      ' ' +
      date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    );
  };

  // Format relative date
  const formatRelativeDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  };

  // Handle line click
  const handleLineClick = (line: GitHubBlameLine) => {
    setSelectedLine(line.lineNumber);
    setSelectedCommit(line.commit.sha);
  };

  // Handle form submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadBlame();
  };

  if (!isConnected) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Connect a GitHub repository to view file blame
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">File Blame</h3>
            <p className="text-xs text-gray-500">{connectionInfo?.fullName}</p>
          </div>
          {blameResult && (
            <button
              onClick={clearBlame}
              className="p-1.5 text-gray-400 hover:text-gray-600"
              title="Clear"
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
          )}
        </div>

        {/* File path input */}
        <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
          <input
            type="text"
            placeholder="Enter file path (e.g., src/index.ts)"
            value={filePath}
            onChange={(e) => setFilePath(e.target.value)}
            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
          <button
            type="submit"
            disabled={isLoading || !filePath.trim()}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Loading...' : 'View Blame'}
          </button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 flex overflow-hidden">
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
          <div className="flex-1 flex items-center justify-center p-4 text-red-600">{error}</div>
        ) : !blameResult ? (
          <div className="flex-1 flex items-center justify-center p-4 text-gray-500">
            Enter a file path to view blame information
          </div>
        ) : (
          <>
            {/* Blame view */}
            <div className="flex-1 overflow-auto font-mono text-xs">
              <table className="w-full border-collapse">
                <tbody>
                  {blameResult.lines.map((line) => {
                    const isSelected = selectedLine === line.lineNumber;
                    const isCommitSelected = selectedCommit === line.commit.sha;
                    const authorColor = getAuthorColor(line.commit.author);

                    return (
                      <tr
                        key={line.lineNumber}
                        onClick={() => handleLineClick(line)}
                        className={`cursor-pointer hover:bg-gray-50 ${
                          isSelected ? 'bg-blue-50' : isCommitSelected ? 'bg-yellow-50' : ''
                        }`}
                      >
                        {/* Line number */}
                        <td className="px-2 py-0.5 text-right text-gray-400 select-none border-r border-gray-200 w-12">
                          {line.lineNumber}
                        </td>

                        {/* Commit info */}
                        <td className="px-2 py-0.5 border-r border-gray-200 w-32 truncate">
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-xs ${authorColor}`}
                            title={line.commit.author}
                          >
                            {line.commit.author.split(' ')[0]}
                          </span>
                        </td>

                        {/* SHA */}
                        <td className="px-2 py-0.5 text-gray-500 border-r border-gray-200 w-20">
                          <a
                            href={`https://github.com/${connection?.owner}/${connection?.repo}/commit/${line.commit.sha}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {line.commit.shortSha}
                          </a>
                        </td>

                        {/* Date */}
                        <td
                          className="px-2 py-0.5 text-gray-400 border-r border-gray-200 w-24"
                          title={formatDate(line.commit.date)}
                        >
                          {formatRelativeDate(line.commit.date)}
                        </td>

                        {/* Code content */}
                        <td className="px-2 py-0.5 whitespace-pre">{line.content || ' '}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Sidebar */}
            <div className="w-72 border-l border-gray-200 bg-gray-50 flex flex-col">
              {/* Selected line details */}
              {selectedLineDetails && (
                <div className="p-4 border-b border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Selected Line</h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <span className="text-gray-500">Commit:</span>
                      <a
                        href={`https://github.com/${connection?.owner}/${connection?.repo}/commit/${selectedLineDetails.commit.sha}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-1 text-blue-600 hover:underline font-mono"
                      >
                        {selectedLineDetails.commit.shortSha}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-500">Author:</span>
                      <span className="ml-1 text-gray-900">
                        {selectedLineDetails.commit.author}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Date:</span>
                      <span className="ml-1 text-gray-900">
                        {formatDate(selectedLineDetails.commit.date)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">Message:</span>
                      <p className="mt-1 text-gray-900 break-words">
                        {selectedLineDetails.commit.message}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Author statistics */}
              <div className="flex-1 overflow-auto p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Contributors</h4>
                <div className="space-y-2">
                  {authorStats.map(({ author, count, percentage }) => (
                    <div key={author} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs text-gray-900 truncate">{author}</div>
                        <div className="mt-0.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${getAuthorColor(author).split(' ')[0]}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 w-12 text-right">
                        {count} ({percentage}%)
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* File info */}
              <div className="p-4 border-t border-gray-200">
                <div className="text-xs text-gray-500">
                  <div>File: {blameFilePath}</div>
                  <div>Lines: {blameResult.lines.length}</div>
                  <div>Contributors: {authorStats.length}</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// Blame Dialog (modal wrapper)
// ============================================================================

export interface GitHubBlameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  filePath?: string;
}

export const GitHubBlameDialog: React.FC<GitHubBlameDialogProps> = ({
  isOpen,
  onClose,
  filePath,
}) => {
  const clearBlame = useGitHubStore((state) => state.clearBlame);

  const handleClose = () => {
    clearBlame();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] mx-4 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">File Blame</h3>
          <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-gray-600">
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
        <div className="flex-1 overflow-hidden">
          <GitHubBlameViewer initialFilePath={filePath} className="h-full" />
        </div>
      </div>
    </div>
  );
};
