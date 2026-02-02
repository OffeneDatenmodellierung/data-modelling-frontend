/**
 * Validation Store
 *
 * Tracks validation warnings and errors for imported resources.
 * Allows import to succeed even with validation issues, while surfacing
 * problems to the user for later correction.
 */

import { create } from 'zustand';

// ============================================================================
// Types
// ============================================================================

export type ValidationSeverity = 'error' | 'warning' | 'info';

export type ResourceType =
  | 'table'
  | 'relationship'
  | 'system'
  | 'product'
  | 'compute_asset'
  | 'knowledge_article'
  | 'decision_record'
  | 'bpmn_process'
  | 'dmn_decision'
  | 'domain'
  | 'workspace';

export interface ValidationIssue {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  filePath?: string;
  severity: ValidationSeverity;
  field?: string;
  message: string;
  details?: string;
  createdAt: string;
  /** If true, this issue was detected during the most recent validation */
  isActive: boolean;
}

export interface ValidationState {
  /** All validation issues */
  issues: ValidationIssue[];

  /** Whether validation is currently running */
  isValidating: boolean;

  /** Last validation timestamp */
  lastValidatedAt: string | null;

  // Actions
  addIssue: (issue: Omit<ValidationIssue, 'id' | 'createdAt' | 'isActive'>) => void;
  addIssues: (issues: Array<Omit<ValidationIssue, 'id' | 'createdAt' | 'isActive'>>) => void;
  removeIssue: (id: string) => void;
  clearIssuesForResource: (resourceType: ResourceType, resourceId: string) => void;
  clearAllIssues: () => void;
  markAllInactive: () => void;
  removeInactiveIssues: () => void;
  setValidating: (isValidating: boolean) => void;

  // Selectors
  getIssuesForResource: (resourceType: ResourceType, resourceId: string) => ValidationIssue[];
  getIssuesByType: (resourceType: ResourceType) => ValidationIssue[];
  getErrorCount: () => number;
  getWarningCount: () => number;
  hasErrors: () => boolean;
  hasWarnings: () => boolean;
}

// ============================================================================
// Store Implementation
// ============================================================================

export const useValidationStore = create<ValidationState>((set, get) => ({
  issues: [],
  isValidating: false,
  lastValidatedAt: null,

  addIssue: (issue) => {
    const newIssue: ValidationIssue = {
      ...issue,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isActive: true,
    };
    set((state) => ({
      issues: [...state.issues, newIssue],
    }));
  },

  addIssues: (issues) => {
    const newIssues: ValidationIssue[] = issues.map((issue) => ({
      ...issue,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      isActive: true,
    }));
    set((state) => ({
      issues: [...state.issues, ...newIssues],
    }));
  },

  removeIssue: (id) => {
    set((state) => ({
      issues: state.issues.filter((i) => i.id !== id),
    }));
  },

  clearIssuesForResource: (resourceType, resourceId) => {
    set((state) => ({
      issues: state.issues.filter(
        (i) => !(i.resourceType === resourceType && i.resourceId === resourceId)
      ),
    }));
  },

  clearAllIssues: () => {
    set({ issues: [], lastValidatedAt: null });
  },

  markAllInactive: () => {
    set((state) => ({
      issues: state.issues.map((i) => ({ ...i, isActive: false })),
    }));
  },

  removeInactiveIssues: () => {
    set((state) => ({
      issues: state.issues.filter((i) => i.isActive),
      lastValidatedAt: new Date().toISOString(),
    }));
  },

  setValidating: (isValidating) => {
    set({ isValidating });
  },

  getIssuesForResource: (resourceType, resourceId) => {
    return get().issues.filter(
      (i) => i.resourceType === resourceType && i.resourceId === resourceId
    );
  },

  getIssuesByType: (resourceType) => {
    return get().issues.filter((i) => i.resourceType === resourceType);
  },

  getErrorCount: () => {
    return get().issues.filter((i) => i.severity === 'error' && i.isActive).length;
  },

  getWarningCount: () => {
    return get().issues.filter((i) => i.severity === 'warning' && i.isActive).length;
  },

  hasErrors: () => {
    return get().issues.some((i) => i.severity === 'error' && i.isActive);
  },

  hasWarnings: () => {
    return get().issues.some((i) => i.severity === 'warning' && i.isActive);
  },
}));

// ============================================================================
// Selectors
// ============================================================================

export const selectValidationIssues = (state: ValidationState) => state.issues;
export const selectActiveIssues = (state: ValidationState) =>
  state.issues.filter((i) => i.isActive);
export const selectErrorCount = (state: ValidationState) =>
  state.issues.filter((i) => i.severity === 'error' && i.isActive).length;
export const selectWarningCount = (state: ValidationState) =>
  state.issues.filter((i) => i.severity === 'warning' && i.isActive).length;
export const selectHasIssues = (state: ValidationState) =>
  state.issues.some((i) => i.isActive);
export const selectIsValidating = (state: ValidationState) => state.isValidating;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Parse validation error from SDK response and create ValidationIssue objects
 */
export function parseValidationError(
  error: unknown,
  resourceType: ResourceType,
  resourceId: string,
  resourceName: string,
  filePath?: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!error) return issues;

  // Handle SDK validation error format
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;

    // SDK error format: { error_type, message, code }
    if (err.message && typeof err.message === 'string') {
      const message = err.message;

      // Parse "Validation error: ... at path 'root': \"field\" is a required property"
      const requiredMatch = message.match(/\"(\w+)\" is a required property/);
      if (requiredMatch) {
        issues.push({
          id: crypto.randomUUID(),
          resourceType,
          resourceId,
          resourceName,
          filePath,
          severity: 'error',
          field: requiredMatch[1],
          message: `Required field "${requiredMatch[1]}" is missing`,
          details: message,
          createdAt: new Date().toISOString(),
          isActive: true,
        });
        return issues;
      }

      // Generic validation error
      issues.push({
        id: crypto.randomUUID(),
        resourceType,
        resourceId,
        resourceName,
        filePath,
        severity: 'error',
        message: message,
        createdAt: new Date().toISOString(),
        isActive: true,
      });
      return issues;
    }

    // Handle error.error (nested error message)
    if (err.error && typeof err.error === 'string') {
      issues.push({
        id: crypto.randomUUID(),
        resourceType,
        resourceId,
        resourceName,
        filePath,
        severity: 'error',
        message: err.error,
        createdAt: new Date().toISOString(),
        isActive: true,
      });
      return issues;
    }
  }

  // Handle Error objects
  if (error instanceof Error) {
    issues.push({
      id: crypto.randomUUID(),
      resourceType,
      resourceId,
      resourceName,
      filePath,
      severity: 'error',
      message: error.message,
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    return issues;
  }

  // Handle string errors
  if (typeof error === 'string') {
    issues.push({
      id: crypto.randomUUID(),
      resourceType,
      resourceId,
      resourceName,
      filePath,
      severity: 'error',
      message: error,
      createdAt: new Date().toISOString(),
      isActive: true,
    });
    return issues;
  }

  return issues;
}
