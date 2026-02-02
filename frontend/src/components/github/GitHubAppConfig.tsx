/**
 * GitHub App Configuration Component
 * Allows users to add/remove GitHub App configurations
 */

import React, { useState, useCallback } from 'react';
import type { GitHubAppConfig } from '@/types/github';
import {
  getStoredAppConfigs,
  storeAppConfig,
  removeAppConfig,
  GitHubAppAuthService,
} from '@/services/github';

export interface GitHubAppConfigProps {
  onConfigAdded?: (config: GitHubAppConfig) => void;
  onConfigRemoved?: (clientId: string) => void;
  className?: string;
}

export const GitHubAppConfigManager: React.FC<GitHubAppConfigProps> = ({
  onConfigAdded,
  onConfigRemoved,
  className = '',
}) => {
  const [configs, setConfigs] = useState<GitHubAppConfig[]>(getStoredAppConfigs);
  const [isAdding, setIsAdding] = useState(false);
  const [newConfig, setNewConfig] = useState<Partial<GitHubAppConfig>>({});
  const [error, setError] = useState<string | null>(null);

  const instructions = GitHubAppAuthService.getSetupInstructions();

  const handleAddConfig = useCallback(() => {
    setIsAdding(true);
    setNewConfig({});
    setError(null);
  }, []);

  const handleCancelAdd = useCallback(() => {
    setIsAdding(false);
    setNewConfig({});
    setError(null);
  }, []);

  const handleSaveConfig = useCallback(() => {
    if (!newConfig.clientId?.trim()) {
      setError('Client ID is required');
      return;
    }
    if (!newConfig.appName?.trim()) {
      setError('App name is required');
      return;
    }

    // Check for duplicate
    if (configs.some((c) => c.clientId === newConfig.clientId)) {
      setError('A configuration with this Client ID already exists');
      return;
    }

    const config: GitHubAppConfig = {
      clientId: newConfig.clientId.trim(),
      appName: newConfig.appName.trim(),
      description: newConfig.description?.trim(),
      installationUrl: newConfig.installationUrl?.trim(),
    };

    storeAppConfig(config);
    setConfigs([...configs, config]);
    setIsAdding(false);
    setNewConfig({});
    setError(null);
    onConfigAdded?.(config);
  }, [newConfig, configs, onConfigAdded]);

  const handleRemoveConfig = useCallback(
    (clientId: string) => {
      removeAppConfig(clientId);
      setConfigs(configs.filter((c) => c.clientId !== clientId));
      onConfigRemoved?.(clientId);
    },
    [configs, onConfigRemoved]
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900">GitHub App Configurations</h3>
        {!isAdding && (
          <button
            onClick={handleAddConfig}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add App
          </button>
        )}
      </div>

      {/* Info about GitHub Apps */}
      <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
        <p className="text-xs text-gray-600">
          GitHub Apps provide organization-managed authentication. Your organization admin can set
          up a GitHub App and share the Client ID with team members.
        </p>
      </div>

      {/* Existing configurations */}
      {configs.length > 0 && (
        <div className="space-y-2">
          {configs.map((config) => (
            <div
              key={config.clientId}
              className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-md"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{config.appName}</p>
                <p className="text-xs text-gray-500 font-mono truncate">{config.clientId}</p>
                {config.description && (
                  <p className="text-xs text-gray-500 truncate mt-0.5">{config.description}</p>
                )}
              </div>
              <button
                onClick={() => handleRemoveConfig(config.clientId)}
                className="ml-2 p-1 text-gray-400 hover:text-red-500"
                title="Remove configuration"
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
            </div>
          ))}
        </div>
      )}

      {/* No configurations message */}
      {configs.length === 0 && !isAdding && (
        <p className="text-sm text-gray-500 text-center py-4">
          No GitHub Apps configured. Add one to enable organization authentication.
        </p>
      )}

      {/* Add new configuration form */}
      {isAdding && (
        <div className="p-4 bg-white border border-gray-200 rounded-md space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              App Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newConfig.appName || ''}
              onChange={(e) => setNewConfig({ ...newConfig, appName: e.target.value })}
              placeholder="My Organization's App"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Client ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={newConfig.clientId || ''}
              onChange={(e) => setNewConfig({ ...newConfig, clientId: e.target.value })}
              placeholder="Iv1.xxxxxxxxx"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              Found in your GitHub App settings under "Client ID"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={newConfig.description || ''}
              onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
              placeholder="For the engineering team"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={handleCancelAdd}
              className="px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveConfig}
              className="px-3 py-1.5 text-sm text-white bg-blue-600 hover:bg-blue-700 rounded-md"
            >
              Save
            </button>
          </div>
        </div>
      )}

      {/* Setup instructions */}
      <details className="text-xs">
        <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
          How to set up a GitHub App
        </summary>
        <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-md space-y-2">
          <ol className="list-decimal list-inside space-y-1 text-gray-600">
            {instructions.steps.map((step, index) => (
              <li key={index}>{step.replace('{origin}', window.location.origin)}</li>
            ))}
          </ol>
          <div className="pt-2 border-t border-gray-200">
            <p className="font-medium text-gray-700 mb-1">Token Proxy Requirements:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-600">
              {instructions.proxyRequirements.map((req, index) => (
                <li key={index}>{req}</li>
              ))}
            </ul>
          </div>
        </div>
      </details>
    </div>
  );
};
