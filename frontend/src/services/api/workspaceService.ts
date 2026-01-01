/**
 * Workspace Service
 * Handles API interactions for workspace CRUD operations
 */

import { apiClient } from './apiClient';

class WorkspaceService {
  /**
   * Get current workspace information
   */
  async getWorkspaceInfo(): Promise<{ workspace_path: string; email: string }> {
    const response = await apiClient.getClient().get<{ workspace_path: string; email: string }>(
      '/workspace/info'
    );
    return response.data;
  }

  /**
   * List all user profiles (workspaces)
   */
  async listProfiles(): Promise<Array<{ email: string; domains: string[] }>> {
    const response = await apiClient.getClient().get<{ profiles: Array<{ email: string; domains: string[] }> }>(
      '/workspace/profiles'
    );
    return response.data.profiles;
  }

  /**
   * Create a new workspace (email-based)
   */
  async createWorkspace(
    email: string,
    domain: string,
    type: 'personal' | 'shared' = 'personal'
  ): Promise<{ workspace_path: string; message: string }> {
    const response = await apiClient.getClient().post<{ workspace_path: string; message: string }>(
      '/workspace/create',
      { email, domain, type }
    );
    return response.data;
  }

  /**
   * Update workspace (rename)
   */
  async updateWorkspace(
    workspaceId: string,
    updates: { name?: string }
  ): Promise<{ workspace_path: string; email: string }> {
    const response = await apiClient.getClient().put<{ workspace_path: string; email: string }>(
      `/api/v1/workspaces/${workspaceId}`,
      updates
    );
    return response.data;
  }

  /**
   * Delete workspace
   */
  async deleteWorkspace(workspaceId: string): Promise<void> {
    await apiClient.getClient().delete(`/api/v1/workspaces/${workspaceId}`);
  }

  /**
   * Convert personal workspace to shared
   */
  async convertToShared(workspaceId: string): Promise<{ workspace_path: string; email: string; type: string }> {
    const response = await apiClient.getClient().post<{ workspace_path: string; email: string; type: string }>(
      `/api/v1/workspaces/${workspaceId}/convert-to-shared`
    );
    return response.data;
  }

  /**
   * Convert shared workspace to personal
   */
  async convertToPersonal(workspaceId: string): Promise<{ workspace_path: string; email: string; type: string }> {
    const response = await apiClient.getClient().post<{ workspace_path: string; email: string; type: string }>(
      `/api/v1/workspaces/${workspaceId}/convert-to-personal`
    );
    return response.data;
  }

  /**
   * Add collaborator to shared workspace
   */
  async addCollaborator(
    workspaceId: string,
    email: string,
    accessLevel: 'read' | 'edit'
  ): Promise<void> {
    await apiClient.getClient().post(`/api/v1/workspaces/${workspaceId}/collaborators`, {
      email,
      access_level: accessLevel,
    });
  }

  /**
   * Remove collaborator from shared workspace
   */
  async removeCollaborator(workspaceId: string, email: string): Promise<void> {
    await apiClient.getClient().delete(`/api/v1/workspaces/${workspaceId}/collaborators/${email}`);
  }

  /**
   * Update collaborator access level
   */
  async updateCollaboratorAccess(
    workspaceId: string,
    email: string,
    accessLevel: 'read' | 'edit'
  ): Promise<void> {
    await apiClient.getClient().put(`/api/v1/workspaces/${workspaceId}/collaborators/${email}`, {
      access_level: accessLevel,
    });
  }

  /**
   * Get workspace collaborators
   */
  async getCollaborators(workspaceId: string): Promise<Array<{ email: string; access_level: 'read' | 'edit' }>> {
    const response = await apiClient.getClient().get<{
      collaborators: Array<{ email: string; access_level: 'read' | 'edit' }>;
    }>(`/api/v1/workspaces/${workspaceId}/collaborators`);
    return response.data.collaborators;
  }

  /**
   * List all domains in the workspace
   */
  async listDomains(): Promise<string[]> {
    const response = await apiClient.getClient().get<{ domains: string[] }>('/workspace/domains');
    return response.data.domains;
  }

  /**
   * Create a new domain
   */
  async createDomain(domain: string): Promise<{ domain: string; workspace_path: string; message: string }> {
    const response = await apiClient.getClient().post<{ domain: string; workspace_path: string; message: string }>(
      '/workspace/domains',
      { domain }
    );
    return response.data;
  }

  /**
   * Get domain information
   */
  async getDomain(domain: string): Promise<{ domain: string; workspace_path: string; message: string }> {
    const response = await apiClient.getClient().get<{ domain: string; workspace_path: string; message: string }>(
      `/workspace/domains/${domain}`
    );
    return response.data;
  }

  /**
   * Load a domain into the model service
   */
  async loadDomain(domain: string): Promise<{ domain: string; workspace_path: string; message: string }> {
    const response = await apiClient.getClient().post<{ domain: string; workspace_path: string; message: string }>(
      '/workspace/load-domain',
      { domain }
    );
    return response.data;
  }
}

// Export singleton instance
export const workspaceService = new WorkspaceService();

