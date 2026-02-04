/**
 * PR Review Submit Dialog Component
 * Modal for submitting a PR review with pending comments
 */

import React, { useState } from 'react';
import { Dialog } from '@/components/common/Dialog';
import type { GitHubPullRequest, PendingReviewComment, ReviewEvent } from '@/types/github';

export interface PRReviewSubmitDialogProps {
  isOpen: boolean;
  onClose: () => void;
  pr: GitHubPullRequest;
  pendingComments: PendingReviewComment[];
  onSubmit: (event: ReviewEvent, body: string) => void;
  isSubmitting?: boolean;
}

export const PRReviewSubmitDialog: React.FC<PRReviewSubmitDialogProps> = ({
  isOpen,
  onClose,
  pr,
  pendingComments,
  onSubmit,
  isSubmitting = false,
}) => {
  const [reviewBody, setReviewBody] = useState('');
  const [reviewEvent, setReviewEvent] = useState<ReviewEvent>('COMMENT');

  const handleSubmit = () => {
    onSubmit(reviewEvent, reviewBody.trim());
  };

  const getEventColor = (event: ReviewEvent) => {
    switch (event) {
      case 'APPROVE':
        return 'bg-green-600 hover:bg-green-700';
      case 'REQUEST_CHANGES':
        return 'bg-red-600 hover:bg-red-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const getEventLabel = (event: ReviewEvent) => {
    switch (event) {
      case 'APPROVE':
        return 'Approve';
      case 'REQUEST_CHANGES':
        return 'Request Changes';
      default:
        return 'Comment';
    }
  };

  return (
    <Dialog isOpen={isOpen} onClose={onClose} title="Submit Review" size="md">
      <div className="space-y-4">
        {/* PR Info */}
        <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-gray-500">#{pr.number}</span>
            <span className="font-medium text-gray-900 truncate">{pr.title}</span>
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {pr.head.ref} → {pr.base.ref}
          </div>
        </div>

        {/* Pending comments count */}
        {pendingComments.length > 0 && (
          <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
              />
            </svg>
            <span className="text-sm text-yellow-800">
              You have <strong>{pendingComments.length}</strong> pending comment
              {pendingComments.length !== 1 ? 's' : ''} on this PR.
            </span>
          </div>
        )}

        {/* Pending comments preview */}
        {pendingComments.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-2">
            {pendingComments.map((comment) => (
              <div key={comment.id} className="p-2 bg-white border border-gray-200 rounded text-xs">
                <div className="font-mono text-gray-500">
                  {comment.path}:{comment.line}
                </div>
                <div className="mt-1 text-gray-700 truncate">{comment.body}</div>
              </div>
            ))}
          </div>
        )}

        {/* Review body */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Review Summary{' '}
            {reviewEvent !== 'APPROVE' && <span className="text-gray-400">(optional)</span>}
          </label>
          <textarea
            value={reviewBody}
            onChange={(e) => setReviewBody(e.target.value)}
            placeholder={
              reviewEvent === 'APPROVE'
                ? 'LGTM! (optional)'
                : 'Leave a comment about this pull request...'
            }
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={4}
          />
        </div>

        {/* Review event selection */}
        <div>
          <span className="block text-sm font-medium text-gray-700 mb-2">Review Action</span>
          <div className="space-y-2">
            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reviewEvent"
                value="COMMENT"
                checked={reviewEvent === 'COMMENT'}
                onChange={() => setReviewEvent('COMMENT')}
                className="mt-0.5 text-blue-600"
              />
              <div>
                <div className="font-medium text-gray-900">Comment</div>
                <div className="text-xs text-gray-500">
                  Submit general feedback without explicit approval
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reviewEvent"
                value="APPROVE"
                checked={reviewEvent === 'APPROVE'}
                onChange={() => setReviewEvent('APPROVE')}
                className="mt-0.5 text-green-600"
              />
              <div>
                <div className="font-medium text-green-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Approve
                </div>
                <div className="text-xs text-gray-500">
                  Submit feedback and approve merging these changes
                </div>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
              <input
                type="radio"
                name="reviewEvent"
                value="REQUEST_CHANGES"
                checked={reviewEvent === 'REQUEST_CHANGES'}
                onChange={() => setReviewEvent('REQUEST_CHANGES')}
                className="mt-0.5 text-red-600"
              />
              <div>
                <div className="font-medium text-red-700 flex items-center gap-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Request Changes
                </div>
                <div className="text-xs text-gray-500">
                  Submit feedback that must be addressed before merging
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (reviewEvent !== 'APPROVE' && !reviewBody.trim() && pendingComments.length === 0)
            }
            className={`px-4 py-2 text-sm font-medium text-white rounded-lg disabled:opacity-50 flex items-center gap-2 ${getEventColor(reviewEvent)}`}
          >
            {isSubmitting ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                Submitting...
              </>
            ) : (
              <>Submit Review ({getEventLabel(reviewEvent)})</>
            )}
          </button>
        </div>
      </div>
    </Dialog>
  );
};

export default PRReviewSubmitDialog;
