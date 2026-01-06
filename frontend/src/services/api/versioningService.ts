/**
 * Versioning Service
 * Handles workspace versioning via PostgreSQL API
 */

import { apiClient } from './apiClient';

export interface Version {
  version_id: string;
  created_at: string;
  created_by: string;
  description: string;
  workspace_data?: unknown;
}

class VersioningService {
  /**
   * Get version history for a workspace
   */
  async getVersionHistory(workspaceId: string): Promise<Version[]> {
    const response = await apiClient.getClient().get<{ versions: Version[] }>(
      `/api/v1/workspaces/${workspaceId}/versions`
    );
    return response.data.versions;
  }

  /**
   * Create a new version
   */
  async createVersion(workspaceId: string, description: string): Promise<Version> {
    const response = await apiClient.getClient().post<{ version: Version }>(
      `/api/v1/workspaces/${workspaceId}/versions`,
      { description }
    );
    return response.data.version;
  }

  /**
   * Get a specific version
   */
  async getVersion(workspaceId: string, versionId: string): Promise<Version> {
    const response = await apiClient.getClient().get<{ version: Version }>(
      `/api/v1/workspaces/${workspaceId}/versions/${versionId}`
    );
    return response.data.version;
  }

  /**
   * Restore workspace to a specific version
   */
  async restoreVersion(workspaceId: string, versionId: string): Promise<void> {
    await apiClient.getClient().post(`/api/v1/workspaces/${workspaceId}/versions/${versionId}/restore`);
  }
}

// Export singleton instance
export const versioningService = new VersioningService();



