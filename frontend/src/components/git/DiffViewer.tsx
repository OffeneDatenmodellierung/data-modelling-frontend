/**
 * Diff Viewer Component
 * Displays git diff output with syntax highlighting
 */

import React, { useMemo } from 'react';

export interface DiffViewerProps {
  diff: string;
  isLoading?: boolean;
  fileName?: string;
}

interface DiffLine {
  type: 'header' | 'hunk' | 'addition' | 'deletion' | 'context' | 'meta';
  content: string;
  lineNumber?: number;
}

export const DiffViewer: React.FC<DiffViewerProps> = ({ diff, isLoading = false, fileName }) => {
  const parsedLines = useMemo((): DiffLine[] => {
    if (!diff) return [];

    return diff.split('\n').map((line): DiffLine => {
      if (line.startsWith('diff --git') || line.startsWith('index ')) {
        return { type: 'meta', content: line };
      }
      if (line.startsWith('---') || line.startsWith('+++')) {
        return { type: 'header', content: line };
      }
      if (line.startsWith('@@')) {
        return { type: 'hunk', content: line };
      }
      if (line.startsWith('+')) {
        return { type: 'addition', content: line };
      }
      if (line.startsWith('-')) {
        return { type: 'deletion', content: line };
      }
      return { type: 'context', content: line };
    });
  }, [diff]);

  const getLineStyle = (type: DiffLine['type']): string => {
    switch (type) {
      case 'addition':
        return 'bg-green-50 text-green-800';
      case 'deletion':
        return 'bg-red-50 text-red-800';
      case 'hunk':
        return 'bg-blue-50 text-blue-700 font-medium';
      case 'header':
        return 'bg-gray-100 text-gray-700 font-medium';
      case 'meta':
        return 'bg-gray-50 text-gray-500 text-xs';
      default:
        return 'text-gray-600';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
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
    );
  }

  if (!diff) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400 text-sm">
        Select a file to view diff
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      {fileName && (
        <div className="px-3 py-1.5 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600 truncate">
          {fileName}
        </div>
      )}

      {/* Diff content */}
      <div className="flex-1 overflow-auto">
        <pre className="text-xs font-mono leading-relaxed">
          {parsedLines.map((line, index) => (
            <div key={index} className={`px-3 py-0.5 ${getLineStyle(line.type)}`}>
              {line.content || ' '}
            </div>
          ))}
        </pre>
      </div>

      {/* Stats footer */}
      <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-200 text-xs text-gray-500 flex gap-3">
        <span className="text-green-600">
          +{parsedLines.filter((l) => l.type === 'addition').length}
        </span>
        <span className="text-red-600">
          -{parsedLines.filter((l) => l.type === 'deletion').length}
        </span>
      </div>
    </div>
  );
};
