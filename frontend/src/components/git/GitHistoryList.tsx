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
}

export const GitHistoryList: React.FC<GitHistoryListProps> = ({
  commits,
  selectedCommit,
  onSelectCommit,
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
          </div>
        );
      })}
    </div>
  );
};
