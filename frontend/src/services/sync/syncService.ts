/**
 * Sync Service
 * Handles synchronization between local and remote workspaces
 */

import { useModelStore } from '@/stores/modelStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { odcsService } from '@/services/sdk/odcsService';
import { apiClient } from '@/services/api/apiClient';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import type { Workspace } from '@/types/workspace';
import type { ODCSWorkspace } from '@/services/sdk/odcsService';

export interface SyncResult {
  success: boolean;
  conflicts?: Array<{
    elementType: 'table' | 'relationship' | 'data_flow_diagram';
    elementId: string;
    localVersion: unknown;
    remoteVersion: unknown;
  }>;
  error?: string;
}

class SyncService {
  private workspaceId: string;

  constructor(workspaceId: string) {
    this.workspaceId = workspaceId;
  }

  /**
   * Sync workspace to remote (push local changes)
   */
  async syncToRemote(): Promise<SyncResult> {
    const mode = await useSDKModeStore.getState().getMode();
    if (mode === 'offline') {
      throw new Error('Cannot sync to remote in offline mode');
    }

    const accessToken = apiClient.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available for sync');
    }

    try {
      const workspaceStore = useWorkspaceStore.getState();
      const currentWorkspace = workspaceStore.workspaces.find((w) => w.id === this.workspaceId);
      
      if (!currentWorkspace) {
        throw new Error(`Workspace ${this.workspaceId} not found`);
      }

      // Get current model state
      const modelStore = useModelStore.getState();
      const workspaceData: ODCSWorkspace = {
        workspace_id: this.workspaceId,
        tables: modelStore.tables,
        relationships: modelStore.relationships,
        data_flow_diagrams: modelStore.dataFlowDiagrams,
      };

      // Convert to ODCS YAML
      const yamlContent = await odcsService.toYAML(workspaceData);

      // Upload to API
      const client = apiClient.getClient();
      await client.put(`/api/v1/workspaces/${this.workspaceId}/sync`, {
        odcs_content: yamlContent,
        last_modified_at: currentWorkspace.last_modified_at,
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Sync workspace from remote (pull remote changes)
   */
  async syncFromRemote(): Promise<SyncResult> {
    const mode = await useSDKModeStore.getState().getMode();
    if (mode === 'offline') {
      throw new Error('Cannot sync from remote in offline mode');
    }

    const accessToken = apiClient.getAccessToken();
    if (!accessToken) {
      throw new Error('No access token available for sync');
    }

    try {
      // Download from API
      const client = apiClient.getClient();
      const response = await client.get<string>(`/api/v1/workspaces/${this.workspaceId}/export`, {
        params: { format: 'odcl' },
      });

      // Parse ODCS YAML
      const workspaceData = await odcsService.parseYAML(response.data);

      // Update local stores
      const modelStore = useModelStore.getState();
      if (workspaceData.tables) {
        modelStore.setTables(workspaceData.tables);
      }
      if (workspaceData.relationships) {
        modelStore.setRelationships(workspaceData.relationships);
      }
      if (workspaceData.data_flow_diagrams) {
        modelStore.setDataFlowDiagrams(workspaceData.data_flow_diagrams);
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Sync failed',
      };
    }
  }

  /**
   * Automatically merge when connection is restored
   */
  async autoMergeOnConnectionRestored(): Promise<SyncResult> {
    try {
      // Check for conflicts first
      const localWorkspace = useWorkspaceStore.getState().workspaces.find(
        (w) => w.id === this.workspaceId
      );

      if (!localWorkspace) {
        // No local workspace, just sync from remote
        return await this.syncFromRemote();
      }

      // Try to sync from remote
      const syncResult = await this.syncFromRemote();

      if (!syncResult.success) {
        return syncResult;
      }

      // Check for conflicts
      const remoteWorkspace = useWorkspaceStore.getState().workspaces.find(
        (w) => w.id === this.workspaceId
      );

      if (remoteWorkspace && (await this.detectConflict(remoteWorkspace))) {
        // Conflicts detected - return them for manual resolution
        return {
          success: false,
          conflicts: [], // Will be populated by conflict resolver
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Auto-merge failed',
      };
    }
  }

  /**
   * Detect conflicts between local and remote workspaces
   */
  async detectConflict(remoteWorkspace: Workspace): Promise<boolean> {
    const localWorkspace = useWorkspaceStore.getState().workspaces.find(
      (w) => w.id === this.workspaceId
    );

    if (!localWorkspace) {
      return false; // No local workspace, no conflict
    }

    // Compare last modified timestamps
    const localTime = new Date(localWorkspace.last_modified_at).getTime();
    const remoteTime = new Date(remoteWorkspace.last_modified_at).getTime();

    // If remote is newer and local has unsaved changes, there's a conflict
    if (remoteTime > localTime) {
      // Check if local has unsaved changes (simplified check)
      // In a real implementation, we'd track pending changes
      return true;
    }

    return false;
  }
}

export { SyncService };

