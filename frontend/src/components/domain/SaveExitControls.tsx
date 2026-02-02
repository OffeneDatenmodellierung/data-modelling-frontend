/**
 * Save/Exit Controls Component
 * Provides auto-save toggle, manual save, and exit functionality
 * In GitHub repo mode, shows sync controls instead of save
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { getPlatform } from '@/services/platform/platform';
import { closeElectronApp } from '@/services/platform/electron';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import {
  useGitHubRepoStore,
  selectIsRepoOpen,
  selectHasPendingChanges as selectGitHubHasPendingChanges,
  selectPendingChangeCount,
  selectSyncStatus,
  selectIsOnline,
} from '@/stores/githubRepoStore';

export const SaveExitControls: React.FC = () => {
  const navigate = useNavigate();
  const { manualSave, pendingChanges, autoSaveEnabled, setAutoSaveEnabled } = useWorkspaceStore();
  const { addToast } = useUIStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [showCommitDialog, setShowCommitDialog] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');

  // GitHub repo mode state
  const isGitHubRepoMode = useGitHubRepoStore(selectIsRepoOpen);
  const gitHubHasPendingChanges = useGitHubRepoStore(selectGitHubHasPendingChanges);
  const gitHubPendingCount = useGitHubRepoStore(selectPendingChangeCount);
  const syncStatus = useGitHubRepoStore(selectSyncStatus);
  const isOnline = useGitHubRepoStore(selectIsOnline);
  const { sync, pushChanges, closeRepo } = useGitHubRepoStore();

  const handleManualSave = async () => {
    setIsSaving(true);
    try {
      await manualSave();
      addToast({
        type: 'success',
        message: 'Workspace saved successfully',
      });
    } catch (error) {
      console.error('Failed to save:', error);
      addToast({
        type: 'error',
        message: `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCloseApp = () => {
    const platform = getPlatform();

    if (pendingChanges) {
      setShowExitConfirm(true);
    } else {
      if (platform === 'electron') {
        closeElectronApp().catch((error) => {
          console.error('Failed to close app:', error);
          addToast({
            type: 'error',
            message: 'Failed to close application',
          });
        });
      } else {
        navigate('/');
      }
    }
  };

  const handleExitWithSave = async () => {
    setIsClosing(true);
    setShowExitConfirm(false);
    const platform = getPlatform();

    try {
      await manualSave();
      await new Promise((resolve) => setTimeout(resolve, 500));

      if (platform === 'electron') {
        await closeElectronApp();
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to save before closing:', error);
      addToast({
        type: 'error',
        message: 'Failed to save changes. Workspace will not close.',
      });
      setIsClosing(false);
    }
  };

  const handleExitWithoutSave = async () => {
    setShowExitConfirm(false);
    setIsClosing(true);
    const platform = getPlatform();

    try {
      if (platform === 'electron') {
        await closeElectronApp();
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Failed to close workspace:', error);
      addToast({
        type: 'error',
        message: 'Failed to close workspace',
      });
      setIsClosing(false);
    }
  };

  // GitHub repo mode handlers
  const handleGitHubSync = async () => {
    if (!isOnline) {
      addToast({
        type: 'warning',
        message: 'Cannot sync while offline. Changes are queued.',
      });
      return;
    }

    if (gitHubHasPendingChanges) {
      setShowCommitDialog(true);
    } else {
      // Just pull latest
      setIsSaving(true);
      try {
        await sync();
        addToast({
          type: 'success',
          message: 'Synced with GitHub',
        });
      } catch (error) {
        addToast({
          type: 'error',
          message: `Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      } finally {
        setIsSaving(false);
      }
    }
  };

  const handleCommitAndPush = async () => {
    const message = commitMessage.trim() || 'Update from Data Modeller';
    setShowCommitDialog(false);
    setCommitMessage('');
    setIsSaving(true);

    try {
      await pushChanges(message);
      addToast({
        type: 'success',
        message: 'Changes committed and pushed to GitHub',
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: `Push failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGitHubExit = () => {
    if (gitHubHasPendingChanges) {
      setShowExitConfirm(true);
    } else {
      closeRepo();
      navigate('/');
    }
  };

  const handleGitHubExitWithoutSync = () => {
    setShowExitConfirm(false);
    closeRepo();
    navigate('/');
  };

  const handleGitHubExitWithSync = async () => {
    setShowExitConfirm(false);
    setIsClosing(true);

    try {
      const message = 'Auto-save before exit from Data Modeller';
      await pushChanges(message);
      closeRepo();
      navigate('/');
    } catch (error) {
      addToast({
        type: 'error',
        message: `Failed to sync before exit: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
      setIsClosing(false);
    }
  };

  // GitHub repo mode UI
  if (isGitHubRepoMode) {
    const isSyncing = syncStatus === 'syncing';
    const isOffline = !isOnline;

    return (
      <>
        <div className="flex items-center gap-2">
          {/* Online/Offline indicator */}
          <div
            className={`flex items-center gap-1 text-xs ${isOffline ? 'text-yellow-600' : 'text-green-600'}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${isOffline ? 'bg-yellow-500' : 'bg-green-500'}`}
            />
            <span>{isOffline ? 'Offline' : 'Online'}</span>
          </div>

          {/* Pending changes indicator */}
          {gitHubHasPendingChanges && (
            <span className="px-2 py-0.5 text-xs bg-yellow-100 text-yellow-700 rounded-full">
              {gitHubPendingCount} pending
            </span>
          )}

          {/* Sync/Commit Button */}
          <button
            onClick={handleGitHubSync}
            disabled={isSyncing || isClosing}
            className={`
              flex items-center gap-1 px-3 py-1 text-sm font-medium rounded transition-colors
              ${
                gitHubHasPendingChanges
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-blue-600 text-white hover:bg-blue-700'
              }
              ${isSyncing || isClosing || isOffline ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title={
              isOffline
                ? 'Offline - changes queued'
                : gitHubHasPendingChanges
                  ? 'Commit & push changes'
                  : 'Sync with GitHub'
            }
          >
            {isSyncing ? (
              <>
                <span className="animate-spin text-xs">⏳</span>
                <span>Syncing...</span>
              </>
            ) : (
              <>
                <span>{gitHubHasPendingChanges ? '📤' : '🔄'}</span>
                <span>{gitHubHasPendingChanges ? 'Commit' : 'Sync'}</span>
              </>
            )}
          </button>

          {/* Exit Button */}
          <button
            onClick={handleGitHubExit}
            disabled={isClosing || isSyncing}
            className={`
              flex items-center gap-1 px-3 py-1 text-sm font-medium rounded transition-colors
              bg-red-600 text-white hover:bg-red-700
              ${isClosing || isSyncing ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            title="Close GitHub workspace"
          >
            {isClosing ? (
              <>
                <span className="animate-spin text-xs">⏳</span>
                <span>Closing...</span>
              </>
            ) : (
              <>
                <span>✕</span>
                <span>Exit</span>
              </>
            )}
          </button>
        </div>

        {/* Commit Message Dialog */}
        {showCommitDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowCommitDialog(false)}
            />
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Commit Changes</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter a commit message for your {gitHubPendingCount} pending change
                {gitHubPendingCount !== 1 ? 's' : ''}.
              </p>
              <textarea
                value={commitMessage}
                onChange={(e) => setCommitMessage(e.target.value)}
                placeholder="Update from Data Modeller"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                rows={3}
                /* eslint-disable-next-line jsx-a11y/no-autofocus */
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleCommitAndPush();
                  }
                }}
              />
              <div className="mt-4 flex justify-end gap-2">
                <button
                  onClick={() => {
                    setShowCommitDialog(false);
                    setCommitMessage('');
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCommitAndPush}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
                >
                  Commit & Push
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Exit Confirmation for GitHub mode */}
        <ConfirmDialog
          isOpen={showExitConfirm}
          onClose={() => {
            setShowExitConfirm(false);
            setIsClosing(false);
          }}
          title="Uncommitted Changes"
          message={`You have ${gitHubPendingCount} uncommitted change${gitHubPendingCount !== 1 ? 's' : ''}. What would you like to do?`}
          actions={[
            {
              label: 'Cancel',
              onClick: () => {
                setShowExitConfirm(false);
                setIsClosing(false);
              },
              variant: 'secondary',
            },
            {
              label: 'Exit Without Syncing',
              onClick: handleGitHubExitWithoutSync,
              variant: 'danger',
            },
            {
              label: 'Commit & Exit',
              onClick: handleGitHubExitWithSync,
              variant: 'primary',
            },
          ]}
        />
      </>
    );
  }

  // Standard local mode UI
  return (
    <>
      <div className="flex items-center gap-2">
        {/* Auto-save Toggle */}
        <label className="flex items-center gap-1.5 text-sm text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            className="w-3.5 h-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-xs">Auto-save</span>
        </label>

        {/* Save Button */}
        <button
          onClick={handleManualSave}
          disabled={isSaving || isClosing}
          className={`
            flex items-center gap-1 px-3 py-1 text-sm font-medium rounded transition-colors
            ${
              pendingChanges
                ? 'bg-green-600 text-white hover:bg-green-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
            ${isSaving || isClosing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={pendingChanges ? 'Save changes' : 'No unsaved changes'}
        >
          {isSaving ? (
            <>
              <span className="animate-spin text-xs">⏳</span>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <span>💾</span>
              <span>Save</span>
              {pendingChanges && <span className="text-xs ml-0.5">*</span>}
            </>
          )}
        </button>

        {/* Exit Button */}
        <button
          onClick={handleCloseApp}
          disabled={isClosing}
          className={`
            flex items-center gap-1 px-3 py-1 text-sm font-medium rounded transition-colors
            bg-red-600 text-white hover:bg-red-700
            ${isClosing ? 'opacity-50 cursor-not-allowed' : ''}
          `}
          title={getPlatform() === 'electron' ? 'Close application' : 'Close workspace'}
        >
          {isClosing ? (
            <>
              <span className="animate-spin text-xs">⏳</span>
              <span>Closing...</span>
            </>
          ) : (
            <>
              <span>✕</span>
              <span>Exit</span>
            </>
          )}
        </button>
      </div>

      {/* Exit Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showExitConfirm}
        onClose={() => {
          setShowExitConfirm(false);
          setIsClosing(false);
        }}
        title="Unsaved Changes"
        message={`You have unsaved changes. What would you like to do?${
          getPlatform() === 'browser' ? ' Closing will return you to workspace selection.' : ''
        }`}
        actions={[
          {
            label: 'Cancel',
            onClick: () => {
              setShowExitConfirm(false);
              setIsClosing(false);
            },
            variant: 'secondary',
          },
          {
            label: "Don't Save",
            onClick: handleExitWithoutSave,
            variant: 'danger',
          },
          {
            label: 'Save & Exit',
            onClick: handleExitWithSave,
            variant: 'primary',
          },
        ]}
      />
    </>
  );
};
