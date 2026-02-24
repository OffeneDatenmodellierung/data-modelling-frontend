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
