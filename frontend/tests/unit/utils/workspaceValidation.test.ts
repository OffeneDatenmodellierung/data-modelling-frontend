/**
 * Unit tests for Workspace Validation utility
 * Tests the runWorkspaceValidation and getValidationState functions
 */

import { describe, it, expect, beforeEach, vi, type Mock } from 'vitest';
import { runWorkspaceValidation, getValidationState } from '@/utils/workspaceValidation';
import { validationService } from '@/services/sdk/validationService';
import { useValidationStore } from '@/stores/validationStore';
import { useModelStore } from '@/stores/modelStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useDecisionStore } from '@/stores/decisionStore';

// Mock the stores and services
vi.mock('@/services/sdk/validationService');
vi.mock('@/stores/validationStore');
vi.mock('@/stores/modelStore');
vi.mock('@/stores/knowledgeStore');
vi.mock('@/stores/decisionStore');

describe('workspaceValidation', () => {
  // Mock store states
  const mockValidationStoreState = {
    setValidating: vi.fn(),
    clearAllIssues: vi.fn(),
    addIssues: vi.fn(),
    hasErrors: vi.fn(),
    hasWarnings: vi.fn(),
    getErrorCount: vi.fn(),
    getWarningCount: vi.fn(),
  };

  const mockModelStoreState = {
    tables: [],
    relationships: [],
    domains: [],
  };

  const mockKnowledgeStoreState = {
    articles: [],
  };

  const mockDecisionStoreState = {
    decisions: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Set up mock implementations
    (useValidationStore.getState as Mock).mockReturnValue(mockValidationStoreState);
    (useValidationStore.setState as unknown as Mock) = vi.fn();
    (useModelStore.getState as Mock).mockReturnValue(mockModelStoreState);
    (useKnowledgeStore.getState as Mock).mockReturnValue(mockKnowledgeStoreState);
    (useDecisionStore.getState as Mock).mockReturnValue(mockDecisionStoreState);

    // Reset mock function return values
    mockValidationStoreState.hasErrors.mockReturnValue(false);
    mockValidationStoreState.hasWarnings.mockReturnValue(false);
    mockValidationStoreState.getErrorCount.mockReturnValue(0);
    mockValidationStoreState.getWarningCount.mockReturnValue(0);
  });

  describe('runWorkspaceValidation', () => {
    it('should set validating state to true at start', async () => {
      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [],
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
        warningCount: 0,
      });

      await runWorkspaceValidation();

      expect(mockValidationStoreState.setValidating).toHaveBeenCalledWith(true);
    });

    it('should set validating state to false when done', async () => {
      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [],
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
        warningCount: 0,
      });

      await runWorkspaceValidation();

      expect(mockValidationStoreState.setValidating).toHaveBeenCalledWith(false);
    });

    it('should call validateAll with resources from stores', async () => {
      const mockTables = [{ id: 'table-1', name: 'Users' }];
      const mockRelationships = [{ id: 'rel-1' }];
      const mockDomains = [{ id: 'domain-1', name: 'Core' }];
      const mockArticles = [{ id: 'article-1', title: 'Guide' }];
      const mockDecisions = [{ id: 'decision-1', title: 'Use Postgres' }];

      (useModelStore.getState as Mock).mockReturnValue({
        tables: mockTables,
        relationships: mockRelationships,
        domains: mockDomains,
      });
      (useKnowledgeStore.getState as Mock).mockReturnValue({
        articles: mockArticles,
      });
      (useDecisionStore.getState as Mock).mockReturnValue({
        decisions: mockDecisions,
      });

      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [],
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
        warningCount: 0,
      });

      await runWorkspaceValidation();

      expect(validationService.validateAll).toHaveBeenCalledWith(
        mockTables,
        mockRelationships,
        mockDomains,
        mockArticles,
        mockDecisions
      );
    });

    it('should clear existing issues before adding new ones', async () => {
      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [
          {
            resourceType: 'table',
            resourceId: 'table-1',
            resourceName: 'Users',
            severity: 'error',
            field: 'name',
            message: 'Name is required',
          },
        ],
        hasErrors: true,
        hasWarnings: false,
        errorCount: 1,
        warningCount: 0,
      });

      await runWorkspaceValidation();

      expect(mockValidationStoreState.clearAllIssues).toHaveBeenCalled();
      expect(mockValidationStoreState.addIssues).toHaveBeenCalled();
    });

    it('should not add issues if there are none', async () => {
      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [],
        hasErrors: false,
        hasWarnings: false,
        errorCount: 0,
        warningCount: 0,
      });

      await runWorkspaceValidation();

      expect(mockValidationStoreState.clearAllIssues).toHaveBeenCalled();
      expect(mockValidationStoreState.addIssues).not.toHaveBeenCalled();
    });

    it('should return validation summary with errors', async () => {
      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [
          {
            resourceType: 'table',
            resourceId: 'table-1',
            resourceName: 'Users',
            severity: 'error',
            field: 'name',
            message: 'Name is required',
          },
        ],
        hasErrors: true,
        hasWarnings: false,
        errorCount: 1,
        warningCount: 0,
      });

      const result = await runWorkspaceValidation();

      expect(result.hasErrors).toBe(true);
      expect(result.hasWarnings).toBe(false);
      expect(result.errorCount).toBe(1);
      expect(result.warningCount).toBe(0);
    });

    it('should return validation summary with warnings', async () => {
      (validationService.validateAll as Mock).mockResolvedValue({
        issues: [
          {
            resourceType: 'knowledge_article',
            resourceId: 'article-1',
            resourceName: 'Guide',
            severity: 'warning',
            field: 'content',
            message: 'Article has no content',
          },
        ],
        hasErrors: false,
        hasWarnings: true,
        errorCount: 0,
        warningCount: 1,
      });

      const result = await runWorkspaceValidation();

      expect(result.hasErrors).toBe(false);
      expect(result.hasWarnings).toBe(true);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(1);
    });

    it('should set validating to false even if validation throws', async () => {
      (validationService.validateAll as Mock).mockRejectedValue(new Error('Validation failed'));

      await expect(runWorkspaceValidation()).rejects.toThrow('Validation failed');

      expect(mockValidationStoreState.setValidating).toHaveBeenCalledWith(false);
    });
  });

  describe('getValidationState', () => {
    it('should return current validation state from store', () => {
      mockValidationStoreState.hasErrors.mockReturnValue(true);
      mockValidationStoreState.hasWarnings.mockReturnValue(true);
      mockValidationStoreState.getErrorCount.mockReturnValue(3);
      mockValidationStoreState.getWarningCount.mockReturnValue(5);

      const result = getValidationState();

      expect(result.hasErrors).toBe(true);
      expect(result.hasWarnings).toBe(true);
      expect(result.errorCount).toBe(3);
      expect(result.warningCount).toBe(5);
    });

    it('should return false/0 when no issues', () => {
      mockValidationStoreState.hasErrors.mockReturnValue(false);
      mockValidationStoreState.hasWarnings.mockReturnValue(false);
      mockValidationStoreState.getErrorCount.mockReturnValue(0);
      mockValidationStoreState.getWarningCount.mockReturnValue(0);

      const result = getValidationState();

      expect(result.hasErrors).toBe(false);
      expect(result.hasWarnings).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
    });
  });
});
