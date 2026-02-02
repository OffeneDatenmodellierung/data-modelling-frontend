/**
 * GitHub Services
 * Public exports for GitHub integration
 */

export { githubAuth, GitHubAuthService } from './githubAuth';
export { githubApi, getRateLimit, isRateLimited } from './githubApi';
export { githubProvider } from './githubProvider';
export type {
  GitHubFileChange,
  GitHubProviderStatus,
  GitHubProviderCommit,
} from './githubProvider';
