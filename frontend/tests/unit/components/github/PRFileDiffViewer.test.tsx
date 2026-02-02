/**
 * PRFileDiffViewer Component Tests
 * Tests for the enhanced diff viewer with inline comments
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PRFileDiffViewer } from '@/components/github/PRFileDiffViewer';
import type { GitHubPRFile, PendingReviewComment } from '@/types/github';

const mockFile: GitHubPRFile = {
  sha: 'abc123',
  filename: 'src/components/Button.tsx',
  status: 'modified',
  additions: 10,
  deletions: 5,
  changes: 15,
  patch: `@@ -1,5 +1,10 @@
 import React from 'react';
+import { useState } from 'react';

-const Button = (props) => {
+interface ButtonProps {
+  onClick: () => void;
+  label: string;
+}
+
+const Button: React.FC<ButtonProps> = ({ onClick, label }) => {
   return <button>Click</button>;
 };`,
};

const mockPendingComments: PendingReviewComment[] = [
  {
    id: 'pending-1',
    path: 'src/components/Button.tsx',
    line: 5,
    side: 'RIGHT',
    body: 'Consider adding disabled prop',
  },
];

describe('PRFileDiffViewer', () => {
  const mockOnAddComment = vi.fn();
  const mockOnRemovePendingComment = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the diff viewer', () => {
    render(
      <PRFileDiffViewer
        file={mockFile}
        pendingComments={[]}
        onAddComment={mockOnAddComment}
        defaultExpanded={true}
      />
    );
    expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();
  });

  it('should show file statistics', () => {
    render(
      <PRFileDiffViewer
        file={mockFile}
        pendingComments={[]}
        onAddComment={mockOnAddComment}
        defaultExpanded={true}
      />
    );
    expect(screen.getByText('+10')).toBeInTheDocument();
    expect(screen.getByText('-5')).toBeInTheDocument();
  });

  it('should show pending comments', () => {
    render(
      <PRFileDiffViewer
        file={mockFile}
        pendingComments={mockPendingComments}
        onAddComment={mockOnAddComment}
        onRemovePendingComment={mockOnRemovePendingComment}
        defaultExpanded={true}
      />
    );
    expect(screen.getByText('Consider adding disabled prop')).toBeInTheDocument();
  });

  it('should handle file with no patch', () => {
    const fileWithoutPatch: GitHubPRFile = {
      ...mockFile,
      patch: undefined,
    };
    render(
      <PRFileDiffViewer
        file={fileWithoutPatch}
        pendingComments={[]}
        onAddComment={mockOnAddComment}
        defaultExpanded={true}
      />
    );
    expect(screen.getByText('src/components/Button.tsx')).toBeInTheDocument();
  });

  it('should show file status', () => {
    render(
      <PRFileDiffViewer
        file={mockFile}
        pendingComments={[]}
        onAddComment={mockOnAddComment}
        defaultExpanded={true}
      />
    );
    expect(screen.getByText('modified')).toBeInTheDocument();
  });
});
