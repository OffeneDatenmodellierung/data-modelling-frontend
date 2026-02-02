/**
 * TagPanel Component
 * UI for managing git tags (version management)
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useGitStore, GitTag, selectTagCount } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

interface TagPanelProps {
  className?: string;
}

export const TagPanel: React.FC<TagPanelProps> = ({ className = '' }) => {
  const { tags, isLoadingTags, status, selectedTag } = useGitStore();
  const tagCount = useGitStore(selectTagCount);

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [tagName, setTagName] = useState('');
  const [tagMessage, setTagMessage] = useState('');
  const [createAnnotated, setCreateAnnotated] = useState(true);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPushing, setIsPushing] = useState(false);
  const [filter, setFilter] = useState('');

  // Load tags on mount
  useEffect(() => {
    if (status.isGitRepo) {
      gitService.loadTags();
    }
  }, [status.isGitRepo]);

  const handleCreateTag = useCallback(async () => {
    if (!tagName.trim()) return;

    setIsCreating(true);
    const success = await gitService.createTag(tagName.trim(), {
      message: createAnnotated ? tagMessage || tagName : undefined,
    });

    setIsCreating(false);
    if (success) {
      setShowCreateDialog(false);
      setTagName('');
      setTagMessage('');
      setCreateAnnotated(true);
    }
  }, [tagName, tagMessage, createAnnotated]);

  const handleDeleteTag = useCallback(async (name: string) => {
    setIsDeleting(true);
    const success = await gitService.deleteTag(name);
    setIsDeleting(false);
    if (success) {
      setShowDeleteConfirm(null);
    }
  }, []);

  const handlePushTag = useCallback(async (name: string) => {
    setIsPushing(true);
    await gitService.pushTag(name);
    setIsPushing(false);
  }, []);

  const handlePushAllTags = useCallback(async () => {
    setIsPushing(true);
    await gitService.pushTag(undefined, { allTags: true });
    setIsPushing(false);
  }, []);

  const handleCheckoutTag = useCallback(async (name: string) => {
    await gitService.checkoutTag(name);
  }, []);

  const handleSelectTag = useCallback((tag: GitTag) => {
    useGitStore.getState().setSelectedTag(tag);
  }, []);

  // Filter tags
  const filteredTags = filter
    ? tags.filter(
        (t) =>
          t.name.toLowerCase().includes(filter.toLowerCase()) ||
          (t.message && t.message.toLowerCase().includes(filter.toLowerCase()))
      )
    : tags;

  // Sort tags by date (newest first) or name
  const sortedTags = [...filteredTags].sort((a, b) => {
    if (a.date && b.date) {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return b.name.localeCompare(a.name);
  });

  return (
    <div className={`flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-gray-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Tags</span>
          {tagCount > 0 && <span className="text-xs text-gray-500">({tagCount})</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreateDialog(true)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
            title="Create new tag"
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
          {tagCount > 0 && status.remoteName && (
            <button
              onClick={handlePushAllTags}
              disabled={isPushing}
              className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50"
              title="Push all tags to remote"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Search/Filter */}
      {tagCount > 5 && (
        <div className="px-3 py-2 border-b border-gray-100">
          <input
            type="text"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter tags..."
            className="w-full px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Tag List */}
      <div className="flex-1 overflow-y-auto max-h-64">
        {isLoadingTags ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-sm text-gray-500">Loading tags...</span>
          </div>
        ) : tagCount === 0 ? (
          <div className="flex flex-col items-center justify-center h-24 text-center px-4">
            <svg
              className="w-8 h-8 text-gray-300 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
              />
            </svg>
            <span className="text-xs text-gray-500">No tags</span>
            <span className="text-xs text-gray-400 mt-1">Create a tag to mark a version</span>
          </div>
        ) : filteredTags.length === 0 ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-sm text-gray-500">No tags match &ldquo;{filter}&rdquo;</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {sortedTags.map((tag) => (
              <TagItem
                key={tag.name}
                tag={tag}
                isSelected={selectedTag?.name === tag.name}
                hasRemote={!!status.remoteName}
                isPushing={isPushing}
                onSelect={() => handleSelectTag(tag)}
                onCheckout={() => handleCheckoutTag(tag.name)}
                onPush={() => handlePushTag(tag.name)}
                onDelete={() => setShowDeleteConfirm(tag.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Tag Details */}
      {selectedTag && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-medium text-gray-900">{selectedTag.name}</span>
            {selectedTag.isAnnotated && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                annotated
              </span>
            )}
          </div>
          <div className="text-xs text-gray-500 font-mono mb-1">{selectedTag.hash.slice(0, 8)}</div>
          {selectedTag.message && (
            <p className="text-xs text-gray-600 line-clamp-2">{selectedTag.message}</p>
          )}
          {selectedTag.tagger && (
            <div className="text-xs text-gray-400 mt-1">
              {selectedTag.tagger} {selectedTag.date && `- ${selectedTag.date}`}
            </div>
          )}
        </div>
      )}

      {/* Create Tag Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateDialog(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Create Tag</h2>
              <button
                onClick={() => setShowCreateDialog(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
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
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tag Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={tagName}
                  onChange={(e) => setTagName(e.target.value)}
                  placeholder="v1.0.0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  /* eslint-disable-next-line jsx-a11y/no-autofocus */
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Use semantic versioning (e.g., v1.0.0, v2.1.3-beta)
                </p>
              </div>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={createAnnotated}
                  onChange={(e) => setCreateAnnotated(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Create annotated tag</span>
              </label>

              {createAnnotated && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    value={tagMessage}
                    onChange={(e) => setTagMessage(e.target.value)}
                    placeholder="Release notes or description..."
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  />
                </div>
              )}

              <div className="p-3 bg-gray-50 rounded-md text-xs text-gray-600">
                <p className="font-medium mb-1">Tag will be created at:</p>
                <p className="font-mono">
                  {status.currentBranch || 'HEAD'} ({status.gitRoot ? 'current commit' : 'HEAD'})
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowCreateDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTag}
                disabled={isCreating || !tagName.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isCreating ? 'Creating...' : 'Create Tag'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Tag Confirmation */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowDeleteConfirm(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-sm mx-4">
            <div className="p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Delete Tag?</h3>
                  <p className="text-sm text-gray-500">
                    Delete tag &ldquo;{showDeleteConfirm}&rdquo; locally. This won&apos;t affect
                    remote tags.
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDeleteTag(showDeleteConfirm)}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface TagItemProps {
  tag: GitTag;
  isSelected: boolean;
  hasRemote: boolean;
  isPushing: boolean;
  onSelect: () => void;
  onCheckout: () => void;
  onPush: () => void;
  onDelete: () => void;
}

const TagItem: React.FC<TagItemProps> = ({
  tag,
  isSelected,
  hasRemote,
  isPushing,
  onSelect,
  onCheckout,
  onPush,
  onDelete,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={onSelect}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <svg
              className={`w-3.5 h-3.5 ${tag.isAnnotated ? 'text-blue-500' : 'text-gray-400'}`}
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M17.707 9.293a1 1 0 010 1.414l-7 7a1 1 0 01-1.414 0l-7-7A.997.997 0 012 10V5a3 3 0 013-3h5c.256 0 .512.098.707.293l7 7zM5 6a1 1 0 100-2 1 1 0 000 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="text-sm font-medium text-gray-900">{tag.name}</span>
          </div>
          {tag.message && (
            <p className="text-xs text-gray-500 truncate mt-0.5 ml-5">{tag.message}</p>
          )}
        </div>
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
              />
            </svg>
          </button>
          {showMenu && (
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowMenu(false);
                }}
              />
              <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white border border-gray-200 rounded-md shadow-lg py-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onCheckout();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  Checkout
                </button>
                {hasRemote && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPush();
                      setShowMenu(false);
                    }}
                    disabled={isPushing}
                    className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16V4m0 0L3 8m4-4l4 4"
                      />
                    </svg>
                    Push to remote
                  </button>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
