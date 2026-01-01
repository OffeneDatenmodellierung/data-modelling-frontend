/**
 * Unit tests for Workspace Service
 * Tests workspace CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workspaceService } from '@/services/api/workspaceService';
import { apiClient } from '@/services/api/apiClient';

// Mock dependencies
vi.mock('@/services/api/apiClient', () => ({
  apiClient: {
    getClient: vi.fn(),
  },
}));

describe('WorkspaceService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createWorkspace', () => {
    it('should create a personal workspace', async () => {
      const mockResponse = {
        workspace_path: 'workspace-1',
        email: 'user@example.com',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: mockResponse }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await workspaceService.createWorkspace('user@example.com', 'default', 'personal');

      expect(mockClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });

    it('should create a shared workspace', async () => {
      const mockResponse = {
        workspace_path: 'workspace-2',
        email: 'user@example.com',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: mockResponse }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await workspaceService.createWorkspace('user@example.com', 'default', 'shared');

      expect(mockClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('updateWorkspace', () => {
    it('should rename a workspace', async () => {
      const mockResponse = {
        workspace_path: 'workspace-1',
        email: 'new-name@example.com',
      };

      const mockClient = {
        put: vi.fn().mockResolvedValue({ data: mockResponse }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await workspaceService.updateWorkspace('workspace-1', { name: 'New Name' });

      expect(mockClient.put).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteWorkspace', () => {
    it('should delete a workspace', async () => {
      const mockClient = {
        delete: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      await workspaceService.deleteWorkspace('workspace-1');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1');
    });
  });

  describe('convertToShared', () => {
    it('should convert personal workspace to shared', async () => {
      const mockResponse = {
        workspace_path: 'workspace-1',
        email: 'user@example.com',
        type: 'shared',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: mockResponse }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await workspaceService.convertToShared('workspace-1');

      expect(mockClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('convertToPersonal', () => {
    it('should convert shared workspace to personal', async () => {
      const mockResponse = {
        workspace_path: 'workspace-1',
        email: 'user@example.com',
        type: 'personal',
      };

      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: mockResponse }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      const result = await workspaceService.convertToPersonal('workspace-1');

      expect(mockClient.post).toHaveBeenCalled();
      expect(result).toEqual(mockResponse);
    });
  });

  describe('addCollaborator', () => {
    it('should add a collaborator to shared workspace', async () => {
      const mockClient = {
        post: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      await workspaceService.addCollaborator('workspace-1', 'collaborator@example.com', 'edit');

      expect(mockClient.post).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/collaborators', {
        email: 'collaborator@example.com',
        access_level: 'edit',
      });
    });
  });

  describe('removeCollaborator', () => {
    it('should remove a collaborator from shared workspace', async () => {
      const mockClient = {
        delete: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      await workspaceService.removeCollaborator('workspace-1', 'collaborator@example.com');

      expect(mockClient.delete).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/collaborators/collaborator@example.com');
    });
  });

  describe('updateCollaboratorAccess', () => {
    it('should update collaborator access level', async () => {
      const mockClient = {
        put: vi.fn().mockResolvedValue({ data: {} }),
      };
      vi.mocked(apiClient.getClient).mockReturnValue(mockClient as any);

      await workspaceService.updateCollaboratorAccess('workspace-1', 'collaborator@example.com', 'read');

      expect(mockClient.put).toHaveBeenCalledWith('/api/v1/workspaces/workspace-1/collaborators/collaborator@example.com', {
        access_level: 'read',
      });
    });
  });
});
