/**
 * Unit tests for Platform Service - Offline Mode Detection
 * Tests offline mode detection and switching
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sdkModeDetector, useSDKModeStore } from '@/services/sdk/sdkMode';

// Mock fetch
global.fetch = vi.fn();

// Mock AbortSignal.timeout
const originalAbortSignalTimeout = AbortSignal.timeout;

describe('Platform Service - Offline Mode Detection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock AbortSignal.timeout to create an abort signal that aborts after the timeout
    global.AbortSignal.timeout = vi.fn((ms: number) => {
      const controller = new AbortController();
      setTimeout(() => controller.abort(), ms);
      return controller.signal;
    });
    useSDKModeStore.setState({
      mode: 'offline',
      isManualOverride: false,
    });
  });

  afterEach(() => {
    global.AbortSignal.timeout = originalAbortSignalTimeout;
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
      // Mock fetch to reject when aborted (simulating timeout)
      vi.mocked(fetch).mockImplementationOnce(
        (_url: any, options?: any) => {
          return new Promise((_resolve, reject) => {
            // Check if signal is aborted
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                reject(new Error('Aborted'));
              });
            }
            // Never resolve - should timeout and abort
          });
        }
      );

      const startTime = Date.now();
      const isOnline = await sdkModeDetector.checkOnlineMode();
      const elapsedTime = Date.now() - startTime;

      // Should timeout and return false
      expect(isOnline).toBe(false);
      // Should timeout around 2 seconds (allow some variance)
      expect(elapsedTime).toBeLessThan(3000);
      expect(elapsedTime).toBeGreaterThan(1500);
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

