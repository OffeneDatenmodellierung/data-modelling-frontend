/**
 * PR Inline Comment Component
 * Displays a review comment thread with reply, edit, and delete capabilities
 */

import React, { useState } from 'react';
import type { GitHubPullRequestComment } from '@/types/github';

export interface PRInlineCommentProps {
  comment: GitHubPullRequestComment;
  replies?: GitHubPullRequestComment[];
  onReply?: (commentId: number, body: string) => void;
  onEdit?: (commentId: number, body: string) => void;
  onDelete?: (commentId: number) => void;
  onResolve?: () => void;
  isResolved?: boolean;
  className?: string;
}

export const PRInlineComment: React.FC<PRInlineCommentProps> = ({
  comment,
  replies = [],
  onReply,
  onEdit,
  onDelete,
  onResolve,
  isResolved = false,
  className = '',
}) => {
  const [isReplying, setIsReplying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [editBody, setEditBody] = useState(comment.body);
  const [showActions, setShowActions] = useState(false);

  // Handle reply submission
  const handleSubmitReply = () => {
    if (!replyBody.trim() || !onReply) return;
    onReply(comment.id, replyBody.trim());
    setReplyBody('');
    setIsReplying(false);
  };

  // Handle edit submission
  const handleSubmitEdit = () => {
    if (!editBody.trim() || !onEdit) return;
    onEdit(comment.id, editBody.trim());
    setIsEditing(false);
  };

  // Handle delete
  const handleDelete = () => {
    if (!onDelete) return;
    if (window.confirm('Are you sure you want to delete this comment?')) {
      onDelete(comment.id);
    }
  };

  // Format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div
      className={`border border-gray-200 rounded-lg bg-white ${isResolved ? 'opacity-60' : ''} ${className}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Main comment */}
      <div className="p-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <img
              src={comment.user.avatar_url}
              alt={comment.user.login}
              className="w-6 h-6 rounded-full"
            />
            <span className="text-sm font-medium text-gray-900">{comment.user.login}</span>
            <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
            {comment.updated_at !== comment.created_at && (
              <span className="text-xs text-gray-400">(edited)</span>
            )}
          </div>

          {/* Actions */}
          {showActions && (onEdit || onDelete || onResolve) && (
            <div className="flex items-center gap-1">
              {onResolve && (
                <button
                  onClick={onResolve}
                  className="p-1 text-xs text-gray-500 hover:text-green-600 hover:bg-green-50 rounded"
                  title={isResolved ? 'Unresolve' : 'Resolve'}
                >
                  {isResolved ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              )}
              {onEdit && (
                <button
                  onClick={() => {
                    setIsEditing(true);
                    setEditBody(comment.body);
                  }}
                  className="p-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                  title="Edit"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                </button>
              )}
              {onDelete && (
                <button
                  onClick={handleDelete}
                  className="p-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="mt-2">
            <textarea
              value={editBody}
              onChange={(e) => setEditBody(e.target.value)}
              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
              rows={3}
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
            />
            <div className="mt-2 flex justify-end gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitEdit}
                disabled={!editBody.trim()}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</div>
        )}

        {/* Diff hunk preview (if available) */}
        {comment.diff_hunk && (
          <div className="mt-2 p-2 bg-gray-50 rounded text-xs font-mono overflow-x-auto">
            <pre className="text-gray-600">{comment.diff_hunk}</pre>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.length > 0 && (
        <div className="border-t border-gray-100">
          {replies.map((reply) => (
            <ReplyComment
              key={reply.id}
              comment={reply}
              onEdit={onEdit}
              onDelete={onDelete}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}

      {/* Reply form */}
      {onReply && (
        <div className="border-t border-gray-100 p-3">
          {isReplying ? (
            <div>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                placeholder="Write a reply..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                rows={2}
                // eslint-disable-next-line jsx-a11y/no-autofocus
                autoFocus
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setIsReplying(false);
                    setReplyBody('');
                  }}
                  className="px-3 py-1 text-xs text-gray-600 hover:bg-gray-100 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReply}
                  disabled={!replyBody.trim()}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  Reply
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsReplying(true)}
              className="text-xs text-blue-600 hover:underline"
            >
              Reply...
            </button>
          )}
        </div>
      )}

      {/* Resolved indicator */}
      {isResolved && (
        <div className="px-3 py-2 bg-green-50 border-t border-green-100 text-xs text-green-700 flex items-center gap-1">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Resolved</span>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Reply Comment
// ============================================================================

interface ReplyCommentProps {
  comment: GitHubPullRequestComment;
  onEdit?: (commentId: number, body: string) => void;
  onDelete?: (commentId: number) => void;
  formatDate: (date: string) => string;
}

const ReplyComment: React.FC<ReplyCommentProps> = ({ comment, onEdit, onDelete, formatDate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editBody, setEditBody] = useState(comment.body);
  const [showActions, setShowActions] = useState(false);

  const handleSubmitEdit = () => {
    if (!editBody.trim() || !onEdit) return;
    onEdit(comment.id, editBody.trim());
    setIsEditing(false);
  };

  const handleDelete = () => {
    if (!onDelete) return;
    if (window.confirm('Are you sure you want to delete this reply?')) {
      onDelete(comment.id);
    }
  };

  return (
    <div
      className="p-3 pl-8 bg-gray-50"
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img
            src={comment.user.avatar_url}
            alt={comment.user.login}
            className="w-5 h-5 rounded-full"
          />
          <span className="text-sm font-medium text-gray-900">{comment.user.login}</span>
          <span className="text-xs text-gray-500">{formatDate(comment.created_at)}</span>
        </div>

        {/* Actions */}
        {showActions && (onEdit || onDelete) && (
          <div className="flex items-center gap-1">
            {onEdit && (
              <button
                onClick={() => {
                  setIsEditing(true);
                  setEditBody(comment.body);
                }}
                className="p-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded"
                title="Edit"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                  />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                onClick={handleDelete}
                className="p-1 text-xs text-gray-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Body */}
      {isEditing ? (
        <div className="mt-2">
          <textarea
            value={editBody}
            onChange={(e) => setEditBody(e.target.value)}
            className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
            rows={2}
            // eslint-disable-next-line jsx-a11y/no-autofocus
            autoFocus
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={() => setIsEditing(false)}
              className="px-2 py-0.5 text-xs text-gray-600 hover:bg-gray-100 rounded"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmitEdit}
              disabled={!editBody.trim()}
              className="px-2 py-0.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</div>
      )}
    </div>
  );
};

export default PRInlineComment;
