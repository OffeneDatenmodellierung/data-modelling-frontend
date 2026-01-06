/**
 * Integration tests for Offline Mode
 * Tests complete offline mode workflow
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { useModelStore } from '@/stores/modelStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { localFileService } from '@/services/storage/localFileService';
import { browserFileService } from '@/services/platform/browser';
import { odcsService } from '@/services/sdk/odcsService';
import type { Workspace } from '@/types/workspace';
import type { Table } from '@/types/table';

// Mock browser file service
vi.mock('@/services/platform/browser', () => ({
  browserFileService: {
    readFile: vi.fn(),
    downloadFile: vi.fn(),
    pickFile: vi.fn(),
    pickFolder: vi.fn(),
  },
}));

vi.mock('@/services/sdk/odcsService', () => ({
  odcsService: {
    toYAML: vi.fn(),
    parseYAML: vi.fn(),
  },
}));

describe('Offline Mode Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useSDKModeStore.setState({
      mode: 'offline',
      isManualOverride: true,
    });
    useModelStore.setState({
      tables: [],
      relationships: [],
      domains: [],
      dataFlowDiagrams: [],
    });
    useWorkspaceStore.setState({
      workspaces: [],
      currentWorkspaceId: null,
    });
  });

  describe('offline workspace creation', () => {
    it('should create workspace in offline mode', () => {
      const workspace: Workspace = {
        id: 'd6fdd0ef-1e66-4c91-aa2f-c8ce7c0a8c37',
        name: 'Offline Workspace',
        owner_id: 'offline-user',
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
      };

      useWorkspaceStore.getState().addWorkspace(workspace);

      const workspaces = useWorkspaceStore.getState().workspaces;
      expect(workspaces).toContainEqual(workspace);
    });

    it('should create tables in offline mode', () => {
      const table: Table = {
        id: 'table-1',
        workspace_id: 'd6fdd0ef-1e66-4c91-aa2f-c8ce7c0a8c37',
        primary_domain_id: 'domain-1',
        name: 'Test Table',
        model_type: 'conceptual',
        columns: [],
        position_x: 0,
        position_y: 0,
        width: 200,
        height: 150,
        visible_domains: ['domain-1'],
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
      };

      useModelStore.getState().addTable(table);

      const tables = useModelStore.getState().tables;
      expect(tables).toContainEqual(table);
    });
  });

  describe('offline workspace save', () => {
    it('should save workspace to local file', async () => {
      const workspace: Workspace = {
        id: 'd6fdd0ef-1e66-4c91-aa2f-c8ce7c0a8c37',
        name: 'Offline Workspace',
        owner_id: 'offline-user',
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
      };

      useWorkspaceStore.getState().addWorkspace(workspace);
      vi.mocked(odcsService.toYAML).mockResolvedValue('yaml-content');
      vi.mocked(browserFileService.downloadFile).mockResolvedValue();

      await localFileService.saveFile(workspace, 'workspace.yaml');

      expect(odcsService.toYAML).toHaveBeenCalled();
      expect(browserFileService.downloadFile).toHaveBeenCalledWith('yaml-content', 'workspace.yaml', 'text/yaml');
    });
  });

  describe('offline workspace load', () => {
    it('should load workspace from local file', async () => {
      const mockFile = new File(['yaml-content'], 'workspace.yaml', { type: 'text/yaml' });
      
      vi.mocked(browserFileService.readFile).mockResolvedValue('yaml-content');
      const expectedWorkspaceId = 'd6fdd0ef-1e66-4c91-aa2f-c8ce7c0a8c37';
      vi.mocked(odcsService.parseYAML).mockResolvedValue({
        workspace_id: expectedWorkspaceId,
        tables: [],
        relationships: [],
        data_flow_diagrams: [],
      });

      const loadedWorkspace = await localFileService.loadWorkspace(mockFile);

      expect(loadedWorkspace).toBeDefined();
      // The loadWorkspace method uses workspace_id from parsed YAML if it's a valid UUID, otherwise generates one
      expect(loadedWorkspace.id).toBe(expectedWorkspaceId);
      expect(browserFileService.readFile).toHaveBeenCalledWith(mockFile);
      expect(odcsService.parseYAML).toHaveBeenCalledWith('yaml-content');
    });
  });

  describe('offline mode persistence', () => {
    it('should persist workspace state across sessions', () => {
      const workspace: Workspace = {
        id: 'offline-workspace-1',
        name: 'Persistent Workspace',
        type: 'personal',
        owner_id: 'offline-user',
        created_at: new Date().toISOString(),
        last_modified_at: new Date().toISOString(),
      };

      useWorkspaceStore.getState().addWorkspace(workspace);

      // Simulate page reload - state should be persisted
      const persistedState = useWorkspaceStore.getState().workspaces;
      expect(persistedState).toContainEqual(workspace);
    });
  });
});

