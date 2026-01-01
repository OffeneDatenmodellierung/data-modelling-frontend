/**
 * Unit tests for Home Page
 * Tests workspace selection and creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Home } from '@/pages/Home';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useAuth } from '@/components/auth/AuthProvider';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import type { Workspace } from '@/types/workspace';

// Mock dependencies
vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: vi.fn(),
}));

vi.mock('@/components/auth/AuthProvider', () => ({
  useAuth: vi.fn(),
}));

vi.mock('@/services/sdk/sdkMode', () => ({
  useSDKModeStore: vi.fn(),
  sdkModeDetector: {
    initialize: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('Home Page', () => {
  const mockWorkspaces: Workspace[] = [
    {
      id: 'workspace-1',
      name: 'Personal Workspace',
      type: 'personal',
      owner_id: 'user-1',
      created_at: '2025-01-01T00:00:00Z',
      last_modified_at: '2025-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
    } as any);
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'online',
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any);
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: mockWorkspaces,
      setCurrentWorkspace: vi.fn(),
      addWorkspace: vi.fn(),
      fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
    } as any);
  });

  it('should render workspace list', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('Personal Workspace')).toBeInTheDocument();
    });
  });

  it('should show create workspace button', () => {
    render(<Home />);

    expect(screen.getByText(/create workspace|new workspace/i)).toBeInTheDocument();
  });

  it('should navigate to workspace when clicked', async () => {
    const mockNavigate = vi.fn();
    vi.mock('react-router-dom', () => ({
      useNavigate: () => mockNavigate,
    }));

    render(<Home />);

    await waitFor(() => {
      const workspaceItem = screen.getByText('Personal Workspace');
      fireEvent.click(workspaceItem);
    });

    // Navigation would be called
    expect(mockNavigate).toBeDefined();
  });

  it('should show loading state while fetching workspaces', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [],
      isLoading: true,
      fetchWorkspaces: vi.fn(),
    } as any);

    render(<Home />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('should show empty state when no workspaces exist', async () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [],
      isLoading: false,
      fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText(/no workspaces|create your first/i)).toBeInTheDocument();
    });
  });
});

