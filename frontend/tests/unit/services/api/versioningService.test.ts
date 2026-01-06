/**
 * Unit tests for Versioning Service
 * Tests PostgreSQL-based versioning operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { versioningService } from '@/services/api/versioningService';
import { apiClient } from '@/services/api/apiClient';

// Mock dependencies
vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getClient: vi.fn(),
  },
}));

describe('VersioningService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getVersionHistory', () => {
    it('should retrieve version history for a workspace', async () => {
      const mockVersions = [
        {
          version_id: 'v1',
          created_at: '2025-01-01T00:00:00Z',
          created_by: 'user-1',
          description: 'Initial version',
        },
        {
          version_id: 'v2',
          created_at: '2025-01-02T00:00:00Z',
          created_by: 'user-1',
          description: 'Added tables',
        },
      ];

      const mockClient = {
        get: vi.fn().mockResolvedValue({ data: { versions: mockVersions } }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await versioningService.getVersionHistory('workspace-1');

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/versions');
      expect(result).toEqual(mockVersions);
    });
  });

  describe('createVersion', () => {
    it('should create a new version', async () => {
      const mockVersion = {
        version_id: 'v3',
        created_at: '2025-01-03T00:00:00Z',
        created_by: 'user-1',
        description: 'Updated relationships',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: { version: mockVersion } }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await versioningService.createVersion('workspace-1', 'Updated relationships');

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/versions', {
        description: 'Updated relationships',
      });
      expect(result).toEqual(mockVersion);
    });
  });

  describe('getVersion', () => {
    it('should retrieve a specific version', async () => {
      const mockVersion = {
        version_id: 'v2',
        created_at: '2025-01-02T00:00:00Z',
        created_by: 'user-1',
        description: 'Added tables',
        workspace_data: {},
      };

      const mockClient = {
        get: vi.fn().mockResolvedValue({ data: { version: mockVersion } }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await versioningService.getVersion('workspace-1', 'v2');

      expect(mockClient.get).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/versions/v2');
      expect(result).toEqual(mockVersion);
    });
  });

  describe('restoreVersion', () => {
    it('should restore a workspace to a specific version', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: { message: 'Version restored' } }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      await versioningService.restoreVersion('workspace-1', 'v2');

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/versions/v2/restore');
    });
  });
});



