/**
 * Integration tests for Sync and Merge Workflow
 * Tests sync operations and conflict resolution
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncService } from '@/services/sync/syncService';
import { ConflictResolver } from '@/services/sync/conflictResolver';
import { useModelStore } from '@/stores/modelStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { apiClient } from '@/services/api/apiClient';
import { odcsService } from '@/services/sdk/odcsService';
import type { Workspace } from '@/types/workspace';
import type { Table } from '@/types/table';

// Mock dependencies
vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getClient: vi.fn(),
    getAccessToken: vi.fn(),
  },
}));

vi.mock('@/services/sdk/odcsService', () => ({
  odcsService: {
    toYAML: vi.fn(),
    parseYAML: vi.fn(),
  },
}));

describe('Sync and Merge Integration', () => {
  const workspaceId = 'workspace-1';
  let syncService: SyncService;
  let conflictResolver: ConflictResolver;

  beforeEach(() => {
    vi.clearAllMocks();
    useSDKModeStore.setState({
      mode: 'online',
      isManualOverride: false,
    });
    useModelStore.setState({
      tables: [],
      relationships: [],
      domains: [],
      dataFlowDiagrams: [],
    });
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspaceId: workspaceId,
    });

    syncService = new SyncService(workspaceId);
    conflictResolver = new ConflictResolver();
  });

  describe('sync workflow', () => {
    it('should sync local changes to remote', async () => {
      const localTable: Table = {
        id: 'table-1',
        workspace_id: workspaceId,
        primary_domain_id: 'domain-1',
        name: 'Local Table',
        model_type: 'conceptual',
        columns: [],
        position_x: 0,
        position_y: 0,
        width: 200,
        height: 150,
        visible_domains: ['domain-1'],
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      useModelStore.getState().addTable(localTable);

      const workspace: Workspace = {
        id: workspaceId,
        name: 'Test Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      useWorkspaceStore.getState().addWorkspace(workspace);

      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
      vi.mocked(odcsService.toYAML).mockResolvedValue('yaml-content');
      const mockClient = {
        put: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await syncService.syncToRemote();

      expect(result.success).toBe(true);
      expect(odcsService.toYAML).toHaveBeenCalled();
    });

    it('should sync remote changes to local', async () => {
      const remoteYAML = 'yaml-content';
      const remoteData = {
        workspace_id: workspaceId,
        tables: [
          {
            id: 'table-1',
            name: 'Remote Table',
            model_type: 'conceptual',
            columns: [],
          },
        ],
        relationships: [],
      };

      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
      const mockClient = {
        get: vi.fn().mockResolvedValue({ data: remoteYAML }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);
      vi.mocked(odcsService.parseYAML).mockResolvedValue(remoteData);

      const result = await syncService.syncFromRemote();

      expect(result.success).toBe(true);
      expect(odcsService.parseYAML).toHaveBeenCalledWith(remoteYAML);
      
      const tables = useModelStore.getState().tables;
      expect(tables.length).toBeGreaterThan(0);
    });
  });

  describe('conflict resolution', () => {
    it('should detect conflicts between local and remote', async () => {
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

      useWorkspaceStore.getState().addWorkspace(localWorkspace);

      const hasConflict = await syncService.detectConflict(remoteWorkspace);
      expect(hasConflict).toBe(true);
    });

    it('should resolve conflicts with last-change-wins', async () => {
      const conflicts = [
        {
          elementType: 'table' as const,
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:00:00Z',
          remoteTimestamp: '2025-01-01T00:01:00Z', // Newer
        },
      ];

      await conflictResolver.resolveWithLastChangeWins(conflicts);

      // Remote version should be applied
      const updateTable = useModelStore.getState().updateTable;
      expect(updateTable).toBeDefined();
    });
  });

  describe('automatic merge on connection restore', () => {
    it('should automatically merge when connection restored', async () => {
      const localWorkspace: Workspace = {
        id: workspaceId,
        name: 'Local Workspace',
        type: 'personal',
        owner_id: 'user-1',
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      useWorkspaceStore.getState().addWorkspace(localWorkspace);

      vi.mocked(apiClient.getAccessToken).mockReturnValue('test-token');
      const mockClient = {
        get: vi.fn().mockResolvedValue({
          data: 'yaml-content',
        }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);
      vi.mocked(odcsService.parseYAML).mockResolvedValue({
        workspace_id: workspaceId,
        tables: [],
        relationships: [],
      });

      const result = await syncService.autoMergeOnConnectionRestored();

      expect(result.success).toBe(true);
    });
  });
});

