/**
 * BranchComparePanel Component Tests
 * Tests for the branch comparison panel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BranchComparePanel } from '@/components/github/BranchComparePanel';
import type { BranchComparison } from '@/types/github';

// Mock the store
vi.mock('@/stores/githubStore', () => ({
  useGitHubStore: vi.fn(),
  selectIsConnected: (state: any) => state.connection !== null,
  selectBranchComparison: (state: any) => state.branchComparison,
  selectIsLoadingComparison: (state: any) => state.isLoadingComparison,
  selectComparisonError: (state: any) => state.comparisonError,
}));

// Mock the githubApi
vi.mock('@/services/github/githubApi', () => ({
  githubApi: {
    compareBranches: vi.fn(),
  },
}));

import * as githubStore from '@/stores/githubStore';

const mockComparison: BranchComparison = {
  status: 'diverged',
  aheadBy: 5,
  behindBy: 2,
  totalCommits: 5,
  commits: [
    {
      sha: 'abc1234567890',
      shortSha: 'abc1234',
      message: 'Add new feature implementation',
      author: 'Developer',
      date: '2024-01-15T10:00:00Z',
    },
    {
      sha: 'def2345678901',
      shortSha: 'def2345',
      message: 'Add tests for new feature',
      author: 'Developer',
      date: '2024-01-15T11:00:00Z',
    },
  ],
  files: [
    {
      filename: 'src/feature.ts',
      status: 'added',
      additions: 50,
      deletions: 0,
    },
    {
      filename: 'src/utils.ts',
      status: 'modified',
      additions: 10,
      deletions: 5,
    },
  ],
};

const createMockState = (overrides = {}) => ({
  connection: { owner: 'owner', repo: 'repo', branch: 'main', connectedAt: '' },
  branchComparison: mockComparison,
  isLoadingComparison: false,
  comparisonError: null,
  setBranchComparison: vi.fn(),
  setLoadingComparison: vi.fn(),
  setComparisonError: vi.fn(),
  ...overrides,
});

describe('BranchComparePanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const mockState = createMockState();
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });
  });

  it('should render the compare panel', () => {
    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    expect(document.body.textContent).toContain('Compare');
  });

  it('should display branch names', () => {
    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    // Check that branch names appear in the content
    expect(document.body.textContent).toContain('main');
    expect(document.body.textContent).toContain('feature/new-feature');
  });

  it('should show ahead count', () => {
    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    // Check for "5" and "ahead" in content
    expect(document.body.textContent).toContain('5');
    expect(document.body.textContent?.toLowerCase()).toContain('ahead');
  });

  it('should show behind count', () => {
    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    // Check for "2" and "behind" in content
    expect(document.body.textContent).toContain('2');
    expect(document.body.textContent?.toLowerCase()).toContain('behind');
  });

  it('should display commit messages', () => {
    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    expect(screen.getByText('Add new feature implementation')).toBeInTheDocument();
    expect(screen.getByText('Add tests for new feature')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    const mockState = createMockState({ isLoadingComparison: true, branchComparison: null });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    // Should show some loading indicator
    const loadingIndicator = document.querySelector('[class*="animate"]');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('should show error state', () => {
    const mockState = createMockState({
      comparisonError: 'Failed to compare branches',
      branchComparison: null,
    });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<BranchComparePanel baseBranch="main" headBranch="feature/new-feature" />);
    expect(screen.getByText('Failed to compare branches')).toBeInTheDocument();
  });
});
