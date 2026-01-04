/**
 * Model Editor Navbar Component
 * Provides navigation and action buttons with conditional visibility rules
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { useUIStore } from '@/stores/uiStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { getPlatform, getAssetPath } from '@/services/platform/platform';

export interface ModelNavbarProps {
  onShowSettings: () => void;
  onShowVersionHistory?: () => void;
  workspaceId?: string;
  domainId?: string;
}

export const ModelNavbar: React.FC<ModelNavbarProps> = ({
  onShowSettings,
  onShowVersionHistory,
  workspaceId,
  domainId,
}) => {
  const { mode } = useSDKModeStore();
  const isOffline = mode === 'offline';
  const isOnline = mode === 'online';

  return (
    <nav className="bg-white border-b border-gray-200 shadow-sm">
      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Logo */}
          <div className="flex items-center gap-4">
            <img 
              src={getAssetPath('/logo.svg')} 
              alt="Open Data Modelling" 
              className="h-8 w-auto"
              style={{ maxHeight: '32px' }}
            />
          </div>

          {/* Center - Action buttons */}
          <div className="flex items-center gap-2">

            {/* Settings and History - only in online mode */}
            {isOnline && (
              <>
                <div className="h-6 w-px bg-gray-300 mx-1" />
                <button
                  onClick={onShowSettings}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                  aria-label="Workspace Settings"
                >
                  Settings
                </button>
                {workspaceId && onShowVersionHistory && (
                  <button
                    onClick={onShowVersionHistory}
                    className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                    aria-label="Version History"
                  >
                    History
                  </button>
                )}
              </>
            )}
          </div>

          {/* Right side - Mode toggle and domain selector */}
          <div className="flex items-center gap-3">
            {/* This will be rendered by parent component */}
          </div>
        </div>
      </div>
    </nav>
  );
};

