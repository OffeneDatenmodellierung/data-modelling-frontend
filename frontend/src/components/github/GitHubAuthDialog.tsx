/**
 * GitHub Auth Dialog Component
 * Dialog for authenticating with GitHub using a Personal Access Token
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGitHubStore } from '@/stores/githubStore';
import { githubAuth, GitHubAuthService } from '@/services/github/githubAuth';

export interface GitHubAuthDialogProps {
  className?: string;
}

export const GitHubAuthDialog: React.FC<GitHubAuthDialogProps> = ({ className = '' }) => {
  const { showAuthDialog, isAuthenticating, authError } = useGitHubStore();
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // PAT creation instructions
  const patInstructions = GitHubAuthService.getPATInstructions();

  // Focus input when dialog opens
  useEffect(() => {
    if (showAuthDialog && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [showAuthDialog]);

  // Reset form when dialog opens
  useEffect(() => {
    if (showAuthDialog) {
      setToken('');
      setShowToken(false);
      setLocalError(null);
      setScopeWarning(null);
    }
  }, [showAuthDialog]);

  const handleClose = useCallback(() => {
    useGitHubStore.getState().setShowAuthDialog(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!token.trim()) {
        setLocalError('Please enter a token');
        return;
      }

      // Basic token format validation
      if (!token.startsWith('ghp_') && !token.startsWith('github_pat_')) {
        setLocalError('Token should start with "ghp_" (classic) or "github_pat_" (fine-grained)');
        return;
      }

      setLocalError(null);
      setScopeWarning(null);
      useGitHubStore.getState().setAuthenticating(true);
      useGitHubStore.getState().setAuthError(null);

      const result = await githubAuth.authenticateWithPAT(token.trim());

      if (result.success) {
        if (result.scopeWarning) {
          setScopeWarning(result.scopeWarning);
        }
        // Close dialog after brief delay to show success
        setTimeout(() => {
          handleClose();
        }, 500);
      } else {
        useGitHubStore.getState().setAuthError(result.error || 'Authentication failed');
      }
    },
    [token, handleClose]
  );

  if (!showAuthDialog) {
    return null;
  }

  const error = localError || authError;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-2">
            {/* GitHub icon */}
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">Connect to GitHub</h2>
          </div>
          <button onClick={handleClose} className="p-1 text-gray-400 hover:text-gray-600 rounded">
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
        <div className="p-4">
          {/* Instructions */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-900 mb-2">
              Create a Personal Access Token
            </h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              {patInstructions.steps.map((step, index) => (
                <li key={index}>{step}</li>
              ))}
            </ol>
            <a
              href={patInstructions.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm font-medium text-blue-700 hover:text-blue-800"
            >
              Open GitHub Token Settings
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </div>

          {/* Required scopes */}
          <div className="mb-4 text-sm">
            <span className="font-medium text-gray-700">Required scope: </span>
            <code className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-800">repo</code>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {/* Token input */}
            <div className="mb-4">
              <label
                htmlFor="github-token"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="github-token"
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => {
                    setToken(e.target.value);
                    setLocalError(null);
                  }}
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                  autoComplete="off"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                >
                  {showToken ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                      />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                      />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your token is stored locally and never sent to our servers.
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Scope warning */}
            {scopeWarning && (
              <div className="mb-4 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md">
                <p className="text-sm text-yellow-700">{scopeWarning}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAuthenticating || !token.trim()}
                className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-md hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAuthenticating ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
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
                    Connecting...
                  </>
                ) : (
                  'Connect'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
