/**
 * Conflict Resolver Service
 * Handles conflict resolution for sync operations
 */

import { odcsService } from '@/services/sdk/odcsService';
import { useModelStore } from '@/stores/modelStore';
import type { ODCSWorkspace } from '@/services/sdk/odcsService';

export interface Conflict {
  elementType: 'table' | 'relationship' | 'data_flow_diagram';
  elementId: string;
  localVersion: unknown;
  remoteVersion: unknown;
  localTimestamp: string;
  remoteTimestamp: string;
}

export interface MergeStrategy {
  strategy: 'local' | 'remote' | 'merge' | 'manual';
  elementId?: string;
  elementType?: 'table' | 'relationship' | 'data_flow_diagram';
}

class ConflictResolver {
  /**
   * Resolve conflicts using last-change-wins strategy
   */
  async resolveWithLastChangeWins(conflicts: Conflict[]): Promise<void> {
    for (const conflict of conflicts) {
      const localTime = new Date(conflict.localTimestamp).getTime();
      const remoteTime = new Date(conflict.remoteTimestamp).getTime();

      // Last change wins
      if (remoteTime > localTime) {
        await this.applyRemoteVersion(conflict);
      } else {
        // Keep local version
        await this.applyLocalVersion(conflict);
      }
    }
  }

  /**
   * Resolve conflicts using custom merge strategy
   */
  async resolveWithStrategy(conflicts: Conflict[], strategies: MergeStrategy[]): Promise<void> {
    for (const conflict of conflicts) {
      const strategy = strategies.find(
        (s) => s.elementId === conflict.elementId && s.elementType === conflict.elementType
      );

      if (!strategy) {
        // Default to last-change-wins
        await this.resolveWithLastChangeWins([conflict]);
        continue;
      }

      switch (strategy.strategy) {
        case 'local':
          await this.applyLocalVersion(conflict);
          break;
        case 'remote':
          await this.applyRemoteVersion(conflict);
          break;
        case 'merge':
          await this.mergeVersions(conflict);
          break;
        case 'manual':
          // Manual resolution - do nothing, user will handle
          break;
      }
    }
  }

  /**
   * Export conflicts to files for manual resolution
   */
  async exportForManualResolution(
    conflicts: Conflict[],
    workspaceId: string
  ): Promise<{ localFile: string; remoteFile: string }> {
    const modelStore = useModelStore.getState();

    // Create local workspace data
    const localData: ODCSWorkspace = {
      workspace_id: workspaceId,
      tables: modelStore.tables,
      relationships: modelStore.relationships,
      // Legacy data flow diagrams - deprecated, replaced by BPMN processes
      data_flow_diagrams: [],
    };

    // Create remote workspace data (from conflicts)
    const remoteData: ODCSWorkspace = {
      workspace_id: workspaceId,
      tables: [],
      relationships: [],
      data_flow_diagrams: [],
    };

    // Extract remote versions from conflicts
    for (const conflict of conflicts) {
      if (conflict.elementType === 'table') {
        remoteData.tables?.push(conflict.remoteVersion as any);
      } else if (conflict.elementType === 'relationship') {
        remoteData.relationships?.push(conflict.remoteVersion as any);
      } else if (conflict.elementType === 'data_flow_diagram') {
        remoteData.data_flow_diagrams?.push(conflict.remoteVersion as any);
      }
    }

    // Convert to YAML
    const localYAML = await odcsService.toYAML(localData);
    const remoteYAML = await odcsService.toYAML(remoteData);

    // Return file contents (caller will handle file creation)
    return {
      localFile: localYAML,
      remoteFile: remoteYAML,
    };
  }

  /**
   * Apply local version (keep local changes)
   */
  private async applyLocalVersion(_conflict: Conflict): Promise<void> {
    // Local version is already in store, no action needed
  }

  /**
   * Apply remote version (use remote changes)
   */
  private async applyRemoteVersion(conflict: Conflict): Promise<void> {
    const modelStore = useModelStore.getState();

    if (conflict.elementType === 'table') {
      const remoteTable = conflict.remoteVersion as any;
      modelStore.updateTable(conflict.elementId, remoteTable);
    } else if (conflict.elementType === 'relationship') {
      const remoteRelationship = conflict.remoteVersion as any;
      modelStore.updateRelationship(conflict.elementId, remoteRelationship);
    } else if (conflict.elementType === 'data_flow_diagram') {
      // Legacy data flow diagrams - deprecated, replaced by BPMN processes
      // Data flow diagrams are no longer supported in SDK 1.5.0
      console.warn('Data flow diagram conflicts are no longer supported - use BPMN processes instead');
    }
  }

  /**
   * Merge versions (combine local and remote changes)
   */
  private async mergeVersions(conflict: Conflict): Promise<void> {
    // Simple merge: prefer remote for most fields, keep local metadata
    await this.applyRemoteVersion(conflict);
  }
}

export { ConflictResolver };
