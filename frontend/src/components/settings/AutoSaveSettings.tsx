/**
 * Auto-Save Settings Component
 * Allows users to configure auto-save interval
 */

import React from 'react';
import { useWorkspaceStore } from '@/stores/workspaceStore';

export interface AutoSaveSettingsProps {
  className?: string;
}

export const AutoSaveSettings: React.FC<AutoSaveSettingsProps> = ({ className = '' }) => {
  const { autoSaveInterval, autoSaveEnabled, setAutoSaveInterval, setAutoSaveEnabled } =
    useWorkspaceStore();

  const intervalMinutes = Math.round(autoSaveInterval / 60000);

  const handleIntervalChange = (minutes: number) => {
    if (minutes < 1) minutes = 1;
    if (minutes > 60) minutes = 60;
    setAutoSaveInterval(minutes * 60 * 1000);
  };

  return (
    <div className={`p-4 ${className}`}>
      <h3 className="text-lg font-semibold mb-4">Auto-Save Settings</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label htmlFor="auto-save-enabled" className="text-sm font-medium text-gray-700">
            Enable Auto-Save
          </label>
          <input
            id="auto-save-enabled"
            type="checkbox"
            checked={autoSaveEnabled}
            onChange={(e) => setAutoSaveEnabled(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
        </div>

        {autoSaveEnabled && (
          <div>
            <label htmlFor="auto-save-interval" className="block text-sm font-medium text-gray-700 mb-2">
              Auto-Save Interval: {intervalMinutes} {intervalMinutes === 1 ? 'minute' : 'minutes'}
            </label>
            <input
              id="auto-save-interval"
              type="range"
              min="1"
              max="60"
              value={intervalMinutes}
              onChange={(e) => handleIntervalChange(parseInt(e.target.value, 10))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>1 min</span>
              <span>60 min</span>
            </div>
          </div>
        )}

        <div className="text-xs text-gray-500 mt-2">
          Auto-save runs automatically when offline. In online mode, changes are saved in real-time via WebSocket.
        </div>
      </div>
    </div>
  );
};



