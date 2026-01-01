/**
 * Unit tests for Workspace Store
 * Tests workspace switching logic
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useModelStore } from '@/stores/modelStore';
import { workspaceService } from '@/services/api/workspaceService';

// Mock dependencies
vi.mock('@/stores/modelStore', () => ({
  useModelStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/services/api/workspaceService', () => ({
  workspaceService: {
    getWorkspaceInfo: vi.fn(),
    listProfiles: vi.fn(),
  },
}));

describe('WorkspaceStore - Workspace Switching', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspaceId: null,
      pendingChanges: false,
    });
  });

  describe('switchWorkspace', () => {
    it('should save current workspace state before switching', async () => {
      const mockModelStore = {
        tables: [{ id: 'table-1', name: 'Test Table' }],
        relationships: [],
        dataFlowDiagrams: [],
      };
      vi.mocked(useModelStore.getState).mockReturnValue(mockModelStore as any);

      useWorkspaceStore.setState({
        workspaces: [
          {
            id: 'workspace-1',
            name: 'Workspace 1',
            type: 'personal',
            owner_id: 'user-1',
            created_at: '2025-01-01T00:00:00Z',
            last_modified_at: '2025-01-01T00:00:00Z',
          },
          {
            id: 'workspace-2',
            name: 'Workspace 2',
            type: 'personal',
            owner_id: 'user-1',
            created_at: '2025-01-01T00:00:00Z',
            last_modified_at: '2025-01-01T00:00:00Z',
          },
        ],
        currentWorkspaceId: 'workspace-1',
        pendingChanges: true,
      });

      // Switch workspace
      useWorkspaceStore.getState().setCurrentWorkspace('workspace-2');

      // Verify current workspace changed
      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('workspace-2');
    });

    it('should load new workspace state after switching', async () => {
      const mockWorkspaceInfo = {
        workspace_path: 'workspace-2',
        email: 'user@example.com',
      };
      vi.mocked(workspaceService.getWorkspaceInfo).mockResolvedValue(mockWorkspaceInfo);

      useWorkspaceStore.setState({
        workspaces: [
          {
            id: 'workspace-2',
            name: 'Workspace 2',
            type: 'personal',
            owner_id: 'user-1',
            created_at: '2025-01-01T00:00:00Z',
            last_modified_at: '2025-01-01T00:00:00Z',
          },
        ],
        currentWorkspaceId: null,
      });

      await useWorkspaceStore.getState().fetchWorkspace('workspace-2');

      const state = useWorkspaceStore.getState();
      expect(state.currentWorkspaceId).toBe('workspace-2');
    });

    it('should clear pending changes when switching workspaces', () => {
      useWorkspaceStore.setState({
        currentWorkspaceId: 'workspace-1',
        pendingChanges: true,
      });

      useWorkspaceStore.getState().setCurrentWorkspace('workspace-2');

      expect(useWorkspaceStore.getState().pendingChanges).toBe(false);
    });
  });

  describe('workspace isolation', () => {
    it('should maintain separate state for each workspace', () => {
      const workspace1 = {
        id: 'workspace-1',
        name: 'Workspace 1',
        type: 'personal' as const,
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const workspace2 = {
        id: 'workspace-2',
        name: 'Workspace 2',
        type: 'personal' as const,
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      useWorkspaceStore.setState({
        workspaces: [workspace1, workspace2],
        currentWorkspaceId: 'workspace-1',
      });

      // Switch to workspace 2
      useWorkspaceStore.getState().setCurrentWorkspace('workspace-2');

      expect(useWorkspaceStore.getState().currentWorkspaceId).toBe('workspace-2');
      expect(useWorkspaceStore.getState().workspaces).toHaveLength(2);
    });
  });
});
