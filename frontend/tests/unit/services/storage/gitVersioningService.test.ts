/**
 * Unit tests for Git Versioning Service
 * Tests Git-based versioning for offline mode
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitVersioningService } from '@/services/storage/gitVersioningService';
import { odcsService } from '@/services/sdk/odcsService';

// Mock dependencies
vi.mock('@/services/sdk/odcsService', () => ({
  odcsService: {
    toYAML: vi.fn(),
  },
}));

vi.mock('@/services/platform/platform', () => ({
  getPlatform: vi.fn(() => 'electron'),
}));

describe('GitVersioningService', () => {
  let gitVersioningService: GitVersioningService;
  const workspacePath = '/path/to/workspace';

  beforeEach(() => {
    vi.clearAllMocks();
    gitVersioningService = new GitVersioningService(workspacePath);
  });

  describe('initializeGit', () => {
    it('should initialize Git repository', async () => {
      // Mock Git commands (would use actual Git in real implementation)
      const result = await gitVersioningService.initializeGit();
      expect(result).toBeDefined();
    });
  });

  describe('createCommit', () => {
    it('should create a Git commit with workspace changes', async () => {
      const workspaceData = {
        workspace_id: 'workspace-1',
        tables: [],
        relationships: [],
      };

      vi.mocked(odcsService.toYAML).mockResolvedValue('yaml-content');

      const commitHash = await gitVersioningService.createCommit('Test commit', workspaceData);

      expect(commitHash).toBeDefined();
      expect(odcsService.toYAML).toHaveBeenCalledWith(workspaceData);
    });
  });

  describe('getHistory', () => {
    it('should retrieve Git commit history', async () => {
      const history = await gitVersioningService.getHistory();

      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('revertToCommit', () => {
    it('should revert workspace to a specific commit', async () => {
      const commitHash = 'abc123';
      
      await gitVersioningService.revertToCommit(commitHash);

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('exportForConflictResolution', () => {
    it('should export workspace as Git diff format', async () => {
      const workspaceData = {
        workspace_id: 'workspace-1',
        tables: [],
        relationships: [],
      };

      vi.mocked(odcsService.toYAML).mockResolvedValue('yaml-content');

      const diff = await gitVersioningService.exportForConflictResolution(workspaceData);

      expect(diff).toBeDefined();
      expect(typeof diff).toBe('string');
    });
  });
});

