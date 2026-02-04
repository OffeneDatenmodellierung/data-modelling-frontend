/**
 * GitHub Repository Workspace Hook
 *
 * Hook for managing a GitHub repository workspace,
 * including online/offline detection and auto-sync.
 */

import { useEffect, useCallback } from 'react';
import { useGitHubRepoStore, selectIsRepoOpen, selectIsOnline } from '@/stores/githubRepoStore';

export interface UseGitHubRepoWorkspaceOptions {
  /**
   * Whether to auto-sync on reconnect
   */
  autoSyncOnReconnect?: boolean;

  /**
   * Interval for checking pending changes (ms)
   * Set to 0 to disable
   */
  pendingCheckInterval?: number;
}

export function useGitHubRepoWorkspace(options: UseGitHubRepoWorkspaceOptions = {}) {
  const { autoSyncOnReconnect = true, pendingCheckInterval = 0 } = options;

  const isRepoOpen = useGitHubRepoStore(selectIsRepoOpen);
  const isOnline = useGitHubRepoStore(selectIsOnline);
  const { setOnline, loadPendingChanges, sync } = useGitHubRepoStore();

  // Handle online/offline events
  useEffect(() => {
    const handleOnline = () => {
      setOnline(true);
      if (autoSyncOnReconnect && isRepoOpen) {
        // Auto-sync when coming back online
        sync().catch(console.error);
      }
    };

    const handleOffline = () => {
      setOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Set initial state
    setOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [setOnline, autoSyncOnReconnect, isRepoOpen, sync]);

  // Periodically check for pending changes (if enabled)
  useEffect(() => {
    if (!isRepoOpen || pendingCheckInterval <= 0) return;

    const interval = setInterval(() => {
      loadPendingChanges();
    }, pendingCheckInterval);

    return () => clearInterval(interval);
  }, [isRepoOpen, pendingCheckInterval, loadPendingChanges]);

  // Reload pending changes when workspace opens
  useEffect(() => {
    if (isRepoOpen) {
      loadPendingChanges();
    }
  }, [isRepoOpen, loadPendingChanges]);

  return {
    isRepoOpen,
    isOnline,
  };
}

/**
 * Hook for keyboard shortcuts in GitHub repo workspace
 */
export function useGitHubRepoKeyboardShortcuts() {
  const isRepoOpen = useGitHubRepoStore(selectIsRepoOpen);
  const isOnline = useGitHubRepoStore(selectIsOnline);
  const { sync } = useGitHubRepoStore();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Cmd/Ctrl + S to sync
      if ((event.metaKey || event.ctrlKey) && event.key === 's') {
        if (isRepoOpen && isOnline) {
          event.preventDefault();
          sync().catch(console.error);
        }
      }
    },
    [isRepoOpen, isOnline, sync]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
