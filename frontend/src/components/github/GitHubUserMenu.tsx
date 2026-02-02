/**
 * GitHub User Menu Component
 * Shows authenticated user info and provides logout option
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useGitHubStore, selectIsAuthenticated, selectUser } from '@/stores/githubStore';
import { GitHubAuthSettings } from './GitHubAuthSettings';

export interface GitHubUserMenuProps {
  className?: string;
}

export const GitHubUserMenu: React.FC<GitHubUserMenuProps> = ({ className = '' }) => {
  const isAuthenticated = useGitHubStore(selectIsAuthenticated);
  const user = useGitHubStore(selectUser);
  const auth = useGitHubStore((state) => state.auth);
  const rateLimit = useGitHubStore((state) => state.rateLimit);
  const [isOpen, setIsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu on outside click
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleConnect = useCallback(() => {
    useGitHubStore.getState().setShowAuthDialog(true);
    setIsOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    useGitHubStore.getState().logout();
    setIsOpen(false);
  }, []);

  const handleOpenSettings = useCallback(() => {
    setIsOpen(false);
    setShowSettings(true);
  }, []);

  // Update rate limit when menu opens
  useEffect(() => {
    if (isOpen && isAuthenticated) {
      useGitHubStore.getState().updateRateLimit();
    }
  }, [isOpen, isAuthenticated]);

  // Not authenticated - show connect button
  if (!isAuthenticated) {
    return (
      <button
        onClick={handleConnect}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md ${className}`}
      >
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
          <path
            fillRule="evenodd"
            d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
            clipRule="evenodd"
          />
        </svg>
        Connect GitHub
      </button>
    );
  }

  // Authenticated - show user menu
  return (
    <div ref={menuRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
      >
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt={user.login} className="w-6 h-6 rounded-full" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
            <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
        )}
        <span className="hidden sm:inline">{user?.login}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {/* User info */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="font-medium text-gray-900">{user?.name || user?.login}</div>
            {user?.name && <div className="text-sm text-gray-500">@{user.login}</div>}
            <div className="text-xs text-gray-400 mt-0.5">
              via {auth.tokenType === 'github_app' ? 'GitHub App' : 'Personal Access Token'}
            </div>
          </div>

          {/* Rate limit info */}
          <div className="px-4 py-2 border-b border-gray-100">
            <div className="text-xs text-gray-500 mb-1">API Rate Limit</div>
            <div className="flex items-center gap-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full ${
                    rateLimit.remaining < 100
                      ? 'bg-red-500'
                      : rateLimit.remaining < 500
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                  }`}
                  style={{
                    width: `${Math.round((rateLimit.remaining / rateLimit.limit) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-600">
                {rateLimit.remaining}/{rateLimit.limit}
              </span>
            </div>
          </div>

          {/* Actions */}
          <a
            href={user?.html_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            View GitHub Profile
          </a>

          <button
            onClick={handleOpenSettings}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            Authentication Settings
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Disconnect GitHub
          </button>
        </div>
      )}

      {/* Settings Dialog */}
      <GitHubAuthSettings isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};
