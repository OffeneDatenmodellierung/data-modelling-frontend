/**
 * Git Store
 * Zustand store for managing git repository state
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export interface GitCommit {
  hash: string;
  hashShort: string;
  message: string;
  author: string;
  authorEmail: string;
  date: Date;
  files?: string[];
}

export interface GitFileChange {
  path: string;
  status: 'modified' | 'added' | 'deleted' | 'renamed' | 'untracked';
  staged: boolean;
  oldPath?: string; // For renames
}

export interface GitStatus {
  isGitRepo: boolean;
  currentBranch: string | null;
  isDirty: boolean;
  files: GitFileChange[];
  ahead: number;
  behind: number;
  remoteName: string | null;
  remoteUrl: string | null;
  hasConflicts: boolean;
  conflictFiles: string[];
}

export interface GitState {
  // Status
  status: GitStatus;
  isLoading: boolean;
  error: string | null;
  lastRefresh: Date | null;

  // History
  commits: GitCommit[];
  isLoadingHistory: boolean;

  // UI State
  isPanelOpen: boolean;
  selectedCommit: GitCommit | null;
  diffContent: string | null;
  isLoadingDiff: boolean;

  // Workspace path
  workspacePath: string | null;

  // Actions
  setWorkspacePath: (path: string | null) => void;
  setStatus: (status: GitStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCommits: (commits: GitCommit[]) => void;
  setLoadingHistory: (loading: boolean) => void;
  setPanelOpen: (open: boolean) => void;
  togglePanel: () => void;
  setSelectedCommit: (commit: GitCommit | null) => void;
  setDiffContent: (diff: string | null) => void;
  setLoadingDiff: (loading: boolean) => void;
  reset: () => void;
}

const initialStatus: GitStatus = {
  isGitRepo: false,
  currentBranch: null,
  isDirty: false,
  files: [],
  ahead: 0,
  behind: 0,
  remoteName: null,
  remoteUrl: null,
  hasConflicts: false,
  conflictFiles: [],
};

const initialState = {
  status: initialStatus,
  isLoading: false,
  error: null,
  lastRefresh: null,
  commits: [],
  isLoadingHistory: false,
  isPanelOpen: false,
  selectedCommit: null,
  diffContent: null,
  isLoadingDiff: false,
  workspacePath: null,
};

export const useGitStore = create<GitState>()(
  devtools(
    (set) => ({
      ...initialState,

      setWorkspacePath: (path) => set({ workspacePath: path }),

      setStatus: (status) =>
        set({
          status,
          lastRefresh: new Date(),
          error: null,
        }),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error, isLoading: false }),

      setCommits: (commits) => set({ commits, isLoadingHistory: false }),

      setLoadingHistory: (isLoadingHistory) => set({ isLoadingHistory }),

      setPanelOpen: (isPanelOpen) => set({ isPanelOpen }),

      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),

      setSelectedCommit: (selectedCommit) => set({ selectedCommit }),

      setDiffContent: (diffContent) => set({ diffContent, isLoadingDiff: false }),

      setLoadingDiff: (isLoadingDiff) => set({ isLoadingDiff }),

      reset: () => set(initialState),
    }),
    { name: 'git-store' }
  )
);

// Selectors for common derived state
export const selectStagedFiles = (state: GitState) => state.status.files.filter((f) => f.staged);

export const selectUnstagedFiles = (state: GitState) => state.status.files.filter((f) => !f.staged);

export const selectModifiedCount = (state: GitState) => state.status.files.length;

export const selectHasChanges = (state: GitState) => state.status.files.length > 0;

export const selectCanPush = (state: GitState) =>
  state.status.isGitRepo && state.status.remoteName !== null && state.status.ahead > 0;

export const selectCanPull = (state: GitState) =>
  state.status.isGitRepo && state.status.remoteName !== null && state.status.behind > 0;
