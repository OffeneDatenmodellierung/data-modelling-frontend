/**
 * GitHub Create Pull Request Dialog
 * Dialog for creating new pull requests
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useGitHubStore, selectIsConnected } from '@/stores/githubStore';
import { githubApi } from '@/services/github/githubApi';
import type { GitHubBranch, GitHubPullRequest } from '@/types/github';

export interface GitHubCreatePRDialogProps {
  className?: string;
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (pr: GitHubPullRequest) => void;
  defaultHead?: string;
  defaultBase?: string;
}

export const GitHubCreatePRDialog: React.FC<GitHubCreatePRDialogProps> = ({
  className = '',
  isOpen,
  onClose,
  onCreated,
  defaultHead,
  defaultBase,
}) => {
  const isConnected = useGitHubStore(selectIsConnected);
  const connection = useGitHubStore((state) => state.connection);
  const connectedRepo = useGitHubStore((state) => state.connectedRepo);

  const [branches, setBranches] = useState<GitHubBranch[]>([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(false);
  const [headBranch, setHeadBranch] = useState(defaultHead || '');
  const [baseBranch, setBaseBranch] = useState(defaultBase || '');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [isDraft, setIsDraft] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);

  // Load branches
  const loadBranches = useCallback(async () => {
    if (!connection) return;

    setIsLoadingBranches(true);
    try {
      const branchList = await githubApi.listBranches(connection.owner, connection.repo, {
        per_page: 100,
      });
      setBranches(branchList);

      // Set defaults
      if (!headBranch && connection.branch) {
        setHeadBranch(connection.branch);
      }
      if (!baseBranch && connectedRepo?.default_branch) {
        setBaseBranch(connectedRepo.default_branch);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branches');
    } finally {
      setIsLoadingBranches(false);
    }
  }, [connection, connectedRepo, headBranch, baseBranch]);

  // Load branches on open
  useEffect(() => {
    if (isOpen && isConnected) {
      loadBranches();
    }
  }, [isOpen, isConnected, loadBranches]);

  // Focus title input on open
  useEffect(() => {
    if (isOpen && titleRef.current) {
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset form on open
  useEffect(() => {
    if (isOpen) {
      setTitle('');
      setBody('');
      setIsDraft(false);
      setError(null);
      if (defaultHead) setHeadBranch(defaultHead);
      if (defaultBase) setBaseBranch(defaultBase);
    }
  }, [isOpen, defaultHead, defaultBase]);

  const handleCreate = useCallback(async () => {
    if (!connection || !title.trim() || !headBranch || !baseBranch) return;

    if (headBranch === baseBranch) {
      setError('Head and base branches must be different');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const pr = await githubApi.createPullRequest(connection.owner, connection.repo, {
        title: title.trim(),
        body: body.trim() || undefined,
        head: headBranch,
        base: baseBranch,
        draft: isDraft,
      });

      onCreated?.(pr);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create pull request');
    } finally {
      setIsCreating(false);
    }
  }, [connection, title, body, headBranch, baseBranch, isDraft, onCreated, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Modal backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Create Pull Request</h2>
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
        <div className="flex-1 overflow-y-auto p-4">
          {/* Branch selectors */}
          <div className="mb-4 flex items-center gap-2">
            {/* Head branch */}
            <div className="flex-1">
              <label
                htmlFor="pr-head-branch"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                From
              </label>
              <select
                id="pr-head-branch"
                value={headBranch}
                onChange={(e) => setHeadBranch(e.target.value)}
                disabled={isLoadingBranches}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Arrow */}
            <div className="pt-5">
              <svg
                className="w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </div>

            {/* Base branch */}
            <div className="flex-1">
              <label
                htmlFor="pr-base-branch"
                className="block text-xs font-medium text-gray-700 mb-1"
              >
                Into
              </label>
              <select
                id="pr-base-branch"
                value={baseBranch}
                onChange={(e) => setBaseBranch(e.target.value)}
                disabled={isLoadingBranches}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select branch</option>
                {branches.map((b) => (
                  <option key={b.name} value={b.name}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Title */}
          <div className="mb-4">
            <label htmlFor="pr-title" className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              ref={titleRef}
              id="pr-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Describe your changes"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Body */}
          <div className="mb-4">
            <label htmlFor="pr-body" className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              id="pr-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Add a detailed description of your changes..."
              rows={6}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Draft option */}
          <div className="mb-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={isDraft}
                onChange={(e) => setIsDraft(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Create as draft</span>
            </label>
            <p className="mt-1 text-xs text-gray-500 ml-6">
              Draft pull requests cannot be merged until marked as ready for review
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !title.trim() || !headBranch || !baseBranch}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isCreating ? (
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
                Creating...
              </>
            ) : (
              'Create Pull Request'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
