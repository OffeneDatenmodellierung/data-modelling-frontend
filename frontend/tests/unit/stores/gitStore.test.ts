/**
 * Git Store Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGitStore } from '@/stores/gitStore';
import type {
  GitCommit,
  GitBranch,
  GitRemoteBranch,
  GitStashEntry,
  GitTag,
} from '@/stores/gitStore';

describe('gitStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useGitStore.getState().reset();
  });

  describe('status', () => {
    it('should start with default status', () => {
      const { status } = useGitStore.getState();
      expect(status.isGitRepo).toBe(false);
      expect(status.currentBranch).toBeNull();
      expect(status.isDirty).toBe(false);
      expect(status.files).toEqual([]);
    });

    it('should set status', () => {
      useGitStore.getState().setStatus({
        isGitRepo: true,
        currentBranch: 'main',
        isDirty: true,
        files: [
          { path: 'src/index.ts', status: 'modified', staged: false },
          { path: 'README.md', status: 'added', staged: true },
        ],
        ahead: 2,
        behind: 1,
        remoteName: 'origin',
        remoteUrl: 'https://github.com/owner/repo.git',
        hasConflicts: false,
        conflictFiles: [],
        gitRoot: '/path/to/repo',
      });

      const { status, lastRefresh } = useGitStore.getState();
      expect(status.isGitRepo).toBe(true);
      expect(status.currentBranch).toBe('main');
      expect(status.isDirty).toBe(true);
      expect(status.files.length).toBe(2);
      expect(status.ahead).toBe(2);
      expect(status.behind).toBe(1);
      expect(lastRefresh).not.toBeNull();
    });

    it('should track conflict files', () => {
      useGitStore.getState().setStatus({
        isGitRepo: true,
        currentBranch: 'feature',
        isDirty: true,
        files: [],
        ahead: 0,
        behind: 0,
        remoteName: null,
        remoteUrl: null,
        hasConflicts: true,
        conflictFiles: ['src/file1.ts', 'src/file2.ts'],
        gitRoot: '/path/to/repo',
      });

      const { status } = useGitStore.getState();
      expect(status.hasConflicts).toBe(true);
      expect(status.conflictFiles).toEqual(['src/file1.ts', 'src/file2.ts']);
    });
  });

  describe('loading states', () => {
    it('should set loading state', () => {
      useGitStore.getState().setLoading(true);
      expect(useGitStore.getState().isLoading).toBe(true);

      useGitStore.getState().setLoading(false);
      expect(useGitStore.getState().isLoading).toBe(false);
    });

    it('should set loading history state', () => {
      useGitStore.getState().setLoadingHistory(true);
      expect(useGitStore.getState().isLoadingHistory).toBe(true);
    });

    it('should set loading branches state', () => {
      useGitStore.getState().setLoadingBranches(true);
      expect(useGitStore.getState().isLoadingBranches).toBe(true);
    });

    it('should set loading diff state', () => {
      useGitStore.getState().setLoadingDiff(true);
      expect(useGitStore.getState().isLoadingDiff).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should set and clear error', () => {
      useGitStore.getState().setError('Git operation failed');
      expect(useGitStore.getState().error).toBe('Git operation failed');

      useGitStore.getState().setError(null);
      expect(useGitStore.getState().error).toBeNull();
    });
  });

  describe('commits', () => {
    const mockCommits: GitCommit[] = [
      {
        hash: 'abc123def456',
        hashShort: 'abc123d',
        message: 'feat: add new feature',
        author: 'Test Author',
        authorEmail: 'test@example.com',
        date: new Date('2024-01-15'),
      },
      {
        hash: 'def456abc789',
        hashShort: 'def456a',
        message: 'fix: bug fix',
        author: 'Another Author',
        authorEmail: 'another@example.com',
        date: new Date('2024-01-14'),
      },
    ];

    it('should set commits', () => {
      useGitStore.getState().setCommits(mockCommits);
      expect(useGitStore.getState().commits.length).toBe(2);
      expect(useGitStore.getState().commits[0]?.hash).toBe('abc123def456');
    });

    it('should select a commit', () => {
      useGitStore.getState().setCommits(mockCommits);
      useGitStore.getState().setSelectedCommit(mockCommits[0]!);

      expect(useGitStore.getState().selectedCommit?.hash).toBe('abc123def456');
    });

    it('should clear selected commit', () => {
      useGitStore.getState().setSelectedCommit(mockCommits[0]!);
      useGitStore.getState().setSelectedCommit(null);

      expect(useGitStore.getState().selectedCommit).toBeNull();
    });
  });

  describe('branches', () => {
    const mockBranches: GitBranch[] = [
      { name: 'main', commit: 'abc123', label: 'main', current: true },
      { name: 'feature/new', commit: 'def456', label: 'feature/new', current: false },
    ];

    const mockRemoteBranches: GitRemoteBranch[] = [
      { name: 'origin/main', commit: 'abc123', remoteName: 'origin', branchName: 'main' },
      { name: 'origin/develop', commit: 'ghi789', remoteName: 'origin', branchName: 'develop' },
    ];

    it('should set branches', () => {
      useGitStore.getState().setBranches(mockBranches, mockRemoteBranches);

      const state = useGitStore.getState();
      expect(state.branches.length).toBe(2);
      expect(state.remoteBranches.length).toBe(2);
    });

    it('should show branch selector', () => {
      useGitStore.getState().setShowBranchSelector(true);
      expect(useGitStore.getState().showBranchSelector).toBe(true);
    });

    it('should show create branch dialog', () => {
      useGitStore.getState().setShowCreateBranchDialog(true);
      expect(useGitStore.getState().showCreateBranchDialog).toBe(true);
    });
  });

  describe('remotes', () => {
    it('should set remotes', () => {
      useGitStore.getState().setRemotes([
        {
          name: 'origin',
          fetchUrl: 'https://github.com/owner/repo.git',
          pushUrl: 'https://github.com/owner/repo.git',
        },
        { name: 'upstream', fetchUrl: 'https://github.com/upstream/repo.git', pushUrl: null },
      ]);

      expect(useGitStore.getState().remotes.length).toBe(2);
    });

    it('should set fetching state', () => {
      useGitStore.getState().setFetching(true);
      expect(useGitStore.getState().isFetching).toBe(true);
    });

    it('should set pulling state', () => {
      useGitStore.getState().setPulling(true);
      expect(useGitStore.getState().isPulling).toBe(true);
    });

    it('should set pushing state', () => {
      useGitStore.getState().setPushing(true);
      expect(useGitStore.getState().isPushing).toBe(true);
    });
  });

  describe('stash', () => {
    const mockStash: GitStashEntry = {
      index: 0,
      hash: 'stash@{0}',
      message: 'WIP on main: abc123 feat: work in progress',
      date: '2024-01-15',
      branch: 'main',
    };

    it('should set stashes', () => {
      useGitStore.getState().setStashes([mockStash]);
      expect(useGitStore.getState().stashes.length).toBe(1);
    });

    it('should select stash', () => {
      useGitStore.getState().setSelectedStash(mockStash);
      expect(useGitStore.getState().selectedStash?.index).toBe(0);
    });

    it('should set stash diff', () => {
      useGitStore.getState().setStashDiff('diff --git a/file.ts b/file.ts');
      expect(useGitStore.getState().stashDiff).toContain('diff --git');
    });

    it('should set stashing state', () => {
      useGitStore.getState().setStashing(true);
      expect(useGitStore.getState().isStashing).toBe(true);
    });
  });

  describe('rebase', () => {
    it('should set rebase status', () => {
      useGitStore.getState().setRebaseStatus({
        isRebasing: true,
        currentCommit: 'abc123',
        headName: 'feature/branch',
        onto: 'main',
        done: 2,
        remaining: 3,
      });

      const { rebaseStatus } = useGitStore.getState();
      expect(rebaseStatus.isRebasing).toBe(true);
      expect(rebaseStatus.done).toBe(2);
      expect(rebaseStatus.remaining).toBe(3);
    });

    it('should set rebasing flag', () => {
      useGitStore.getState().setRebasing(true);
      expect(useGitStore.getState().isRebasing).toBe(true);
    });
  });

  describe('cherry-pick', () => {
    it('should set cherry-picking state', () => {
      useGitStore.getState().setCherryPicking(true);
      expect(useGitStore.getState().isCherryPicking).toBe(true);
    });

    it('should set cherry-pick conflicts', () => {
      useGitStore.getState().setCherryPickConflicts(['file1.ts', 'file2.ts']);
      expect(useGitStore.getState().cherryPickConflicts).toEqual(['file1.ts', 'file2.ts']);
    });
  });

  describe('tags', () => {
    const mockTag: GitTag = {
      name: 'v1.0.0',
      hash: 'abc123',
      message: 'Release 1.0.0',
      tagger: 'Release Bot',
      taggerEmail: 'release@example.com',
      date: '2024-01-15',
      isAnnotated: true,
    };

    it('should set tags', () => {
      useGitStore.getState().setTags([mockTag]);
      expect(useGitStore.getState().tags.length).toBe(1);
      expect(useGitStore.getState().tags[0]?.name).toBe('v1.0.0');
    });

    it('should select tag', () => {
      useGitStore.getState().setSelectedTag(mockTag);
      expect(useGitStore.getState().selectedTag?.name).toBe('v1.0.0');
    });

    it('should set loading tags state', () => {
      useGitStore.getState().setLoadingTags(true);
      expect(useGitStore.getState().isLoadingTags).toBe(true);
    });
  });

  describe('blame', () => {
    it('should set blame result', () => {
      const blameResult = {
        lines: [
          {
            lineNumber: 1,
            content: 'const x = 1;',
            commit: {
              hash: 'abc123',
              hashShort: 'abc123',
              author: 'Author',
              authorEmail: 'author@example.com',
              date: '2024-01-15',
              message: 'Initial commit',
            },
            isOriginal: true,
          },
        ],
        filePath: 'src/index.ts',
      };

      useGitStore.getState().setBlameResult(blameResult);
      expect(useGitStore.getState().blameResult?.lines.length).toBe(1);
    });

    it('should set blame file path', () => {
      useGitStore.getState().setBlameFilePath('src/index.ts');
      expect(useGitStore.getState().blameFilePath).toBe('src/index.ts');
    });

    it('should clear blame', () => {
      useGitStore.getState().setBlameResult({
        lines: [],
        filePath: 'test.ts',
      });
      useGitStore.getState().setBlameFilePath('test.ts');

      useGitStore.getState().clearBlame();

      expect(useGitStore.getState().blameResult).toBeNull();
      expect(useGitStore.getState().blameFilePath).toBeNull();
    });
  });

  describe('UI state', () => {
    it('should toggle panel', () => {
      expect(useGitStore.getState().isPanelOpen).toBe(false);

      useGitStore.getState().togglePanel();
      expect(useGitStore.getState().isPanelOpen).toBe(true);

      useGitStore.getState().togglePanel();
      expect(useGitStore.getState().isPanelOpen).toBe(false);
    });

    it('should set panel open', () => {
      useGitStore.getState().setPanelOpen(true);
      expect(useGitStore.getState().isPanelOpen).toBe(true);
    });

    it('should set diff content', () => {
      useGitStore.getState().setDiffContent('diff content here');
      expect(useGitStore.getState().diffContent).toBe('diff content here');
    });
  });

  describe('workspace', () => {
    it('should set workspace path', () => {
      useGitStore.getState().setWorkspacePath('/path/to/workspace');
      expect(useGitStore.getState().workspacePath).toBe('/path/to/workspace');
    });
  });

  describe('reset', () => {
    it('should reset all state to initial values', () => {
      // Set various state
      useGitStore.getState().setStatus({
        isGitRepo: true,
        currentBranch: 'main',
        isDirty: true,
        files: [{ path: 'test.ts', status: 'modified', staged: false }],
        ahead: 1,
        behind: 0,
        remoteName: 'origin',
        remoteUrl: 'https://github.com/test/repo',
        hasConflicts: false,
        conflictFiles: [],
        gitRoot: '/path',
      });
      useGitStore.getState().setPanelOpen(true);
      useGitStore.getState().setCommits([
        {
          hash: 'abc',
          hashShort: 'abc',
          message: 'test',
          author: 'test',
          authorEmail: 'test@test.com',
          date: new Date(),
        },
      ]);

      // Reset
      useGitStore.getState().reset();

      // Verify reset
      const state = useGitStore.getState();
      expect(state.status.isGitRepo).toBe(false);
      expect(state.status.currentBranch).toBeNull();
      expect(state.isPanelOpen).toBe(false);
      expect(state.commits.length).toBe(0);
      expect(state.branches.length).toBe(0);
      expect(state.stashes.length).toBe(0);
    });
  });
});
