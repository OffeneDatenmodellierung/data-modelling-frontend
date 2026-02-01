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

// Phase 3: Branch types
export interface GitBranch {
  name: string;
  commit: string;
  label: string;
  current: boolean;
}

export interface GitRemoteBranch {
  name: string;
  commit: string;
  remoteName: string;
  branchName: string;
}

// Phase 4: Remote types
export interface GitRemote {
  name: string;
  fetchUrl: string | null;
  pushUrl: string | null;
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
  gitRoot: string | null; // The root of the git repo (may be parent of workspace)
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

  // Phase 3: Branches
  branches: GitBranch[];
  remoteBranches: GitRemoteBranch[];
  isLoadingBranches: boolean;

  // Phase 4: Remotes
  remotes: GitRemote[];
  isLoadingRemotes: boolean;
  isFetching: boolean;
  isPulling: boolean;
  isPushing: boolean;

  // UI State
  isPanelOpen: boolean;
  selectedCommit: GitCommit | null;
  diffContent: string | null;
  isLoadingDiff: boolean;
  showBranchSelector: boolean;
  showCreateBranchDialog: boolean;

  // Workspace path
  workspacePath: string | null;

  // Actions
  setWorkspacePath: (path: string | null) => void;
  setStatus: (status: GitStatus) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setCommits: (commits: GitCommit[]) => void;
  setLoadingHistory: (loading: boolean) => void;
  // Phase 3: Branch actions
  setBranches: (branches: GitBranch[], remoteBranches: GitRemoteBranch[]) => void;
  setLoadingBranches: (loading: boolean) => void;
  setShowBranchSelector: (show: boolean) => void;
  setShowCreateBranchDialog: (show: boolean) => void;
  // Phase 4: Remote actions
  setRemotes: (remotes: GitRemote[]) => void;
  setLoadingRemotes: (loading: boolean) => void;
  setFetching: (fetching: boolean) => void;
  setPulling: (pulling: boolean) => void;
  setPushing: (pushing: boolean) => void;
  // UI actions
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
  gitRoot: null,
};

const initialState = {
  status: initialStatus,
  isLoading: false,
  error: null,
  lastRefresh: null,
  commits: [],
  isLoadingHistory: false,
  // Phase 3: Branches
  branches: [] as GitBranch[],
  remoteBranches: [] as GitRemoteBranch[],
  isLoadingBranches: false,
  // Phase 4: Remotes
  remotes: [] as GitRemote[],
  isLoadingRemotes: false,
  isFetching: false,
  isPulling: false,
  isPushing: false,
  // UI State
  isPanelOpen: false,
  selectedCommit: null,
  diffContent: null,
  isLoadingDiff: false,
  showBranchSelector: false,
  showCreateBranchDialog: false,
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

      // Phase 3: Branch actions
      setBranches: (branches, remoteBranches) =>
        set({ branches, remoteBranches, isLoadingBranches: false }),

      setLoadingBranches: (isLoadingBranches) => set({ isLoadingBranches }),

      setShowBranchSelector: (showBranchSelector) => set({ showBranchSelector }),

      setShowCreateBranchDialog: (showCreateBranchDialog) => set({ showCreateBranchDialog }),

      // Phase 4: Remote actions
      setRemotes: (remotes) => set({ remotes, isLoadingRemotes: false }),

      setLoadingRemotes: (isLoadingRemotes) => set({ isLoadingRemotes }),

      setFetching: (isFetching) => set({ isFetching }),

      setPulling: (isPulling) => set({ isPulling }),

      setPushing: (isPushing) => set({ isPushing }),

      // UI actions
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

// Phase 3: Branch selectors
export const selectCurrentBranch = (state: GitState) =>
  state.branches.find((b) => b.current) || null;

export const selectOtherBranches = (state: GitState) => state.branches.filter((b) => !b.current);

export const selectHasRemote = (state: GitState) => state.remotes.length > 0;

// Phase 4: Remote selectors
export const selectOriginRemote = (state: GitState) =>
  state.remotes.find((r) => r.name === 'origin') || state.remotes[0] || null;

export const selectIsRemoteOperationInProgress = (state: GitState) =>
  state.isFetching || state.isPulling || state.isPushing;
