/**
 * GitHub Store
 * Zustand store for managing GitHub integration state
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  GitHubAuthState,
  GitHubUser,
  GitHubRepository,
  GitHubRepositoryConnection,
  GitHubRateLimit,
  GitHubTag,
  GitHubBlameResult,
  GitHubPRConflictInfo,
  GitHubPullRequest,
  GitHubPullRequestReview,
  GitHubPullRequestComment,
  GitHubIssueComment,
  GitHubPRFile,
  PendingReviewComment,
  ReviewThread,
  PendingReview,
  BranchComparison,
} from '@/types/github';
import { githubAuth } from '@/services/github/githubAuth';
import { getRateLimit } from '@/services/github/githubApi';

// ============================================================================
// Types
// ============================================================================

export interface GitHubState {
  // Authentication
  auth: GitHubAuthState;
  isAuthenticating: boolean;
  authError: string | null;

  // Repository connection
  connection: GitHubRepositoryConnection | null;
  connectedRepo: GitHubRepository | null;
  isConnecting: boolean;
  connectionError: string | null;

  // Available repositories
  repositories: GitHubRepository[];
  isLoadingRepos: boolean;

  // Rate limiting
  rateLimit: GitHubRateLimit;

  // Tags
  tags: GitHubTag[];
  isLoadingTags: boolean;
  selectedTag: GitHubTag | null;
  tagError: string | null;

  // Blame
  blameResult: GitHubBlameResult | null;
  blameFilePath: string | null;
  isLoadingBlame: boolean;
  blameError: string | null;

  // PR Conflict Info
  prConflictInfo: Map<number, GitHubPRConflictInfo>;
  isLoadingConflictInfo: boolean;

  // Pull Requests
  pullRequests: GitHubPullRequest[];
  isLoadingPRs: boolean;
  prError: string | null;
  selectedPR: GitHubPullRequest | null;

  // PR Details (for selected PR)
  prComments: GitHubIssueComment[];
  prReviews: GitHubPullRequestReview[];
  prFiles: GitHubPRFile[];
  isLoadingPRDetails: boolean;
  prDetailsError: string | null;

  // UI State
  showConnectDialog: boolean;
  showAuthDialog: boolean;
  showPRDetailPanel: boolean;
  showPRListPanel: boolean;
  showBranchComparePanel: boolean;

  // Branch switching
  currentBranch: string | null;
  previousBranch: string | null;
  isSwitchingBranch: boolean;
  branchSwitchError: string | null;

  // Pending review (for inline comments before submission)
  pendingReview: PendingReview | null;

  // Review comments (inline code comments with threads)
  prReviewComments: GitHubPullRequestComment[];
  reviewThreads: ReviewThread[];
  isLoadingReviewComments: boolean;

  // Branch comparison
  branchComparison: BranchComparison | null;
  isLoadingComparison: boolean;
  comparisonError: string | null;

  // Actions - Auth
  setAuth: (auth: GitHubAuthState) => void;
  setAuthenticating: (isAuthenticating: boolean) => void;
  setAuthError: (error: string | null) => void;
  logout: () => void;

  // Actions - Connection
  setConnection: (connection: GitHubRepositoryConnection | null) => void;
  setConnectedRepo: (repo: GitHubRepository | null) => void;
  setConnecting: (isConnecting: boolean) => void;
  setConnectionError: (error: string | null) => void;
  disconnect: () => void;

  // Actions - Repositories
  setRepositories: (repos: GitHubRepository[]) => void;
  setLoadingRepos: (isLoading: boolean) => void;

  // Actions - Rate Limit
  updateRateLimit: () => void;

  // Actions - Tags
  setTags: (tags: GitHubTag[]) => void;
  setLoadingTags: (isLoading: boolean) => void;
  setSelectedTag: (tag: GitHubTag | null) => void;
  setTagError: (error: string | null) => void;
  addTag: (tag: GitHubTag) => void;
  removeTag: (tagName: string) => void;

  // Actions - Blame
  setBlameResult: (result: GitHubBlameResult | null, filePath: string | null) => void;
  setLoadingBlame: (isLoading: boolean) => void;
  setBlameError: (error: string | null) => void;
  clearBlame: () => void;

  // Actions - PR Conflicts
  setPRConflictInfo: (prNumber: number, info: GitHubPRConflictInfo) => void;
  setLoadingConflictInfo: (isLoading: boolean) => void;
  clearPRConflictInfo: (prNumber: number) => void;

  // Actions - Pull Requests
  setPullRequests: (prs: GitHubPullRequest[]) => void;
  setLoadingPRs: (isLoading: boolean) => void;
  setPRError: (error: string | null) => void;
  setSelectedPR: (pr: GitHubPullRequest | null) => void;
  updatePR: (pr: GitHubPullRequest) => void;
  removePR: (prNumber: number) => void;

  // Actions - PR Details
  setPRComments: (comments: GitHubIssueComment[]) => void;
  addPRComment: (comment: GitHubIssueComment) => void;
  updatePRComment: (commentId: number, body: string) => void;
  removePRComment: (commentId: number) => void;
  setPRReviews: (reviews: GitHubPullRequestReview[]) => void;
  addPRReview: (review: GitHubPullRequestReview) => void;
  setPRFiles: (files: GitHubPRFile[]) => void;
  setLoadingPRDetails: (isLoading: boolean) => void;
  setPRDetailsError: (error: string | null) => void;
  clearPRDetails: () => void;

  // Actions - UI
  setShowConnectDialog: (show: boolean) => void;
  setShowAuthDialog: (show: boolean) => void;
  setShowPRDetailPanel: (show: boolean) => void;
  setShowPRListPanel: (show: boolean) => void;
  setShowBranchComparePanel: (show: boolean) => void;

  // Actions - Branch switching
  setCurrentBranch: (branch: string | null) => void;
  switchToBranch: (branch: string) => Promise<void>;
  switchToPRBranch: (pr: GitHubPullRequest) => Promise<void>;
  switchBack: () => Promise<void>;
  setBranchSwitchError: (error: string | null) => void;

  // Actions - Pending review
  startPendingReview: (prNumber: number) => void;
  addPendingComment: (comment: Omit<PendingReviewComment, 'id'>) => void;
  updatePendingComment: (id: string, body: string) => void;
  removePendingComment: (id: string) => void;
  discardPendingReview: () => void;

  // Actions - Review comments
  setPRReviewComments: (comments: GitHubPullRequestComment[]) => void;
  setReviewThreads: (threads: ReviewThread[]) => void;
  setLoadingReviewComments: (loading: boolean) => void;

  // Actions - Branch comparison
  setBranchComparison: (comparison: BranchComparison | null) => void;
  setLoadingComparison: (loading: boolean) => void;
  setComparisonError: (error: string | null) => void;
  clearBranchComparison: () => void;

  // Actions - Reset
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialAuth: GitHubAuthState = {
  isAuthenticated: false,
  user: null,
  token: null,
  tokenType: null,
  scopes: [],
  expiresAt: null,
};

const initialRateLimit: GitHubRateLimit = {
  limit: 5000,
  remaining: 5000,
  reset: 0,
  used: 0,
};

const initialState = {
  // Authentication
  auth: initialAuth,
  isAuthenticating: false,
  authError: null,

  // Repository connection
  connection: null as GitHubRepositoryConnection | null,
  connectedRepo: null as GitHubRepository | null,
  isConnecting: false,
  connectionError: null,

  // Available repositories
  repositories: [] as GitHubRepository[],
  isLoadingRepos: false,

  // Rate limiting
  rateLimit: initialRateLimit,

  // Tags
  tags: [] as GitHubTag[],
  isLoadingTags: false,
  selectedTag: null as GitHubTag | null,
  tagError: null as string | null,

  // Blame
  blameResult: null as GitHubBlameResult | null,
  blameFilePath: null as string | null,
  isLoadingBlame: false,
  blameError: null as string | null,

  // PR Conflict Info
  prConflictInfo: new Map<number, GitHubPRConflictInfo>(),
  isLoadingConflictInfo: false,

  // Pull Requests
  pullRequests: [] as GitHubPullRequest[],
  isLoadingPRs: false,
  prError: null as string | null,
  selectedPR: null as GitHubPullRequest | null,

  // PR Details
  prComments: [] as GitHubIssueComment[],
  prReviews: [] as GitHubPullRequestReview[],
  prFiles: [] as GitHubPRFile[],
  isLoadingPRDetails: false,
  prDetailsError: null as string | null,

  // UI State
  showConnectDialog: false,
  showAuthDialog: false,
  showPRDetailPanel: false,
  showPRListPanel: false,
  showBranchComparePanel: false,

  // Branch switching
  currentBranch: null as string | null,
  previousBranch: null as string | null,
  isSwitchingBranch: false,
  branchSwitchError: null as string | null,

  // Pending review
  pendingReview: null as PendingReview | null,

  // Review comments
  prReviewComments: [] as GitHubPullRequestComment[],
  reviewThreads: [] as ReviewThread[],
  isLoadingReviewComments: false,

  // Branch comparison
  branchComparison: null as BranchComparison | null,
  isLoadingComparison: false,
  comparisonError: null as string | null,
};

// ============================================================================
// Store
// ============================================================================

export const useGitHubStore = create<GitHubState>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Auth Actions
        setAuth: (auth) =>
          set({
            auth,
            authError: null,
            isAuthenticating: false,
          }),

        setAuthenticating: (isAuthenticating) => set({ isAuthenticating }),

        setAuthError: (authError) =>
          set({
            authError,
            isAuthenticating: false,
          }),

        logout: () => {
          githubAuth.logout();
          set({
            auth: initialAuth,
            authError: null,
            // Also clear connection on logout
            connection: null,
            connectedRepo: null,
            repositories: [],
          });
        },

        // Connection Actions
        setConnection: (connection) => set({ connection, connectionError: null }),

        setConnectedRepo: (connectedRepo) => set({ connectedRepo }),

        setConnecting: (isConnecting) => set({ isConnecting }),

        setConnectionError: (connectionError) =>
          set({
            connectionError,
            isConnecting: false,
          }),

        disconnect: () =>
          set({
            connection: null,
            connectedRepo: null,
            connectionError: null,
          }),

        // Repository Actions
        setRepositories: (repositories) =>
          set({
            repositories,
            isLoadingRepos: false,
          }),

        setLoadingRepos: (isLoadingRepos) => set({ isLoadingRepos }),

        // Rate Limit Actions
        updateRateLimit: () => {
          const rateLimit = getRateLimit();
          set({ rateLimit });
        },

        // Tag Actions
        setTags: (tags) => set({ tags, isLoadingTags: false, tagError: null }),

        setLoadingTags: (isLoadingTags) => set({ isLoadingTags }),

        setSelectedTag: (selectedTag) => set({ selectedTag }),

        setTagError: (tagError) => set({ tagError, isLoadingTags: false }),

        addTag: (tag) =>
          set((state) => ({
            tags: [tag, ...state.tags],
            tagError: null,
          })),

        removeTag: (tagName) =>
          set((state) => ({
            tags: state.tags.filter((t) => t.name !== tagName),
            selectedTag: state.selectedTag?.name === tagName ? null : state.selectedTag,
          })),

        // Blame Actions
        setBlameResult: (blameResult, blameFilePath) =>
          set({
            blameResult,
            blameFilePath,
            isLoadingBlame: false,
            blameError: null,
          }),

        setLoadingBlame: (isLoadingBlame) => set({ isLoadingBlame }),

        setBlameError: (blameError) =>
          set({
            blameError,
            isLoadingBlame: false,
          }),

        clearBlame: () =>
          set({
            blameResult: null,
            blameFilePath: null,
            blameError: null,
          }),

        // PR Conflict Actions
        setPRConflictInfo: (prNumber, info) =>
          set((state) => {
            const newMap = new Map(state.prConflictInfo);
            newMap.set(prNumber, info);
            return { prConflictInfo: newMap, isLoadingConflictInfo: false };
          }),

        setLoadingConflictInfo: (isLoadingConflictInfo) => set({ isLoadingConflictInfo }),

        clearPRConflictInfo: (prNumber) =>
          set((state) => {
            const newMap = new Map(state.prConflictInfo);
            newMap.delete(prNumber);
            return { prConflictInfo: newMap };
          }),

        // Pull Request Actions
        setPullRequests: (pullRequests) =>
          set({ pullRequests, isLoadingPRs: false, prError: null }),

        setLoadingPRs: (isLoadingPRs) => set({ isLoadingPRs }),

        setPRError: (prError) => set({ prError, isLoadingPRs: false }),

        setSelectedPR: (selectedPR) =>
          set({
            selectedPR,
            showPRDetailPanel: selectedPR !== null,
            // Clear details when selecting a new PR
            prComments: [],
            prReviews: [],
            prFiles: [],
            prDetailsError: null,
          }),

        updatePR: (pr) =>
          set((state) => ({
            pullRequests: state.pullRequests.map((p) => (p.number === pr.number ? pr : p)),
            selectedPR: state.selectedPR?.number === pr.number ? pr : state.selectedPR,
          })),

        removePR: (prNumber) =>
          set((state) => ({
            pullRequests: state.pullRequests.filter((p) => p.number !== prNumber),
            selectedPR: state.selectedPR?.number === prNumber ? null : state.selectedPR,
            showPRDetailPanel:
              state.selectedPR?.number === prNumber ? false : state.showPRDetailPanel,
          })),

        // PR Details Actions
        setPRComments: (prComments) => set({ prComments, isLoadingPRDetails: false }),

        addPRComment: (comment) =>
          set((state) => ({
            prComments: [...state.prComments, comment],
          })),

        updatePRComment: (commentId, body) =>
          set((state) => ({
            prComments: state.prComments.map((c) =>
              c.id === commentId ? { ...c, body, updated_at: new Date().toISOString() } : c
            ),
          })),

        removePRComment: (commentId) =>
          set((state) => ({
            prComments: state.prComments.filter((c) => c.id !== commentId),
          })),

        setPRReviews: (prReviews) => set({ prReviews }),

        addPRReview: (review) =>
          set((state) => ({
            prReviews: [...state.prReviews, review],
          })),

        setPRFiles: (prFiles) => set({ prFiles }),

        setLoadingPRDetails: (isLoadingPRDetails) => set({ isLoadingPRDetails }),

        setPRDetailsError: (prDetailsError) => set({ prDetailsError, isLoadingPRDetails: false }),

        clearPRDetails: () =>
          set({
            prComments: [],
            prReviews: [],
            prFiles: [],
            prDetailsError: null,
            selectedPR: null,
            showPRDetailPanel: false,
          }),

        // UI Actions
        setShowConnectDialog: (showConnectDialog) => set({ showConnectDialog }),

        setShowAuthDialog: (showAuthDialog) => set({ showAuthDialog }),

        setShowPRDetailPanel: (showPRDetailPanel) => set({ showPRDetailPanel }),

        setShowPRListPanel: (showPRListPanel) => set({ showPRListPanel }),

        setShowBranchComparePanel: (showBranchComparePanel) => set({ showBranchComparePanel }),

        // Branch switching actions
        setCurrentBranch: (currentBranch) => set({ currentBranch }),

        switchToBranch: async (branch) => {
          const state = useGitHubStore.getState();
          if (!state.connection) return;

          set({
            isSwitchingBranch: true,
            branchSwitchError: null,
            previousBranch: state.currentBranch,
          });

          try {
            // Update the connection with the new branch
            set({
              connection: {
                ...state.connection,
                branch,
              },
              currentBranch: branch,
              isSwitchingBranch: false,
            });
          } catch (error) {
            set({
              branchSwitchError: error instanceof Error ? error.message : 'Failed to switch branch',
              isSwitchingBranch: false,
            });
          }
        },

        switchToPRBranch: async (pr) => {
          const state = useGitHubStore.getState();
          if (!state.connection) return;

          set({
            isSwitchingBranch: true,
            branchSwitchError: null,
            previousBranch: state.currentBranch || state.connection.branch,
          });

          try {
            const prBranch = pr.head.ref;
            set({
              connection: {
                ...state.connection,
                branch: prBranch,
              },
              currentBranch: prBranch,
              isSwitchingBranch: false,
            });
          } catch (error) {
            set({
              branchSwitchError:
                error instanceof Error ? error.message : 'Failed to switch to PR branch',
              isSwitchingBranch: false,
            });
          }
        },

        switchBack: async () => {
          const state = useGitHubStore.getState();
          if (!state.connection || !state.previousBranch) return;

          set({
            isSwitchingBranch: true,
            branchSwitchError: null,
          });

          try {
            const targetBranch = state.previousBranch;
            set({
              connection: {
                ...state.connection,
                branch: targetBranch,
              },
              currentBranch: targetBranch,
              previousBranch: null,
              isSwitchingBranch: false,
            });
          } catch (error) {
            set({
              branchSwitchError: error instanceof Error ? error.message : 'Failed to switch back',
              isSwitchingBranch: false,
            });
          }
        },

        setBranchSwitchError: (branchSwitchError) => set({ branchSwitchError }),

        // Pending review actions
        startPendingReview: (prNumber) =>
          set({
            pendingReview: {
              prNumber,
              comments: [],
              startedAt: new Date().toISOString(),
            },
          }),

        addPendingComment: (comment) =>
          set((state) => {
            if (!state.pendingReview) return state;
            const newComment: PendingReviewComment = {
              ...comment,
              id: `pending-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            };
            return {
              pendingReview: {
                ...state.pendingReview,
                comments: [...state.pendingReview.comments, newComment],
              },
            };
          }),

        updatePendingComment: (id, body) =>
          set((state) => {
            if (!state.pendingReview) return state;
            return {
              pendingReview: {
                ...state.pendingReview,
                comments: state.pendingReview.comments.map((c) =>
                  c.id === id ? { ...c, body } : c
                ),
              },
            };
          }),

        removePendingComment: (id) =>
          set((state) => {
            if (!state.pendingReview) return state;
            return {
              pendingReview: {
                ...state.pendingReview,
                comments: state.pendingReview.comments.filter((c) => c.id !== id),
              },
            };
          }),

        discardPendingReview: () => set({ pendingReview: null }),

        // Review comments actions
        setPRReviewComments: (prReviewComments) =>
          set({ prReviewComments, isLoadingReviewComments: false }),

        setReviewThreads: (reviewThreads) => set({ reviewThreads }),

        setLoadingReviewComments: (isLoadingReviewComments) => set({ isLoadingReviewComments }),

        // Branch comparison actions
        setBranchComparison: (branchComparison) =>
          set({ branchComparison, isLoadingComparison: false, comparisonError: null }),

        setLoadingComparison: (isLoadingComparison) => set({ isLoadingComparison }),

        setComparisonError: (comparisonError) =>
          set({ comparisonError, isLoadingComparison: false }),

        clearBranchComparison: () =>
          set({
            branchComparison: null,
            comparisonError: null,
          }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'github-store',
        // Only persist connection info, not auth (that's handled by githubAuth)
        partialize: (state) => ({
          connection: state.connection,
        }),
        // Ensure UI state is always reset on hydration (in case old persisted state exists)
        merge: (persistedState, currentState) => ({
          ...currentState,
          ...(persistedState as Partial<GitHubState>),
          // Always reset UI dialogs to closed state
          showAuthDialog: false,
          showConnectDialog: false,
          showPRDetailPanel: false,
          showPRListPanel: false,
          showBranchComparePanel: false,
        }),
      }
    ),
    { name: 'github-store' }
  )
);

// ============================================================================
// Selectors
// ============================================================================

export const selectIsAuthenticated = (state: GitHubState) => state.auth.isAuthenticated;

export const selectUser = (state: GitHubState): GitHubUser | null => state.auth.user;

export const selectIsConnected = (state: GitHubState) => state.connection !== null;

export const selectConnectionInfo = (state: GitHubState) => {
  if (!state.connection) return null;
  return {
    fullName: `${state.connection.owner}/${state.connection.repo}`,
    branch: state.connection.branch,
    path: state.connection.path || '/',
  };
};

export const selectRateLimitPercentage = (state: GitHubState) => {
  const { remaining, limit } = state.rateLimit;
  if (limit === 0) return 100;
  return Math.round((remaining / limit) * 100);
};

export const selectIsRateLimitLow = (state: GitHubState) => {
  return state.rateLimit.remaining < 100;
};

export const selectCanUseGitHub = (state: GitHubState) => {
  return state.auth.isAuthenticated && state.rateLimit.remaining > 0;
};

// Tag selectors
export const selectTags = (state: GitHubState) => state.tags;

export const selectSelectedTag = (state: GitHubState) => state.selectedTag;

export const selectIsLoadingTags = (state: GitHubState) => state.isLoadingTags;

export const selectTagError = (state: GitHubState) => state.tagError;

// Blame selectors
export const selectBlameResult = (state: GitHubState) => state.blameResult;

export const selectBlameFilePath = (state: GitHubState) => state.blameFilePath;

export const selectIsLoadingBlame = (state: GitHubState) => state.isLoadingBlame;

export const selectBlameError = (state: GitHubState) => state.blameError;

// PR Conflict selectors
export const selectPRConflictInfo = (prNumber: number) => (state: GitHubState) =>
  state.prConflictInfo.get(prNumber);

export const selectIsLoadingConflictInfo = (state: GitHubState) => state.isLoadingConflictInfo;

// Pull Request selectors
export const selectPullRequests = (state: GitHubState) => state.pullRequests;

export const selectIsLoadingPRs = (state: GitHubState) => state.isLoadingPRs;

export const selectPRError = (state: GitHubState) => state.prError;

export const selectSelectedPR = (state: GitHubState) => state.selectedPR;

export const selectShowPRDetailPanel = (state: GitHubState) => state.showPRDetailPanel;

// PR Details selectors
export const selectPRComments = (state: GitHubState) => state.prComments;

export const selectPRReviews = (state: GitHubState) => state.prReviews;

export const selectPRFiles = (state: GitHubState) => state.prFiles;

export const selectIsLoadingPRDetails = (state: GitHubState) => state.isLoadingPRDetails;

export const selectPRDetailsError = (state: GitHubState) => state.prDetailsError;

// UI selectors
export const selectShowPRListPanel = (state: GitHubState) => state.showPRListPanel;

export const selectShowBranchComparePanel = (state: GitHubState) => state.showBranchComparePanel;

// Branch switching selectors
export const selectCurrentBranch = (state: GitHubState) => state.currentBranch;

export const selectPreviousBranch = (state: GitHubState) => state.previousBranch;

export const selectIsSwitchingBranch = (state: GitHubState) => state.isSwitchingBranch;

export const selectBranchSwitchError = (state: GitHubState) => state.branchSwitchError;

export const selectCanSwitchBack = (state: GitHubState) => state.previousBranch !== null;

// Pending review selectors
export const selectPendingReview = (state: GitHubState) => state.pendingReview;

// Use a stable empty array reference to prevent infinite re-renders
const EMPTY_PENDING_COMMENTS: never[] = [];
export const selectPendingComments = (state: GitHubState) =>
  state.pendingReview?.comments ?? EMPTY_PENDING_COMMENTS;

export const selectPendingCommentCount = (state: GitHubState) =>
  state.pendingReview?.comments.length ?? 0;

export const selectHasPendingReview = (state: GitHubState) => state.pendingReview !== null;

// Review comments selectors
export const selectPRReviewComments = (state: GitHubState) => state.prReviewComments;

export const selectReviewThreads = (state: GitHubState) => state.reviewThreads;

export const selectIsLoadingReviewComments = (state: GitHubState) => state.isLoadingReviewComments;

// Branch comparison selectors
export const selectBranchComparison = (state: GitHubState) => state.branchComparison;

export const selectIsLoadingComparison = (state: GitHubState) => state.isLoadingComparison;

export const selectComparisonError = (state: GitHubState) => state.comparisonError;

// ============================================================================
// Initialize from stored auth
// ============================================================================

/**
 * Initialize GitHub store from stored authentication
 * Call this on app startup
 */
export async function initializeGitHubStore(): Promise<void> {
  const store = useGitHubStore.getState();

  // Check if we have stored auth
  const storedAuth = githubAuth.getState();
  if (storedAuth.isAuthenticated && storedAuth.token) {
    store.setAuthenticating(true);

    // Revalidate the token
    const isValid = await githubAuth.revalidate();
    if (isValid) {
      store.setAuth(githubAuth.getState());
    } else {
      store.setAuth(initialAuth);
    }
  }

  // Subscribe to auth changes
  githubAuth.subscribe((authState) => {
    useGitHubStore.getState().setAuth(authState);
  });
}
