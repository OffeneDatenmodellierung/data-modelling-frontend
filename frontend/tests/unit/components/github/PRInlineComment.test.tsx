/**
 * PRInlineComment Component Tests
 * Tests for the inline comment thread component
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PRInlineComment } from '@/components/github/PRInlineComment';
import type { GitHubPullRequestComment } from '@/types/github';

const mockComment: GitHubPullRequestComment = {
  id: 1,
  body: 'This function should handle edge cases better',
  user: {
    login: 'reviewer1',
    id: 100,
    avatar_url: 'https://example.com/avatar1.png',
    html_url: 'https://github.com/reviewer1',
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  html_url: 'https://github.com/owner/repo/pull/42#discussion_r1',
  path: 'src/utils/helper.ts',
  line: 42,
  side: 'RIGHT',
  commit_id: 'abc123',
};

const mockReplies: GitHubPullRequestComment[] = [
  {
    id: 2,
    body: 'Good point, I will add error handling',
    user: {
      login: 'author1',
      id: 101,
      avatar_url: 'https://example.com/avatar2.png',
      html_url: 'https://github.com/author1',
    },
    created_at: '2024-01-15T11:00:00Z',
    updated_at: '2024-01-15T11:00:00Z',
    html_url: 'https://github.com/owner/repo/pull/42#discussion_r2',
    path: 'src/utils/helper.ts',
    line: 42,
    side: 'RIGHT',
    commit_id: 'abc123',
    in_reply_to_id: 1,
  },
];

describe('PRInlineComment', () => {
  const mockOnReply = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the comment', () => {
    render(<PRInlineComment comment={mockComment} replies={[]} onReply={mockOnReply} />);
    expect(screen.getByText('This function should handle edge cases better')).toBeInTheDocument();
  });

  it('should display username', () => {
    render(<PRInlineComment comment={mockComment} replies={[]} onReply={mockOnReply} />);
    expect(screen.getByText('reviewer1')).toBeInTheDocument();
  });

  it('should display user avatar', () => {
    render(<PRInlineComment comment={mockComment} replies={[]} onReply={mockOnReply} />);
    const avatar = screen.getByAltText('reviewer1');
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar1.png');
  });

  it('should display replies', () => {
    render(<PRInlineComment comment={mockComment} replies={mockReplies} onReply={mockOnReply} />);
    expect(screen.getByText('Good point, I will add error handling')).toBeInTheDocument();
    expect(screen.getByText('author1')).toBeInTheDocument();
  });

  it('should have reply functionality', () => {
    render(<PRInlineComment comment={mockComment} replies={[]} onReply={mockOnReply} />);
    // Check there's some way to reply
    expect(document.body.textContent?.toLowerCase()).toContain('reply');
  });
});
