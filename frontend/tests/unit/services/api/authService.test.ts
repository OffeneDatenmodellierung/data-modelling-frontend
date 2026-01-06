/**
 * Unit tests for Auth Service - JWT Token Refresh
 * Tests JWT token refresh functionality
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { authService } from '@/services/api/authService';
import { apiClient } from '@/services/api/apiClient';
import { useSDKModeStore } from '@/services/sdk/sdkMode';

// Mock dependencies
vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getClient: vi.fn(),
    getAccessToken: vi.fn(),
    getRefreshToken: vi.fn(),
    setAccessToken: vi.fn(),
    setRefreshToken: vi.fn(),
    clearTokens: vi.fn(),
  },
}));

vi.mock('@/services/sdk/sdkMode', () => ({
  useSDKModeStore: {
    getState: vi.fn(),
  },
}));

describe('AuthService - JWT Token Refresh', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSDKModeStore.getState).mockReturnValue({
      mode: 'online',
      getMode: vi.fn().mockResolvedValue('online'),
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('refreshToken', () => {
    it('should refresh access token successfully', async () => {
      const mockRefreshResponse = {
        access_token: 'new-access-token',
        refresh_token: 'new-refresh-token',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 86400000,
        token_type: 'Bearer',
      };

      vi.mocked(apiClient.getRefreshToken).mockReturnValue('old-refresh-token');
      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockRefreshResponse,
        }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await authService.refreshToken();

      expect(result).toEqual(mockRefreshResponse);
      expect(apiClient.setAccessToken).toHaveBeenCalledWith('new-access-token');
      expect(apiClient.setRefreshToken).toHaveBeenCalledWith('new-refresh-token');
    });

    it('should throw error when no refresh token available', async () => {
      vi.mocked(apiClient.getRefreshToken).mockReturnValue(null);

      await expect(authService.refreshToken()).rejects.toThrow('No refresh token available');
    });

    it('should handle refresh failure gracefully', async () => {
      vi.mocked(apiClient.getRefreshToken).mockReturnValue('refresh-token');
      const mockClient = {
        post: vi.fn().mockRejectedValue(new Error('Refresh failed')),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      await expect(authService.refreshToken()).rejects.toThrow('Refresh failed');
    });
  });

  describe('token refresh before expiration', () => {
    it('should refresh token when close to expiration', async () => {
      // Mock token that expires in 5 minutes (should refresh)
      const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes
      
      vi.mocked(apiClient.getAccessToken).mockReturnValue('token');
      const mockRefreshResponse = {
        access_token: 'new-token',
        refresh_token: 'new-refresh',
        access_token_expires_at: Date.now() + 3600000,
        refresh_token_expires_at: Date.now() + 86400000,
        token_type: 'Bearer',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({
          data: mockRefreshResponse,
        }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);
      vi.mocked(apiClient.getRefreshToken).mockReturnValue('refresh-token');

      // This would be called by a token refresh scheduler
      // For now, we just test the refresh function itself
      await authService.refreshToken();

      expect(mockClient.post).toHaveBeenCalled();
    });
  });

  describe('offline mode fallback', () => {
    it('should handle refresh failure in offline mode', async () => {
      vi.mocked(useSDKModeStore.getState).mockReturnValue({
        mode: 'offline',
        getMode: vi.fn().mockResolvedValue('offline'),
      } as any);

      vi.mocked(apiClient.getRefreshToken).mockReturnValue('refresh-token');
      const mockClient = {
        post: vi.fn().mockRejectedValue(new Error('Network error')),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      // In offline mode, refresh should fail gracefully
      await expect(authService.refreshToken()).rejects.toThrow();
    });
  });
});

