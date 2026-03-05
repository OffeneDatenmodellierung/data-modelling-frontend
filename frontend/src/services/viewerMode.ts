/**
 * Viewer Mode Configuration
 *
 * Provides build-time configuration for the read-only viewer deployment.
 * When VITE_VIEWER_MODE is "true", the app runs as a locked-down viewer
 * for a specific GitHub repo with no editing capabilities.
 */

export interface ViewerConfig {
  enabled: boolean;
  owner: string;
  repo: string;
  branch: string;
  workspacePath: string;
}

let _config: ViewerConfig | null = null;

export function getViewerConfig(): ViewerConfig {
  if (!_config) {
    _config = {
      enabled: import.meta.env.VITE_VIEWER_MODE === 'true',
      owner: import.meta.env.VITE_VIEWER_OWNER || '',
      repo: import.meta.env.VITE_VIEWER_REPO || '',
      branch: import.meta.env.VITE_VIEWER_BRANCH || 'main',
      workspacePath: import.meta.env.VITE_VIEWER_WORKSPACE_PATH || '',
    };
  }
  return _config;
}

export function isViewerMode(): boolean {
  return getViewerConfig().enabled;
}

/**
 * Flush all browser state (localStorage, IndexedDB) and reload the page.
 * Used in viewer mode when a 502/503 from the Cloudflare proxy leaves
 * the app in a corrupt state that prevents recovery on subsequent loads.
 */
export async function viewerAutoRecover(): Promise<void> {
  console.error('[viewerMode] Auto-recovering: flushing browser state and reloading...');

  try {
    // Clear all Zustand-persisted localStorage keys
    localStorage.removeItem('workspace-storage');
    localStorage.removeItem('github-store');
    localStorage.removeItem('knowledge-store');
    localStorage.removeItem('decision-store');
    localStorage.removeItem('sketch-store');
  } catch (e) {
    console.warn('[viewerMode] Failed to clear localStorage:', e);
  }

  try {
    // Clear all IndexedDB databases
    const databases = await (indexedDB.databases?.() ?? Promise.resolve([]));
    for (const db of databases) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
      }
    }
  } catch (e) {
    console.warn('[viewerMode] Failed to clear IndexedDB:', e);
  }

  // Reload to get a clean start
  window.location.reload();
}
