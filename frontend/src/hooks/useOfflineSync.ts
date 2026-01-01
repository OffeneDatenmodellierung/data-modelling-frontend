/**
 * useOfflineSync Hook
 * React hook for managing offline sync operations
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { SyncService } from '@/services/sync/syncService';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import type { SyncResult } from '@/services/sync/syncService';

export interface UseOfflineSyncOptions {
  workspaceId: string;
  enabled?: boolean;
  autoSyncOnConnectionRestore?: boolean;
  onSyncComplete?: (result: SyncResult) => void;
  onSyncError?: (error: Error) => void;
}

export function useOfflineSync({
  workspaceId,
  enabled = true,
  autoSyncOnConnectionRestore = true,
  onSyncComplete,
  onSyncError,
}: UseOfflineSyncOptions) {
  const { mode } = useSDKModeStore();
  const syncServiceRef = useRef<SyncService | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);
  const [lastSyncError, setLastSyncError] = useState<Error | null>(null);

  // Initialize sync service
  useEffect(() => {
    if (!enabled || !workspaceId) {
      return;
    }

    syncServiceRef.current = new SyncService(workspaceId);

    return () => {
      syncServiceRef.current = null;
    };
  }, [workspaceId, enabled]);

  // Auto-sync when connection is restored
  useEffect(() => {
    if (!enabled || !workspaceId || !autoSyncOnConnectionRestore) {
      return;
    }

    if (mode === 'online' && syncServiceRef.current) {
      // Connection restored - attempt auto-merge
      const performAutoSync = async () => {
        try {
          setIsSyncing(true);
          setLastSyncError(null);
          const result = await syncServiceRef.current!.autoMergeOnConnectionRestored();
          setLastSyncResult(result);
          onSyncComplete?.(result);
        } catch (error) {
          const syncError = error instanceof Error ? error : new Error('Auto-sync failed');
          setLastSyncError(syncError);
          onSyncError?.(syncError);
        } finally {
          setIsSyncing(false);
        }
      };

      performAutoSync();
    }
  }, [mode, enabled, workspaceId, autoSyncOnConnectionRestore, onSyncComplete, onSyncError]);

  // Sync to remote
  const syncToRemote = useCallback(async (): Promise<SyncResult> => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not initialized');
    }

    if (mode === 'offline') {
      throw new Error('Cannot sync to remote in offline mode');
    }

    try {
      setIsSyncing(true);
      setLastSyncError(null);
      const result = await syncServiceRef.current.syncToRemote();
      setLastSyncResult(result);
      onSyncComplete?.(result);
      return result;
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Sync to remote failed');
      setLastSyncError(syncError);
      onSyncError?.(syncError);
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [mode, onSyncComplete, onSyncError]);

  // Sync from remote
  const syncFromRemote = useCallback(async (): Promise<SyncResult> => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not initialized');
    }

    if (mode === 'offline') {
      throw new Error('Cannot sync from remote in offline mode');
    }

    try {
      setIsSyncing(true);
      setLastSyncError(null);
      const result = await syncServiceRef.current.syncFromRemote();
      setLastSyncResult(result);
      onSyncComplete?.(result);
      return result;
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Sync from remote failed');
      setLastSyncError(syncError);
      onSyncError?.(syncError);
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [mode, onSyncComplete, onSyncError]);

  // Auto-merge
  const autoMerge = useCallback(async (): Promise<SyncResult> => {
    if (!syncServiceRef.current) {
      throw new Error('Sync service not initialized');
    }

    try {
      setIsSyncing(true);
      setLastSyncError(null);
      const result = await syncServiceRef.current.autoMergeOnConnectionRestored();
      setLastSyncResult(result);
      onSyncComplete?.(result);
      return result;
    } catch (error) {
      const syncError = error instanceof Error ? error : new Error('Auto-merge failed');
      setLastSyncError(syncError);
      onSyncError?.(syncError);
      throw syncError;
    } finally {
      setIsSyncing(false);
    }
  }, [onSyncComplete, onSyncError]);

  return {
    isSyncing,
    lastSyncResult,
    lastSyncError,
    syncToRemote,
    syncFromRemote,
    autoMerge,
  };
}

