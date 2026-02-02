/**
 * PR File Diff Viewer Component
 * Enhanced diff viewer with line numbers, click-to-comment, and inline comment threads
 */

import React, { useState, useMemo, useCallback } from 'react';
import type {
  GitHubPRFile,
  GitHubPullRequestComment,
  DiffLine,
  DiffHunk,
  ParsedFileDiff,
  PendingReviewComment,
} from '@/types/github';
import { PRInlineComment } from './PRInlineComment';

export interface PRFileDiffViewerProps {
  file: GitHubPRFile;
  existingComments?: GitHubPullRequestComment[];
  pendingComments?: PendingReviewComment[];
  onAddComment?: (line: number, side: 'LEFT' | 'RIGHT', body: string) => void;
  onReplyToComment?: (commentId: number, body: string) => void;
  onEditComment?: (commentId: number, body: string) => void;
  onDeleteComment?: (commentId: number) => void;
  onRemovePendingComment?: (id: string) => void;
  className?: string;
  defaultExpanded?: boolean;
}

type ViewMode = 'unified' | 'split';

export const PRFileDiffViewer: React.FC<PRFileDiffViewerProps> = ({
  file,
  existingComments = [],
  pendingComments = [],
  onAddComment,
  onReplyToComment,
  onEditComment,
  onDeleteComment,
  onRemovePendingComment,
  className = '',
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [viewMode, setViewMode] = useState<ViewMode>('unified');
  const [commentingLine, setCommentingLine] = useState<{
    line: number;
    side: 'LEFT' | 'RIGHT';
  } | null>(null);
  const [newCommentBody, setNewCommentBody] = useState('');

  // Parse the patch into structured diff data
  const parsedDiff = useMemo(() => parsePatch(file), [file]);

  // Group comments by line
  const commentsByLine = useMemo(() => {
    const map = new Map<string, GitHubPullRequestComment[]>();
    existingComments
      .filter((c) => c.path === file.filename)
      .forEach((comment) => {
        const key = `${comment.line || comment.original_position}-${comment.position ? 'RIGHT' : 'LEFT'}`;
        const existing = map.get(key) || [];
        existing.push(comment);
        map.set(key, existing);
      });
    return map;
  }, [existingComments, file.filename]);

  // Group pending comments by line
  const pendingByLine = useMemo(() => {
    const map = new Map<string, PendingReviewComment[]>();
    pendingComments
      .filter((c) => c.path === file.filename)
      .forEach((comment) => {
        const key = `${comment.line}-${comment.side}`;
        const existing = map.get(key) || [];
        existing.push(comment);
        map.set(key, existing);
      });
    return map;
  }, [pendingComments, file.filename]);

  // Handle line click for adding comment
  const handleLineClick = useCallback(
    (lineNumber: number, side: 'LEFT' | 'RIGHT') => {
      if (!onAddComment) return;
      setCommentingLine({ line: lineNumber, side });
      setNewCommentBody('');
    },
    [onAddComment]
  );

  // Submit new comment
  const handleSubmitComment = useCallback(() => {
    if (!commentingLine || !newCommentBody.trim() || !onAddComment) return;
    onAddComment(commentingLine.line, commentingLine.side, newCommentBody.trim());
    setCommentingLine(null);
    setNewCommentBody('');
  }, [commentingLine, newCommentBody, onAddComment]);

  // Cancel comment
  const handleCancelComment = useCallback(() => {
    setCommentingLine(null);
    setNewCommentBody('');
  }, []);

  // Get file status color
  const getStatusColor = () => {
    switch (file.status) {
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
    <div className={`border border-gray-200 rounded-lg overflow-hidden ${className}`}>
      {/* File Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 bg-gray-50 hover:bg-gray-100 text-left border-b border-gray-200"
      >
        <svg
          className={`w-4 h-4 text-gray-400 transition-transform ${expanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>

        <span className={`px-1.5 py-0.5 text-xs rounded ${getStatusColor()}`}>{file.status}</span>

        <span className="flex-1 font-mono text-sm text-gray-900 truncate">
          {file.previous_filename ? (
            <>
              <span className="text-gray-400">{file.previous_filename}</span>
              <span className="mx-1">→</span>
              {file.filename}
            </>
          ) : (
            file.filename
          )}
        </span>

        <span className="text-xs text-green-600">+{file.additions}</span>
        <span className="text-xs text-red-600">-{file.deletions}</span>
      </button>

      {/* Diff Content */}
      {expanded && (
        <div>
          {/* View mode toggle */}
          <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-end gap-2">
            <div className="flex rounded-md border border-gray-300 overflow-hidden">
              <button
                onClick={() => setViewMode('unified')}
                className={`px-2 py-0.5 text-xs ${
                  viewMode === 'unified'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Unified
              </button>
              <button
                onClick={() => setViewMode('split')}
                className={`px-2 py-0.5 text-xs ${
                  viewMode === 'split'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                Split
              </button>
            </div>
          </div>

          {/* Diff lines */}
          {!parsedDiff.isBinary ? (
            <div className="overflow-x-auto">
              {viewMode === 'unified' ? (
                <UnifiedDiffView
                  hunks={parsedDiff.hunks}
                  commentsByLine={commentsByLine}
                  pendingByLine={pendingByLine}
                  commentingLine={commentingLine}
                  newCommentBody={newCommentBody}
                  onLineClick={handleLineClick}
                  onCommentBodyChange={setNewCommentBody}
                  onSubmitComment={handleSubmitComment}
                  onCancelComment={handleCancelComment}
                  onReplyToComment={onReplyToComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onRemovePendingComment={onRemovePendingComment}
                  canComment={!!onAddComment}
                />
              ) : (
                <SplitDiffView
                  hunks={parsedDiff.hunks}
                  commentsByLine={commentsByLine}
                  pendingByLine={pendingByLine}
                  commentingLine={commentingLine}
                  newCommentBody={newCommentBody}
                  onLineClick={handleLineClick}
                  onCommentBodyChange={setNewCommentBody}
                  onSubmitComment={handleSubmitComment}
                  onCancelComment={handleCancelComment}
                  onReplyToComment={onReplyToComment}
                  onEditComment={onEditComment}
                  onDeleteComment={onDeleteComment}
                  onRemovePendingComment={onRemovePendingComment}
                  canComment={!!onAddComment}
                />
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-gray-500 text-sm">Binary file not shown</div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Unified Diff View
// ============================================================================

interface DiffViewProps {
  hunks: DiffHunk[];
  commentsByLine: Map<string, GitHubPullRequestComment[]>;
  pendingByLine: Map<string, PendingReviewComment[]>;
  commentingLine: { line: number; side: 'LEFT' | 'RIGHT' } | null;
  newCommentBody: string;
  onLineClick: (line: number, side: 'LEFT' | 'RIGHT') => void;
  onCommentBodyChange: (body: string) => void;
  onSubmitComment: () => void;
  onCancelComment: () => void;
  onReplyToComment?: (commentId: number, body: string) => void;
  onEditComment?: (commentId: number, body: string) => void;
  onDeleteComment?: (commentId: number) => void;
  onRemovePendingComment?: (id: string) => void;
  canComment: boolean;
}

const UnifiedDiffView: React.FC<DiffViewProps> = ({
  hunks,
  commentsByLine,
  pendingByLine,
  commentingLine,
  newCommentBody,
  onLineClick,
  onCommentBodyChange,
  onSubmitComment,
  onCancelComment,
  onReplyToComment,
  onEditComment,
  onDeleteComment,
  onRemovePendingComment,
  canComment,
}) => {
  return (
    <table className="w-full text-xs font-mono">
      <tbody>
        {hunks.map((hunk, hunkIndex) => (
          <React.Fragment key={hunkIndex}>
            {/* Hunk header */}
            <tr className="bg-blue-50">
              <td className="w-10 px-2 py-1 text-blue-600 text-right select-none">...</td>
              <td className="w-10 px-2 py-1 text-blue-600 text-right select-none">...</td>
              <td className="px-2 py-1 text-blue-700">{hunk.header}</td>
            </tr>

            {/* Hunk lines */}
            {hunk.lines.map((line, lineIndex) => {
              const lineKey = `${hunk.newStart + lineIndex}-RIGHT`;
              const comments = commentsByLine.get(lineKey) || [];
              const pending = pendingByLine.get(lineKey) || [];
              const isCommenting =
                commentingLine?.line === (line.newLineNumber || line.oldLineNumber) &&
                commentingLine?.side === 'RIGHT';

              return (
                <React.Fragment key={lineIndex}>
                  <DiffLineRow
                    line={line}
                    onLineClick={onLineClick}
                    canComment={canComment}
                    viewMode="unified"
                  />

                  {/* Existing comments */}
                  {comments.length > 0 && (
                    <tr>
                      <td colSpan={3} className="p-0">
                        <div className="mx-4 my-2">
                          {comments.map((comment) => (
                            <PRInlineComment
                              key={comment.id}
                              comment={comment}
                              onReply={onReplyToComment}
                              onEdit={onEditComment}
                              onDelete={onDeleteComment}
                            />
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* Pending comments */}
                  {pending.length > 0 && (
                    <tr>
                      <td colSpan={3} className="p-0">
                        <div className="mx-4 my-2">
                          {pending.map((pc) => (
                            <div
                              key={pc.id}
                              className="p-2 bg-yellow-50 border border-yellow-200 rounded-md"
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs text-yellow-700 font-medium">
                                  Pending comment
                                </span>
                                {onRemovePendingComment && (
                                  <button
                                    onClick={() => onRemovePendingComment(pc.id)}
                                    className="text-xs text-red-600 hover:underline"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{pc.body}</p>
                            </div>
                          ))}
                        </div>
                      </td>
                    </tr>
                  )}

                  {/* New comment form */}
                  {isCommenting && (
                    <tr>
                      <td colSpan={3} className="p-0">
                        <div className="mx-4 my-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                          <textarea
                            value={newCommentBody}
                            onChange={(e) => onCommentBodyChange(e.target.value)}
                            placeholder="Leave a comment..."
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                            rows={3}
                            // eslint-disable-next-line jsx-a11y/no-autofocus
                            autoFocus
                          />
                          <div className="mt-2 flex justify-end gap-2">
                            <button
                              onClick={onCancelComment}
                              className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={onSubmitComment}
                              disabled={!newCommentBody.trim()}
                              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                              Add comment
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </React.Fragment>
        ))}
      </tbody>
    </table>
  );
};

// ============================================================================
// Split Diff View
// ============================================================================

const SplitDiffView: React.FC<DiffViewProps> = ({
  hunks,
  commentsByLine: _commentsByLine,
  pendingByLine: _pendingByLine,
  commentingLine: _commentingLine,
  newCommentBody: _newCommentBody,
  onLineClick,
  onCommentBodyChange: _onCommentBodyChange,
  onSubmitComment: _onSubmitComment,
  onCancelComment: _onCancelComment,
  canComment,
}) => {
  // For split view, we need to pair up old and new lines
  const pairedLines = useMemo(() => {
    const pairs: Array<{
      oldLine?: DiffLine;
      newLine?: DiffLine;
    }> = [];

    hunks.forEach((hunk) => {
      // Add hunk header
      pairs.push({ oldLine: { type: 'hunk', content: hunk.header } });

      let oldLines: DiffLine[] = [];
      let newLines: DiffLine[] = [];

      hunk.lines.forEach((line) => {
        if (line.type === 'deletion') {
          oldLines.push(line);
        } else if (line.type === 'addition') {
          newLines.push(line);
        } else {
          // Flush any accumulated changes
          while (oldLines.length || newLines.length) {
            pairs.push({
              oldLine: oldLines.shift(),
              newLine: newLines.shift(),
            });
          }
          // Add context line to both sides
          pairs.push({ oldLine: line, newLine: line });
        }
      });

      // Flush remaining
      while (oldLines.length || newLines.length) {
        pairs.push({
          oldLine: oldLines.shift(),
          newLine: newLines.shift(),
        });
      }
    });

    return pairs;
  }, [hunks]);

  return (
    <table className="w-full text-xs font-mono">
      <tbody>
        {pairedLines.map((pair, index) => {
          const isHunk = pair.oldLine?.type === 'hunk';

          if (isHunk) {
            return (
              <tr key={index} className="bg-blue-50">
                <td colSpan={4} className="px-2 py-1 text-blue-700 text-center">
                  {pair.oldLine?.content}
                </td>
              </tr>
            );
          }

          return (
            <tr key={index}>
              {/* Old side */}
              <td className="w-10 px-2 py-0.5 text-gray-400 text-right select-none border-r border-gray-200 bg-gray-50">
                {pair.oldLine?.oldLineNumber || ''}
              </td>
              <td
                className={`w-1/2 px-2 py-0.5 border-r border-gray-200 ${
                  pair.oldLine?.type === 'deletion' ? 'bg-red-50' : ''
                } ${canComment ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                onClick={() => {
                  if (canComment && pair.oldLine?.oldLineNumber !== undefined) {
                    onLineClick(pair.oldLine.oldLineNumber, 'LEFT');
                  }
                }}
              >
                <span
                  className={pair.oldLine?.type === 'deletion' ? 'text-red-800' : 'text-gray-600'}
                >
                  {pair.oldLine?.content || ''}
                </span>
              </td>

              {/* New side */}
              <td className="w-10 px-2 py-0.5 text-gray-400 text-right select-none border-r border-gray-200 bg-gray-50">
                {pair.newLine?.newLineNumber || ''}
              </td>
              <td
                className={`w-1/2 px-2 py-0.5 ${
                  pair.newLine?.type === 'addition' ? 'bg-green-50' : ''
                } ${canComment ? 'cursor-pointer hover:bg-blue-50' : ''}`}
                onClick={() => {
                  if (canComment && pair.newLine?.newLineNumber !== undefined) {
                    onLineClick(pair.newLine.newLineNumber, 'RIGHT');
                  }
                }}
              >
                <span
                  className={pair.newLine?.type === 'addition' ? 'text-green-800' : 'text-gray-600'}
                >
                  {pair.newLine?.content || ''}
                </span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ============================================================================
// Diff Line Row
// ============================================================================

interface DiffLineRowProps {
  line: DiffLine;
  onLineClick: (line: number, side: 'LEFT' | 'RIGHT') => void;
  canComment: boolean;
  viewMode: 'unified' | 'split';
}

const DiffLineRow: React.FC<DiffLineRowProps> = ({ line, onLineClick, canComment }) => {
  const getLineClass = () => {
    switch (line.type) {
      case 'addition':
        return 'bg-green-50';
      case 'deletion':
        return 'bg-red-50';
      case 'hunk':
        return 'bg-blue-50';
      default:
        return '';
    }
  };

  const getContentClass = () => {
    switch (line.type) {
      case 'addition':
        return 'text-green-800';
      case 'deletion':
        return 'text-red-800';
      case 'hunk':
        return 'text-blue-700';
      default:
        return 'text-gray-600';
    }
  };

  const lineNumber = line.newLineNumber || line.oldLineNumber;
  const side: 'LEFT' | 'RIGHT' = line.type === 'deletion' ? 'LEFT' : 'RIGHT';

  return (
    <tr className={`${getLineClass()} group`}>
      {/* Old line number */}
      <td className="w-10 px-2 py-0.5 text-gray-400 text-right select-none border-r border-gray-100">
        {line.oldLineNumber || ''}
      </td>

      {/* New line number */}
      <td className="w-10 px-2 py-0.5 text-gray-400 text-right select-none border-r border-gray-100">
        {line.newLineNumber || ''}
      </td>

      {/* Content */}
      <td
        className={`px-2 py-0.5 whitespace-pre ${canComment ? 'cursor-pointer' : ''}`}
        onClick={() => canComment && lineNumber && onLineClick(lineNumber, side)}
      >
        <div className="flex items-start gap-1">
          {/* Add comment button (shows on hover) */}
          {canComment && lineNumber && (
            <button
              className="opacity-0 group-hover:opacity-100 flex-shrink-0 w-4 h-4 flex items-center justify-center text-blue-600 hover:bg-blue-100 rounded"
              onClick={(e) => {
                e.stopPropagation();
                onLineClick(lineNumber, side);
              }}
              title="Add comment"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
          )}
          <span className={getContentClass()}>{line.content}</span>
        </div>
      </td>
    </tr>
  );
};

// ============================================================================
// Patch Parser
// ============================================================================

function parsePatch(file: GitHubPRFile): ParsedFileDiff {
  const result: ParsedFileDiff = {
    filename: file.filename,
    previousFilename: file.previous_filename,
    status: file.status as ParsedFileDiff['status'],
    additions: file.additions,
    deletions: file.deletions,
    isBinary: !file.patch,
    hunks: [],
  };

  if (!file.patch) return result;

  const lines = file.patch.split('\n');
  let currentHunk: DiffHunk | null = null;
  let oldLineNum = 0;
  let newLineNum = 0;

  for (const rawLine of lines) {
    // Hunk header: @@ -oldStart,oldCount +newStart,newCount @@
    const hunkMatch = rawLine.match(/^@@\s+-(\d+)(?:,(\d+))?\s+\+(\d+)(?:,(\d+))?\s+@@(.*)?$/);

    if (hunkMatch) {
      currentHunk = {
        header: rawLine,
        oldStart: parseInt(hunkMatch[1] || '1', 10),
        oldCount: parseInt(hunkMatch[2] || '1', 10),
        newStart: parseInt(hunkMatch[3] || '1', 10),
        newCount: parseInt(hunkMatch[4] || '1', 10),
        lines: [],
      };
      result.hunks.push(currentHunk);
      oldLineNum = currentHunk.oldStart;
      newLineNum = currentHunk.newStart;
      continue;
    }

    if (!currentHunk) continue;

    const prefix = rawLine[0] || ' ';
    const content = rawLine.substring(1) || '';

    let diffLine: DiffLine;

    switch (prefix) {
      case '+':
        diffLine = {
          type: 'addition',
          content,
          newLineNumber: newLineNum++,
        };
        break;
      case '-':
        diffLine = {
          type: 'deletion',
          content,
          oldLineNumber: oldLineNum++,
        };
        break;
      case '\\':
        // "\ No newline at end of file" - skip
        continue;
      default:
        diffLine = {
          type: 'context',
          content: content || rawLine || '',
          oldLineNumber: oldLineNum++,
          newLineNumber: newLineNum++,
        };
    }

    currentHunk.lines.push(diffLine);
  }

  return result;
}

export default PRFileDiffViewer;
