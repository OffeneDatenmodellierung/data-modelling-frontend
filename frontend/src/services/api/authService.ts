/**
 * Authentication service
 * Handles login, logout, and token management
 */

import { apiClient } from './apiClient';
import type { RefreshTokenRequest, RefreshTokenResponse } from '@/types/api';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  access_token_expires_at: number;
  refresh_token_expires_at: number;
  token_type: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

class AuthService {
  /**
   * Initialize auth tokens from localStorage
   */
  initialize(): void {
    const accessToken = apiClient.getAccessToken();
    const refreshToken = apiClient.getRefreshToken();
    if (accessToken) {
      apiClient.setAccessToken(accessToken);
    }
    if (refreshToken) {
      apiClient.setRefreshToken(refreshToken);
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!apiClient.getAccessToken();
  }

  /**
   * Set authentication tokens
   */
  setTokens(tokens: AuthTokens): void {
    apiClient.setAccessToken(tokens.access_token);
    apiClient.setRefreshToken(tokens.refresh_token);
  }

  /**
   * Clear authentication tokens
   */
  clearTokens(): void {
    apiClient.clearTokens();
  }

  /**
   * Refresh access token
   * Handles offline mode fallback when refresh fails
   */
  async refreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = apiClient.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const request: RefreshTokenRequest = {
        refresh_token: refreshToken,
      };

      const response = await apiClient.getClient().post<RefreshTokenResponse>(
        '/api/v1/auth/refresh',
        request
      );

      this.setTokens({
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        access_token_expires_at: response.data.access_token_expires_at,
        refresh_token_expires_at: response.data.refresh_token_expires_at,
        token_type: response.data.token_type,
      });

      return response.data;
    } catch (error) {
      // If refresh fails, check if we should fall back to offline mode
      const { useSDKModeStore } = await import('@/services/sdk/sdkMode');
      const mode = await useSDKModeStore.getState().getMode();
      
      if (mode === 'offline') {
        // In offline mode, token refresh failure is expected
        throw new Error('Token refresh not available in offline mode');
      }

      // Check if error is network-related
      const isNetworkError =
        error instanceof Error &&
        (error.message.includes('network') ||
          error.message.includes('fetch') ||
          error.message.includes('timeout'));

      if (isNetworkError) {
        // Network error - switch to offline mode
        useSDKModeStore.getState().setMode('offline', true);
        throw new Error('Network error during token refresh. Switched to offline mode.');
      }

      // Other errors - rethrow
      throw error;
    }
  }

  /**
   * Refresh token before expiration
   * Checks token expiration and refreshes if needed
   */
  async refreshTokenIfNeeded(): Promise<void> {
    const accessToken = apiClient.getAccessToken();
    if (!accessToken) {
      return; // No token to refresh
    }

    // Check if token is close to expiration (within 5 minutes)
    // In a real implementation, we'd decode the JWT and check exp claim
    // For now, we'll refresh proactively
    try {
      await this.refreshToken();
    } catch (error) {
      // Refresh failed - will be handled by refreshToken method
      console.warn('Token refresh failed:', error);
    }
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    try {
      await apiClient.getClient().post('/api/v1/auth/logout');
    } catch (error) {
      // Ignore errors during logout
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Get current user (if available)
   * Uses /auth/status endpoint which returns authentication status and user info
   * Returns null if endpoint doesn't exist or fails
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await apiClient.getClient().get<{ 
        authenticated: boolean;
        user?: User;
        email?: string;
        user_id?: string;
      }>('/api/v1/auth/status');
      
      // Extract user info from status response
      if (response.data.user) {
        return response.data.user;
      }
      
      // If user info is in different format, construct User object
      if (response.data.email && response.data.user_id) {
        return {
          id: response.data.user_id,
          email: response.data.email,
          name: response.data.email.split('@')[0] || 'User', // Use email prefix as name
        };
      }
      
      return null;
    } catch (error: any) {
      // If endpoint doesn't exist (404) or other error, return null
      // The caller should handle this gracefully
      if (error?.response?.status === 404) {
        console.warn('/auth/status endpoint not available');
      }
      return null;
    }
  }

  /**
   * Get available email aliases from the session
   * Uses /auth/status endpoint which should return available emails
   * Returns empty array if no emails available or endpoint fails
   */
  async getAvailableEmails(): Promise<string[]> {
    try {
      const response = await apiClient.getClient().get<{ 
        authenticated: boolean;
        emails?: Array<string | { email: string; verified?: boolean; primary?: boolean }>;
        email?: string;
        user?: User;
        session?: {
          emails?: Array<string | { email: string; verified?: boolean; primary?: boolean }>;
          selected_email?: string;
        };
      }>('/api/v1/auth/status');
      
      console.log('[AuthService] /auth/status response:', response.data);
      
      // Helper function to extract email strings from array
      const extractEmails = (emails: Array<string | { email: string; verified?: boolean; primary?: boolean }>): string[] => {
        return emails.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (item && typeof item === 'object' && 'email' in item) {
            return item.email;
          }
          return '';
        }).filter((email): email is string => Boolean(email));
      };
      
      // Check if emails array is available at top level
      if (response.data.emails && Array.isArray(response.data.emails) && response.data.emails.length > 0) {
        console.log('[AuthService] Found emails at top level:', response.data.emails);
        const emailStrings = extractEmails(response.data.emails);
        if (emailStrings.length > 0) {
          return emailStrings;
        }
      }
      
      // Check if emails are in session object
      if (response.data.session?.emails && Array.isArray(response.data.session.emails) && response.data.session.emails.length > 0) {
        console.log('[AuthService] Found emails in session:', response.data.session.emails);
        const emailStrings = extractEmails(response.data.session.emails);
        if (emailStrings.length > 0) {
          return emailStrings;
        }
      }
      
      // Fallback: if single email is available, return it as array
      if (response.data.email) {
        console.log('[AuthService] Found single email:', response.data.email);
        return [response.data.email];
      }
      
      console.warn('[AuthService] No emails found in /auth/status response');
      return [];
    } catch (error: any) {
      console.warn('Failed to get available emails from /auth/status:', error);
      return [];
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

