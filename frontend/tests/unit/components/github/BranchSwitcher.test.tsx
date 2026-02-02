/**
 * BranchSwitcher Component Tests
 * Tests for the branch switching dropdown component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BranchSwitcher } from '@/components/github/BranchSwitcher';

// Mock the store
vi.mock('@/stores/githubStore', () => ({
  useGitHubStore: vi.fn(),
  selectIsConnected: (state: any) => state.connection !== null,
  selectCurrentBranch: (state: any) => state.currentBranch,
  selectPreviousBranch: (state: any) => state.previousBranch,
  selectIsSwitchingBranch: (state: any) => state.isSwitchingBranch,
  selectCanSwitchBack: (state: any) => state.previousBranch !== null,
  selectSelectedPR: (state: any) => state.selectedPR,
  selectPullRequests: (state: any) => state.pullRequests,
}));

import * as githubStore from '@/stores/githubStore';

const mockBranches = ['main', 'develop', 'fix/auth-bug', 'feature/new-thing', 'release/v1.0'];

const createMockState = (overrides = {}) => ({
  connection: { owner: 'owner', repo: 'repo', branch: 'main', connectedAt: '' },
  currentBranch: 'main',
  previousBranch: null,
  isSwitchingBranch: false,
  pullRequests: [],
  selectedPR: null,
  switchToBranch: vi.fn(),
  switchBack: vi.fn(),
  ...overrides,
});

describe('BranchSwitcher', () => {
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

  it('should render the branch switcher', () => {
    render(<BranchSwitcher branches={mockBranches} />);
    expect(screen.getByText('main')).toBeInTheDocument();
  });

  it('should show current branch from store', () => {
    const mockState = createMockState({ currentBranch: 'develop' });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<BranchSwitcher branches={mockBranches} />);
    expect(screen.getByText('develop')).toBeInTheDocument();
  });

  it('should have dropdown button', () => {
    render(<BranchSwitcher branches={mockBranches} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should show back option when previous branch exists', () => {
    const mockState = createMockState({
      currentBranch: 'fix/auth-bug',
      previousBranch: 'main',
    });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<BranchSwitcher branches={mockBranches} />);
    // Check for "Back" text somewhere in the component
    expect(screen.getByText(/back/i)).toBeInTheDocument();
  });
});
