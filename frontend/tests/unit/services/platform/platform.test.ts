/**
 * Unit tests for Platform Service - Offline Mode Detection
 * Tests offline mode detection and switching
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { sdkModeDetector, useSDKModeStore } from '@/services/sdk/sdkMode';

// Mock fetch
global.fetch = vi.fn();

describe('Platform Service - Offline Mode Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSDKModeStore.setState({
      mode: 'offline',
      isManualOverride: false,
    });
  });

  describe('checkOnlineMode', () => {
    it('should return true when API is available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const isOnline = await sdkModeDetector.checkOnlineMode();
      expect(isOnline).toBe(true);
    });

    it('should return false when API is unavailable', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const isOnline = await sdkModeDetector.checkOnlineMode();
      expect(isOnline).toBe(false);
    });

    it('should return false when API returns error', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
      } as Response);

      const isOnline = await sdkModeDetector.checkOnlineMode();
      expect(isOnline).toBe(false);
    });

    it('should timeout after 2 seconds', async () => {
      vi.mocked(fetch).mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            setTimeout(() => resolve({ ok: true } as Response), 3000);
          })
      );

      const isOnline = await sdkModeDetector.checkOnlineMode();
      expect(isOnline).toBe(false);
    });
  });

  describe('getMode', () => {
    it('should return manual override mode when set', async () => {
      useSDKModeStore.setState({
        mode: 'online',
        isManualOverride: true,
      });

      const mode = await sdkModeDetector.getMode();
      expect(mode).toBe('online');
    });

    it('should detect online mode when API is available', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        status: 200,
      } as Response);

      const mode = await sdkModeDetector.getMode();
      expect(mode).toBe('online');
    });

    it('should detect offline mode when API is unavailable', async () => {
      vi.mocked(fetch).mockRejectedValueOnce(new Error('Network error'));

      const mode = await sdkModeDetector.getMode();
      expect(mode).toBe('offline');
    });
  });

  describe('setMode', () => {
    it('should set mode with manual override', () => {
      sdkModeDetector.setMode('online', true);
      const state = useSDKModeStore.getState();
      expect(state.mode).toBe('online');
      expect(state.isManualOverride).toBe(true);
    });

    it('should set mode without manual override', () => {
      sdkModeDetector.setMode('offline', false);
      const state = useSDKModeStore.getState();
      expect(state.mode).toBe('offline');
      expect(state.isManualOverride).toBe(false);
    });
  });
});

