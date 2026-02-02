/**
 * Unit tests for Home Page
 * Tests workspace selection and creation
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import Home from '@/pages/Home';
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

const mockNavigate = vi.fn();
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/components/workspace/WorkspaceList', () => ({
  WorkspaceList: ({ onWorkspaceSelect }: { onWorkspaceSelect?: (id: string) => void }) => (
    <div data-testid="workspace-list">
      <div onClick={() => onWorkspaceSelect?.('workspace-1')}>Personal Workspace</div>
    </div>
  ),
}));

vi.mock('@/components/workspace/WorkspaceSelector', () => ({
  WorkspaceSelector: () => <div data-testid="workspace-selector">Workspace Selector</div>,
}));

vi.mock('@/components/common/OnlineOfflineToggle', () => ({
  OnlineOfflineToggle: () => <div data-testid="online-offline-toggle">Toggle</div>,
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: () => ({
    addToast: vi.fn(),
  }),
}));

vi.mock('@/services/storage/localFileService', () => ({
  localFileService: {
    pickFolder: vi.fn(),
    loadWorkspaceFromFolder: vi.fn(),
  },
}));

vi.mock('@/services/platform/platform', () => ({
  isElectron: vi.fn(() => false),
  getAssetPath: vi.fn((path: string) => path),
}));

vi.mock('@/services/api/electronAuthService', () => ({
  electronAuthService: {
    checkLogin: vi.fn(),
  },
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
      mode: 'offline', // Default to offline for tests
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any);
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: mockWorkspaces,
      isLoading: false,
      setCurrentWorkspace: vi.fn(),
      addWorkspace: vi.fn(),
      fetchWorkspaces: vi.fn().mockResolvedValue(undefined),
      createWorkspace: vi.fn(),
    } as any);
  });

  it('should render workspace list', async () => {
    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
      expect(screen.getByText('Personal Workspace')).toBeInTheDocument();
    });
  });

  it('should show create workspace button', async () => {
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByText('New Workspace')).toBeInTheDocument();
    });
  });

  it('should navigate to workspace when clicked', async () => {
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<Home />);

    await waitFor(() => {
      const workspaceItem = screen.getByText('Personal Workspace');
      fireEvent.click(workspaceItem);
    });

    // Navigation should be called via onWorkspaceSelect
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/workspace/workspace-1');
    });
  });

  it('should show loading state while fetching workspaces', () => {
    vi.mocked(useWorkspaceStore).mockReturnValue({
      workspaces: [],
      isLoading: true,
      fetchWorkspaces: vi.fn(),
    } as any);
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
      initialize: vi.fn().mockResolvedValue(undefined),
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
    vi.mocked(useSDKModeStore).mockReturnValue({
      mode: 'offline',
      initialize: vi.fn().mockResolvedValue(undefined),
    } as any);

    render(<Home />);

    await waitFor(() => {
      expect(screen.getByTestId('workspace-list')).toBeInTheDocument();
    });
  });
});
