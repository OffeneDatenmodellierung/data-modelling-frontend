/**
 * Unit tests for Sync Service
 * Tests online/offline sync functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from '@/services/sync/syncService';
import { useModelStore } from '@/stores/modelStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { odcsService } from '@/services/sdk/odcsService';
import { apiClient } from '@/services/api/apiClient';
import type { Workspace } from '@/types/workspace';

// Mock dependencies
vi.mock('@/stores/modelStore', () => ({
  useModelStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/stores/workspaceStore', () => ({
  useWorkspaceStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/services/sdk/sdkMode', () => ({
  useSDKModeStore: {
    getState: vi.fn(),
  },
}));

vi.mock('@/services/sdk/odcsService', () => ({
  odcsService: {
    toYAML: vi.fn(),
    parseYAML: vi.fn(),
  },
}));

vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getClient: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

describe('SyncService', () => {
  const workspaceId = 'workspace-1';
  let syncService: SyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    syncService = new SyncService(workspaceId);
  });

  describe('sync to remote', () => {
    it('should sync workspace to remote when online', async () => {
      const mockWorkspace: Workspace = {
        id: workspaceId,
        name: 'Test Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      vi.mocked(useSDKModeStore.getState).mockReturnValue({
        getMode: vi.fn().mockResolvedValue('online'),
      } as any);

      vi.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspaces: [mockWorkspace],
        currentWorkspaceId: workspaceId,
      } as any);

      vi.mocked(useModelStore.getState).mockReturnValue({
        tables: [],
        relationships: [],
        dataFlowDiagrams: [],
      } as any);

      vi.mocked(odcsService.toYAML).mockResolvedValue('yaml-content');
      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
      
      const mockClient = {
        put: vi.fn().mockResolvedValue({ data: { workspace: mockWorkspace } }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await syncService.syncToRemote();

      expect(result.success).toBe(true);
      expect(odcsService.toYAML).toHaveBeenCalled();
      expect(mockClient.put).toHaveBeenCalled();
    });

    it('should handle sync errors gracefully', async () => {
      vi.mocked(useSDKModeStore.getState).mockReturnValue({
        getMode: vi.fn().mockResolvedValue('online'),
      } as any);

      vi.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspaces: [],
        currentWorkspaceId: workspaceId,
      } as any);

      vi.mocked(useModelStore.getState).mockReturnValue({
        tables: [],
        relationships: [],
        dataFlowDiagrams: [],
      } as any);

      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');

      const result = await syncService.syncToRemote();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('sync from remote', () => {
    it('should sync workspace from remote when online', async () => {
      vi.mocked(useSDKModeStore.getState).mockReturnValue({
        getMode: vi.fn().mockResolvedValue('online'),
      } as any);

      const mockTables: any[] = [];
      const mockRelationships: any[] = [];
      const mockDataFlowDiagrams: any[] = [];

      vi.mocked(useModelStore.getState).mockReturnValue({
        tables: mockTables,
        relationships: mockRelationships,
        dataFlowDiagrams: mockDataFlowDiagrams,
        setTables: vi.fn((tables: any[]) => {
          mockTables.length = 0;
          mockTables.push(...tables);
        }),
        setRelationships: vi.fn((relationships: any[]) => {
          mockRelationships.length = 0;
          mockRelationships.push(...relationships);
        }),
        setDataFlowDiagrams: vi.fn((diagrams: any[]) => {
          mockDataFlowDiagrams.length = 0;
          mockDataFlowDiagrams.push(...diagrams);
        }),
      } as any);

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: 'yaml-content',
        }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);
      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
      vi.mocked(odcsService.parseYAML).mockResolvedValue({
        workspace_id: workspaceId,
        tables: [],
        relationships: [],
        data_flow_diagrams: [],
      });

      const result = await syncService.syncFromRemote();

      expect(result.success).toBe(true);
      expect(mockClient.get).toHaveBeenCalled();
      expect(odcsService.parseYAML).toHaveBeenCalledWith('yaml-content');
    });
  });

  describe('automatic merge', () => {
    it('should automatically merge when connection restored', async () => {
      vi.mocked(useSDKModeStore.getState).mockReturnValue({
        getMode: vi.fn().mockResolvedValue('online'),
      } as any);

      const localWorkspace: Workspace = {
        id: workspaceId,
        name: 'Local Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      vi.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspaces: [localWorkspace],
        currentWorkspaceId: workspaceId,
      } as any);

      vi.mocked(useModelStore.getState).mockReturnValue({
        tables: [],
        relationships: [],
        dataFlowDiagrams: [],
      } as any);

      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: 'yaml-content',
        }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);
      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
      vi.mocked(odcsService.parseYAML).mockResolvedValue({
        workspace_id: workspaceId,
        tables: [],
        relationships: [],
        data_flow_diagrams: [],
      });

      await syncService.autoMergeOnConnectionRestored();

      expect(mockClient.get).toHaveBeenCalled();
    });
  });

  describe('conflict detection', () => {
    it('should detect conflicts when local and remote differ', async () => {
      const localWorkspace: Workspace = {
        id: workspaceId,
        name: 'Local Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const remoteWorkspace: Workspace = {
        id: workspaceId,
        name: 'Remote Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:01:00Z', // Newer
      };

      vi.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspaces: [localWorkspace],
        currentWorkspaceId: workspaceId,
      } as any);

      const hasConflict = await syncService.detectConflict(remoteWorkspace);
      expect(hasConflict).toBe(true);
    });

    it('should not detect conflicts when workspaces are identical', async () => {
      const workspace: Workspace = {
        id: workspaceId,
        name: 'Test Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      vi.mocked(useWorkspaceStore.getState).mockReturnValue({
        workspaces: [workspace],
        currentWorkspaceId: workspaceId,
      } as any);

      const hasConflict = await syncService.detectConflict(workspace);
      expect(hasConflict).toBe(false);
    });
  });
});

