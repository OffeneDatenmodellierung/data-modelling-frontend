/**
 * GitHub PR Detail Panel Component
 * Comprehensive view of a single pull request with comments, reviews, files, and actions
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectSelectedPR,
  selectPRComments,
  selectPRReviews,
  selectPRFiles,
  selectIsLoadingPRDetails,
  selectPRDetailsError,
  selectPendingComments,
  selectPendingCommentCount,
  selectHasPendingReview,
} from '@/stores/githubStore';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { useShallow } from 'zustand/react/shallow';
import { githubApi } from '@/services/github/githubApi';
import type {
  GitHubPullRequest,
  GitHubPullRequestReview,
  GitHubIssueComment,
  GitHubPRFile,
  PendingReviewComment,
} from '@/types/github';
import { GitHubPRConflictPanel } from './GitHubPRConflictPanel';
import { PRFileDiffViewer } from './PRFileDiffViewer';
import { PRReviewSubmitDialog } from './PRReviewSubmitDialog';

export interface GitHubPRDetailPanelProps {
  className?: string;
  onClose?: () => void;
}

type DetailTab = 'conversation' | 'files' | 'reviews';

export const GitHubPRDetailPanel: React.FC<GitHubPRDetailPanelProps> = ({
  className = '',
  onClose,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const selectedPR = useGitHubStore(selectSelectedPR);
  const comments = useGitHubStore(selectPRComments);
  const reviews = useGitHubStore(selectPRReviews);
  const files = useGitHubStore(selectPRFiles);
  const isLoading = useGitHubStore(selectIsLoadingPRDetails);
  const error = useGitHubStore(selectPRDetailsError);
  const pendingComments = useGitHubStore(selectPendingComments);
  const pendingCommentCount = useGitHubStore(selectPendingCommentCount);
  const hasPendingReview = useGitHubStore(selectHasPendingReview);

  // Use shallow comparison for store actions and state to prevent infinite loops
  const {
    connectionFromStore,
    setPRComments,
    setPRReviews,
    setPRFiles,
    setLoadingPRDetails,
    setPRDetailsError,
    addPRComment,
    addPRReview,
    updatePR,
    clearPRDetails,
    startPendingReview,
    addPendingComment,
    removePendingComment,
    discardPendingReview,
  } = useGitHubStore(
    useShallow((state) => ({
      connectionFromStore: state.connection,
      setPRComments: state.setPRComments,
      setPRReviews: state.setPRReviews,
      setPRFiles: state.setPRFiles,
      setLoadingPRDetails: state.setLoadingPRDetails,
      setPRDetailsError: state.setPRDetailsError,
      addPRComment: state.addPRComment,
      addPRReview: state.addPRReview,
      updatePR: state.updatePR,
      clearPRDetails: state.clearPRDetails,
      startPendingReview: state.startPendingReview,
      addPendingComment: state.addPendingComment,
      removePendingComment: state.removePendingComment,
      discardPendingReview: state.discardPendingReview,
    }))
  );

  // Also check githubRepoStore for connection info (used when opening from URL)
  const repoWorkspace = useGitHubRepoStore(
    useShallow((state) => ({
      owner: state.workspace?.owner ?? null,
      repo: state.workspace?.repo ?? null,
      branch: state.workspace?.branch ?? null,
      hasWorkspace: state.workspace !== null,
    }))
  );

  // Use connection from either store - prefer local store, fallback to repo workspace
  const connection = useMemo(() => {
    if (connectionFromStore) return connectionFromStore;
    if (repoWorkspace.hasWorkspace && repoWorkspace.owner && repoWorkspace.repo) {
      return {
        owner: repoWorkspace.owner,
        repo: repoWorkspace.repo,
        branch: repoWorkspace.branch,
      };
    }
    return null;
  }, [
    connectionFromStore,
    repoWorkspace.hasWorkspace,
    repoWorkspace.owner,
    repoWorkspace.repo,
    repoWorkspace.branch,
  ]);

  const [activeTab, setActiveTab] = useState<DetailTab>('conversation');
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [mergeMethod, setMergeMethod] = useState<'merge' | 'squash' | 'rebase'>('merge');
  const [showMergeOptions, setShowMergeOptions] = useState(false);
  const [reviewBody, setReviewBody] = useState('');
  const [reviewEvent, setReviewEvent] = useState<'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT'>(
    'COMMENT'
  );
  const [showReviewDialog, setShowReviewDialog] = useState(false);

  // Load PR details
  const loadDetails = useCallback(async () => {
    if (!connection || !selectedPR) return;

    setLoadingPRDetails(true);
    setPRDetailsError(null);

    try {
      const [commentsData, reviewsData, filesData] = await Promise.all([
        githubApi.listPRComments(connection.owner, connection.repo, selectedPR.number),
        githubApi.listPRReviews(connection.owner, connection.repo, selectedPR.number),
        githubApi.listPRFiles(connection.owner, connection.repo, selectedPR.number),
      ]);

      setPRComments(commentsData);
      setPRReviews(reviewsData);
      setPRFiles(filesData);
    } catch (err) {
      setPRDetailsError(err instanceof Error ? err.message : 'Failed to load PR details');
    }
  }, [
    connection,
    selectedPR,
    setPRComments,
    setPRReviews,
    setPRFiles,
    setLoadingPRDetails,
    setPRDetailsError,
  ]);

  // Track which PR we've loaded to prevent duplicate loads
  const loadedPRRef = useRef<number | null>(null);

  // Load details when PR changes
  // Note: We intentionally exclude loadDetails from dependencies to prevent infinite loops.
  // The loadDetails callback is recreated when connection changes, but we only want to
  // trigger loading when selectedPR.number actually changes.
  useEffect(() => {
    if (selectedPR && selectedPR.number !== loadedPRRef.current) {
      loadedPRRef.current = selectedPR.number;
      loadDetails();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPR?.number]);

  // Submit a comment
  const handleSubmitComment = async () => {
    if (!connection || !selectedPR || !newComment.trim()) return;

    setIsSubmittingComment(true);
    try {
      const comment = await githubApi.createPRComment(
        connection.owner,
        connection.repo,
        selectedPR.number,
        newComment.trim()
      );
      addPRComment(comment);
      setNewComment('');
    } catch (err) {
      setPRDetailsError(err instanceof Error ? err.message : 'Failed to add comment');
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Submit a review
  const handleSubmitReview = async () => {
    if (!connection || !selectedPR) return;

    setIsSubmittingReview(true);
    try {
      const review = await githubApi.createPRReview(
        connection.owner,
        connection.repo,
        selectedPR.number,
        {
          body: reviewBody.trim() || undefined,
          event: reviewEvent,
        }
      );
      addPRReview(review);
      setReviewBody('');
      // Refresh PR to get updated state
      const updatedPR = await githubApi.getPullRequest(
        connection.owner,
        connection.repo,
        selectedPR.number
      );
      updatePR(updatedPR);
    } catch (err) {
      setPRDetailsError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Merge PR
  const handleMerge = async () => {
    if (!connection || !selectedPR) return;

    setIsMerging(true);
    try {
      await githubApi.mergePullRequest(connection.owner, connection.repo, selectedPR.number, {
        merge_method: mergeMethod,
      });
      // Refresh PR to get merged state
      const updatedPR = await githubApi.getPullRequest(
        connection.owner,
        connection.repo,
        selectedPR.number
      );
      updatePR(updatedPR);
      setShowMergeOptions(false);
    } catch (err) {
      setPRDetailsError(err instanceof Error ? err.message : 'Failed to merge PR');
    } finally {
      setIsMerging(false);
    }
  };

  // Handle adding an inline comment (starts pending review if needed)
  const handleAddInlineComment = (
    path: string,
    line: number,
    side: 'LEFT' | 'RIGHT',
    body: string
  ) => {
    if (!selectedPR) return;

    // Start pending review if not already started
    if (!hasPendingReview) {
      startPendingReview(selectedPR.number);
    }

    // Add the comment to pending review
    addPendingComment({
      path,
      line,
      side,
      body,
    });
  };

  // Handle submitting the pending review
  const handleSubmitPendingReview = async (
    event: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT',
    body?: string
  ) => {
    if (!connection || !selectedPR) return;

    setIsSubmittingReview(true);
    try {
      // If we have pending inline comments, we need to use the MCP tools
      // For now, submit a regular review (inline comments support would need MCP integration)
      const review = await githubApi.createPRReview(
        connection.owner,
        connection.repo,
        selectedPR.number,
        {
          body: body || undefined,
          event,
        }
      );
      addPRReview(review);

      // Clear pending review
      discardPendingReview();
      setShowReviewDialog(false);

      // Refresh PR to get updated state
      const updatedPR = await githubApi.getPullRequest(
        connection.owner,
        connection.repo,
        selectedPR.number
      );
      updatePR(updatedPR);
    } catch (err) {
      setPRDetailsError(err instanceof Error ? err.message : 'Failed to submit review');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Close handler
  const handleClose = () => {
    clearPRDetails();
    onClose?.();
  };

  if (!isConnected || !selectedPR) {
    return null;
  }

  return (
    <div className={`flex flex-col h-full bg-white ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <PRStatusBadge pr={selectedPR} />
              <span className="text-sm text-gray-500">#{selectedPR.number}</span>
            </div>
            <h2 className="mt-1 text-lg font-semibold text-gray-900 truncate">
              {selectedPR.title}
            </h2>
            <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
              <img
                src={selectedPR.user.avatar_url}
                alt={selectedPR.user.login}
                className="w-5 h-5 rounded-full"
              />
              <span>{selectedPR.user.login}</span>
              <span>•</span>
              <span>{new Date(selectedPR.created_at).toLocaleDateString()}</span>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <code className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">
                {selectedPR.head.ref}
              </code>
              <span className="text-gray-400">→</span>
              <code className="px-1.5 py-0.5 bg-gray-100 text-gray-700 rounded">
                {selectedPR.base.ref}
              </code>
            </div>
          </div>
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

        {/* Tabs */}
        <div className="mt-4 flex gap-1 border-b border-gray-200 -mb-px">
          {(['conversation', 'files', 'reviews'] as DetailTab[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'conversation' && comments.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {comments.length}
                </span>
              )}
              {tab === 'files' && files.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {files.length}
                </span>
              )}
              {tab === 'reviews' && reviews.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 text-xs bg-gray-100 rounded-full">
                  {reviews.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
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
          <div className="p-4 text-center text-red-600">{error}</div>
        ) : (
          <>
            {activeTab === 'conversation' && (
              <ConversationTab
                pr={selectedPR}
                comments={comments}
                newComment={newComment}
                setNewComment={setNewComment}
                isSubmitting={isSubmittingComment}
                onSubmit={handleSubmitComment}
              />
            )}
            {activeTab === 'files' && (
              <FilesTab
                files={files}
                pendingComments={pendingComments}
                onAddComment={handleAddInlineComment}
                onRemoveComment={removePendingComment}
              />
            )}
            {activeTab === 'reviews' && (
              <ReviewsTab
                reviews={reviews}
                reviewBody={reviewBody}
                setReviewBody={setReviewBody}
                reviewEvent={reviewEvent}
                setReviewEvent={setReviewEvent}
                isSubmitting={isSubmittingReview}
                onSubmit={handleSubmitReview}
              />
            )}
          </>
        )}
      </div>

      {/* Review Submit Dialog */}
      <PRReviewSubmitDialog
        isOpen={showReviewDialog}
        onClose={() => setShowReviewDialog(false)}
        pr={selectedPR}
        pendingComments={pendingComments}
        isSubmitting={isSubmittingReview}
        onSubmit={handleSubmitPendingReview}
      />

      {/* Footer - Merge Actions */}
      {selectedPR.state === 'open' && !selectedPR.merged && (
        <div className="border-t border-gray-200 p-4 space-y-3">
          {/* Submit Review Button */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowReviewDialog(true)}
              className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              Submit Review
              {pendingCommentCount > 0 && (
                <span className="px-1.5 py-0.5 text-xs bg-blue-500 rounded-full">
                  {pendingCommentCount}
                </span>
              )}
            </button>
          </div>

          <GitHubPRConflictPanel pullRequest={selectedPR} onUpdated={loadDetails} />

          {/* Merge Button */}
          {selectedPR.mergeable !== false && (
            <div className="relative">
              <div className="flex gap-2">
                <button
                  onClick={() => setShowMergeOptions(!showMergeOptions)}
                  disabled={isMerging || selectedPR.mergeable_state === 'dirty'}
                  className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isMerging ? (
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
                      Merging...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <path
                          fillRule="evenodd"
                          d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
                        />
                      </svg>
                      Merge pull request
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowMergeOptions(!showMergeOptions)}
                  className="px-2 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>

              {/* Merge Method Dropdown */}
              {showMergeOptions && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                  {(['merge', 'squash', 'rebase'] as const).map((method) => (
                    <button
                      key={method}
                      onClick={() => {
                        setMergeMethod(method);
                        handleMerge();
                      }}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                    >
                      <div className="font-medium text-gray-900">
                        {method === 'merge' && 'Create a merge commit'}
                        {method === 'squash' && 'Squash and merge'}
                        {method === 'rebase' && 'Rebase and merge'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {method === 'merge' &&
                          'All commits will be added to the base branch via a merge commit.'}
                        {method === 'squash' &&
                          'Commits will be combined into one commit in the base branch.'}
                        {method === 'rebase' &&
                          'Commits will be rebased and added to the base branch.'}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Sub-components
// ============================================================================

const PRStatusBadge: React.FC<{ pr: GitHubPullRequest }> = ({ pr }) => {
  if (pr.merged) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">
        Merged
      </span>
    );
  }
  if (pr.state === 'closed') {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
        Closed
      </span>
    );
  }
  if (pr.draft) {
    return (
      <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
        Draft
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">
      Open
    </span>
  );
};

const ConversationTab: React.FC<{
  pr: GitHubPullRequest;
  comments: GitHubIssueComment[];
  newComment: string;
  setNewComment: (value: string) => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}> = ({ pr, comments, newComment, setNewComment, isSubmitting, onSubmit }) => {
  return (
    <div className="p-4 space-y-4">
      {/* PR Description */}
      {pr.body && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2 mb-2">
            <img src={pr.user.avatar_url} alt={pr.user.login} className="w-6 h-6 rounded-full" />
            <span className="font-medium text-gray-900">{pr.user.login}</span>
            <span className="text-sm text-gray-500">opened this pull request</span>
          </div>
          <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
            {pr.body}
          </div>
        </div>
      )}

      {/* Comments */}
      {comments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No comments yet</div>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <CommentCard key={comment.id} comment={comment} />
          ))}
        </div>
      )}

      {/* Add Comment */}
      <div className="pt-4 border-t border-gray-200">
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Leave a comment..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
        <div className="mt-2 flex justify-end">
          <button
            onClick={onSubmit}
            disabled={isSubmitting || !newComment.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {isSubmitting ? 'Commenting...' : 'Comment'}
          </button>
        </div>
      </div>
    </div>
  );
};

const CommentCard: React.FC<{ comment: GitHubIssueComment }> = ({ comment }) => {
  return (
    <div className="p-3 bg-white border border-gray-200 rounded-lg">
      <div className="flex items-center gap-2 mb-2">
        <img
          src={comment.user.avatar_url}
          alt={comment.user.login}
          className="w-5 h-5 rounded-full"
        />
        <span className="font-medium text-sm text-gray-900">{comment.user.login}</span>
        <span className="text-xs text-gray-500">
          {new Date(comment.created_at).toLocaleDateString()}
        </span>
      </div>
      <div className="text-sm text-gray-700 whitespace-pre-wrap">{comment.body}</div>
    </div>
  );
};

const FilesTab: React.FC<{
  files: GitHubPRFile[];
  pendingComments: PendingReviewComment[];
  onAddComment: (path: string, line: number, side: 'LEFT' | 'RIGHT', body: string) => void;
  onRemoveComment: (id: string) => void;
}> = ({ files, pendingComments, onAddComment, onRemoveComment }) => {
  const totalAdditions = files.reduce((sum, f) => sum + f.additions, 0);
  const totalDeletions = files.reduce((sum, f) => sum + f.deletions, 0);

  return (
    <div className="p-4">
      {/* Summary */}
      <div className="mb-4 flex items-center gap-4 text-sm">
        <span className="text-gray-600">{files.length} files changed</span>
        <span className="text-green-600">+{totalAdditions}</span>
        <span className="text-red-600">-{totalDeletions}</span>
      </div>

      {/* File list */}
      <div className="space-y-2">
        {files.map((file) => (
          <FileCard
            key={file.sha}
            file={file}
            pendingComments={pendingComments.filter((c) => c.path === file.filename)}
            onAddComment={onAddComment}
            onRemoveComment={onRemoveComment}
          />
        ))}
      </div>
    </div>
  );
};

const FileCard: React.FC<{
  file: GitHubPRFile;
  pendingComments: PendingReviewComment[];
  onAddComment: (path: string, line: number, side: 'LEFT' | 'RIGHT', body: string) => void;
  onRemoveComment: (id: string) => void;
}> = ({ file, pendingComments, onAddComment, onRemoveComment }) => {
  const [expanded, setExpanded] = useState(false);

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

  const handleAddComment = (line: number, side: 'LEFT' | 'RIGHT', body: string) => {
    onAddComment(file.filename, line, side, body);
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-3 py-2 flex items-center gap-2 hover:bg-gray-50 text-left"
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
        <span className="flex-1 font-mono text-sm text-gray-900 truncate">{file.filename}</span>
        <span className="text-xs text-green-600">+{file.additions}</span>
        <span className="text-xs text-red-600">-{file.deletions}</span>
        {pendingComments.length > 0 && (
          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
            {pendingComments.length} pending
          </span>
        )}
      </button>

      {expanded && file.patch && (
        <div className="border-t border-gray-200">
          <PRFileDiffViewer
            file={file}
            existingComments={[]}
            pendingComments={pendingComments}
            onAddComment={handleAddComment}
            onRemovePendingComment={onRemoveComment}
            defaultExpanded={true}
          />
        </div>
      )}
    </div>
  );
};

const ReviewsTab: React.FC<{
  reviews: GitHubPullRequestReview[];
  reviewBody: string;
  setReviewBody: (value: string) => void;
  reviewEvent: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT';
  setReviewEvent: (value: 'APPROVE' | 'REQUEST_CHANGES' | 'COMMENT') => void;
  isSubmitting: boolean;
  onSubmit: () => void;
}> = ({
  reviews,
  reviewBody,
  setReviewBody,
  reviewEvent,
  setReviewEvent,
  isSubmitting,
  onSubmit,
}) => {
  return (
    <div className="p-4 space-y-4">
      {/* Existing reviews */}
      {reviews.length === 0 ? (
        <div className="text-center text-gray-500 py-8">No reviews yet</div>
      ) : (
        <div className="space-y-3">
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}

      {/* Submit review */}
      <div className="pt-4 border-t border-gray-200">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Submit a review</h4>
        <textarea
          value={reviewBody}
          onChange={(e) => setReviewBody(e.target.value)}
          placeholder="Leave a review comment (optional for approval)..."
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />

        <div className="mt-3 flex items-center gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="reviewEvent"
              value="COMMENT"
              checked={reviewEvent === 'COMMENT'}
              onChange={() => setReviewEvent('COMMENT')}
              className="text-blue-600"
            />
            <span className="text-sm text-gray-700">Comment</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="reviewEvent"
              value="APPROVE"
              checked={reviewEvent === 'APPROVE'}
              onChange={() => setReviewEvent('APPROVE')}
              className="text-green-600"
            />
            <span className="text-sm text-gray-700">Approve</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="reviewEvent"
              value="REQUEST_CHANGES"
              checked={reviewEvent === 'REQUEST_CHANGES'}
              onChange={() => setReviewEvent('REQUEST_CHANGES')}
              className="text-red-600"
            />
            <span className="text-sm text-gray-700">Request changes</span>
          </label>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            onClick={onSubmit}
            disabled={isSubmitting || (reviewEvent !== 'APPROVE' && !reviewBody.trim())}
            className={`px-4 py-2 text-sm rounded-lg disabled:opacity-50 ${
              reviewEvent === 'APPROVE'
                ? 'bg-green-600 text-white hover:bg-green-700'
                : reviewEvent === 'REQUEST_CHANGES'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit review'}
          </button>
        </div>
      </div>
    </div>
  );
};

const ReviewCard: React.FC<{ review: GitHubPullRequestReview }> = ({ review }) => {
  const getStateStyle = () => {
    switch (review.state) {
      case 'APPROVED':
        return 'text-green-700 bg-green-50 border-green-200';
      case 'CHANGES_REQUESTED':
        return 'text-red-700 bg-red-50 border-red-200';
      case 'COMMENTED':
        return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'DISMISSED':
        return 'text-gray-700 bg-gray-50 border-gray-200';
      default:
        return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStateText = () => {
    switch (review.state) {
      case 'APPROVED':
        return 'approved these changes';
      case 'CHANGES_REQUESTED':
        return 'requested changes';
      case 'COMMENTED':
        return 'commented';
      case 'DISMISSED':
        return 'review dismissed';
      default:
        return 'pending review';
    }
  };

  return (
    <div className={`p-3 border rounded-lg ${getStateStyle()}`}>
      <div className="flex items-center gap-2 mb-1">
        <img
          src={review.user.avatar_url}
          alt={review.user.login}
          className="w-5 h-5 rounded-full"
        />
        <span className="font-medium text-sm">{review.user.login}</span>
        <span className="text-sm">{getStateText()}</span>
        <span className="text-xs opacity-75">
          {new Date(review.submitted_at).toLocaleDateString()}
        </span>
      </div>
      {review.body && <div className="text-sm whitespace-pre-wrap mt-2">{review.body}</div>}
    </div>
  );
};
