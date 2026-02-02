/**
 * Git History List Component
 * Displays commit history with relative timestamps
 */

import React from 'react';
import { gitService } from '@/services/git/gitService';
import type { GitCommit } from '@/stores/gitStore';

export interface GitHistoryListProps {
  commits: GitCommit[];
  selectedCommit: GitCommit | null;
  onSelectCommit: (commit: GitCommit | null) => void;
  onCherryPick?: (commit: GitCommit) => void;
  onRevert?: (commit: GitCommit) => void;
}

export const GitHistoryList: React.FC<GitHistoryListProps> = ({
  commits,
  selectedCommit,
  onSelectCommit,
  onCherryPick,
  onRevert,
}) => {
  const handleCommitClick = (commit: GitCommit) => {
    if (selectedCommit?.hash === commit.hash) {
      onSelectCommit(null);
    } else {
      onSelectCommit(commit);
      // Load diff for this commit
      gitService.getDiff({ commit: commit.hash });
    }
  };

  return (
    <div className="divide-y divide-gray-100">
      {commits.map((commit) => {
        const isSelected = selectedCommit?.hash === commit.hash;
        const relativeTime = gitService.formatRelativeTime(commit.date);

        return (
          <div
            key={commit.hash}
            onClick={() => handleCommitClick(commit)}
            className={`px-3 py-2.5 cursor-pointer hover:bg-gray-50 ${
              isSelected ? 'bg-blue-50' : ''
            }`}
          >
            {/* Commit message */}
            <div className="text-sm text-gray-900 truncate" title={commit.message}>
              {commit.message}
            </div>

            {/* Meta info */}
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
              {/* Hash */}
              <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded" title={commit.hash}>
                {commit.hashShort}
              </span>

              {/* Author */}
              <span className="truncate" title={commit.authorEmail}>
                {commit.author}
              </span>

              {/* Time */}
              <span className="ml-auto flex-shrink-0" title={commit.date.toLocaleString()}>
                {relativeTime}
              </span>
            </div>

            {/* Actions (shown when selected) */}
            {isSelected && (onCherryPick || onRevert) && (
              <div className="flex items-center gap-1 mt-2">
                {onCherryPick && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onCherryPick(commit);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-pink-600 bg-pink-50 hover:bg-pink-100 rounded"
                    title="Cherry-pick this commit"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                      />
                    </svg>
                    Cherry-pick
                  </button>
                )}
                {onRevert && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRevert(commit);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-orange-600 bg-orange-50 hover:bg-orange-100 rounded"
                    title="Revert this commit"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
                      />
                    </svg>
                    Revert
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
