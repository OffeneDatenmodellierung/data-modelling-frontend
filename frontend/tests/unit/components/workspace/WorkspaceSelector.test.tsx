/**
 * Unit tests for WorkspaceSelector Component
 * Tests workspace selection dropdown/selector
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WorkspaceSelector } from '@/components/workspace/WorkspaceSelector';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import type { Workspace } from '@/types/workspace';

// Mock dependencies
vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

describe('WorkspaceSelector', () => {
  const mockWorkspaces: Workspace[] = [
    {
      id: 'workspace-1',
      name: 'Personal Workspace',
      type: 'personal',
      owner_id: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      last_modified_at: '2025-01-01T00:00:00Z',
    },
    {
      id: 'workspace-2',
      name: 'Shared Workspace',
      type: 'shared',
      owner_id: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      last_modified_at: '2025-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: mockWorkspaces,
      currentWorkspaceId: 'workspace-1',
      setCurrentWorkspace: vi.fn(),
    } as any);
  });

  it('should render current workspace name', () => {
    render(<WorkspaceSelector />);

    expect(screen.getByText('Personal Workspace')).toBeInTheDocument();
  });

  it('should open dropdown when clicked', async () => {
    render(<WorkspaceSelector />);

    const selector = screen.getByRole('button') || screen.getByText('Personal Workspace');
    fireEvent.click(selector);

    await waitFor(() => {
      expect(screen.getByText('Shared Workspace')).toBeVisible();
    });
  });

  it('should display all workspaces in dropdown', async () => {
    render(<WorkspaceSelector />);

    const selector = screen.getByRole('button', { name: /personal workspace|select workspace/i });
    fireEvent.click(selector);

    await waitFor(() => {
      // Find all workspace names in the dropdown (should be 2)
      const workspaceNames = screen.getAllByText(/Personal Workspace|Shared Workspace/);
      expect(workspaceNames.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should call setCurrentWorkspace when workspace is selected', async () => {
    const mockSetCurrentWorkspace = vi.fn();
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: mockWorkspaces,
      currentWorkspaceId: 'workspace-1',
      setCurrentWorkspace: mockSetCurrentWorkspace,
    } as any);

    render(<WorkspaceSelector />);

    const selector = screen.getByRole('button') || screen.getByText('Personal Workspace');
    fireEvent.click(selector);

    await waitFor(() => {
      const sharedOption = screen.getByText('Shared Workspace');
      fireEvent.click(sharedOption);
    });

    await waitFor(() => {
      expect(mockSetCurrentWorkspace).toHaveBeenCalledWith('workspace-2');
    });
  });

  it('should show workspace type indicator', async () => {
    render(<WorkspaceSelector />);

    const selector = screen.getByRole('button', { name: /personal workspace|select workspace/i });
    fireEvent.click(selector);

    await waitFor(() => {
      // Check for type badges in the dropdown
      const personalBadge = screen.getByText('Personal');
      const sharedBadge = screen.getByText('Shared');
      expect(personalBadge).toBeVisible();
      expect(sharedBadge).toBeVisible();
    });
  });

  it('should close dropdown when clicking outside', async () => {
    const { container } = render(<WorkspaceSelector />);

    const selector = screen.getByRole('button', { name: /personal workspace|select workspace/i });
    fireEvent.click(selector);

    await waitFor(() => {
      // Verify dropdown is open by checking for Shared Workspace
      const sharedWorkspace = screen.getAllByText('Shared Workspace').find(el => {
        // Find the one in the dropdown (not the button)
        return el.closest('[role="button"]') !== selector;
      });
      expect(sharedWorkspace).toBeVisible();
    });

    // Click outside the dropdown
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      // Dropdown should be closed - Shared Workspace should not be visible in dropdown
      const dropdown = container.querySelector('.absolute');
      expect(dropdown).not.toBeInTheDocument();
    });
  });
});

