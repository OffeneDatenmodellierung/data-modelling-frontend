/**
 * BlameViewer Component
 * Shows git blame information for a file with line-by-line attribution
 */

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useGitStore, selectBlameResult, selectIsBlameLoading } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

interface BlameViewerProps {
  filePath: string;
  className?: string;
  onClose?: () => void;
}

export const BlameViewer: React.FC<BlameViewerProps> = ({ filePath, className = '', onClose }) => {
  const blameResult = useGitStore(selectBlameResult);
  const isLoading = useGitStore(selectIsBlameLoading);
  const blameFilePath = useGitStore((state) => state.blameFilePath);

  const [selectedCommit, setSelectedCommit] = useState<string | null>(null);
  const [hoveredLine, setHoveredLine] = useState<number | null>(null);
  const [showAuthorColors, setShowAuthorColors] = useState(true);

  // Load blame data when file path changes
  useEffect(() => {
    if (filePath && filePath !== blameFilePath) {
      gitService.getBlame(filePath);
    }
    return () => {
      gitService.clearBlame();
    };
  }, [filePath, blameFilePath]);

  // Generate consistent colors for authors
  const authorColors = useMemo(() => {
    if (!blameResult) return new Map<string, string>();

    const colors = [
      'bg-blue-50 border-blue-200',
      'bg-green-50 border-green-200',
      'bg-purple-50 border-purple-200',
      'bg-yellow-50 border-yellow-200',
      'bg-pink-50 border-pink-200',
      'bg-indigo-50 border-indigo-200',
      'bg-orange-50 border-orange-200',
      'bg-teal-50 border-teal-200',
    ];

    const authorMap = new Map<string, string>();
    const uniqueAuthors = [...new Set(blameResult.lines.map((l) => l.commit.authorEmail))];

    uniqueAuthors.forEach((email, index) => {
      authorMap.set(email, colors[index % colors.length]!);
    });

    return authorMap;
  }, [blameResult]);

  // Calculate author statistics
  const authorStats = useMemo(() => {
    if (!blameResult) return [];

    const stats = new Map<string, { name: string; email: string; lines: number }>();

    for (const line of blameResult.lines) {
      const key = line.commit.authorEmail;
      const existing = stats.get(key);
      if (existing) {
        existing.lines++;
      } else {
        stats.set(key, {
          name: line.commit.author,
          email: line.commit.authorEmail,
          lines: 1,
        });
      }
    }

    return Array.from(stats.values())
      .map((stat) => ({
        ...stat,
        percentage: Math.round((stat.lines / blameResult.lines.length) * 100),
      }))
      .sort((a, b) => b.lines - a.lines);
  }, [blameResult]);

  const handleLineClick = useCallback((commitHash: string) => {
    setSelectedCommit((prev) => (prev === commitHash ? null : commitHash));
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return date.toLocaleDateString();
  }, []);

  if (isLoading) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-gray-500">
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
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
            <span>Loading blame information...</span>
          </div>
        </div>
      </div>
    );
  }

  if (!blameResult || blameResult.lines.length === 0) {
    return (
      <div className={`flex flex-col ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center text-gray-500">
            <svg
              className="w-12 h-12 mx-auto mb-2 text-gray-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p>No blame information available</p>
            <p className="text-sm text-gray-400 mt-1">The file may be new or not tracked by git</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
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
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Blame</span>
          <span className="text-sm text-gray-500 truncate max-w-xs" title={filePath}>
            {filePath.split('/').pop()}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input
              type="checkbox"
              checked={showAuthorColors}
              onChange={(e) => setShowAuthorColors(e.target.checked)}
              className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded"
            />
            Colors
          </label>
          {onClose && (
            <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
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
      </div>

      {/* Author Stats */}
      <div className="px-4 py-2 border-b border-gray-100 bg-white">
        <div className="flex flex-wrap gap-2">
          {authorStats.slice(0, 5).map((stat) => (
            <div
              key={stat.email}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs ${
                showAuthorColors
                  ? authorColors.get(stat.email)
                  : 'bg-gray-100 border border-gray-200'
              }`}
            >
              <span className="font-medium text-gray-700">{stat.name}</span>
              <span className="text-gray-500">{stat.percentage}%</span>
            </div>
          ))}
          {authorStats.length > 5 && (
            <span className="text-xs text-gray-400 self-center">
              +{authorStats.length - 5} more
            </span>
          )}
        </div>
      </div>

      {/* Blame Lines */}
      <div className="flex-1 overflow-auto font-mono text-sm">
        <table className="w-full border-collapse">
          <tbody>
            {blameResult.lines.map((line) => {
              const isSelected = selectedCommit === line.commit.hash;
              const isHovered = hoveredLine === line.lineNumber;
              const colorClass = showAuthorColors
                ? authorColors.get(line.commit.authorEmail) || ''
                : '';

              return (
                <tr
                  key={line.lineNumber}
                  className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                    isSelected ? 'bg-blue-50' : ''
                  } ${isHovered && !isSelected ? 'bg-gray-50' : ''}`}
                  onClick={() => handleLineClick(line.commit.hash)}
                  onMouseEnter={() => setHoveredLine(line.lineNumber)}
                  onMouseLeave={() => setHoveredLine(null)}
                >
                  {/* Commit Info */}
                  <td
                    className={`px-2 py-0.5 text-xs whitespace-nowrap border-r border-gray-200 ${colorClass}`}
                    style={{ minWidth: '200px', maxWidth: '200px' }}
                  >
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="text-gray-500 font-mono">{line.commit.hashShort}</span>
                        <span className="text-gray-700 truncate max-w-[100px]">
                          {line.commit.author}
                        </span>
                      </div>
                      <span className="text-gray-400 text-[10px]">
                        {formatDate(line.commit.date)}
                      </span>
                    </div>
                  </td>

                  {/* Line Number */}
                  <td className="px-2 py-0.5 text-right text-gray-400 border-r border-gray-200 select-none">
                    {line.lineNumber}
                  </td>

                  {/* Code */}
                  <td className="px-2 py-0.5">
                    <pre className="whitespace-pre overflow-x-auto text-gray-800">
                      {line.content || ' '}
                    </pre>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Selected Commit Details */}
      {selectedCommit && (
        <div className="border-t border-gray-200 bg-gray-50 px-4 py-3">
          {(() => {
            const line = blameResult.lines.find((l) => l.commit.hash === selectedCommit);
            if (!line) return null;

            return (
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-gray-600">{line.commit.hashShort}</span>
                  <span className="text-sm font-medium text-gray-900">{line.commit.message}</span>
                </div>
                <div className="text-xs text-gray-500">
                  {line.commit.author} &lt;{line.commit.authorEmail}&gt; -{' '}
                  {new Date(line.commit.date).toLocaleString()}
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

/**
 * BlameDialog Component
 * Modal wrapper for BlameViewer
 */
interface BlameDialogProps {
  isOpen: boolean;
  filePath: string;
  onClose: () => void;
}

export const BlameDialog: React.FC<BlameDialogProps> = ({ isOpen, filePath, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Modal backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl mx-4 h-[80vh] flex flex-col">
        <BlameViewer filePath={filePath} onClose={onClose} className="h-full" />
      </div>
    </div>
  );
};
