/**
 * Unit tests for Conflict Resolver Service
 * Tests conflict resolution strategies
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ConflictResolver, type Conflict, type MergeStrategy } from '@/services/sync/conflictResolver';
import { useModelStore } from '@/stores/modelStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { odcsService } from '@/services/sdk/odcsService';

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

vi.mock('@/services/sdk/odcsService', () => ({
  odcsService: {
    toYAML: vi.fn(),
  },
}));

describe('ConflictResolver', () => {
  let conflictResolver: ConflictResolver;
  const mockUpdateTable = vi.fn();
  const mockUpdateRelationship = vi.fn();
  const mockUpdateDataFlowDiagram = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    conflictResolver = new ConflictResolver();

    vi.mocked(useModelStore.getState).mockReturnValue({
      tables: [],
      relationships: [],
      dataFlowDiagrams: [],
      updateTable: mockUpdateTable,
      updateRelationship: mockUpdateRelationship,
      updateDataFlowDiagram: mockUpdateDataFlowDiagram,
    } as any);

    vi.mocked(useWorkspaceStore.getState).mockReturnValue({
      workspaces: [],
    } as any);
  });

  describe('last-change-wins strategy', () => {
    it('should use remote version when remote is newer', async () => {
      const conflicts: Conflict[] = [
        {
          elementType: 'table',
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:00:00Z',
          remoteTimestamp: '2025-01-01T00:01:00Z', // Newer
        },
      ];

      await conflictResolver.resolveWithLastChangeWins(conflicts);

      expect(mockUpdateTable).toHaveBeenCalledWith('table-1', conflicts[0].remoteVersion);
    });

    it('should keep local version when local is newer', async () => {
      const conflicts: Conflict[] = [
        {
          elementType: 'table',
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:01:00Z', // Newer
          remoteTimestamp: '2025-01-01T00:00:00Z',
        },
      ];

      await conflictResolver.resolveWithLastChangeWins(conflicts);

      // Local version should be kept (no update call)
      expect(mockUpdateTable).not.toHaveBeenCalled();
    });
  });

  describe('custom merge strategy', () => {
    it('should apply local strategy', async () => {
      const conflicts: Conflict[] = [
        {
          elementType: 'table',
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:00:00Z',
          remoteTimestamp: '2025-01-01T00:01:00Z',
        },
      ];

      const strategies: MergeStrategy[] = [
        { strategy: 'local', elementId: 'table-1', elementType: 'table' },
      ];

      await conflictResolver.resolveWithStrategy(conflicts, strategies);

      // Local version should be kept
      expect(mockUpdateTable).not.toHaveBeenCalled();
    });

    it('should apply remote strategy', async () => {
      const conflicts: Conflict[] = [
        {
          elementType: 'table',
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:01:00Z',
          remoteTimestamp: '2025-01-01T00:00:00Z',
        },
      ];

      const strategies: MergeStrategy[] = [
        { strategy: 'remote', elementId: 'table-1', elementType: 'table' },
      ];

      await conflictResolver.resolveWithStrategy(conflicts, strategies);

      expect(mockUpdateTable).toHaveBeenCalledWith('table-1', conflicts[0].remoteVersion);
    });

    it('should apply merge strategy', async () => {
      const conflicts: Conflict[] = [
        {
          elementType: 'table',
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:00:00Z',
          remoteTimestamp: '2025-01-01T00:01:00Z',
        },
      ];

      const strategies: MergeStrategy[] = [
        { strategy: 'merge', elementId: 'table-1', elementType: 'table' },
      ];

      await conflictResolver.resolveWithStrategy(conflicts, strategies);

      // Merge applies remote version
      expect(mockUpdateTable).toHaveBeenCalledWith('table-1', conflicts[0].remoteVersion);
    });
  });

  describe('export for manual resolution', () => {
    it('should export local and remote versions as YAML', async () => {
      const conflicts: Conflict[] = [
        {
          elementType: 'table',
          elementId: 'table-1',
          localVersion: { id: 'table-1', name: 'Local Table' },
          remoteVersion: { id: 'table-1', name: 'Remote Table' },
          localTimestamp: '2025-01-01T00:00:00Z',
          remoteTimestamp: '2025-01-01T00:01:00Z',
        },
      ];

      vi.mocked(odcsService.toYAML).mockResolvedValueOnce('local-yaml').mockResolvedValueOnce('remote-yaml');

      const result = await conflictResolver.exportForManualResolution(conflicts, 'workspace-1');

      expect(result.localFile).toBe('local-yaml');
      expect(result.remoteFile).toBe('remote-yaml');
      expect(odcsService.toYAML).toHaveBeenCalledTimes(2);
    });
  });
});



