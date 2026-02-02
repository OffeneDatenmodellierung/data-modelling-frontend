/**
 * PRListPanel Component Tests
 * Tests for the PR list sidebar panel
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRListPanel } from '@/components/github/PRListPanel';
import * as githubStore from '@/stores/githubStore';
import type { GitHubPullRequest } from '@/types/github';

// Mock the store completely
vi.mock('@/stores/githubStore', () => ({
  useGitHubStore: vi.fn(),
  selectIsConnected: (state: any) => state.connection !== null,
  selectPullRequests: (state: any) => state.pullRequests,
  selectIsLoadingPRs: (state: any) => state.isLoadingPRs,
  selectPRError: (state: any) => state.prError,
  selectSelectedPR: (state: any) => state.selectedPR,
}));

// Mock the githubApi
vi.mock('@/services/github/githubApi', () => ({
  githubApi: {
    listPullRequests: vi.fn(),
  },
}));

const mockPRs: GitHubPullRequest[] = [
  {
    id: 1,
    number: 42,
    title: 'Fix authentication bug',
    body: 'This PR fixes the login issue',
    state: 'open',
    html_url: 'https://github.com/owner/repo/pull/42',
    user: {
      login: 'developer1',
      id: 1,
      avatar_url: 'https://example.com/avatar1.png',
      html_url: '',
    },
    head: { ref: 'fix/auth-bug', sha: 'abc123', repo: null },
    base: { ref: 'main', sha: 'def456', repo: null },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-16T15:30:00Z',
    merged_at: null,
    draft: false,
    labels: [],
  },
  {
    id: 2,
    number: 43,
    title: 'Add dark mode feature',
    body: 'Implements dark mode toggle',
    state: 'open',
    html_url: 'https://github.com/owner/repo/pull/43',
    user: {
      login: 'developer2',
      id: 2,
      avatar_url: 'https://example.com/avatar2.png',
      html_url: '',
    },
    head: { ref: 'feature/dark-mode', sha: 'ghi789', repo: null },
    base: { ref: 'main', sha: 'jkl012', repo: null },
    created_at: '2024-01-14T08:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
    merged_at: null,
    draft: true,
    labels: [],
  },
];

const createMockState = (overrides = {}) => ({
  connection: { owner: 'owner', repo: 'repo', branch: 'main', connectedAt: '' },
  pullRequests: mockPRs,
  isLoadingPRs: false,
  prError: null,
  selectedPR: null,
  setPullRequests: vi.fn(),
  setLoadingPRs: vi.fn(),
  setPRError: vi.fn(),
  setSelectedPR: vi.fn(),
  ...overrides,
});

describe('PRListPanel', () => {
  const mockOnSelectPR = vi.fn();

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

  it('should render the PR list panel', () => {
    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    expect(screen.getByText('Pull Requests')).toBeInTheDocument();
  });

  it('should display pull requests', () => {
    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    expect(screen.getByText('Fix authentication bug')).toBeInTheDocument();
    expect(screen.getByText('Add dark mode feature')).toBeInTheDocument();
  });

  it('should show PR numbers', () => {
    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    expect(screen.getByText('#42')).toBeInTheDocument();
    expect(screen.getByText('#43')).toBeInTheDocument();
  });

  it('should call onSelectPR when clicking a PR', () => {
    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    const prItem = screen.getByText('Fix authentication bug');
    fireEvent.click(prItem);
    expect(mockOnSelectPR).toHaveBeenCalledWith(mockPRs[0]);
  });

  it('should show loading state', () => {
    const mockState = createMockState({ isLoadingPRs: true });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    // Check for loading indicator (spinner)
    const loadingIndicator = document.querySelector('[class*="animate"]');
    expect(loadingIndicator).toBeInTheDocument();
  });

  it('should show error state', () => {
    const mockState = createMockState({ prError: 'Failed to load PRs' });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    expect(screen.getByText('Failed to load PRs')).toBeInTheDocument();
  });

  it('should show message when not connected', () => {
    const mockState = createMockState({
      connection: null,
      pullRequests: [],
    });
    vi.mocked(githubStore.useGitHubStore).mockImplementation((selector: any) => {
      if (typeof selector === 'function') {
        return selector(mockState);
      }
      return mockState;
    });

    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    expect(screen.getByText(/connect.*repository/i)).toBeInTheDocument();
  });

  it('should display branch information', () => {
    render(<PRListPanel onSelectPR={mockOnSelectPR} />);
    expect(screen.getByText('fix/auth-bug')).toBeInTheDocument();
    expect(screen.getByText('feature/dark-mode')).toBeInTheDocument();
  });
});
