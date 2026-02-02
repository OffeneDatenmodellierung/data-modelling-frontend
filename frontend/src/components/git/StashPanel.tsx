/**
 * StashPanel Component
 * UI for managing git stashes
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useGitStore, GitStashEntry, selectHasStashes, selectStashCount } from '@/stores/gitStore';
import { gitService } from '@/services/git/gitService';

interface StashPanelProps {
  className?: string;
}

export const StashPanel: React.FC<StashPanelProps> = ({ className = '' }) => {
  const { stashes, isLoadingStashes, isStashing, status, selectedStash, stashDiff } = useGitStore();

  const hasStashes = useGitStore(selectHasStashes);
  const stashCount = useGitStore(selectStashCount);

  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [stashMessage, setStashMessage] = useState('');
  const [includeUntracked, setIncludeUntracked] = useState(true);
  const [keepIndex, setKeepIndex] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<number | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Load stashes on mount
  useEffect(() => {
    if (status.isGitRepo) {
      gitService.loadStashes();
    }
  }, [status.isGitRepo]);

  const handleStashSave = useCallback(async () => {
    const success = await gitService.stashSave({
      message: stashMessage || undefined,
      includeUntracked,
      keepIndex,
    });

    if (success) {
      setShowSaveDialog(false);
      setStashMessage('');
      setIncludeUntracked(true);
      setKeepIndex(false);
    }
  }, [stashMessage, includeUntracked, keepIndex]);

  const handleStashApply = useCallback(async (stashIndex: number) => {
    await gitService.stashApply(stashIndex);
  }, []);

  const handleStashPop = useCallback(async (stashIndex: number) => {
    await gitService.stashPop(stashIndex);
  }, []);

  const handleStashDrop = useCallback(async (stashIndex: number) => {
    const success = await gitService.stashDrop(stashIndex);
    if (success) {
      setShowDeleteConfirm(null);
      const store = useGitStore.getState();
      if (store.selectedStash?.index === stashIndex) {
        store.setSelectedStash(null);
        store.setStashDiff(null);
      }
    }
  }, []);

  const handleStashClear = useCallback(async () => {
    const success = await gitService.stashClear();
    if (success) {
      setShowClearConfirm(false);
      const store = useGitStore.getState();
      store.setSelectedStash(null);
      store.setStashDiff(null);
    }
  }, []);

  const handleViewStash = useCallback(async (stash: GitStashEntry) => {
    useGitStore.getState().setSelectedStash(stash);
    await gitService.stashShow(stash.index);
  }, []);

  const canStash = status.files.length > 0;

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
              d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
            />
          </svg>
          <span className="text-sm font-medium text-gray-700">Stashes</span>
          {stashCount > 0 && <span className="text-xs text-gray-500">({stashCount})</span>}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowSaveDialog(true)}
            disabled={!canStash || isStashing}
            className="p-1 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
            title={canStash ? 'Stash changes' : 'No changes to stash'}
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
          {hasStashes && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isStashing}
              className="p-1 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
              title="Clear all stashes"
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
      </div>

      {/* Stash List */}
      <div className="flex-1 overflow-y-auto max-h-48">
        {isLoadingStashes ? (
          <div className="flex items-center justify-center h-20">
            <span className="text-sm text-gray-500">Loading stashes...</span>
          </div>
        ) : !hasStashes ? (
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
                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
              />
            </svg>
            <span className="text-xs text-gray-500">No stashes</span>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {stashes.map((stash) => (
              <StashItem
                key={stash.index}
                stash={stash}
                isSelected={selectedStash?.index === stash.index}
                isStashing={isStashing}
                onView={() => handleViewStash(stash)}
                onApply={() => handleStashApply(stash.index)}
                onPop={() => handleStashPop(stash.index)}
                onDrop={() => setShowDeleteConfirm(stash.index)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Stash Diff Preview */}
      {selectedStash && stashDiff && (
        <div className="border-t border-gray-200">
          <div className="px-3 py-1 bg-gray-50">
            <span className="text-xs font-mono text-gray-600">
              stash@{'{' + selectedStash.index + '}'}: {selectedStash.message}
            </span>
          </div>
          <div className="max-h-32 overflow-auto bg-gray-900">
            <pre className="text-xs p-2 font-mono whitespace-pre-wrap text-gray-100">
              {stashDiff}
            </pre>
          </div>
        </div>
      )}

      {/* Save Stash Dialog */}
      {showSaveDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowSaveDialog(false)} />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Stash Changes</h2>
              <button
                onClick={() => setShowSaveDialog(false)}
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
              <p className="text-sm text-gray-600">
                Save your current changes to a stash and restore a clean working directory.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message (optional)
                </label>
                <input
                  type="text"
                  value={stashMessage}
                  onChange={(e) => setStashMessage(e.target.value)}
                  placeholder="Describe the stashed changes..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={includeUntracked}
                  onChange={(e) => setIncludeUntracked(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Include untracked files</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={keepIndex}
                  onChange={(e) => setKeepIndex(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Keep staged changes in index</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-200">
              <button
                onClick={() => setShowSaveDialog(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStashSave}
                disabled={isStashing}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isStashing ? 'Stashing...' : 'Stash'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Stash Confirmation */}
      {showDeleteConfirm !== null && (
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
                  <h3 className="text-lg font-semibold text-gray-900">Delete Stash?</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone.</p>
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
                  onClick={() => handleStashDrop(showDeleteConfirm)}
                  disabled={isStashing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Stashes Confirmation */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowClearConfirm(false)}
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
                  <h3 className="text-lg font-semibold text-gray-900">Clear All Stashes?</h3>
                  <p className="text-sm text-gray-500">
                    This will permanently delete all {stashCount} stash(es).
                  </p>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStashClear}
                  disabled={isStashing}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface StashItemProps {
  stash: GitStashEntry;
  isSelected: boolean;
  isStashing: boolean;
  onView: () => void;
  onApply: () => void;
  onPop: () => void;
  onDrop: () => void;
}

const StashItem: React.FC<StashItemProps> = ({
  stash,
  isSelected,
  isStashing,
  onView,
  onApply,
  onPop,
  onDrop,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      className={`px-3 py-2 hover:bg-gray-50 cursor-pointer transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
      onClick={onView}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-gray-500">stash@{'{' + stash.index + '}'}</span>
            <span className="text-xs text-gray-400">on {stash.branch}</span>
          </div>
          <p className="text-sm text-gray-900 truncate mt-0.5">{stash.message}</p>
          <span className="text-xs text-gray-400">{stash.date}</span>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            disabled={isStashing}
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
                    onApply();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                  </svg>
                  Apply (keep)
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPop();
                    setShowMenu(false);
                  }}
                  className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                  </svg>
                  Pop (apply & delete)
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDrop();
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
