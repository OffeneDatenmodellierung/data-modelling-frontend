/**
 * Migration Utilities
 * Detects legacy workspace structures and provides migration guidance
 */

import type { Workspace } from '@/types/workspace';

export interface LegacyWorkspaceStructure {
  hasLegacyModelTypes: boolean;
  hasLegacyDataFlow: boolean;
  legacyDomains: string[];
  legacyDataFlowDiagrams: number;
}

/**
 * Detect legacy workspace structure
 */
export function detectLegacyStructure(workspace: Workspace): LegacyWorkspaceStructure {
  const result: LegacyWorkspaceStructure = {
    hasLegacyModelTypes: false,
    hasLegacyDataFlow: false,
    legacyDomains: [],
    legacyDataFlowDiagrams: 0,
  };

  // Check for legacy model types (conceptual/logical/physical domains)
  if (workspace.domains) {
    workspace.domains.forEach((domain) => {
      const domainName = domain.name.toLowerCase();
      if (
        domainName.includes('conceptual') ||
        domainName.includes('logical') ||
        domainName.includes('physical')
      ) {
        result.hasLegacyModelTypes = true;
        result.legacyDomains.push(domain.name);
      }
    });
  }

  // Check for legacy data flow diagrams
  const workspaceAny = workspace as any;
  if (workspaceAny.data_flow_diagrams && Array.isArray(workspaceAny.data_flow_diagrams)) {
    result.hasLegacyDataFlow = workspaceAny.data_flow_diagrams.length > 0;
    result.legacyDataFlowDiagrams = workspaceAny.data_flow_diagrams.length;
  }

  return result;
}

/**
 * Check if workspace needs migration
 */
export function needsMigration(workspace: Workspace): boolean {
  const structure = detectLegacyStructure(workspace);
  return structure.hasLegacyModelTypes || structure.hasLegacyDataFlow;
}

/**
 * Get migration guidance message
 */
export function getMigrationGuidance(structure: LegacyWorkspaceStructure): string {
  const messages: string[] = [];

  if (structure.hasLegacyModelTypes) {
    messages.push(
      `Found ${structure.legacyDomains.length} legacy domain(s) (${structure.legacyDomains.join(', ')}). ` +
        'These must be manually reorganized into business domains.'
    );
  }

  if (structure.hasLegacyDataFlow) {
    messages.push(
      `Found ${structure.legacyDataFlowDiagrams} legacy data flow diagram(s). ` +
        'These are deprecated and must be manually recreated as BPMN processes.'
    );
  }

  return messages.join('\n\n');
}



