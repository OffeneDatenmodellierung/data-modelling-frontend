/**
 * GitHub Tag Panel Component
 * Display and manage tags for the connected repository
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  useGitHubStore,
  selectIsConnected,
  selectConnectionInfo,
  selectTags,
  selectIsLoadingTags,
  selectTagError,
  selectSelectedTag,
} from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubTag, GitHubAnnotatedTag } from '@/types/github';

export interface GitHubTagPanelProps {
  className?: string;
  onTagSelect?: (tag: GitHubTag) => void;
}

export const GitHubTagPanel: React.FC<GitHubTagPanelProps> = ({ className = '', onTagSelect }) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connectionInfo = useGitHubStore(selectConnectionInfo);
  const connection = useGitHubStore((state) => state.connection);
  const tags = useGitHubStore(selectTags);
  const isLoading = useGitHubStore(selectIsLoadingTags);
  const error = useGitHubStore(selectTagError);
  const selectedTag = useGitHubStore(selectSelectedTag);

  const setTags = useGitHubStore((state) => state.setTags);
  const setLoadingTags = useGitHubStore((state) => state.setLoadingTags);
  const setTagError = useGitHubStore((state) => state.setTagError);
  const setSelectedTag = useGitHubStore((state) => state.setSelectedTag);
  const addTag = useGitHubStore((state) => state.addTag);
  const removeTag = useGitHubStore((state) => state.removeTag);

  const [filter, setFilter] = useState('');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tagDetails, setTagDetails] = useState<Map<string, GitHubAnnotatedTag>>(new Map());
  const [isLoadingDetails, setIsLoadingDetails] = useState<string | null>(null);

  // Load tags
  const loadTags = useCallback(async () => {
    if (!connection) return;

    setLoadingTags(true);
    setTagError(null);

    try {
      const fetchedTags = await githubApi.listTags(connection.owner, connection.repo, {
        per_page: 100,
      });
      setTags(fetchedTags);
    } catch (err) {
      setTagError(err instanceof Error ? err.message : 'Failed to load tags');
    }
  }, [connection, setTags, setLoadingTags, setTagError]);

  // Load tags on mount
  useEffect(() => {
    if (isConnected && tags.length === 0) {
      loadTags();
    }
  }, [isConnected, loadTags, tags.length]);

  // Load tag details (for annotated tags)
  const loadTagDetails = useCallback(
    async (tag: GitHubTag) => {
      if (!connection || tagDetails.has(tag.name)) return;

      setIsLoadingDetails(tag.name);
      try {
        const details = await githubApi.getTag(connection.owner, connection.repo, tag.commit.sha);
        setTagDetails((prev) => new Map(prev).set(tag.name, details));
      } catch {
        // Tag is likely lightweight, no additional details available
      } finally {
        setIsLoadingDetails(null);
      }
    },
    [connection, tagDetails]
  );

  // Handle tag click
  const handleTagClick = useCallback(
    (tag: GitHubTag) => {
      setSelectedTag(tag);
      loadTagDetails(tag);
      onTagSelect?.(tag);
    },
    [setSelectedTag, loadTagDetails, onTagSelect]
  );

  // Handle delete tag
  const handleDeleteTag = useCallback(
    async (tag: GitHubTag, e: React.MouseEvent) => {
      e.stopPropagation();

      if (!connection) return;
      if (!confirm(`Delete tag "${tag.name}"? This cannot be undone.`)) return;

      try {
        await githubApi.deleteTag(connection.owner, connection.repo, tag.name);
        removeTag(tag.name);
      } catch (err) {
        setTagError(err instanceof Error ? err.message : 'Failed to delete tag');
      }
    },
    [connection, removeTag, setTagError]
  );

  // Filter tags
  const filteredTags = tags.filter((tag) => tag.name.toLowerCase().includes(filter.toLowerCase()));

  // Format date
  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString();
  };

  if (!isConnected) {
    return (
      <div className={`p-4 text-center text-gray-500 ${className}`}>
        Connect a GitHub repository to view tags
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Tags</h3>
            <p className="text-xs text-gray-500">{connectionInfo?.fullName}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="p-1.5 text-gray-400 hover:text-gray-600"
              title="Create tag"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            </button>
            <button
              onClick={loadTags}
              disabled={isLoading}
              className="p-1.5 text-gray-400 hover:text-gray-600 disabled:opacity-50"
              title="Refresh"
            >
              <svg
                className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Filter */}
        <div className="mt-3">
          <input
            type="text"
            placeholder="Filter tags..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading && tags.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
        ) : filteredTags.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {filter ? 'No tags match your filter' : 'No tags found'}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTags.map((tag) => {
              const details = tagDetails.get(tag.name);
              const isAnnotated = !!details;
              const isSelected = selectedTag?.name === tag.name;
              const isLoadingThisTag = isLoadingDetails === tag.name;

              return (
                <button
                  key={tag.name}
                  onClick={() => handleTagClick(tag)}
                  className={`w-full text-left px-4 py-3 hover:bg-gray-50 ${
                    isSelected ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Tag icon */}
                    <div
                      className={`p-1 rounded ${
                        isAnnotated ? 'text-blue-600 bg-blue-50' : 'text-gray-600 bg-gray-100'
                      }`}
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 16 16">
                        <path
                          fillRule="evenodd"
                          d="M2.5 7.775V2.75a.25.25 0 01.25-.25h5.025a.25.25 0 01.177.073l6.25 6.25a.25.25 0 010 .354l-5.025 5.025a.25.25 0 01-.354 0l-6.25-6.25a.25.25 0 01-.073-.177zm-1.5 0V2.75C1 1.784 1.784 1 2.75 1h5.025c.464 0 .91.184 1.238.513l6.25 6.25a1.75 1.75 0 010 2.474l-5.026 5.026a1.75 1.75 0 01-2.474 0l-6.25-6.25A1.75 1.75 0 011 7.775zM6 5a1 1 0 100 2 1 1 0 000-2z"
                        />
                      </svg>
                    </div>

                    {/* Tag info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">{tag.name}</span>
                        {isLoadingThisTag && (
                          <svg
                            className="w-3 h-3 animate-spin text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
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
                        )}
                        {isAnnotated && (
                          <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                            annotated
                          </span>
                        )}
                      </div>

                      <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
                        <code className="font-mono">{tag.commit.sha.slice(0, 7)}</code>
                        {details?.tagger && (
                          <>
                            <span>•</span>
                            <span>{details.tagger.name}</span>
                            <span>•</span>
                            <span>{formatDate(details.tagger.date)}</span>
                          </>
                        )}
                      </div>

                      {details?.message && (
                        <p className="mt-1 text-xs text-gray-600 line-clamp-2">{details.message}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <a
                        href={`https://github.com/${connection?.owner}/${connection?.repo}/releases/tag/${tag.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="View on GitHub"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                      <button
                        onClick={(e) => handleDeleteTag(tag, e)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Delete tag"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                          />
                        </svg>
                      </button>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer */}
      {tags.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 text-center">
            {filteredTags.length} of {tags.length} tags
          </p>
        </div>
      )}

      {/* Create Tag Dialog */}
      {showCreateDialog && (
        <CreateTagDialog
          onClose={() => setShowCreateDialog(false)}
          onCreated={(tag) => {
            addTag(tag);
            setShowCreateDialog(false);
          }}
        />
      )}
    </div>
  );
};

// ============================================================================
// Create Tag Dialog
// ============================================================================

interface CreateTagDialogProps {
  onClose: () => void;
  onCreated: (tag: GitHubTag) => void;
}

const CreateTagDialog: React.FC<CreateTagDialogProps> = ({ onClose, onCreated }) => {
  const connection = useGitHubStore((state) => state.connection);

  const [tagName, setTagName] = useState('');
  const [message, setMessage] = useState('');
  const [targetSha, setTargetSha] = useState('');
  const [isAnnotated, setIsAnnotated] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current branch HEAD SHA
  useEffect(() => {
    const loadCurrentSha = async () => {
      if (!connection) return;
      try {
        const branch = await githubApi.getBranch(
          connection.owner,
          connection.repo,
          connection.branch
        );
        setTargetSha(branch.commit.sha);
      } catch {
        // Ignore
      }
    };
    loadCurrentSha();
  }, [connection]);

  const handleCreate = async () => {
    if (!connection || !tagName.trim() || !targetSha.trim()) return;

    setIsCreating(true);
    setError(null);

    try {
      if (isAnnotated) {
        await githubApi.createAnnotatedTag(connection.owner, connection.repo, {
          tag: tagName.trim(),
          message: message.trim() || tagName.trim(),
          object: targetSha.trim(),
          type: 'commit',
        });
      } else {
        await githubApi.createLightweightTag(
          connection.owner,
          connection.repo,
          tagName.trim(),
          targetSha.trim()
        );
      }

      // Fetch the created tag
      const tags = await githubApi.listTags(connection.owner, connection.repo, { per_page: 1 });
      const newTag = tags.find((t) => t.name === tagName.trim());
      if (newTag) {
        onCreated(newTag);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create tag');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Create Tag</h3>
        </div>

        <div className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>}

          <div>
            <label
              htmlFor="github-tag-name"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Tag name
            </label>
            <input
              id="github-tag-name"
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              placeholder="v1.0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label
              htmlFor="github-tag-target"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Target commit
            </label>
            <input
              id="github-tag-target"
              type="text"
              value={targetSha}
              onChange={(e) => setTargetSha(e.target.value)}
              placeholder="SHA or branch name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            />
            <p className="mt-1 text-xs text-gray-500">
              Defaults to current branch HEAD: {connection?.branch}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="annotated"
              checked={isAnnotated}
              onChange={(e) => setIsAnnotated(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="annotated" className="text-sm text-gray-700">
              Create annotated tag (includes message and tagger info)
            </label>
          </div>

          {isAnnotated && (
            <div>
              <label
                htmlFor="github-tag-message"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Message
              </label>
              <textarea
                id="github-tag-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tag message..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>

        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !tagName.trim() || !targetSha.trim()}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isCreating ? 'Creating...' : 'Create Tag'}
          </button>
        </div>
      </div>
    </div>
  );
};
