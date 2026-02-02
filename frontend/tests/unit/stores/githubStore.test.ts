/**
 * GitHub Store Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGitHubStore } from '@/stores/githubStore';
import type {
  GitHubUser,
  GitHubRepository,
  GitHubPullRequest,
  GitHubIssueComment,
  GitHubPullRequestReview,
  GitHubTag,
} from '@/types/github';

// Mock the githubAuth service
vi.mock('@/services/github/githubAuth', () => ({
  githubAuth: {
    logout: vi.fn(),
    getToken: vi.fn(() => null),
  },
}));

// Mock the githubApi service
vi.mock('@/services/github/githubApi', () => ({
  getRateLimit: vi.fn(() =>
    Promise.resolve({
      limit: 5000,
      remaining: 4999,
      reset: Date.now() / 1000 + 3600,
      used: 1,
    })
  ),
}));

describe('githubStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGitHubStore.getState().reset();
  });

  describe('authentication', () => {
    it('should start unauthenticated', () => {
      const { auth } = useGitHubStore.getState();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
    });

    it('should set auth state', () => {
      const mockUser: GitHubUser = {
        login: 'testuser',
        id: 12345,
        avatar_url: 'https://github.com/testuser.png',
        html_url: 'https://github.com/testuser',
        name: 'Test User',
        email: 'test@example.com',
      };

      useGitHubStore.getState().setAuth({
        isAuthenticated: true,
        user: mockUser,
        tokenType: 'pat',
        scopes: ['repo'],
      });

      const { auth } = useGitHubStore.getState();
      expect(auth.isAuthenticated).toBe(true);
      expect(auth.user?.login).toBe('testuser');
      expect(auth.tokenType).toBe('pat');
    });

    it('should set authenticating state', () => {
      useGitHubStore.getState().setAuthenticating(true);
      expect(useGitHubStore.getState().isAuthenticating).toBe(true);

      useGitHubStore.getState().setAuthenticating(false);
      expect(useGitHubStore.getState().isAuthenticating).toBe(false);
    });

    it('should set auth error', () => {
      useGitHubStore.getState().setAuthError('Invalid token');
      expect(useGitHubStore.getState().authError).toBe('Invalid token');

      useGitHubStore.getState().setAuthError(null);
      expect(useGitHubStore.getState().authError).toBeNull();
    });

    it('should logout and reset auth state', () => {
      // First authenticate
      useGitHubStore.getState().setAuth({
        isAuthenticated: true,
        user: { login: 'test', id: 1, avatar_url: '', html_url: '' },
        tokenType: 'pat',
        scopes: ['repo'],
      });

      // Then logout
      useGitHubStore.getState().logout();

      const { auth } = useGitHubStore.getState();
      expect(auth.isAuthenticated).toBe(false);
      expect(auth.user).toBeNull();
    });
  });

  describe('repository connection', () => {
    const mockRepo: GitHubRepository = {
      id: 1,
      name: 'test-repo',
      full_name: 'owner/test-repo',
      private: false,
      html_url: 'https://github.com/owner/test-repo',
      description: 'Test repository',
      default_branch: 'main',
      owner: { login: 'owner', id: 1, avatar_url: '', html_url: '' },
    };

    it('should set connected repo', () => {
      useGitHubStore.getState().setConnectedRepo(mockRepo);
      expect(useGitHubStore.getState().connectedRepo?.name).toBe('test-repo');
    });

    it('should set connection state', () => {
      useGitHubStore.getState().setConnection({
        owner: 'owner',
        repo: 'test-repo',
        branch: 'main',
        connectedAt: new Date().toISOString(),
      });

      const { connection } = useGitHubStore.getState();
      expect(connection?.owner).toBe('owner');
      expect(connection?.repo).toBe('test-repo');
    });

    it('should set connecting state', () => {
      useGitHubStore.getState().setConnecting(true);
      expect(useGitHubStore.getState().isConnecting).toBe(true);
    });

    it('should disconnect', () => {
      useGitHubStore.getState().setConnectedRepo(mockRepo);
      useGitHubStore.getState().setConnection({
        owner: 'owner',
        repo: 'test-repo',
        branch: 'main',
        connectedAt: new Date().toISOString(),
      });

      useGitHubStore.getState().disconnect();

      expect(useGitHubStore.getState().connectedRepo).toBeNull();
      expect(useGitHubStore.getState().connection).toBeNull();
    });
  });

  describe('repositories', () => {
    it('should set repositories list', () => {
      const repos: GitHubRepository[] = [
        {
          id: 1,
          name: 'repo1',
          full_name: 'owner/repo1',
          private: false,
          html_url: '',
          description: '',
          default_branch: 'main',
          owner: { login: 'owner', id: 1, avatar_url: '', html_url: '' },
        },
        {
          id: 2,
          name: 'repo2',
          full_name: 'owner/repo2',
          private: true,
          html_url: '',
          description: '',
          default_branch: 'main',
          owner: { login: 'owner', id: 1, avatar_url: '', html_url: '' },
        },
      ];

      useGitHubStore.getState().setRepositories(repos);
      expect(useGitHubStore.getState().repositories.length).toBe(2);
    });

    it('should set loading repos state', () => {
      useGitHubStore.getState().setLoadingRepos(true);
      expect(useGitHubStore.getState().isLoadingRepos).toBe(true);
    });
  });

  describe('tags', () => {
    const mockTag: GitHubTag = {
      name: 'v1.0.0',
      commit: { sha: 'abc123', url: '' },
      zipball_url: '',
      tarball_url: '',
      node_id: '',
    };

    it('should set tags', () => {
      useGitHubStore.getState().setTags([mockTag]);
      expect(useGitHubStore.getState().tags.length).toBe(1);
      expect(useGitHubStore.getState().tags[0]?.name).toBe('v1.0.0');
    });

    it('should add a tag', () => {
      useGitHubStore.getState().setTags([mockTag]);
      useGitHubStore.getState().addTag({
        name: 'v1.1.0',
        commit: { sha: 'def456', url: '' },
        zipball_url: '',
        tarball_url: '',
        node_id: '',
      });

      expect(useGitHubStore.getState().tags.length).toBe(2);
    });

    it('should remove a tag', () => {
      useGitHubStore.getState().setTags([mockTag]);
      useGitHubStore.getState().removeTag('v1.0.0');

      expect(useGitHubStore.getState().tags.length).toBe(0);
    });

    it('should select a tag', () => {
      useGitHubStore.getState().setSelectedTag(mockTag);
      expect(useGitHubStore.getState().selectedTag?.name).toBe('v1.0.0');
    });

    it('should set tag error', () => {
      useGitHubStore.getState().setTagError('Failed to load tags');
      expect(useGitHubStore.getState().tagError).toBe('Failed to load tags');
    });
  });

  describe('pull requests', () => {
    const mockPR: GitHubPullRequest = {
      id: 1,
      number: 42,
      title: 'Test PR',
      body: 'Test description',
      state: 'open',
      html_url: 'https://github.com/owner/repo/pull/42',
      user: { login: 'author', id: 1, avatar_url: '', html_url: '' },
      head: { ref: 'feature', sha: 'abc123', repo: null },
      base: { ref: 'main', sha: 'def456', repo: null },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      merged_at: null,
      draft: false,
    };

    it('should set pull requests', () => {
      useGitHubStore.getState().setPullRequests([mockPR]);
      expect(useGitHubStore.getState().pullRequests.length).toBe(1);
      expect(useGitHubStore.getState().pullRequests[0]?.number).toBe(42);
    });

    it('should select a PR', () => {
      useGitHubStore.getState().setSelectedPR(mockPR);
      expect(useGitHubStore.getState().selectedPR?.number).toBe(42);
    });

    it('should update a PR', () => {
      useGitHubStore.getState().setPullRequests([mockPR]);
      useGitHubStore.getState().updatePR({
        ...mockPR,
        title: 'Updated Title',
      });

      expect(useGitHubStore.getState().pullRequests[0]?.title).toBe('Updated Title');
    });

    it('should remove a PR', () => {
      useGitHubStore.getState().setPullRequests([mockPR]);
      useGitHubStore.getState().removePR(42);

      expect(useGitHubStore.getState().pullRequests.length).toBe(0);
    });

    it('should set PR error', () => {
      useGitHubStore.getState().setPRError('Failed to load PRs');
      expect(useGitHubStore.getState().prError).toBe('Failed to load PRs');
    });
  });

  describe('PR details', () => {
    const mockComment: GitHubIssueComment = {
      id: 1,
      body: 'Test comment',
      user: { login: 'commenter', id: 1, avatar_url: '', html_url: '' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      html_url: '',
    };

    const mockReview: GitHubPullRequestReview = {
      id: 1,
      user: { login: 'reviewer', id: 2, avatar_url: '', html_url: '' },
      body: 'LGTM',
      state: 'APPROVED',
      html_url: '',
      submitted_at: new Date().toISOString(),
    };

    it('should set PR comments', () => {
      useGitHubStore.getState().setPRComments([mockComment]);
      expect(useGitHubStore.getState().prComments.length).toBe(1);
    });

    it('should add a PR comment', () => {
      useGitHubStore.getState().setPRComments([mockComment]);
      useGitHubStore.getState().addPRComment({
        ...mockComment,
        id: 2,
        body: 'Another comment',
      });

      expect(useGitHubStore.getState().prComments.length).toBe(2);
    });

    it('should update a PR comment', () => {
      useGitHubStore.getState().setPRComments([mockComment]);
      useGitHubStore.getState().updatePRComment(1, 'Updated comment');

      expect(useGitHubStore.getState().prComments[0]?.body).toBe('Updated comment');
    });

    it('should remove a PR comment', () => {
      useGitHubStore.getState().setPRComments([mockComment]);
      useGitHubStore.getState().removePRComment(1);

      expect(useGitHubStore.getState().prComments.length).toBe(0);
    });

    it('should set PR reviews', () => {
      useGitHubStore.getState().setPRReviews([mockReview]);
      expect(useGitHubStore.getState().prReviews.length).toBe(1);
      expect(useGitHubStore.getState().prReviews[0]?.state).toBe('APPROVED');
    });

    it('should add a PR review', () => {
      useGitHubStore.getState().setPRReviews([mockReview]);
      useGitHubStore.getState().addPRReview({
        ...mockReview,
        id: 2,
        state: 'CHANGES_REQUESTED',
      });

      expect(useGitHubStore.getState().prReviews.length).toBe(2);
    });

    it('should clear PR details', () => {
      useGitHubStore.getState().setPRComments([mockComment]);
      useGitHubStore.getState().setPRReviews([mockReview]);

      useGitHubStore.getState().clearPRDetails();

      expect(useGitHubStore.getState().prComments.length).toBe(0);
      expect(useGitHubStore.getState().prReviews.length).toBe(0);
      expect(useGitHubStore.getState().prFiles.length).toBe(0);
    });
  });

  describe('UI state', () => {
    it('should toggle connect dialog', () => {
      useGitHubStore.getState().setShowConnectDialog(true);
      expect(useGitHubStore.getState().showConnectDialog).toBe(true);

      useGitHubStore.getState().setShowConnectDialog(false);
      expect(useGitHubStore.getState().showConnectDialog).toBe(false);
    });

    it('should toggle auth dialog', () => {
      useGitHubStore.getState().setShowAuthDialog(true);
      expect(useGitHubStore.getState().showAuthDialog).toBe(true);
    });

    it('should toggle PR detail panel', () => {
      useGitHubStore.getState().setShowPRDetailPanel(true);
      expect(useGitHubStore.getState().showPRDetailPanel).toBe(true);
    });
  });

  describe('blame', () => {
    it('should set blame result', () => {
      const blameResult = {
        ranges: [
          {
            commit: {
              oid: 'abc123',
              message: 'Initial commit',
              author: {
                name: 'Author',
                email: 'author@example.com',
                date: new Date().toISOString(),
              },
            },
            startingLine: 1,
            endingLine: 10,
            age: 30,
          },
        ],
      };

      useGitHubStore.getState().setBlameResult(blameResult, 'src/index.ts');

      expect(useGitHubStore.getState().blameResult).toEqual(blameResult);
      expect(useGitHubStore.getState().blameFilePath).toBe('src/index.ts');
    });

    it('should clear blame', () => {
      useGitHubStore.getState().setBlameResult({ ranges: [] }, 'test.ts');
      useGitHubStore.getState().clearBlame();

      expect(useGitHubStore.getState().blameResult).toBeNull();
      expect(useGitHubStore.getState().blameFilePath).toBeNull();
    });
  });

  describe('reset', () => {
    it('should reset all state', () => {
      // Set up various state
      useGitHubStore.getState().setAuth({
        isAuthenticated: true,
        user: { login: 'test', id: 1, avatar_url: '', html_url: '' },
        tokenType: 'pat',
        scopes: [],
      });
      useGitHubStore.getState().setPullRequests([
        {
          id: 1,
          number: 1,
          title: 'Test',
          body: '',
          state: 'open',
          html_url: '',
          user: { login: 'test', id: 1, avatar_url: '', html_url: '' },
          head: { ref: 'feature', sha: 'abc', repo: null },
          base: { ref: 'main', sha: 'def', repo: null },
          created_at: '',
          updated_at: '',
          merged_at: null,
          draft: false,
        },
      ]);

      // Reset
      useGitHubStore.getState().reset();

      // Verify reset
      const state = useGitHubStore.getState();
      expect(state.auth.isAuthenticated).toBe(false);
      expect(state.pullRequests.length).toBe(0);
      expect(state.connectedRepo).toBeNull();
    });
  });
});
