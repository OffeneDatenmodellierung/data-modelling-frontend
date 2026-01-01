/**
 * Unit tests for useOfflineSync Hook
 * Tests offline sync management hook
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { SyncService } from '@/services/sync/syncService';

// Mock dependencies
vi.mock('@/services/sdk/sdkMode', () => ({
  useSDKModeStore: vi.fn(),
}));

vi.mock('@/services/sync/syncService', () => ({
  SyncService: vi.fn().mockImplementation(() => ({
    syncToRemote: vi.fn(),
    syncFromRemote: vi.fn(),
    autoMergeOnConnectionRestored: vi.fn(),
    detectConflict: vi.fn(),
  })),
}));

describe('useOfflineSync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'online',
    } as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should initialize sync service', () => {
    renderHook(() =>
      useOfflineSync({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    expect(SyncService).toHaveBeenCalledWith('workspace-1');
  });

  it('should not sync in offline mode', async () => {
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
    } as any);

    const { result } = renderHook(() =>
      useOfflineSync({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await waitFor(() => {
      expect(result.current.isSyncing).toBe(false);
    });
  });

  it('should sync to remote when online', async () => {
    const mockSyncService = {
      syncToRemote: vi.fn().mockResolvedValue({ success: true }),
      syncFromRemote: vi.fn(),
      autoMergeOnConnectionRestored: vi.fn(),
      detectConflict: vi.fn(),
    };
    (SyncService as any).mockImplementation(() => mockSyncService);

    const { result } = renderHook(() =>
      useOfflineSync({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await result.current.syncToRemote();

    expect(mockSyncService.syncToRemote).toHaveBeenCalled();
  });

  it('should sync from remote when online', async () => {
    const mockSyncService = {
      syncToRemote: vi.fn(),
      syncFromRemote: vi.fn().mockResolvedValue({ success: true }),
      autoMergeOnConnectionRestored: vi.fn(),
      detectConflict: vi.fn(),
    };
    (SyncService as any).mockImplementation(() => mockSyncService);

    const { result } = renderHook(() =>
      useOfflineSync({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await result.current.syncFromRemote();

    expect(mockSyncService.syncFromRemote).toHaveBeenCalled();
  });

  it('should auto-merge when connection restored', async () => {
    const mockSyncService = {
      syncToRemote: vi.fn(),
      syncFromRemote: vi.fn(),
      autoMergeOnConnectionRestored: vi.fn().mockResolvedValue({ success: true }),
      detectConflict: vi.fn(),
    };
    (SyncService as any).mockImplementation(() => mockSyncService);

    const { result } = renderHook(() =>
      useOfflineSync({
        workspaceId: 'workspace-1',
        enabled: true,
      })
    );

    await result.current.autoMerge();

    expect(mockSyncService.autoMergeOnConnectionRestored).toHaveBeenCalled();
  });
});

