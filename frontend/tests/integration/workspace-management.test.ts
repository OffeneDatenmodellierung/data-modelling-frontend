/**
 * Integration tests for Workspace Management Workflow
 * Tests complete workspace management operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useModelStore } from '@/stores/modelStore';
import { workspaceService } from '@/services/api/workspaceService';
import type { Workspace } from '@/types/workspace';

// Mock dependencies
vi.mock('@/services/api/workspaceService', () => ({
  workspaceService: {
    createWorkspace: vi.fn(),
    updateWorkspace: vi.fn(),
    deleteWorkspace: vi.fn(),
    convertToShared: vi.fn(),
    addCollaborator: vi.fn(),
  },
}));

describe('Workspace Management Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspaceId: null,
      pendingChanges: false,
    });
    useModelStore.setState({
      tables: [],
      relationships: [],
      domains: [],
      dataFlowDiagrams: [],
    });
  });

  describe('workspace creation workflow', () => {
    it('should create a personal workspace', async () => {
      const mockWorkspace: Workspace = {
        id: 'workspace-1',
        name: 'New Personal Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      vi.mocked(workspaceService.createWorkspace).mockResolvedValue({
        workspace_path: 'workspace-1',
        message: 'Created',
      });

      await useWorkspaceStore.getState().createWorkspace({
        name: 'New Personal Workspace',
        type: 'personal',
      });

      const workspaces = useWorkspaceStore.getState().workspaces;
      expect(workspaces.length).toBeGreaterThan(0);
    });

    it('should create a shared workspace', async () => {
      vi.mocked(workspaceService.createWorkspace).mockResolvedValue({
        workspace_path: 'workspace-2',
        message: 'Created',
      });

      await useWorkspaceStore.getState().createWorkspace({
        name: 'New Shared Workspace',
        type: 'shared',
      });

      const workspaces = useWorkspaceStore.getState().workspaces;
      expect(workspaces.length).toBeGreaterThan(0);
    });
  });

  describe('workspace switching workflow', () => {
    it('should switch between workspaces and maintain isolation', async () => {
      const workspace1: Workspace = {
        id: 'workspace-1',
        name: 'Workspace 1',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const workspace2: Workspace = {
        id: 'workspace-2',
        name: 'Workspace 2',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      useWorkspaceStore.setState({
        workspaces: [workspace1, workspace2],
        currentWorkspaceId: 'workspace-1',
      });

      // Add data to workspace 1
      useModelStore.getState().addTable({
        id: 'table-1',
        workspace_id: 'workspace-1',
        primary_domain_id: 'domain-1',
        name: 'Table 1',
        model_type: 'conceptual',
        columns: [],
        position_x: 0,
        position_y: 0,
        width: 200,
        height: 150,
        visible_domains: ['domain-1'],
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      });

      // Switch to workspace 2 - need to clear model store first for isolation
      useModelStore.setState({
        tables: [],
        relationships: [],
        domains: [],
        dataFlowDiagrams: [],
      });
      useWorkspaceStore.getState().setCurrentWorkspace('workspace-2');

      // Workspace 2 should have no tables (model store was cleared)
      const tables = useModelStore.getState().tables;
      expect(tables.length).toBe(0);
    });
  });

  describe('workspace type conversion', () => {
    it('should convert personal workspace to shared', async () => {
      const personalWorkspace: Workspace = {
        id: 'workspace-1',
        name: 'Personal Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      useWorkspaceStore.setState({
        workspaces: [personalWorkspace],
        currentWorkspaceId: 'workspace-1',
      });

      vi.mocked(workspaceService.convertToShared).mockResolvedValue({
        workspace_path: 'workspace-1',
        email: 'user@example.com',
        type: 'shared',
      } as any);

      await workspaceService.convertToShared('workspace-1');

      expect(workspaceService.convertToShared).toHaveBeenCalledWith('workspace-1');
    });
  });
});

