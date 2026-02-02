/**
 * Workspace Selector Component
 *
 * Shows detected workspaces in a repository and allows the user
 * to select which one to open, or create a new workspace.
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import type { DetectedWorkspace } from '@/types/github-repo';

export interface WorkspaceSelectorProps {
  owner: string;
  repo: string;
  branch: string;
  onSelect: (workspacePath: string, workspaceName: string) => void;
  onBack: () => void;
  onCancel: () => void;
  className?: string;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  owner,
  repo,
  branch,
  onSelect,
  onBack,
  onCancel,
  className = '',
}) => {
  const { detectWorkspaces, isDetectingWorkspaces, detectedWorkspaces, syncError } =
    useGitHubRepoStore();

  const [selectedWorkspace, setSelectedWorkspace] = useState<DetectedWorkspace | null>(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newWorkspacePath, setNewWorkspacePath] = useState('');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');

  // Detect workspaces on mount
  useEffect(() => {
    detectWorkspaces(owner, repo, branch);
  }, [owner, repo, branch, detectWorkspaces]);

  // Auto-select if only one workspace
  useEffect(() => {
    if (detectedWorkspaces.length === 1 && !selectedWorkspace) {
      setSelectedWorkspace(detectedWorkspaces[0] || null);
    }
  }, [detectedWorkspaces, selectedWorkspace]);

  const handleSelect = useCallback(() => {
    if (selectedWorkspace) {
      onSelect(selectedWorkspace.path, selectedWorkspace.name);
    }
  }, [selectedWorkspace, onSelect]);

  const handleCreateNew = useCallback(() => {
    const path = newWorkspacePath.trim();
    const name = newWorkspaceName.trim() || path || 'New Workspace';
    onSelect(path, name);
  }, [newWorkspacePath, newWorkspaceName, onSelect]);

  const handleAutoOpen = useCallback(() => {
    // If only one workspace found, open it directly
    if (detectedWorkspaces.length === 1) {
      const ws = detectedWorkspaces[0];
      if (ws) {
        onSelect(ws.path, ws.name);
      }
    }
  }, [detectedWorkspaces, onSelect]);

  // Show loading state
  if (isDetectingWorkspaces) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <svg className="w-6 h-6 animate-spin text-gray-400" fill="none" viewBox="0 0 24 24">
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
          <span className="ml-2 text-gray-600">Scanning for workspaces...</span>
        </div>
      </div>
    );
  }

  // No workspaces found
  if (detectedWorkspaces.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-lg max-h-[70vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-900">No Workspaces Found</h3>
        </div>

        {/* Repo info */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="font-medium text-gray-900">
            {owner}/{repo}
          </div>
          <div className="text-sm text-gray-500">Branch: {branch}</div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              No <code className="bg-yellow-100 px-1 rounded">.workspace.yaml</code> files were
              found in the root or first-level subdirectories of this repository.
            </p>
          </div>

          <p className="text-sm text-gray-600 mb-4">
            You can create a new workspace or open the repository root:
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Workspace folder (leave empty for root)
              </label>
              <input
                type="text"
                value={newWorkspacePath}
                onChange={(e) => setNewWorkspacePath(e.target.value)}
                placeholder="e.g., my-workspace"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Workspace name</label>
              <input
                type="text"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                placeholder="My Workspace"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Open / Create Workspace
          </button>
        </div>
      </div>
    );
  }

  // Single workspace - show confirmation
  if (detectedWorkspaces.length === 1) {
    const workspace = detectedWorkspaces[0];
    return (
      <div className={`bg-white rounded-lg shadow-lg max-h-[70vh] flex flex-col ${className}`}>
        {/* Header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
          <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-600 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h3 className="text-lg font-semibold text-gray-900">Workspace Found</h3>
        </div>

        {/* Repo info */}
        <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
          <div className="font-medium text-gray-900">
            {owner}/{repo}
          </div>
          <div className="text-sm text-gray-500">Branch: {branch}</div>
        </div>

        {/* Content */}
        <div className="flex-1 p-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-blue-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h4 className="font-medium text-gray-900">{workspace?.name}</h4>
                {workspace?.path && <p className="text-sm text-gray-500">/{workspace.path}</p>}
                {workspace?.description && (
                  <p className="text-sm text-gray-600 mt-1">{workspace.description}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleAutoOpen}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          >
            Open Workspace
          </button>
        </div>
      </div>
    );
  }

  // Multiple workspaces - show selection
  return (
    <div className={`bg-white rounded-lg shadow-lg max-h-[70vh] flex flex-col ${className}`}>
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <button onClick={onBack} className="p-1 text-gray-400 hover:text-gray-600 rounded">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
        </button>
        <h3 className="text-lg font-semibold text-gray-900">Select Workspace</h3>
      </div>

      {/* Repo info */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="font-medium text-gray-900">
          {owner}/{repo}
        </div>
        <div className="text-sm text-gray-500">Branch: {branch}</div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {syncError && (
          <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-600">{syncError.message}</p>
          </div>
        )}

        <p className="text-sm text-gray-600 mb-4">
          Multiple workspaces found. Select the one you want to open:
        </p>

        <div className="space-y-2">
          {detectedWorkspaces.map((workspace) => (
            <label
              key={workspace.workspaceFile}
              className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                selectedWorkspace?.workspaceFile === workspace.workspaceFile
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <input
                type="radio"
                name="workspace"
                checked={selectedWorkspace?.workspaceFile === workspace.workspaceFile}
                onChange={() => setSelectedWorkspace(workspace)}
                className="mt-1 w-4 h-4 text-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{workspace.name}</span>
                  {!workspace.path && (
                    <span className="px-1.5 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                      root
                    </span>
                  )}
                </div>
                {workspace.path && <p className="text-sm text-gray-500">/{workspace.path}</p>}
                {workspace.description && (
                  <p className="text-sm text-gray-600 mt-1">{workspace.description}</p>
                )}
              </div>
            </label>
          ))}
        </div>

        {/* Create new workspace option */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          {!showCreateNew ? (
            <button
              onClick={() => setShowCreateNew(true)}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              + Create new workspace in a different location
            </button>
          ) : (
            <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace folder
                </label>
                <input
                  type="text"
                  value={newWorkspacePath}
                  onChange={(e) => setNewWorkspacePath(e.target.value)}
                  placeholder="e.g., projects/new-workspace"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace name
                </label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  placeholder="My Workspace"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowCreateNew(false);
                    setNewWorkspacePath('');
                    setNewWorkspaceName('');
                  }}
                  className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateNew}
                  disabled={!newWorkspacePath.trim() && !newWorkspaceName.trim()}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create & Open
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-gray-200 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSelect}
          disabled={!selectedWorkspace}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Open Workspace
        </button>
      </div>
    </div>
  );
};
