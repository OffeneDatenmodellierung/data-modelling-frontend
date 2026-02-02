/**
 * GitHub Auth Settings Component
 * Allows users to switch between PAT and GitHub App authentication methods
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubStore } from '@/stores/githubStore';
import { githubAuth, githubAppAuth, getStoredAppConfigs } from '@/services/github';
import type { GitHubAppConfig } from '@/types/github';
import { GitHubAppConfigManager } from './GitHubAppConfig';

// Storage key for preferred auth method
const AUTH_METHOD_STORAGE_KEY = 'github_auth_method_preference';

export type AuthMethodPreference = 'pat' | 'github_app';

export function getAuthMethodPreference(): AuthMethodPreference {
  try {
    const stored = localStorage.getItem(AUTH_METHOD_STORAGE_KEY);
    if (stored === 'github_app' || stored === 'pat') {
      return stored;
    }
  } catch {
    // Ignore
  }
  return 'pat'; // Default to PAT
}

export function setAuthMethodPreference(method: AuthMethodPreference): void {
  localStorage.setItem(AUTH_METHOD_STORAGE_KEY, method);
}

export interface GitHubAuthSettingsProps {
  isOpen: boolean;
  onClose: () => void;
  className?: string;
}

export const GitHubAuthSettings: React.FC<GitHubAuthSettingsProps> = ({
  isOpen,
  onClose,
  className = '',
}) => {
  const { auth } = useGitHubStore();
  const [preferredMethod, setPreferredMethod] =
    useState<AuthMethodPreference>(getAuthMethodPreference);
  const [availableApps, setAvailableApps] = useState<GitHubAppConfig[]>(getStoredAppConfigs);
  const [showAppConfig, setShowAppConfig] = useState(false);

  // Refresh app configs when component mounts
  useEffect(() => {
    if (isOpen) {
      setAvailableApps(getStoredAppConfigs());
    }
  }, [isOpen]);

  const handleMethodChange = useCallback((method: AuthMethodPreference) => {
    setPreferredMethod(method);
    setAuthMethodPreference(method);
  }, []);

  const handleLogout = useCallback(() => {
    // Logout from both services
    githubAuth.logout();
    githubAppAuth.logout();
    useGitHubStore.getState().logout();
  }, []);

  const handleSwitchAuth = useCallback(() => {
    // Logout and show auth dialog to re-authenticate with new method
    handleLogout();
    onClose();
    // Show auth dialog
    setTimeout(() => {
      useGitHubStore.getState().setShowAuthDialog(true);
    }, 100);
  }, [handleLogout, onClose]);

  const handleAppConfigChange = useCallback(() => {
    setAvailableApps(getStoredAppConfigs());
  }, []);

  if (!isOpen) {
    return null;
  }

  const currentMethod = auth.tokenType;
  const isAuthenticated = auth.isAuthenticated;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">GitHub Authentication Settings</h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
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

        {/* Content */}
        <div className="p-4 space-y-6">
          {/* Current Status */}
          {isAuthenticated && (
            <div className="p-3 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center gap-2">
                <svg
                  className="w-5 h-5 text-green-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Connected as {auth.user?.login}
                  </p>
                  <p className="text-xs text-green-600">
                    Using {currentMethod === 'github_app' ? 'GitHub App' : 'Personal Access Token'}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Auth Method Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Preferred Authentication Method
            </label>
            <div className="space-y-2">
              {/* PAT Option */}
              <label
                className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  preferredMethod === 'pat'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="authMethod"
                  value="pat"
                  checked={preferredMethod === 'pat'}
                  onChange={() => handleMethodChange('pat')}
                  className="mt-0.5 mr-3"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Personal Access Token (PAT)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Create a token in your GitHub settings. Best for individual use.
                  </p>
                </div>
              </label>

              {/* GitHub App Option */}
              <label
                className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                  preferredMethod === 'github_app'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                } ${availableApps.length === 0 ? 'opacity-60' : ''}`}
              >
                <input
                  type="radio"
                  name="authMethod"
                  value="github_app"
                  checked={preferredMethod === 'github_app'}
                  onChange={() => handleMethodChange('github_app')}
                  disabled={availableApps.length === 0}
                  className="mt-0.5 mr-3"
                />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">GitHub App (OAuth)</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {availableApps.length > 0
                      ? `${availableApps.length} app${availableApps.length > 1 ? 's' : ''} configured. Organization-managed authentication.`
                      : 'No apps configured. Ask your admin to set up a GitHub App.'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* GitHub App Configuration */}
          <div>
            <button
              onClick={() => setShowAppConfig(!showAppConfig)}
              className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-800"
            >
              <svg
                className={`w-4 h-4 transition-transform ${showAppConfig ? 'rotate-90' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
              Manage GitHub App Configurations
            </button>
            {showAppConfig && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-md">
                <GitHubAppConfigManager
                  onConfigAdded={handleAppConfigChange}
                  onConfigRemoved={handleAppConfigChange}
                />
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-gray-200 space-y-2">
            {isAuthenticated && currentMethod !== preferredMethod && (
              <button
                onClick={handleSwitchAuth}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Switch to {preferredMethod === 'github_app' ? 'GitHub App' : 'PAT'} Authentication
              </button>
            )}
            {isAuthenticated && (
              <button
                onClick={handleLogout}
                className="w-full px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100"
              >
                Sign Out from GitHub
              </button>
            )}
            {!isAuthenticated && (
              <button
                onClick={() => {
                  onClose();
                  setTimeout(() => {
                    useGitHubStore.getState().setShowAuthDialog(true);
                  }, 100);
                }}
                className="w-full px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800"
              >
                Connect to GitHub
              </button>
            )}
          </div>

          {/* Help text */}
          <p className="text-xs text-gray-500 text-center">
            Your authentication preference is stored locally. You can switch methods at any time.
          </p>
        </div>
      </div>
    </div>
  );
};
