/**
 * Save/Exit Controls Component
 * Provides auto-save toggle, manual save, and exit functionality
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useUIStore } from '@/stores/uiStore';
import { getPlatform } from '@/services/platform/platform';
import { closeElectronApp } from '@/services/platform/electron';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';

export const SaveExitControls: React.FC = () => {
  const navigate = useNavigate();
  const { manualSave, pendingChanges, autoSaveEnabled, setAutoSaveEnabled } = useWorkspaceStore();
  const { addToast } = useUIStore();
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

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
