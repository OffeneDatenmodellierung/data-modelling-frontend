/**
 * GitHub Components
 * Public exports for GitHub integration UI
 */

export { GitHubAuthDialog } from './GitHubAuthDialog';
export { GitHubUserMenu } from './GitHubUserMenu';
export { GitHubRepoSelector } from './GitHubRepoSelector';
export { GitHubConnectionStatus } from './GitHubConnectionStatus';
export { GitHubFileBrowser } from './GitHubFileBrowser';
export { GitHubCommitHistory } from './GitHubCommitHistory';
export { GitHubPullRequestList } from './GitHubPullRequestList';
export { GitHubCreatePRDialog } from './GitHubCreatePRDialog';
export { GitHubAppConfigManager } from './GitHubAppConfig';
export {
  GitHubAuthSettings,
  getAuthMethodPreference,
  setAuthMethodPreference,
} from './GitHubAuthSettings';
export type { AuthMethodPreference } from './GitHubAuthSettings';

// Advanced features - Tags, Blame, PR Conflicts
export { GitHubTagPanel } from './GitHubTagPanel';
export { GitHubBlameViewer, GitHubBlameDialog } from './GitHubBlameViewer';
export { GitHubPRConflictPanel, GitHubPRConflictBadge } from './GitHubPRConflictPanel';

// PR Detail View
export { GitHubPRDetailPanel } from './GitHubPRDetailPanel';
