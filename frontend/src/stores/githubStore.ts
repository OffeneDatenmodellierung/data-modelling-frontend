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

  // UI State
  showConnectDialog: boolean;
  showAuthDialog: boolean;

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

  // Actions - UI
  setShowConnectDialog: (show: boolean) => void;
  setShowAuthDialog: (show: boolean) => void;

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

  // UI State
  showConnectDialog: false,
  showAuthDialog: false,
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

        // UI Actions
        setShowConnectDialog: (showConnectDialog) => set({ showConnectDialog }),

        setShowAuthDialog: (showAuthDialog) => set({ showAuthDialog }),

        // Reset
        reset: () => set(initialState),
      }),
      {
        name: 'github-store',
        // Only persist connection info, not auth (that's handled by githubAuth)
        partialize: (state) => ({
          connection: state.connection,
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
