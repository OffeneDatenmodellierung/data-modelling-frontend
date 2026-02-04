/**
 * Validation Service
 * Uses SDK for validating data models and relationships
 */

import { sdkLoader } from './sdkLoader';
import type { Table } from '@/types/table';
import type { Relationship } from '@/types/relationship';
import type { Domain } from '@/types/domain';
import type { KnowledgeArticle } from '@/types/knowledge';
import type { Decision } from '@/types/decision';
import type { ResourceType, ValidationSeverity } from '@/stores/validationStore';
import { isValidTableName, isValidColumnName } from '@/utils/validation';

export interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ModelIntegrityResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  orphanedRelationships: string[];
  invalidDataTypes: string[];
  duplicateNames: string[];
}

/**
 * Issue format compatible with validationStore.addIssues()
 */
export interface ValidationIssueInput {
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  severity: ValidationSeverity;
  field?: string;
  message: string;
  details?: string;
}

/**
 * Result of validateAll() comprehensive validation
 */
export interface ValidateAllResult {
  issues: ValidationIssueInput[];
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
}

class ValidationService {
  /**
   * Validate a table
   */
  async validateTable(table: Table): Promise<ValidationResult> {
    await sdkLoader.load();

    // TODO: Implement actual SDK validation when available
    // const sdk = await sdkLoader.load();
    // return sdk.validateTable(table);

    // Placeholder implementation with basic validation
    const errors: ValidationError[] = [];

    if (!table.name || table.name.trim().length === 0) {
      errors.push({
        field: 'name',
        message: 'Table name is required',
        code: 'REQUIRED',
      });
    }

    if (table.columns.length === 0 && table.model_type === 'physical') {
      errors.push({
        field: 'columns',
        message: 'Physical tables must have at least one column',
        code: 'MIN_COLUMNS',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate a relationship
   */
  async validateRelationship(relationship: Relationship): Promise<ValidationResult> {
    await sdkLoader.load();

    // TODO: Implement actual SDK validation when available
    // const sdk = await sdkLoader.load();
    // return sdk.validateRelationship(relationship);

    // Placeholder implementation with basic validation
    const errors: ValidationError[] = [];

    if (relationship.source_table_id === relationship.target_table_id) {
      errors.push({
        field: 'target_table_id',
        message: 'Source and target tables must be different',
        code: 'SELF_REFERENCE',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate circular relationships
   */
  async detectCircularRelationships(
    relationships: Relationship[]
  ): Promise<{ isCircular: boolean; cycle?: string[] }> {
    await sdkLoader.load();

    // TODO: Implement actual SDK circular detection when available
    // const sdk = await sdkLoader.load();
    // return sdk.detectCircularRelationships(relationships);

    // Placeholder implementation - basic cycle detection
    // This is a simplified version - full implementation will use SDK
    const graph = new Map<string, string[]>();

    // Build adjacency list
    for (const rel of relationships) {
      if (!rel.source_table_id || !rel.target_table_id) {
        continue; // Skip relationships with missing IDs
      }
      if (!graph.has(rel.source_table_id)) {
        graph.set(rel.source_table_id, []);
      }
      graph.get(rel.source_table_id)!.push(rel.target_table_id);
    }

    // Simple cycle detection using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const hasCycle = (node: string): boolean => {
      if (recStack.has(node)) {
        return true;
      }
      if (visited.has(node)) {
        return false;
      }

      visited.add(node);
      recStack.add(node);

      const neighbors = graph.get(node) || [];
      for (const neighbor of neighbors) {
        if (hasCycle(neighbor)) {
          return true;
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (!visited.has(node) && hasCycle(node)) {
        return { isCircular: true };
      }
    }

    return { isCircular: false };
  }

  /**
   * Validate model integrity (orphaned relationships, invalid data types, duplicates)
   */
  async validateModelIntegrity(
    tables: Table[],
    relationships: Relationship[]
  ): Promise<ModelIntegrityResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const orphanedRelationships: string[] = [];
    const invalidDataTypes: string[] = [];
    const duplicateNames: string[] = [];

    // Check for orphaned relationships
    const tableIds = new Set(tables.map((t) => t.id));
    for (const rel of relationships) {
      if (!rel.source_table_id || !tableIds.has(rel.source_table_id)) {
        const sourceId = rel.source_table_id || 'unknown';
        const errorMsg = `orphaned relationship: ${rel.id} (source table ${sourceId} not found)`;
        orphanedRelationships.push(
          `Relationship ${rel.id} references non-existent source table ${sourceId}`
        );
        errors.push(errorMsg);
      }
      if (!rel.target_table_id || !tableIds.has(rel.target_table_id)) {
        const targetId = rel.target_table_id || 'unknown';
        const errorMsg = `orphaned relationship: ${rel.id} (target table ${targetId} not found)`;
        orphanedRelationships.push(
          `Relationship ${rel.id} references non-existent target table ${rel.target_table_id}`
        );
        errors.push(errorMsg);
      }
    }

    // Check for duplicate table names
    const tableNames = new Map<string, string>();
    for (const table of tables) {
      if (tableNames.has(table.name)) {
        duplicateNames.push(table.name);
        errors.push(
          `Duplicate table name: ${table.name} (tables ${tableNames.get(table.name)} and ${table.id})`
        );
      } else {
        tableNames.set(table.name, table.id);
      }
    }

    // Check for invalid data types (basic validation)
    const validDataTypes = [
      'UUID',
      'VARCHAR',
      'TEXT',
      'INTEGER',
      'BIGINT',
      'DECIMAL',
      'NUMERIC',
      'BOOLEAN',
      'DATE',
      'TIMESTAMP',
      'JSON',
      'JSONB',
    ];
    for (const table of tables) {
      for (const column of table.columns) {
        if (!validDataTypes.includes(column.data_type.toUpperCase())) {
          invalidDataTypes.push(`${table.name}.${column.name}: ${column.data_type}`);
          warnings.push(
            `Potentially invalid data type: ${column.data_type} in ${table.name}.${column.name}`
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      orphanedRelationships,
      invalidDataTypes,
      duplicateNames,
    };
  }

  /**
   * Validate all workspace resources comprehensively
   * Returns issues in format compatible with validationStore.addIssues()
   */
  async validateAll(
    tables: Table[],
    relationships: Relationship[],
    domains: Domain[],
    knowledgeArticles: KnowledgeArticle[] = [],
    decisionRecords: Decision[] = []
  ): Promise<ValidateAllResult> {
    const issues: ValidationIssueInput[] = [];

    // Validate tables
    for (const table of tables) {
      // Required: name
      if (!table.name || table.name.trim().length === 0) {
        issues.push({
          resourceType: 'table',
          resourceId: table.id,
          resourceName: table.name || 'Unnamed Table',
          severity: 'error',
          field: 'name',
          message: 'Table name is required',
        });
      } else if (!isValidTableName(table.name)) {
        issues.push({
          resourceType: 'table',
          resourceId: table.id,
          resourceName: table.name,
          severity: 'error',
          field: 'name',
          message: 'Table name must contain only alphanumeric characters and underscores',
        });
      }

      // Physical tables should have columns
      if (table.model_type === 'physical' && table.columns.length === 0) {
        issues.push({
          resourceType: 'table',
          resourceId: table.id,
          resourceName: table.name || 'Unnamed Table',
          severity: 'warning',
          field: 'columns',
          message: 'Physical tables should have at least one column',
        });
      }

      // Validate columns
      for (const column of table.columns) {
        // Required: name
        if (!column.name || column.name.trim().length === 0) {
          issues.push({
            resourceType: 'table',
            resourceId: table.id,
            resourceName: table.name || 'Unnamed Table',
            severity: 'error',
            field: 'column.name',
            message: `Column name is required (column ID: ${column.id})`,
            details: `Table "${table.name}" has a column without a name`,
          });
        } else if (!isValidColumnName(column.name)) {
          issues.push({
            resourceType: 'table',
            resourceId: table.id,
            resourceName: table.name || 'Unnamed Table',
            severity: 'error',
            field: 'column.name',
            message: `Column name "${column.name}" must contain only alphanumeric characters and underscores`,
          });
        }

        // Required: data_type
        if (!column.data_type || column.data_type.trim().length === 0) {
          issues.push({
            resourceType: 'table',
            resourceId: table.id,
            resourceName: table.name || 'Unnamed Table',
            severity: 'error',
            field: 'column.data_type',
            message: `Column "${column.name || column.id}" requires a data type`,
            details: `Table "${table.name}", column "${column.name || column.id}"`,
          });
        }
      }
    }

    // Validate relationships
    const tableIds = new Set(tables.map((t) => t.id));
    for (const rel of relationships) {
      const relName = rel.label || `Relationship ${rel.id.substring(0, 8)}`;

      // Check for self-reference
      if (rel.source_table_id && rel.source_table_id === rel.target_table_id) {
        issues.push({
          resourceType: 'relationship',
          resourceId: rel.id,
          resourceName: relName,
          severity: 'error',
          field: 'target_table_id',
          message: 'Relationship cannot reference the same table as source and target',
        });
      }

      // Check for orphaned source
      if (rel.source_table_id && !tableIds.has(rel.source_table_id)) {
        issues.push({
          resourceType: 'relationship',
          resourceId: rel.id,
          resourceName: relName,
          severity: 'error',
          field: 'source_table_id',
          message: `Source table not found (ID: ${rel.source_table_id})`,
        });
      }

      // Check for orphaned target
      if (rel.target_table_id && !tableIds.has(rel.target_table_id)) {
        issues.push({
          resourceType: 'relationship',
          resourceId: rel.id,
          resourceName: relName,
          severity: 'error',
          field: 'target_table_id',
          message: `Target table not found (ID: ${rel.target_table_id})`,
        });
      }

      // Required: type
      if (!rel.type) {
        issues.push({
          resourceType: 'relationship',
          resourceId: rel.id,
          resourceName: relName,
          severity: 'error',
          field: 'type',
          message: 'Relationship type is required',
        });
      }
    }

    // Validate domains
    const domainNames = new Map<string, string>();
    for (const domain of domains) {
      // Required: name
      if (!domain.name || domain.name.trim().length === 0) {
        issues.push({
          resourceType: 'domain',
          resourceId: domain.id,
          resourceName: domain.name || 'Unnamed Domain',
          severity: 'error',
          field: 'name',
          message: 'Domain name is required',
        });
      } else {
        // Check for duplicate domain names
        if (domainNames.has(domain.name.toLowerCase())) {
          issues.push({
            resourceType: 'domain',
            resourceId: domain.id,
            resourceName: domain.name,
            severity: 'error',
            field: 'name',
            message: `Duplicate domain name "${domain.name}"`,
          });
        } else {
          domainNames.set(domain.name.toLowerCase(), domain.id);
        }
      }
    }

    // Validate knowledge articles
    for (const article of knowledgeArticles) {
      const articleName = article.title || `Article ${article.number}`;

      // Required: title
      if (!article.title || article.title.trim().length === 0) {
        issues.push({
          resourceType: 'knowledge_article',
          resourceId: article.id,
          resourceName: articleName,
          severity: 'error',
          field: 'title',
          message: 'Article title is required',
        });
      }

      // Required: content (warning if empty)
      if (!article.content || article.content.trim().length === 0) {
        issues.push({
          resourceType: 'knowledge_article',
          resourceId: article.id,
          resourceName: articleName,
          severity: 'warning',
          field: 'content',
          message: 'Article has no content',
        });
      }

      // Required: type
      if (!article.type) {
        issues.push({
          resourceType: 'knowledge_article',
          resourceId: article.id,
          resourceName: articleName,
          severity: 'error',
          field: 'type',
          message: 'Article type is required',
        });
      }

      // Required: status
      if (!article.status) {
        issues.push({
          resourceType: 'knowledge_article',
          resourceId: article.id,
          resourceName: articleName,
          severity: 'error',
          field: 'status',
          message: 'Article status is required',
        });
      }

      // Warning: no authors
      if (!article.authors || article.authors.length === 0) {
        issues.push({
          resourceType: 'knowledge_article',
          resourceId: article.id,
          resourceName: articleName,
          severity: 'warning',
          field: 'authors',
          message: 'Article has no authors listed',
        });
      }
    }

    // Validate decision records
    for (const decision of decisionRecords) {
      const decisionName = decision.title || `Decision ${decision.number}`;

      // Required: title
      if (!decision.title || decision.title.trim().length === 0) {
        issues.push({
          resourceType: 'decision_record',
          resourceId: decision.id,
          resourceName: decisionName,
          severity: 'error',
          field: 'title',
          message: 'Decision title is required',
        });
      }

      // Required: status
      if (!decision.status) {
        issues.push({
          resourceType: 'decision_record',
          resourceId: decision.id,
          resourceName: decisionName,
          severity: 'error',
          field: 'status',
          message: 'Decision status is required',
        });
      }

      // Warning: no context
      if (!decision.context || decision.context.trim().length === 0) {
        issues.push({
          resourceType: 'decision_record',
          resourceId: decision.id,
          resourceName: decisionName,
          severity: 'warning',
          field: 'context',
          message: 'Decision has no context provided',
        });
      }

      // Warning: no decision text
      if (!decision.decision || decision.decision.trim().length === 0) {
        issues.push({
          resourceType: 'decision_record',
          resourceId: decision.id,
          resourceName: decisionName,
          severity: 'warning',
          field: 'decision',
          message: 'Decision has no decision text provided',
        });
      }
    }

    // Check for duplicate table names
    const tableNames = new Map<string, string>();
    for (const table of tables) {
      if (table.name && tableNames.has(table.name.toLowerCase())) {
        issues.push({
          resourceType: 'table',
          resourceId: table.id,
          resourceName: table.name,
          severity: 'error',
          field: 'name',
          message: `Duplicate table name "${table.name}"`,
        });
      } else if (table.name) {
        tableNames.set(table.name.toLowerCase(), table.id);
      }
    }

    // Calculate summary
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;

    return {
      issues,
      hasErrors: errorCount > 0,
      hasWarnings: warningCount > 0,
      errorCount,
      warningCount,
    };
  }
}

// Export singleton instance
export const validationService = new ValidationService();
