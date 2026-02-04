/**
 * Merge Conflict Resolver Component
 * 3-panel layout for resolving merge conflicts:
 * - Top-left: "Ours" (PR branch version) with highlighted differences
 * - Top-right: "Theirs" (base branch version) with highlighted differences
 * - Bottom: "Result" (editable merged version with line numbers)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import * as Diff from 'diff';

export interface ConflictFile {
  path: string;
  oursContent: string;
  theirsContent: string;
  baseContent?: string;
  oursExists?: boolean;
  theirsExists?: boolean;
}

export interface MergeConflictResolverProps {
  file: ConflictFile;
  oursBranch: string;
  theirsBranch: string;
  onResolve: (resolvedContent: string) => void;
  onCancel: () => void;
  className?: string;
}

interface DiffHunk {
  id: number;
  type: 'unchanged' | 'modified' | 'added' | 'removed';
  oursLines: string[];
  theirsLines: string[];
  oursStartLine: number;
  theirsStartLine: number;
}

export const MergeConflictResolver: React.FC<MergeConflictResolverProps> = ({
  file,
  oursBranch,
  theirsBranch,
  onResolve,
  onCancel,
  className = '',
}) => {
  const [resolvedContent, setResolvedContent] = useState('');
  const [showLineNumbers, setShowLineNumbers] = useState(true);
  const [selectedHunk, setSelectedHunk] = useState<number | null>(null);

  // Parse differences into hunks
  const diffHunks = useMemo(() => {
    const changes = Diff.diffLines(file.oursContent, file.theirsContent);
    const hunks: DiffHunk[] = [];
    let oursLine = 1;
    let theirsLine = 1;
    let hunkId = 0;

    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      if (!change) continue;

      const lines = change.value.split('\n');
      // Remove trailing empty string from split if the value ended with \n
      if (lines[lines.length - 1] === '') {
        lines.pop();
      }

      if (!change.added && !change.removed) {
        // Unchanged
        hunks.push({
          id: hunkId++,
          type: 'unchanged',
          oursLines: lines,
          theirsLines: lines,
          oursStartLine: oursLine,
          theirsStartLine: theirsLine,
        });
        oursLine += lines.length;
        theirsLine += lines.length;
      } else if (change.removed) {
        // Check if next change is an addition (makes it a modification)
        const nextChange = changes[i + 1];
        if (nextChange && nextChange.added) {
          const nextLines = nextChange.value.split('\n');
          if (nextLines[nextLines.length - 1] === '') {
            nextLines.pop();
          }
          hunks.push({
            id: hunkId++,
            type: 'modified',
            oursLines: lines,
            theirsLines: nextLines,
            oursStartLine: oursLine,
            theirsStartLine: theirsLine,
          });
          oursLine += lines.length;
          theirsLine += nextLines.length;
          i++; // Skip the next change since we've processed it
        } else {
          // Pure removal (exists in ours, not in theirs)
          hunks.push({
            id: hunkId++,
            type: 'removed',
            oursLines: lines,
            theirsLines: [],
            oursStartLine: oursLine,
            theirsStartLine: theirsLine,
          });
          oursLine += lines.length;
        }
      } else if (change.added) {
        // Pure addition (exists in theirs, not in ours)
        hunks.push({
          id: hunkId++,
          type: 'added',
          oursLines: [],
          theirsLines: lines,
          oursStartLine: oursLine,
          theirsStartLine: theirsLine,
        });
        theirsLine += lines.length;
      }
    }

    return hunks;
  }, [file.oursContent, file.theirsContent]);

  // Count conflicts (non-unchanged hunks)
  const conflictCount = useMemo(
    () => diffHunks.filter((h) => h.type !== 'unchanged').length,
    [diffHunks]
  );

  // Track which hunks have been resolved and from which source
  const [hunkResolutions, setHunkResolutions] = useState<Map<number, 'ours' | 'theirs'>>(new Map());

  // Initialize resolved content with "ours" version
  useEffect(() => {
    setResolvedContent(file.oursContent);
    setHunkResolutions(new Map());
  }, [file.oursContent]);

  // Rebuild resolved content based on hunk selections
  const rebuildResolvedContent = useCallback(
    (resolutions: Map<number, 'ours' | 'theirs'>) => {
      let result = '';
      diffHunks.forEach((hunk) => {
        const source = resolutions.get(hunk.id) || 'ours';
        if (hunk.type === 'unchanged') {
          result += hunk.oursLines.join('\n');
          if (hunk.oursLines.length > 0) result += '\n';
        } else if (hunk.type === 'modified') {
          const lines = source === 'ours' ? hunk.oursLines : hunk.theirsLines;
          result += lines.join('\n');
          if (lines.length > 0) result += '\n';
        } else if (hunk.type === 'removed') {
          if (source === 'ours') {
            result += hunk.oursLines.join('\n');
            if (hunk.oursLines.length > 0) result += '\n';
          }
          // If theirs, don't include the lines (they were removed)
        } else if (hunk.type === 'added') {
          if (source === 'theirs') {
            result += hunk.theirsLines.join('\n');
            if (hunk.theirsLines.length > 0) result += '\n';
          }
          // If ours, don't include the lines (they don't exist in ours)
        }
      });
      // Remove trailing newline if original didn't have one
      if (!file.oursContent.endsWith('\n') && result.endsWith('\n')) {
        result = result.slice(0, -1);
      }
      return result;
    },
    [diffHunks, file.oursContent]
  );

  // Apply a hunk from a specific source
  const applyHunk = useCallback(
    (hunkId: number, source: 'ours' | 'theirs') => {
      const newResolutions = new Map(hunkResolutions);
      newResolutions.set(hunkId, source);
      setHunkResolutions(newResolutions);
      setResolvedContent(rebuildResolvedContent(newResolutions));
      setSelectedHunk(null);
    },
    [hunkResolutions, rebuildResolvedContent]
  );

  // Accept all from ours
  const acceptAllOurs = useCallback(() => {
    const newResolutions = new Map<number, 'ours' | 'theirs'>();
    diffHunks.forEach((h) => {
      if (h.type !== 'unchanged') {
        newResolutions.set(h.id, 'ours');
      }
    });
    setHunkResolutions(newResolutions);
    setResolvedContent(file.oursContent);
  }, [diffHunks, file.oursContent]);

  // Accept all from theirs
  const acceptAllTheirs = useCallback(() => {
    const newResolutions = new Map<number, 'ours' | 'theirs'>();
    diffHunks.forEach((h) => {
      if (h.type !== 'unchanged') {
        newResolutions.set(h.id, 'theirs');
      }
    });
    setHunkResolutions(newResolutions);
    setResolvedContent(file.theirsContent);
  }, [diffHunks, file.theirsContent]);

  const handleResolve = useCallback(() => {
    onResolve(resolvedContent);
  }, [onResolve, resolvedContent]);

  // Check if file only exists on one side
  const oursExists = file.oursExists !== false;
  const theirsExists = file.theirsExists !== false;
  const isOneSided = !oursExists || !theirsExists;

  // Special UI for files that only exist on one side
  if (isOneSided) {
    const existsOnOurs = oursExists && file.oursContent;
    const existsOnTheirs = theirsExists && file.theirsContent;
    const content = existsOnOurs ? file.oursContent : file.theirsContent;
    const sourceBranch = existsOnOurs ? oursBranch : theirsBranch;

    return (
      <div className={`flex flex-col h-full bg-white ${className}`}>
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 16 16">
              <path
                fillRule="evenodd"
                d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
              />
            </svg>
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Resolve File Conflict</h3>
              <p className="text-xs text-gray-500 font-mono">{file.path}</p>
            </div>
          </div>
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            {existsOnOurs ? 'New file in PR' : 'File only in base'}
          </span>
        </div>

        <div className="flex-1 overflow-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            <div
              className={`p-4 rounded-lg border ${existsOnOurs ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200'}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <span
                  className={`w-3 h-3 rounded-full ${existsOnOurs ? 'bg-blue-500' : 'bg-green-500'}`}
                ></span>
                <span
                  className={`text-sm font-medium ${existsOnOurs ? 'text-blue-800' : 'text-green-800'}`}
                >
                  File exists in: {sourceBranch}
                </span>
              </div>
              <p className="text-sm text-gray-700 mb-4">
                {existsOnOurs
                  ? `This file was added in the PR branch (${oursBranch}) and does not exist in the base branch (${theirsBranch}).`
                  : `This file exists in the base branch (${theirsBranch}) but was deleted or doesn't exist in the PR branch (${oursBranch}).`}
              </p>
              {content && (
                <div className="bg-white rounded border p-3 font-mono text-xs max-h-64 overflow-auto">
                  <pre className="whitespace-pre-wrap">{content}</pre>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => onResolve(existsOnOurs ? file.oursContent : '')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium ${
                  existsOnOurs
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                {existsOnOurs
                  ? `Keep file (from ${oursBranch})`
                  : `Delete file (not in ${oursBranch})`}
              </button>
              <button
                onClick={() => onResolve(existsOnTheirs ? file.theirsContent : '')}
                className={`flex-1 px-4 py-3 rounded-lg text-sm font-medium ${
                  existsOnTheirs
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100'
                }`}
              >
                {existsOnTheirs
                  ? `Keep file (from ${theirsBranch})`
                  : `Delete file (not in ${theirsBranch})`}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t">
          <p className="text-xs text-gray-500">Choose whether to keep or delete this file</p>
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b flex-shrink-0">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-orange-500" fill="currentColor" viewBox="0 0 16 16">
            <path
              fillRule="evenodd"
              d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
            />
          </svg>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Resolve Merge Conflict</h3>
            <p className="text-xs text-gray-500 font-mono">{file.path}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
            {conflictCount} difference{conflictCount !== 1 ? 's' : ''}
          </span>
          <label className="flex items-center gap-1.5 text-xs text-gray-600">
            <input
              type="checkbox"
              checked={showLineNumbers}
              onChange={(e) => setShowLineNumbers(e.target.checked)}
              className="rounded"
            />
            Lines
          </label>
          <button
            onClick={acceptAllOurs}
            className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            Use All Ours
          </button>
          <button
            onClick={acceptAllTheirs}
            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
          >
            Use All Theirs
          </button>
        </div>
      </div>

      {/* Three-panel layout */}
      <div className="flex-1 flex flex-col overflow-hidden min-h-0">
        {/* Top row: Ours and Theirs side by side */}
        <div className="flex-1 flex min-h-0">
          {/* Ours panel */}
          <div className="flex-1 flex flex-col border-r overflow-hidden">
            <div className="px-3 py-1.5 bg-blue-50 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                <span className="text-xs font-medium text-blue-800">Ours ({oursBranch})</span>
              </div>
              <button
                onClick={acceptAllOurs}
                className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Use All
              </button>
            </div>
            <div className="flex-1 overflow-auto font-mono text-xs">
              <DiffPanel
                hunks={diffHunks}
                side="ours"
                showLineNumbers={showLineNumbers}
                selectedHunk={selectedHunk}
                hunkResolutions={hunkResolutions}
                onSelectHunk={setSelectedHunk}
                onApplyHunk={(id) => applyHunk(id, 'ours')}
              />
            </div>
          </div>

          {/* Theirs panel */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="px-3 py-1.5 bg-green-50 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500"></span>
                <span className="text-xs font-medium text-green-800">Theirs ({theirsBranch})</span>
              </div>
              <button
                onClick={acceptAllTheirs}
                className="px-2 py-0.5 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Use All
              </button>
            </div>
            <div className="flex-1 overflow-auto font-mono text-xs">
              <DiffPanel
                hunks={diffHunks}
                side="theirs"
                showLineNumbers={showLineNumbers}
                selectedHunk={selectedHunk}
                hunkResolutions={hunkResolutions}
                onSelectHunk={setSelectedHunk}
                onApplyHunk={(id) => applyHunk(id, 'theirs')}
              />
            </div>
          </div>
        </div>

        {/* Bottom: Result panel with line numbers */}
        <div className="h-[35%] flex flex-col border-t-2 border-purple-300 min-h-0">
          <div className="px-3 py-1.5 bg-purple-50 border-b flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
              <span className="text-xs font-medium text-purple-800">
                Result (click differences above to apply, or edit directly)
              </span>
            </div>
            <span className="text-xs text-purple-600">
              {resolvedContent.split('\n').length} lines
            </span>
          </div>
          <div className="flex-1 flex overflow-hidden">
            {showLineNumbers && (
              <div className="bg-gray-50 border-r text-gray-400 text-xs font-mono select-none overflow-hidden">
                <div className="py-1">
                  {resolvedContent.split('\n').map((_, i) => (
                    <div key={i} className="px-2 text-right h-5 leading-5">
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <textarea
              value={resolvedContent}
              onChange={(e) => setResolvedContent(e.target.value)}
              className="flex-1 p-1 font-mono text-xs resize-none focus:outline-none leading-5"
              spellCheck={false}
              style={{ lineHeight: '1.25rem' }}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-t flex-shrink-0">
        <p className="text-xs text-gray-500">
          Click highlighted sections to apply changes, or edit the result directly
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-1.5 text-sm text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleResolve}
            className="px-4 py-1.5 text-sm text-white bg-green-600 rounded-lg hover:bg-green-700"
          >
            Mark as Resolved
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// Diff Panel Component - displays file content with highlighted differences
// ============================================================================

interface DiffPanelProps {
  hunks: DiffHunk[];
  side: 'ours' | 'theirs';
  showLineNumbers: boolean;
  selectedHunk: number | null;
  hunkResolutions: Map<number, 'ours' | 'theirs'>;
  onSelectHunk: (id: number | null) => void;
  onApplyHunk: (id: number) => void;
}

const DiffPanel: React.FC<DiffPanelProps> = ({
  hunks,
  side,
  showLineNumbers,
  selectedHunk,
  hunkResolutions,
  onSelectHunk,
  onApplyHunk,
}) => {
  return (
    <div className="min-w-0">
      {hunks.map((hunk) => {
        const lines = side === 'ours' ? hunk.oursLines : hunk.theirsLines;
        const startLine = side === 'ours' ? hunk.oursStartLine : hunk.theirsStartLine;
        const isConflict = hunk.type !== 'unchanged';
        const isSelected = selectedHunk === hunk.id;
        const resolution = hunkResolutions.get(hunk.id);
        const isApplied = resolution === side;
        const isOtherApplied = resolution && resolution !== side;

        // Determine if this side has content for this hunk
        const hasContent = lines.length > 0;

        // Background colors based on state
        let bgClass = '';
        let hoverClass = '';
        if (isConflict) {
          if (isApplied) {
            bgClass = side === 'ours' ? 'bg-blue-100' : 'bg-green-100';
          } else if (isOtherApplied) {
            bgClass = 'bg-gray-100 opacity-50';
          } else {
            bgClass = side === 'ours' ? 'bg-blue-50' : 'bg-green-50';
            hoverClass = side === 'ours' ? 'hover:bg-blue-100' : 'hover:bg-green-100';
          }
        }

        // If no content on this side for added/removed hunks
        if (!hasContent && isConflict) {
          const otherLines = side === 'ours' ? hunk.theirsLines : hunk.oursLines;
          return (
            <div
              key={hunk.id}
              className={`border-l-2 ${side === 'ours' ? 'border-blue-300' : 'border-green-300'} bg-gray-50`}
            >
              {otherLines.map((_, i) => (
                <div key={i} className="flex h-5">
                  {showLineNumbers && (
                    <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-300 select-none border-r bg-gray-100">
                      -
                    </span>
                  )}
                  <span className="flex-1 px-2 text-gray-400 italic text-xs">
                    {i === 0 ? '(no content)' : ''}
                  </span>
                </div>
              ))}
            </div>
          );
        }

        return (
          <div
            key={hunk.id}
            className={`${bgClass} ${isConflict && !isOtherApplied ? `cursor-pointer ${hoverClass}` : ''} ${
              isConflict
                ? `border-l-2 ${side === 'ours' ? 'border-blue-400' : 'border-green-400'}`
                : ''
            } ${isSelected ? 'ring-2 ring-inset ring-yellow-400' : ''}`}
            onClick={() => {
              if (isConflict && !isOtherApplied) {
                onApplyHunk(hunk.id);
              }
            }}
            onMouseEnter={() => isConflict && onSelectHunk(hunk.id)}
            onMouseLeave={() => onSelectHunk(null)}
          >
            {/* Apply button for conflicts */}
            {isConflict && hasContent && !isOtherApplied && (
              <div className="flex justify-end px-2 py-0.5 border-b border-dashed border-gray-300">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onApplyHunk(hunk.id);
                  }}
                  className={`px-2 py-0.5 text-xs rounded ${
                    side === 'ours'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  } ${isApplied ? 'opacity-50' : ''}`}
                >
                  {isApplied ? 'Applied' : 'Use This'}
                </button>
              </div>
            )}
            {lines.map((line, i) => (
              <div key={i} className="flex h-5">
                {showLineNumbers && (
                  <span className="w-10 flex-shrink-0 text-right pr-2 text-gray-400 select-none border-r bg-gray-50/50">
                    {startLine + i}
                  </span>
                )}
                <span className="flex-1 px-2 whitespace-pre overflow-x-auto leading-5">
                  {line || ' '}
                </span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

export default MergeConflictResolver;
