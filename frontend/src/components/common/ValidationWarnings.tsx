/**
 * Validation Warnings Component
 *
 * Displays validation issues from imports and provides a way to view/dismiss them.
 * Shows as a small indicator that expands to show full details.
 */

import React, { useState, useMemo, useCallback } from 'react';
import { useShallow } from 'zustand/shallow';
import {
  useValidationStore,
  type ValidationIssue,
  type ResourceType,
  type ValidationState,
} from '@/stores/validationStore';

interface ValidationWarningsProps {
  className?: string;
}

const resourceTypeLabels: Record<ResourceType, string> = {
  table: 'Table',
  relationship: 'Relationship',
  system: 'System',
  product: 'Product',
  compute_asset: 'Compute Asset',
  knowledge_article: 'Knowledge Article',
  decision_record: 'Decision Record',
  bpmn_process: 'BPMN Process',
  dmn_decision: 'DMN Decision',
  domain: 'Domain',
  workspace: 'Workspace',
};

export const ValidationWarnings: React.FC<ValidationWarningsProps> = ({ className = '' }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Use useShallow for shallow comparison to prevent unnecessary re-renders
  const { issues, clearAllIssues, removeIssue } = useValidationStore(
    useShallow((state: ValidationState) => ({
      issues: state.issues,
      clearAllIssues: state.clearAllIssues,
      removeIssue: state.removeIssue,
    }))
  );

  // Compute derived values with useMemo to avoid recalculating on every render
  const activeIssues = useMemo(() => issues.filter((i: ValidationIssue) => i.isActive), [issues]);

  const errorCount = useMemo(
    () => activeIssues.filter((i: ValidationIssue) => i.severity === 'error').length,
    [activeIssues]
  );

  const warningCount = useMemo(
    () => activeIssues.filter((i: ValidationIssue) => i.severity === 'warning').length,
    [activeIssues]
  );

  const totalCount = errorCount + warningCount;

  // Group issues by resource type - memoized
  const groupedIssues = useMemo(() => {
    return activeIssues.reduce(
      (acc: Record<ResourceType, ValidationIssue[]>, issue: ValidationIssue) => {
        const key = issue.resourceType;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push(issue);
        return acc;
      },
      {} as Record<ResourceType, ValidationIssue[]>
    );
  }, [activeIssues]);

  // Stable callback references
  const handleToggleExpanded = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  const handleClose = useCallback(() => {
    setIsExpanded(false);
  }, []);

  const handleRemoveIssue = useCallback(
    (id: string) => {
      removeIssue(id);
    },
    [removeIssue]
  );

  if (totalCount === 0) {
    return null;
  }

  return (
    <div className={`relative ${className}`}>
      {/* Indicator button */}
      <button
        onClick={handleToggleExpanded}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
          errorCount > 0
            ? 'bg-red-100 text-red-700 hover:bg-red-200'
            : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
        }`}
        title={`${errorCount} error(s), ${warningCount} warning(s) - Click to view details`}
      >
        {errorCount > 0 ? (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        )}
        <span>
          {totalCount} Issue{totalCount !== 1 ? 's' : ''}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded panel */}
      {isExpanded && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-96 overflow-auto bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Validation Issues</h3>
            <div className="flex items-center gap-2">
              <button
                onClick={clearAllIssues}
                className="text-xs text-gray-500 hover:text-gray-700"
              >
                Clear All
              </button>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Issues list */}
          <div className="divide-y divide-gray-100">
            {Object.entries(groupedIssues).map(([type, typeIssues]) => (
              <div key={type} className="px-4 py-3">
                <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">
                  {resourceTypeLabels[type as ResourceType]} ({typeIssues.length})
                </h4>
                <ul className="space-y-2">
                  {typeIssues.map((issue: ValidationIssue) => (
                    <li
                      key={issue.id}
                      className={`text-sm rounded-md p-2 ${
                        issue.severity === 'error'
                          ? 'bg-red-50 text-red-800'
                          : issue.severity === 'warning'
                            ? 'bg-yellow-50 text-yellow-800'
                            : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{issue.resourceName}</p>
                          <p className="text-xs mt-0.5">{issue.message}</p>
                          {issue.field && (
                            <p className="text-xs mt-0.5 opacity-75">Field: {issue.field}</p>
                          )}
                          {issue.filePath && (
                            <p className="text-xs mt-0.5 opacity-75 truncate">
                              File: {issue.filePath}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveIssue(issue.id)}
                          className="flex-shrink-0 opacity-50 hover:opacity-100"
                          title="Dismiss"
                        >
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Footer with help text */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-4 py-2">
            <p className="text-xs text-gray-500">
              These issues were detected during import. Resources were loaded with default values
              where possible. Fix these issues and save to validate again.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ValidationWarnings;
