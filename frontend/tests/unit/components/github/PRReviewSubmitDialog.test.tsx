/**
 * PRReviewSubmitDialog Component Tests
 * Tests for the review submission modal
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PRReviewSubmitDialog } from '@/components/github/PRReviewSubmitDialog';
import type { GitHubPullRequest, PendingReviewComment } from '@/types/github';

const mockPR: GitHubPullRequest = {
  id: 1,
  number: 42,
  title: 'Add new feature',
  body: 'This PR adds a new feature',
  state: 'open',
  html_url: 'https://github.com/owner/repo/pull/42',
  user: { login: 'author', id: 1, avatar_url: '', html_url: '' },
  head: { ref: 'feature/new', sha: 'abc123', repo: null },
  base: { ref: 'main', sha: 'def456', repo: null },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-16T15:30:00Z',
  merged_at: null,
  draft: false,
};

const mockPendingComments: PendingReviewComment[] = [
  {
    id: 'pending-1',
    path: 'src/index.ts',
    line: 10,
    side: 'RIGHT',
    body: 'Consider renaming this variable',
  },
  {
    id: 'pending-2',
    path: 'src/utils.ts',
    line: 25,
    side: 'RIGHT',
    body: 'This could be simplified',
  },
];

describe('PRReviewSubmitDialog', () => {
  const mockOnSubmit = vi.fn();
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render when open', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    // Check dialog is rendered
    expect(document.body.textContent).toContain('Submit');
  });

  it('should not render content when closed', () => {
    const { container } = render(
      <PRReviewSubmitDialog
        isOpen={false}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    // Dialog should be empty or not visible when closed
    expect(container.querySelector('[role="dialog"]')).toBeNull();
  });

  it('should display PR title', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByText('Add new feature')).toBeInTheDocument();
  });

  it('should show pending comments count', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    // Check the text contains "2" (the count)
    expect(document.body.textContent).toContain('2');
  });

  it('should have Cancel button', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('should call onClose when clicking cancel', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should have review type options', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
      />
    );
    // Check for radio inputs
    const radios = document.querySelectorAll('input[type="radio"]');
    expect(radios.length).toBeGreaterThanOrEqual(3);
  });

  it('should show submitting state', () => {
    render(
      <PRReviewSubmitDialog
        isOpen={true}
        onClose={mockOnClose}
        pr={mockPR}
        pendingComments={mockPendingComments}
        onSubmit={mockOnSubmit}
        isSubmitting={true}
      />
    );
    expect(document.body.textContent).toContain('Submitting');
  });
});
