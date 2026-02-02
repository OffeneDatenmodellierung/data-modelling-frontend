/**
 * Workspace Validation Utility
 * Provides a helper function to run comprehensive validation on all workspace resources
 * and update the validation store with results.
 */

import { validationService } from '@/services/sdk/validationService';
import { useValidationStore } from '@/stores/validationStore';
import { useModelStore } from '@/stores/modelStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useDecisionStore } from '@/stores/decisionStore';

export interface ValidationSummary {
  hasErrors: boolean;
  hasWarnings: boolean;
  errorCount: number;
  warningCount: number;
}

/**
 * Run comprehensive validation on all workspace resources and update the validation store.
 * This function can be called before save operations or manually triggered by the user.
 *
 * @returns A summary of validation results
 */
export async function runWorkspaceValidation(): Promise<ValidationSummary> {
  const validationStore = useValidationStore.getState();
  const modelStore = useModelStore.getState();
  const knowledgeStore = useKnowledgeStore.getState();
  const decisionStore = useDecisionStore.getState();

  // Set validating state
  validationStore.setValidating(true);

  try {
    // Get all resources from stores
    const { tables, relationships, domains } = modelStore;
    const { articles } = knowledgeStore;
    const { decisions } = decisionStore;

    // Run comprehensive validation
    const result = await validationService.validateAll(
      tables,
      relationships,
      domains,
      articles,
      decisions
    );

    // Clear existing issues and add new ones
    validationStore.clearAllIssues();
    if (result.issues.length > 0) {
      validationStore.addIssues(result.issues);
    }

    // Update last validated timestamp
    useValidationStore.setState({ lastValidatedAt: new Date().toISOString() });

    return {
      hasErrors: result.hasErrors,
      hasWarnings: result.hasWarnings,
      errorCount: result.errorCount,
      warningCount: result.warningCount,
    };
  } finally {
    validationStore.setValidating(false);
  }
}

/**
 * Check if there are any active validation errors without running a new validation.
 * Useful for quick checks before operations.
 *
 * @returns Current validation state from the store
 */
export function getValidationState(): ValidationSummary {
  const validationStore = useValidationStore.getState();
  return {
    hasErrors: validationStore.hasErrors(),
    hasWarnings: validationStore.hasWarnings(),
    errorCount: validationStore.getErrorCount(),
    warningCount: validationStore.getWarningCount(),
  };
}
