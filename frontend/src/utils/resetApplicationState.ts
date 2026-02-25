/**
 * Reset Application State
 *
 * Clears all workspace/content state while preserving connection settings:
 * - GitHub auth token (stored separately by githubAuth service)
 * - GitHub connection info (owner, repo, branch) from githubStore
 * - Local file folder connections
 */

import { useModelStore } from '@/stores/modelStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { useDecisionStore } from '@/stores/decisionStore';
import { useSketchStore } from '@/stores/sketchStore';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { useValidationStore } from '@/stores/validationStore';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { useUIStore } from '@/stores/uiStore';

export async function resetApplicationState(): Promise<void> {
  console.log('[resetApplicationState] Starting application state reset...');

  // 1. Stop auto-save to prevent writing stale data during reset
  useWorkspaceStore.getState().stopAutoSave();

  // 2. Clear model store (tables, relationships, domains, systems, etc.)
  const modelStore = useModelStore.getState();
  modelStore.setTables([]);
  modelStore.setRelationships([]);
  modelStore.setSystems([]);
  modelStore.setProducts([]);
  modelStore.setComputeAssets([]);
  modelStore.setBPMNProcesses([]);
  modelStore.setDMNDecisions([]);
  modelStore.setDomains([]);
  modelStore.setSelectedDomain(null);
  modelStore.setSelectedTable(null);
  modelStore.setSelectedSystem(null);

  // 3. Reset persisted content stores
  useKnowledgeStore.getState().reset();
  useDecisionStore.getState().reset();
  useSketchStore.getState().reset();

  // 4. Reset workspace store (clear workspaces but preserve auto-save settings)
  useWorkspaceStore.getState().setWorkspaces([]);
  useWorkspaceStore.getState().setCurrentWorkspace(null);
  useWorkspaceStore.getState().setPendingChanges(false);

  // 5. Reset github repo store (session state, not connection info)
  useGitHubRepoStore.getState().reset();

  // 6. Clear validation and collaboration state
  useValidationStore.getState().clearAllIssues();
  useCollaborationStore.getState().clearConflicts();

  // 7. Clear IndexedDB data
  try {
    const { offlineQueueService } = await import('@/services/github/offlineQueueService');
    await offlineQueueService.clearAllData();
    console.log('[resetApplicationState] Cleared offline queue IndexedDB data');
  } catch (error) {
    console.warn('[resetApplicationState] Failed to clear offline queue:', error);
  }

  try {
    const { indexedDBStorage } = await import('@/services/storage/indexedDBStorage');
    const workspaces = await indexedDBStorage.listWorkspaces();
    for (const ws of workspaces) {
      await indexedDBStorage.deleteWorkspace(ws.id);
    }
    console.log('[resetApplicationState] Cleared IndexedDB workspace storage');
  } catch (error) {
    console.warn('[resetApplicationState] Failed to clear IndexedDB workspaces:', error);
  }

  // 8. Remove persisted Zustand localStorage keys for content stores
  // NOTE: We do NOT remove 'github-store' (preserves connection info)
  // NOTE: We do NOT remove GitHub auth tokens
  try {
    localStorage.removeItem('knowledge-store');
    localStorage.removeItem('decision-store');
    localStorage.removeItem('sketch-store');
    localStorage.removeItem('workspace-storage');
    console.log('[resetApplicationState] Cleared persisted store data from localStorage');
  } catch (error) {
    console.warn('[resetApplicationState] Failed to clear localStorage:', error);
  }

  // 9. Show success toast
  useUIStore.getState().addToast({
    type: 'success',
    message: 'Application state has been reset. Redirecting to home...',
  });

  console.log('[resetApplicationState] Reset complete');
}
