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

// Phase 5: Stash types
export interface GitStashEntry {
  index: number;
  hash: string;
  message: string;
  date: string;
  branch: string;
}

// Phase 5: Rebase status
export interface GitRebaseStatus {
  isRebasing: boolean;
  currentCommit?: string;
  headName?: string;
  onto?: string;
  done?: number;
  remaining?: number;
  conflictFiles?: string[];
}

// Phase 6: Tag types
export interface GitTag {
  name: string;
  hash: string;
  message?: string;
  tagger?: string;
  taggerEmail?: string;
  date?: string;
  isAnnotated: boolean;
}

// Phase 6: Blame types
export interface GitBlameLine {
  lineNumber: number;
  content: string;
  commit: {
    hash: string;
    hashShort: string;
    author: string;
    authorEmail: string;
    date: string;
    message: string;
  };
  isOriginal: boolean;
}

export interface GitBlameResult {
  lines: GitBlameLine[];
  filePath: string;
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

  // Phase 5: Stash
  stashes: GitStashEntry[];
  isLoadingStashes: boolean;
  isStashing: boolean;
  selectedStash: GitStashEntry | null;
  stashDiff: string | null;

  // Phase 5: Rebase
  rebaseStatus: GitRebaseStatus;
  isRebasing: boolean;

  // Phase 5: Cherry-pick
  isCherryPicking: boolean;
  cherryPickConflicts: string[];

  // Phase 6: Tags
  tags: GitTag[];
  isLoadingTags: boolean;
  selectedTag: GitTag | null;

  // Phase 6: Blame
  blameResult: GitBlameResult | null;
  isLoadingBlame: boolean;
  blameFilePath: string | null;

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
  // Phase 5: Stash actions
  setStashes: (stashes: GitStashEntry[]) => void;
  setLoadingStashes: (loading: boolean) => void;
  setStashing: (stashing: boolean) => void;
  setSelectedStash: (stash: GitStashEntry | null) => void;
  setStashDiff: (diff: string | null) => void;
  // Phase 5: Rebase actions
  setRebaseStatus: (status: GitRebaseStatus) => void;
  setRebasing: (rebasing: boolean) => void;
  // Phase 5: Cherry-pick actions
  setCherryPicking: (cherryPicking: boolean) => void;
  setCherryPickConflicts: (conflicts: string[]) => void;
  // Phase 6: Tag actions
  setTags: (tags: GitTag[]) => void;
  setLoadingTags: (loading: boolean) => void;
  setSelectedTag: (tag: GitTag | null) => void;
  // Phase 6: Blame actions
  setBlameResult: (result: GitBlameResult | null) => void;
  setLoadingBlame: (loading: boolean) => void;
  setBlameFilePath: (filePath: string | null) => void;
  clearBlame: () => void;
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

const initialRebaseStatus: GitRebaseStatus = {
  isRebasing: false,
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
  // Phase 5: Stash
  stashes: [] as GitStashEntry[],
  isLoadingStashes: false,
  isStashing: false,
  selectedStash: null as GitStashEntry | null,
  stashDiff: null as string | null,
  // Phase 5: Rebase
  rebaseStatus: initialRebaseStatus,
  isRebasing: false,
  // Phase 5: Cherry-pick
  isCherryPicking: false,
  cherryPickConflicts: [] as string[],
  // Phase 6: Tags
  tags: [] as GitTag[],
  isLoadingTags: false,
  selectedTag: null as GitTag | null,
  // Phase 6: Blame
  blameResult: null as GitBlameResult | null,
  isLoadingBlame: false,
  blameFilePath: null as string | null,
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

      // Phase 5: Stash actions
      setStashes: (stashes) => set({ stashes, isLoadingStashes: false }),

      setLoadingStashes: (isLoadingStashes) => set({ isLoadingStashes }),

      setStashing: (isStashing) => set({ isStashing }),

      setSelectedStash: (selectedStash) => set({ selectedStash }),

      setStashDiff: (stashDiff) => set({ stashDiff }),

      // Phase 5: Rebase actions
      setRebaseStatus: (rebaseStatus) => set({ rebaseStatus }),

      setRebasing: (isRebasing) => set({ isRebasing }),

      // Phase 5: Cherry-pick actions
      setCherryPicking: (isCherryPicking) => set({ isCherryPicking }),

      setCherryPickConflicts: (cherryPickConflicts) => set({ cherryPickConflicts }),

      // Phase 6: Tag actions
      setTags: (tags) => set({ tags, isLoadingTags: false }),

      setLoadingTags: (isLoadingTags) => set({ isLoadingTags }),

      setSelectedTag: (selectedTag) => set({ selectedTag }),

      // Phase 6: Blame actions
      setBlameResult: (blameResult) => set({ blameResult, isLoadingBlame: false }),

      setLoadingBlame: (isLoadingBlame) => set({ isLoadingBlame }),

      setBlameFilePath: (blameFilePath) => set({ blameFilePath }),

      clearBlame: () => set({ blameResult: null, blameFilePath: null, isLoadingBlame: false }),

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

// Phase 5: Stash selectors
export const selectHasStashes = (state: GitState) => state.stashes.length > 0;

export const selectStashCount = (state: GitState) => state.stashes.length;

// Phase 5: Rebase selectors
export const selectIsInRebase = (state: GitState) => state.rebaseStatus.isRebasing;

export const selectRebaseProgress = (state: GitState) => {
  const { done, remaining } = state.rebaseStatus;
  if (done === undefined || remaining === undefined) return null;
  return { done, remaining, total: done + remaining };
};

// Phase 5: Advanced operation status
export const selectIsAdvancedOperationInProgress = (state: GitState) =>
  state.isRebasing || state.isCherryPicking || state.isStashing;

export const selectHasConflicts = (state: GitState) =>
  state.status.hasConflicts ||
  (state.rebaseStatus.conflictFiles && state.rebaseStatus.conflictFiles.length > 0) ||
  state.cherryPickConflicts.length > 0;

// Phase 6: Tag selectors
export const selectTags = (state: GitState) => state.tags;

export const selectTagCount = (state: GitState) => state.tags.length;

export const selectAnnotatedTags = (state: GitState) => state.tags.filter((t) => t.isAnnotated);

export const selectLightweightTags = (state: GitState) => state.tags.filter((t) => !t.isAnnotated);

export const selectTagByName = (state: GitState, name: string) =>
  state.tags.find((t) => t.name === name);

// Phase 6: Blame selectors
export const selectBlameResult = (state: GitState) => state.blameResult;

export const selectIsBlameLoading = (state: GitState) => state.isLoadingBlame;

export const selectBlameAuthors = (state: GitState) => {
  if (!state.blameResult) return [];
  const authors = new Map<string, { name: string; email: string; lineCount: number }>();
  for (const line of state.blameResult.lines) {
    const key = line.commit.authorEmail;
    const existing = authors.get(key);
    if (existing) {
      existing.lineCount++;
    } else {
      authors.set(key, {
        name: line.commit.author,
        email: line.commit.authorEmail,
        lineCount: 1,
      });
    }
  }
  return Array.from(authors.values()).sort((a, b) => b.lineCount - a.lineCount);
};
