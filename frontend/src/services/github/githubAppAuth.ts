/**
 * GitHub App Authentication Service
 * Manages OAuth-style authentication via GitHub Apps
 *
 * GitHub App OAuth Flow:
 * 1. Redirect user to GitHub authorization URL
 * 2. User authorizes the app
 * 3. GitHub redirects back with a code
 * 4. Exchange code for access token (via callback handler)
 *
 * Note: The token exchange happens client-side using PKCE for security
 */

import type { GitHubUser, GitHubAuthState, GitHubAppConfig } from '@/types/github';

const APP_CONFIG_STORAGE_KEY = 'github_app_config';
const AUTH_STATE_STORAGE_KEY = 'github_app_auth_state';

// PKCE state for OAuth flow
interface PKCEState {
  codeVerifier: string;
  state: string;
  redirectUri: string;
}

let pendingPKCE: PKCEState | null = null;

/**
 * Generate a random string for PKCE
 */
function generateRandomString(length: number): string {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate SHA-256 hash and base64url encode it
 */
async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hash);

  // Base64url encode
  let base64 = btoa(String.fromCharCode(...hashArray));
  base64 = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return base64;
}

/**
 * Get stored GitHub App configurations
 */
export function getStoredAppConfigs(): GitHubAppConfig[] {
  try {
    const stored = localStorage.getItem(APP_CONFIG_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Store GitHub App configuration
 */
export function storeAppConfig(config: GitHubAppConfig): void {
  const existing = getStoredAppConfigs();
  const index = existing.findIndex((c) => c.clientId === config.clientId);
  if (index >= 0) {
    existing[index] = config;
  } else {
    existing.push(config);
  }
  localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(existing));
}

/**
 * Remove GitHub App configuration
 */
export function removeAppConfig(clientId: string): void {
  const existing = getStoredAppConfigs();
  const filtered = existing.filter((c) => c.clientId !== clientId);
  localStorage.setItem(APP_CONFIG_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * GitHub App Authentication Service
 */
class GitHubAppAuthService {
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
    this.loadStoredAuth();
  }

  /**
   * Load stored GitHub App auth from localStorage
   */
  private loadStoredAuth(): void {
    try {
      const stored = localStorage.getItem(AUTH_STATE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Decode token if present
        if (parsed.token) {
          parsed.token = atob(parsed.token);
        }
        this.authState = parsed;
      }
    } catch (error) {
      console.error('[GitHubAppAuth] Failed to load stored auth:', error);
    }
  }

  /**
   * Store auth state
   */
  private storeAuth(): void {
    try {
      const toStore = {
        ...this.authState,
        token: this.authState.token ? btoa(this.authState.token) : null,
      };
      localStorage.setItem(AUTH_STATE_STORAGE_KEY, JSON.stringify(toStore));
    } catch (error) {
      console.error('[GitHubAppAuth] Failed to store auth:', error);
    }
  }

  /**
   * Get current auth state
   */
  getState(): GitHubAuthState {
    return { ...this.authState };
  }

  /**
   * Check if user is authenticated via GitHub App
   */
  isAuthenticated(): boolean {
    if (!this.authState.isAuthenticated || !this.authState.token) {
      return false;
    }
    // Check if token is expired
    if (this.authState.expiresAt) {
      const expiresAt = new Date(this.authState.expiresAt);
      if (expiresAt <= new Date()) {
        return false;
      }
    }
    return true;
  }

  /**
   * Get current token
   */
  getToken(): string | null {
    return this.authState.token;
  }

  /**
   * Subscribe to auth state changes
   */
  subscribe(listener: (state: GitHubAuthState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify listeners of state change
   */
  private notifyListeners(): void {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  /**
   * Start OAuth flow with PKCE
   * Returns the authorization URL to redirect the user to
   */
  async startOAuthFlow(config: GitHubAppConfig): Promise<string> {
    const codeVerifier = generateRandomString(64);
    const state = generateRandomString(32);
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Determine redirect URI
    const redirectUri = `${window.location.origin}/auth/github/callback`;

    // Store PKCE state for when the user returns
    pendingPKCE = {
      codeVerifier,
      state,
      redirectUri,
    };

    // Also store in sessionStorage in case of page reload
    sessionStorage.setItem('github_oauth_pkce', JSON.stringify(pendingPKCE));
    sessionStorage.setItem('github_oauth_client_id', config.clientId);

    // Build authorization URL
    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      scope: 'repo read:user',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  /**
   * Handle OAuth callback
   * This is called when the user is redirected back from GitHub
   */
  async handleOAuthCallback(
    code: string,
    state: string,
    clientId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Restore PKCE state from sessionStorage if needed
    if (!pendingPKCE) {
      try {
        const stored = sessionStorage.getItem('github_oauth_pkce');
        if (stored) {
          pendingPKCE = JSON.parse(stored);
        }
      } catch {
        return { success: false, error: 'OAuth state lost. Please try again.' };
      }
    }

    if (!pendingPKCE) {
      return { success: false, error: 'No pending OAuth flow. Please start authentication again.' };
    }

    // Verify state matches
    if (state !== pendingPKCE.state) {
      return { success: false, error: 'OAuth state mismatch. This could be a security issue.' };
    }

    // Exchange code for token
    // Note: GitHub Apps with user tokens require a proxy or serverless function
    // because the token exchange requires the client secret
    // For now, we'll provide instructions for setting up a proxy
    try {
      // Attempt token exchange via a proxy endpoint
      // Organizations can set up their own proxy at /api/github/token
      const proxyUrl = `${window.location.origin}/api/github/token`;

      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          client_id: clientId,
          code_verifier: pendingPKCE.codeVerifier,
          redirect_uri: pendingPKCE.redirectUri,
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return { success: false, error: `Token exchange failed: ${error}` };
      }

      const data = await response.json();

      // Validate the token by fetching user info
      const userResponse = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${data.access_token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!userResponse.ok) {
        return { success: false, error: 'Failed to validate token' };
      }

      const user: GitHubUser = await userResponse.json();

      // Update auth state
      this.authState = {
        isAuthenticated: true,
        user,
        token: data.access_token,
        tokenType: 'github_app',
        scopes: (data.scope || '').split(',').filter(Boolean),
        expiresAt: data.expires_in
          ? new Date(Date.now() + data.expires_in * 1000).toISOString()
          : null,
      };

      this.storeAuth();
      this.notifyListeners();

      // Clean up PKCE state
      pendingPKCE = null;
      sessionStorage.removeItem('github_oauth_pkce');
      sessionStorage.removeItem('github_oauth_client_id');

      console.log('[GitHubAppAuth] Authenticated as:', user.login);
      return { success: true };
    } catch (error) {
      console.error('[GitHubAppAuth] Token exchange error:', error);
      return {
        success: false,
        error: 'Token exchange failed. Ensure your organization has set up the token proxy.',
      };
    }
  }

  /**
   * Check if there's a pending OAuth callback to handle
   */
  hasPendingCallback(): boolean {
    const params = new URLSearchParams(window.location.search);
    return params.has('code') && params.has('state');
  }

  /**
   * Get pending callback parameters
   */
  getPendingCallback(): { code: string; state: string } | null {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      return { code, state };
    }
    return null;
  }

  /**
   * Re-validate stored token
   */
  async revalidate(): Promise<boolean> {
    if (!this.authState.token) {
      return false;
    }

    // Check expiration first
    if (this.authState.expiresAt) {
      const expiresAt = new Date(this.authState.expiresAt);
      if (expiresAt <= new Date()) {
        this.logout();
        return false;
      }
    }

    // Validate token is still working
    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          Authorization: `Bearer ${this.authState.token}`,
          Accept: 'application/vnd.github+json',
        },
      });

      if (!response.ok) {
        this.logout();
        return false;
      }

      const user: GitHubUser = await response.json();
      this.authState = { ...this.authState, user };
      this.storeAuth();
      this.notifyListeners();

      return true;
    } catch {
      this.logout();
      return false;
    }
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

    localStorage.removeItem(AUTH_STATE_STORAGE_KEY);
    this.notifyListeners();

    console.log('[GitHubAppAuth] Logged out');
  }

  /**
   * Get instructions for setting up a GitHub App
   */
  static getSetupInstructions(): {
    steps: string[];
    proxyRequirements: string[];
  } {
    return {
      steps: [
        'Create a GitHub App at https://github.com/settings/apps/new',
        'Set the callback URL to: {origin}/auth/github/callback',
        'Enable "Request user authorization (OAuth) during installation"',
        'Add required permissions: Contents (Read & Write), Metadata (Read-only)',
        'Generate a client secret (needed for the token proxy)',
        'Note the Client ID - this is what users will enter',
      ],
      proxyRequirements: [
        'A token proxy endpoint must be set up at /api/github/token',
        'The proxy securely stores the client secret and exchanges codes for tokens',
        'This keeps the client secret server-side while allowing client-side OAuth',
      ],
    };
  }
}

// Export class and singleton instance
export { GitHubAppAuthService };
export const githubAppAuth = new GitHubAppAuthService();
