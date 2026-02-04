/**
 * Unit tests for Validation Service
 * Tests data model validation using SDK
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validationService } from '@/services/sdk/validationService';
import { sdkLoader } from '@/services/sdk/sdkLoader';
import type { Table } from '@/types/table';
import type { Relationship } from '@/types/relationship';
import type { Domain } from '@/types/domain';
import type { KnowledgeArticle, ArticleType, ArticleStatus } from '@/types/knowledge';
import type { Decision, DecisionStatus, DecisionCategory } from '@/types/decision';

vi.mock('@/services/sdk/sdkLoader');

describe('ValidationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sdkLoader.load).mockResolvedValue({
      init: vi.fn(),
    } as any);
  });

  describe('validateTable', () => {
    it('should validate a valid table', async () => {
      const table: Table = {
        id: 'table-1',
        workspace_id: 'workspace-1',
        primary_domain_id: 'domain-1',
        name: 'Users',
        model_type: 'conceptual',
        columns: [],
        position_x: 100,
        position_y: 100,
        width: 200,
        height: 150,
        visible_domains: ['domain-1'],
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const result = await validationService.validateTable(table);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject table with empty name', async () => {
      const table: Table = {
        id: 'table-1',
        workspace_id: 'workspace-1',
        primary_domain_id: 'domain-1',
        name: '',
        model_type: 'conceptual',
        columns: [],
        position_x: 100,
        position_y: 100,
        width: 200,
        height: 150,
        visible_domains: ['domain-1'],
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const result = await validationService.validateTable(table);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    it('should require at least one column for physical model', async () => {
      const table: Table = {
        id: 'table-1',
        workspace_id: 'workspace-1',
        primary_domain_id: 'domain-1',
        name: 'Users',
        model_type: 'physical',
        columns: [],
        position_x: 100,
        position_y: 100,
        width: 200,
        height: 150,
        visible_domains: ['domain-1'],
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const result = await validationService.validateTable(table);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === 'columns')).toBe(true);
    });
  });

  describe('validateRelationship', () => {
    it('should validate a valid relationship', async () => {
      const relationship: Relationship = {
        id: 'rel-1',
        workspace_id: 'workspace-1',
        domain_id: 'domain-1',
        source_table_id: 'table-1',
        target_table_id: 'table-2',
        type: 'one-to-many',
        source_cardinality: '1',
        target_cardinality: 'N',
        model_type: 'conceptual',
        is_circular: false,
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const result = await validationService.validateRelationship(relationship);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject self-referencing relationship', async () => {
      const relationship: Relationship = {
        id: 'rel-1',
        workspace_id: 'workspace-1',
        domain_id: 'domain-1',
        source_table_id: 'table-1',
        target_table_id: 'table-1', // Same table
        type: 'one-to-one',
        source_cardinality: '1',
        target_cardinality: '1',
        model_type: 'conceptual',
        is_circular: false,
        created_at: '2025-01-01T00:00:00Z',
        last_modified_at: '2025-01-01T00:00:00Z',
      };

      const result = await validationService.validateRelationship(relationship);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SELF_REFERENCE')).toBe(true);
    });
  });

  describe('detectCircularRelationships', () => {
    it('should detect circular relationships', async () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          workspace_id: 'workspace-1',
          domain_id: 'domain-1',
          source_table_id: 'table-1',
          target_table_id: 'table-2',
          type: 'one-to-many',
          source_cardinality: '1',
          target_cardinality: 'N',
          model_type: 'conceptual',
          is_circular: false,
          created_at: '2025-01-01T00:00:00Z',
          last_modified_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          workspace_id: 'workspace-1',
          domain_id: 'domain-1',
          source_table_id: 'table-2',
          target_table_id: 'table-1', // Creates cycle
          type: 'many-to-one',
          source_cardinality: 'N',
          target_cardinality: '1',
          model_type: 'conceptual',
          is_circular: true,
          created_at: '2025-01-01T00:00:00Z',
          last_modified_at: '2025-01-01T00:00:00Z',
        },
      ];

      const result = await validationService.detectCircularRelationships(relationships);
      expect(result.isCircular).toBe(true);
    });

    it('should not detect cycles in acyclic relationships', async () => {
      const relationships: Relationship[] = [
        {
          id: 'rel-1',
          workspace_id: 'workspace-1',
          domain_id: 'domain-1',
          source_table_id: 'table-1',
          target_table_id: 'table-2',
          type: 'one-to-many',
          source_cardinality: '1',
          target_cardinality: 'N',
          model_type: 'conceptual',
          is_circular: false,
          created_at: '2025-01-01T00:00:00Z',
          last_modified_at: '2025-01-01T00:00:00Z',
        },
        {
          id: 'rel-2',
          workspace_id: 'workspace-1',
          domain_id: 'domain-1',
          source_table_id: 'table-2',
          target_table_id: 'table-3', // No cycle
          type: 'one-to-many',
          source_cardinality: '1',
          target_cardinality: 'N',
          model_type: 'conceptual',
          is_circular: false,
          created_at: '2025-01-01T00:00:00Z',
          last_modified_at: '2025-01-01T00:00:00Z',
        },
      ];

      const result = await validationService.detectCircularRelationships(relationships);
      expect(result.isCircular).toBe(false);
    });
  });

  describe('validateAll', () => {
    // Helper function to create a valid table
    const createTable = (overrides: Partial<Table> = {}): Table => ({
      id: 'table-1',
      workspace_id: 'workspace-1',
      primary_domain_id: 'domain-1',
      name: 'Users',
      model_type: 'conceptual',
      columns: [],
      position_x: 100,
      position_y: 100,
      width: 200,
      height: 150,
      visible_domains: ['domain-1'],
      created_at: '2025-01-01T00:00:00Z',
      last_modified_at: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    // Helper function to create a valid relationship
    const createRelationship = (overrides: Partial<Relationship> = {}): Relationship => ({
      id: 'rel-1',
      workspace_id: 'workspace-1',
      domain_id: 'domain-1',
      source_table_id: 'table-1',
      target_table_id: 'table-2',
      type: 'one-to-many',
      source_cardinality: '1',
      target_cardinality: 'N',
      model_type: 'conceptual',
      is_circular: false,
      created_at: '2025-01-01T00:00:00Z',
      last_modified_at: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    // Helper function to create a valid domain
    const createDomain = (overrides: Partial<Domain> = {}): Domain => ({
      id: 'domain-1',
      workspace_id: 'workspace-1',
      name: 'Core Domain',
      created_at: '2025-01-01T00:00:00Z',
      last_modified_at: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    // Helper function to create a valid knowledge article
    const createArticle = (overrides: Partial<KnowledgeArticle> = {}): KnowledgeArticle => ({
      id: 'article-1',
      number: 2501011200,
      title: 'Getting Started',
      type: 'guide' as ArticleType,
      status: 'published' as ArticleStatus,
      summary: 'A guide to getting started',
      content: 'This is the content of the article.',
      authors: ['author@example.com'],
      reviewers: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    // Helper function to create a valid decision
    const createDecision = (overrides: Partial<Decision> = {}): Decision => ({
      id: 'decision-1',
      number: 2501011200,
      title: 'Use PostgreSQL for main database',
      status: 'accepted' as DecisionStatus,
      category: 'technology' as DecisionCategory,
      context: 'We need to choose a database.',
      decision: 'We will use PostgreSQL.',
      consequences: 'We will need PostgreSQL expertise.',
      options: [],
      created_at: '2025-01-01T00:00:00Z',
      updated_at: '2025-01-01T00:00:00Z',
      ...overrides,
    });

    it('should return no issues for valid resources', async () => {
      const tables = [createTable(), createTable({ id: 'table-2', name: 'Orders' })];
      const relationships = [createRelationship()];
      const domains = [createDomain()];
      const articles = [createArticle()];
      const decisions = [createDecision()];

      const result = await validationService.validateAll(
        tables,
        relationships,
        domains,
        articles,
        decisions
      );

      expect(result.hasErrors).toBe(false);
      expect(result.hasWarnings).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect table with empty name', async () => {
      const tables = [createTable({ name: '' })];

      const result = await validationService.validateAll(tables, [], [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(result.errorCount).toBeGreaterThanOrEqual(1);
      expect(result.issues.some((i) => i.field === 'name' && i.resourceType === 'table')).toBe(
        true
      );
    });

    it('should detect table with invalid name format', async () => {
      const tables = [createTable({ name: 'Invalid Name!' })];

      const result = await validationService.validateAll(tables, [], [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.field === 'name' && i.resourceType === 'table' && i.message.includes('alphanumeric')
        )
      ).toBe(true);
    });

    it('should warn about physical table without columns', async () => {
      const tables = [createTable({ model_type: 'physical', columns: [] })];

      const result = await validationService.validateAll(tables, [], [], [], []);

      expect(result.hasWarnings).toBe(true);
      expect(result.issues.some((i) => i.field === 'columns' && i.severity === 'warning')).toBe(
        true
      );
    });

    it('should detect column without name', async () => {
      const tables = [
        createTable({
          columns: [
            {
              id: 'col-1',
              table_id: 'table-1',
              name: '',
              data_type: 'VARCHAR',
              ordinal_position: 1,
              created_at: '2025-01-01T00:00:00Z',
              last_modified_at: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ];

      const result = await validationService.validateAll(tables, [], [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(result.issues.some((i) => i.field === 'column.name')).toBe(true);
    });

    it('should detect column without data type', async () => {
      const tables = [
        createTable({
          columns: [
            {
              id: 'col-1',
              table_id: 'table-1',
              name: 'user_id',
              data_type: '',
              ordinal_position: 1,
              created_at: '2025-01-01T00:00:00Z',
              last_modified_at: '2025-01-01T00:00:00Z',
            },
          ],
        }),
      ];

      const result = await validationService.validateAll(tables, [], [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(result.issues.some((i) => i.field === 'column.data_type')).toBe(true);
    });

    it('should detect self-referencing relationship', async () => {
      const tables = [createTable()];
      const relationships = [
        createRelationship({ source_table_id: 'table-1', target_table_id: 'table-1' }),
      ];

      const result = await validationService.validateAll(tables, relationships, [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some(
          (i) => i.resourceType === 'relationship' && i.field === 'target_table_id'
        )
      ).toBe(true);
    });

    it('should detect orphaned relationship (source table missing)', async () => {
      const tables = [createTable({ id: 'table-2', name: 'Orders' })];
      const relationships = [createRelationship({ source_table_id: 'table-1' })];

      const result = await validationService.validateAll(tables, relationships, [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'relationship' &&
            i.field === 'source_table_id' &&
            i.message.includes('not found')
        )
      ).toBe(true);
    });

    it('should detect orphaned relationship (target table missing)', async () => {
      const tables = [createTable()];
      const relationships = [createRelationship({ target_table_id: 'table-missing' })];

      const result = await validationService.validateAll(tables, relationships, [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'relationship' &&
            i.field === 'target_table_id' &&
            i.message.includes('not found')
        )
      ).toBe(true);
    });

    it('should detect relationship without type', async () => {
      const tables = [createTable(), createTable({ id: 'table-2', name: 'Orders' })];
      const relationships = [createRelationship({ type: '' as Relationship['type'] })];

      const result = await validationService.validateAll(tables, relationships, [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i) => i.resourceType === 'relationship' && i.field === 'type')
      ).toBe(true);
    });

    it('should detect domain without name', async () => {
      const domains = [createDomain({ name: '' })];

      const result = await validationService.validateAll([], [], domains, [], []);

      expect(result.hasErrors).toBe(true);
      expect(result.issues.some((i) => i.resourceType === 'domain' && i.field === 'name')).toBe(
        true
      );
    });

    it('should detect duplicate domain names', async () => {
      const domains = [
        createDomain({ id: 'domain-1', name: 'Core' }),
        createDomain({ id: 'domain-2', name: 'Core' }),
      ];

      const result = await validationService.validateAll([], [], domains, [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'domain' && i.field === 'name' && i.message.includes('Duplicate')
        )
      ).toBe(true);
    });

    it('should detect article without title', async () => {
      const articles = [createArticle({ title: '' })];

      const result = await validationService.validateAll([], [], [], articles, []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i) => i.resourceType === 'knowledge_article' && i.field === 'title')
      ).toBe(true);
    });

    it('should warn about article without content', async () => {
      const articles = [createArticle({ content: '' })];

      const result = await validationService.validateAll([], [], [], articles, []);

      expect(result.hasWarnings).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'knowledge_article' &&
            i.field === 'content' &&
            i.severity === 'warning'
        )
      ).toBe(true);
    });

    it('should detect article without type', async () => {
      const articles = [createArticle({ type: '' as ArticleType })];

      const result = await validationService.validateAll([], [], [], articles, []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i) => i.resourceType === 'knowledge_article' && i.field === 'type')
      ).toBe(true);
    });

    it('should detect article without status', async () => {
      const articles = [createArticle({ status: '' as ArticleStatus })];

      const result = await validationService.validateAll([], [], [], articles, []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i) => i.resourceType === 'knowledge_article' && i.field === 'status')
      ).toBe(true);
    });

    it('should warn about article without authors', async () => {
      const articles = [createArticle({ authors: [] })];

      const result = await validationService.validateAll([], [], [], articles, []);

      expect(result.hasWarnings).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'knowledge_article' &&
            i.field === 'authors' &&
            i.severity === 'warning'
        )
      ).toBe(true);
    });

    it('should detect decision without title', async () => {
      const decisions = [createDecision({ title: '' })];

      const result = await validationService.validateAll([], [], [], [], decisions);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i) => i.resourceType === 'decision_record' && i.field === 'title')
      ).toBe(true);
    });

    it('should detect decision without status', async () => {
      const decisions = [createDecision({ status: '' as DecisionStatus })];

      const result = await validationService.validateAll([], [], [], [], decisions);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some((i) => i.resourceType === 'decision_record' && i.field === 'status')
      ).toBe(true);
    });

    it('should warn about decision without context', async () => {
      const decisions = [createDecision({ context: '' })];

      const result = await validationService.validateAll([], [], [], [], decisions);

      expect(result.hasWarnings).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'decision_record' &&
            i.field === 'context' &&
            i.severity === 'warning'
        )
      ).toBe(true);
    });

    it('should warn about decision without decision text', async () => {
      const decisions = [createDecision({ decision: '' })];

      const result = await validationService.validateAll([], [], [], [], decisions);

      expect(result.hasWarnings).toBe(true);
      expect(
        result.issues.some(
          (i) =>
            i.resourceType === 'decision_record' &&
            i.field === 'decision' &&
            i.severity === 'warning'
        )
      ).toBe(true);
    });

    it('should detect duplicate table names', async () => {
      const tables = [
        createTable({ id: 'table-1', name: 'Users' }),
        createTable({ id: 'table-2', name: 'Users' }),
      ];

      const result = await validationService.validateAll(tables, [], [], [], []);

      expect(result.hasErrors).toBe(true);
      expect(
        result.issues.some(
          (i) => i.resourceType === 'table' && i.field === 'name' && i.message.includes('Duplicate')
        )
      ).toBe(true);
    });

    it('should correctly count errors and warnings separately', async () => {
      const tables = [createTable({ name: '' })]; // 1 error
      const articles = [createArticle({ content: '', authors: [] })]; // 2 warnings

      const result = await validationService.validateAll(tables, [], [], articles, []);

      expect(result.hasErrors).toBe(true);
      expect(result.hasWarnings).toBe(true);
      expect(result.errorCount).toBeGreaterThanOrEqual(1);
      expect(result.warningCount).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty inputs', async () => {
      const result = await validationService.validateAll([], [], [], [], []);

      expect(result.hasErrors).toBe(false);
      expect(result.hasWarnings).toBe(false);
      expect(result.errorCount).toBe(0);
      expect(result.warningCount).toBe(0);
      expect(result.issues).toHaveLength(0);
    });
  });
});
