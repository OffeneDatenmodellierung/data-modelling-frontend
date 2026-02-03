/**
 * Git File List Component
 * Displays list of changed files with status indicators
 */

import React from 'react';
import { gitService } from '@/services/git/gitService';
import type { GitFileChange } from '@/stores/gitStore';

export interface GitFileListProps {
  files: GitFileChange[];
  selectedFile: string | null;
  onSelectFile: (file: string | null) => void;
}

export const GitFileList: React.FC<GitFileListProps> = ({ files, selectedFile, onSelectFile }) => {
  const handleFileClick = (filePath: string) => {
    if (selectedFile === filePath) {
      onSelectFile(null);
    } else {
      onSelectFile(filePath);
    }
  };

  const handleDiscardFile = async (filePath: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Discard changes to ${filePath}?`)) {
      return;
    }
    await gitService.discardChanges({ files: [filePath] });
    if (selectedFile === filePath) {
      onSelectFile(null);
    }
  };

  // Group files by directory
  const groupedFiles = files.reduce<Record<string, GitFileChange[]>>((acc, file) => {
    const parts = file.path.split('/');
    const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '.';
    if (!acc[dir]) {
      acc[dir] = [];
    }
    acc[dir].push(file);
    return acc;
  }, {});

  // Sort directories
  const sortedDirs = Object.keys(groupedFiles).sort();

  return (
    <div className="divide-y divide-gray-100">
      {sortedDirs.map((dir) => (
        <div key={dir}>
          {dir !== '.' && (
            <div className="px-3 py-1.5 text-xs font-medium text-gray-500 bg-gray-50">{dir}/</div>
          )}
          {groupedFiles[dir]?.map((file) => {
            const { icon, color, label } = gitService.getFileStatusDisplay(file.status);
            const fileName = file.path.split('/').pop() || file.path;
            const isSelected = selectedFile === file.path;

            return (
              <div
                key={file.path}
                onClick={() => handleFileClick(file.path)}
                onKeyDown={(e) => e.key === 'Enter' && handleFileClick(file.path)}
                role="button"
                tabIndex={0}
                className={`flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-50 group ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                {/* Status indicator */}
                <span
                  className={`w-4 h-4 flex items-center justify-center text-xs font-bold ${color}`}
                  title={label}
                >
                  {icon}
                </span>

                {/* File name */}
                <span className="flex-1 text-sm text-gray-700 truncate" title={file.path}>
                  {fileName}
                  {file.oldPath && (
                    <span className="text-gray-400 ml-1">← {file.oldPath.split('/').pop()}</span>
                  )}
                </span>

                {/* Staged indicator */}
                {file.staged && (
                  <span className="text-xs text-green-600" title="Staged">
                    S
                  </span>
                )}

                {/* Discard button */}
                {file.status !== 'untracked' && (
                  <button
                    onClick={(e) => handleDiscardFile(file.path, e)}
                    className="p-1 text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Discard changes"
                  >
                    <svg
                      className="w-3.5 h-3.5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
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
            );
          })}
        </div>
      ))}
    </div>
  );
};
