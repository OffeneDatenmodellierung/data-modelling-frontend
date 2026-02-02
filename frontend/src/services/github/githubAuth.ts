/**
 * GitHub Authentication Service
 * Manages Personal Access Token (PAT) authentication
 * All tokens are stored client-side only - no backend storage
 */

import type { GitHubUser, GitHubAuthState } from '@/types/github';

const STORAGE_KEY = 'github_auth';
const TOKEN_VALIDATION_ENDPOINT = 'https://api.github.com/user';

/**
 * Simple encryption for token storage
 * Note: This is obfuscation, not true encryption. For sensitive environments,
 * consider using Web Crypto API or electron's safeStorage
 */
function encodeToken(token: string): string {
  return btoa(token.split('').reverse().join(''));
}

function decodeToken(encoded: string): string {
  try {
    return atob(encoded).split('').reverse().join('');
  } catch {
    return '';
  }
}

/**
 * Get stored auth state from localStorage
 */
function getStoredAuth(): GitHubAuthState | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (parsed.token) {
      parsed.token = decodeToken(parsed.token);
    }
    return parsed;
  } catch (error) {
    console.error('[GitHubAuth] Failed to parse stored auth:', error);
    return null;
  }
}

/**
 * Store auth state in localStorage
 */
function setStoredAuth(auth: GitHubAuthState | null): void {
  try {
    if (!auth) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }

    const toStore = {
      ...auth,
      token: auth.token ? encodeToken(auth.token) : null,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
  } catch (error) {
    console.error('[GitHubAuth] Failed to store auth:', error);
  }
}

/**
 * Validate a GitHub Personal Access Token
 * Returns user info if valid, null if invalid
 */
async function validateToken(token: string): Promise<{
  user: GitHubUser;
  scopes: string[];
} | null> {
  try {
    const response = await fetch(TOKEN_VALIDATION_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!response.ok) {
      console.error('[GitHubAuth] Token validation failed:', response.status);
      return null;
    }

    const user: GitHubUser = await response.json();
    const scopesHeader = response.headers.get('x-oauth-scopes') || '';
    const scopes = scopesHeader
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    return { user, scopes };
  } catch (error) {
    console.error('[GitHubAuth] Token validation error:', error);
    return null;
  }
}

/**
 * Check if token has required scopes
 */
function hasRequiredScopes(scopes: string[]): { valid: boolean; missing: string[] } {
  const required = ['repo'];
  const missing = required.filter((r) => !scopes.includes(r));
  return { valid: missing.length === 0, missing };
}

/**
 * GitHub Authentication Service
 */
class GitHubAuthService {
  private authState: GitHubAuthState = {
    isAuthenticated: false,
    user: null,
    token: null,
    tokenType: null,
    scopes: [],
    expiresAt: null,
  };

  private listeners: Set<(state: GitHubAuthState) => void> = new Set();

  constructor() {
    // Load stored auth on initialization
    const stored = getStoredAuth();
    if (stored) {
      this.authState = stored;
    }
  }

  /**
   * Get current auth state
   */
  getState(): GitHubAuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.authState.isAuthenticated && !!this.authState.token;
  }

  /**
   * Get current token (if authenticated)
   */
  getToken(): string | null {
    return this.authState.token;
  }

  /**
   * Get current user (if authenticated)
   */
  getUser(): GitHubUser | null {
    return this.authState.user;
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: GitHubAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Authenticate with a Personal Access Token
   */
  async authenticateWithPAT(token: string): Promise<{
    success: boolean;
    error?: string;
    scopeWarning?: string;
  }> {
    // Validate the token
    const validation = await validateToken(token);
    if (!validation) {
      return { success: false, error: 'Invalid token or network error' };
    }

    // Check scopes
    const scopeCheck = hasRequiredScopes(validation.scopes);
    let scopeWarning: string | undefined;
    if (!scopeCheck.valid) {
      scopeWarning = `Token is missing recommended scopes: ${scopeCheck.missing.join(', ')}. Some features may not work.`;
    }

    // Update state
    this.authState = {
      isAuthenticated: true,
      user: validation.user,
      token,
      tokenType: 'pat',
      scopes: validation.scopes,
      expiresAt: null, // PATs don't expire unless revoked
    };

    // Store and notify
    setStoredAuth(this.authState);
    this.notifyListeners();

    console.log('[GitHubAuth] Authenticated as:', validation.user.login);

    return { success: true, scopeWarning };
  }

  /**
   * Re-validate stored token (call on app startup)
   */
  async revalidate(): Promise<boolean> {
    if (!this.authState.token) {
      return false;
    }

    const validation = await validateToken(this.authState.token);
    if (!validation) {
      // Token is no longer valid, clear auth
      this.logout();
      return false;
    }

    // Update user info (may have changed)
    this.authState = {
      ...this.authState,
      user: validation.user,
      scopes: validation.scopes,
    };

    setStoredAuth(this.authState);
    this.notifyListeners();

    return true;
  }

  /**
   * Logout / clear authentication
   */
  logout(): void {
    this.authState = {
      isAuthenticated: false,
      user: null,
      token: null,
      tokenType: null,
      scopes: [],
      expiresAt: null,
    };

    setStoredAuth(null);
    this.notifyListeners();

    console.log('[GitHubAuth] Logged out');
  }

  /**
   * Check if token has a specific scope
   */
  hasScope(scope: string): boolean {
    return this.authState.scopes.includes(scope);
  }

  /**
   * Get instructions for creating a PAT
   */
  static getPATInstructions(): {
    url: string;
    steps: string[];
    requiredScopes: string[];
    recommendedScopes: string[];
  } {
    return {
      url: 'https://github.com/settings/tokens/new',
      steps: [
        'Go to GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)',
        'Click "Generate new token (classic)"',
        'Give your token a descriptive name (e.g., "Open Data Modelling")',
        'Select the required scopes listed below',
        'Click "Generate token" and copy the token',
        'Paste the token in this app',
      ],
      requiredScopes: ['repo'],
      recommendedScopes: ['repo', 'read:user', 'read:org'],
    };
  }
}

// Export class and singleton instance
export { GitHubAuthService };
export const githubAuth = new GitHubAuthService();
