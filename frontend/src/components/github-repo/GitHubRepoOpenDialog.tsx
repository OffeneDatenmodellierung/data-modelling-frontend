/**
 * GitHub Repository Open Dialog
 *
 * Multi-step dialog for opening a GitHub repository:
 * 1. Select repository (browse or URL)
 * 2. Select branch
 * 3. Select workspace (if multiple found)
 */

import React, { useState, useCallback } from 'react';
import { RepoSelector } from './RepoSelector';
import { BranchSelector } from './BranchSelector';
import { WorkspaceSelector } from './WorkspaceSelector';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';

export interface GitHubRepoOpenDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onOpen?: (workspaceId: string) => void;
  className?: string;
}

type Step = 'repo' | 'branch' | 'workspace';

interface SelectedRepo {
  owner: string;
  repo: string;
  defaultBranch: string;
}

export const GitHubRepoOpenDialog: React.FC<GitHubRepoOpenDialogProps> = ({
  isOpen,
  onClose,
  onOpen,
  className = '',
}) => {
  const [step, setStep] = useState<Step>('repo');
  const [selectedRepo, setSelectedRepo] = useState<SelectedRepo | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const { openWorkspace, isOpeningRepo, clearDetectedWorkspaces } = useGitHubRepoStore();

  const handleClose = useCallback(() => {
    setStep('repo');
    setSelectedRepo(null);
    setSelectedBranch('');
    clearDetectedWorkspaces();
    onClose();
  }, [onClose, clearDetectedWorkspaces]);

  const handleRepoSelect = useCallback((owner: string, repo: string, defaultBranch: string) => {
    setSelectedRepo({ owner, repo, defaultBranch });
    setSelectedBranch(defaultBranch);
    setStep('branch');
  }, []);

  const handleBranchSelect = useCallback((branch: string) => {
    setSelectedBranch(branch);
    setStep('workspace');
  }, []);

  const handleWorkspaceSelect = useCallback(
    async (workspacePath: string, workspaceName: string) => {
      if (!selectedRepo) return;

      try {
        await openWorkspace(
          selectedRepo.owner,
          selectedRepo.repo,
          selectedBranch,
          workspacePath,
          workspaceName
        );

        const workspaceId = `${selectedRepo.owner}/${selectedRepo.repo}/${selectedBranch}/${workspacePath || '_root_'}`;
        onOpen?.(workspaceId);
        handleClose();
      } catch (error) {
        console.error('Failed to open workspace:', error);
        // Error is handled by the store
      }
    },
    [selectedRepo, selectedBranch, openWorkspace, onOpen, handleClose]
  );

  const handleBack = useCallback(() => {
    if (step === 'workspace') {
      setStep('branch');
    } else if (step === 'branch') {
      setStep('repo');
      setSelectedRepo(null);
    }
  }, [step]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
      {/* Backdrop */}
      {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- Modal backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Dialog content */}
      <div className="relative w-full max-w-xl mx-4">
        {/* Loading overlay */}
        {isOpeningRepo && (
          <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center rounded-lg">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
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
              <span className="text-gray-700">Opening workspace...</span>
            </div>
          </div>
        )}

        {/* Step 1: Repository selection */}
        {step === 'repo' && <RepoSelector onSelect={handleRepoSelect} onCancel={handleClose} />}

        {/* Step 2: Branch selection */}
        {step === 'branch' && selectedRepo && (
          <BranchSelector
            owner={selectedRepo.owner}
            repo={selectedRepo.repo}
            defaultBranch={selectedRepo.defaultBranch}
            onSelect={handleBranchSelect}
            onBack={handleBack}
            onCancel={handleClose}
          />
        )}

        {/* Step 3: Workspace selection */}
        {step === 'workspace' && selectedRepo && (
          <WorkspaceSelector
            owner={selectedRepo.owner}
            repo={selectedRepo.repo}
            branch={selectedBranch}
            onSelect={handleWorkspaceSelect}
            onBack={handleBack}
            onCancel={handleClose}
          />
        )}
      </div>
    </div>
  );
};
