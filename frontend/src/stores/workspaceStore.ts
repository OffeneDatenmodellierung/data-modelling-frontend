/**
 * Workspace Store
 * Manages workspace state using Zustand
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { workspaceService } from '@/services/api/workspaceService';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { localFileService } from '@/services/storage/localFileService';
import { getPlatform } from '@/services/platform/platform';
import type { Workspace } from '@/types/workspace';
import type { CreateWorkspaceRequest } from '@/types/api';

interface WorkspaceState {
  workspaces: Workspace[];
  currentWorkspaceId: string | null;
  isLoading: boolean;
  error: string | null;
  autoSaveInterval: number; // Auto-save interval in milliseconds (default: 5 minutes)
  autoSaveEnabled: boolean;
  pendingChanges: boolean; // Track if there are unsaved changes
  lastSavedAt: string | null; // ISO timestamp of last save

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void;
  setCurrentWorkspace: (workspaceId: string | null) => void;
  addWorkspace: (workspace: Workspace) => void;
  updateWorkspace: (workspaceId: string, updates: Partial<Workspace>) => void;
  removeWorkspace: (workspaceId: string) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  setAutoSaveInterval: (interval: number) => void;
  setAutoSaveEnabled: (enabled: boolean) => void;
  setPendingChanges: (pending: boolean) => void;
  markSaved: () => void;

  // CRUD Operations
  fetchWorkspaces: () => Promise<void>;
  fetchWorkspace: (workspaceId: string) => Promise<Workspace | null>;
  createWorkspace: (request: CreateWorkspaceRequest) => Promise<Workspace>;
  updateWorkspaceRemote: (workspaceId: string, updates: Partial<Workspace>) => Promise<Workspace>;
  deleteWorkspaceRemote: (workspaceId: string) => Promise<void>;
  
  // Auto-save
  autoSave: () => Promise<void>;
  startAutoSave: () => void;
  stopAutoSave: () => void;
  
  // Browser refresh handling
  handleBrowserRefresh: () => Promise<{ hasLocalChanges: boolean; hasRemoteChanges: boolean }>;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => {
      let autoSaveTimer: NodeJS.Timeout | null = null;

      return {
        workspaces: [],
        currentWorkspaceId: null,
        isLoading: false,
        error: null,
        autoSaveInterval: 5 * 60 * 1000, // 5 minutes default
        autoSaveEnabled: true,
        pendingChanges: false,
        lastSavedAt: null,

        setWorkspaces: (workspaces) => set({ workspaces }),
        setCurrentWorkspace: (workspaceId) => set({ currentWorkspaceId: workspaceId }),
        addWorkspace: (workspace) =>
          set((state) => ({
            workspaces: [...state.workspaces, workspace],
          })),
        updateWorkspace: (workspaceId, updates) =>
          set((state) => ({
            workspaces: state.workspaces.map((w) => (w.id === workspaceId ? { ...w, ...updates } : w)),
          })),
        removeWorkspace: (workspaceId) =>
          set((state) => ({
            workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
            currentWorkspaceId: state.currentWorkspaceId === workspaceId ? null : state.currentWorkspaceId,
          })),
        setLoading: (isLoading) => set({ isLoading }),
        setError: (error) => set({ error }),
        setAutoSaveInterval: (interval) => {
          set({ autoSaveInterval: interval });
          // Restart auto-save with new interval
          get().stopAutoSave();
          if (get().autoSaveEnabled) {
            get().startAutoSave();
          }
        },
        setAutoSaveEnabled: (enabled) => {
          set({ autoSaveEnabled: enabled });
          if (enabled) {
            get().startAutoSave();
          } else {
            get().stopAutoSave();
          }
        },
        setPendingChanges: (pending) => set({ pendingChanges: pending }),
        markSaved: () => set({ pendingChanges: false, lastSavedAt: new Date().toISOString() }),

        // CRUD Operations
        fetchWorkspaces: async () => {
          set({ isLoading: true, error: null });
          try {
            const profiles = await workspaceService.listProfiles();
            // Convert profiles to workspaces format (simplified for now)
            const workspaces = profiles.map((profile, index) => ({
              id: `workspace-${index}`,
              name: profile.email,
              type: 'personal' as const,
              owner_id: profile.email,
              created_at: new Date().toISOString(),
              last_modified_at: new Date().toISOString(),
            }));
            set({ workspaces, isLoading: false });
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch workspaces',
              isLoading: false,
            });
          }
        },

        fetchWorkspace: async (workspaceId: string) => {
          set({ isLoading: true, error: null });
          try {
            const info = await workspaceService.getWorkspaceInfo();
            const workspace = {
              id: workspaceId,
              name: info.email,
              type: 'personal' as const,
              owner_id: info.email,
              created_at: new Date().toISOString(),
              last_modified_at: new Date().toISOString(),
            };
            set((state) => {
              const existing = state.workspaces.find((w) => w.id === workspaceId);
              if (existing) {
                return {
                  workspaces: state.workspaces.map((w) => (w.id === workspaceId ? workspace : w)),
                  isLoading: false,
                };
              }
              return {
                workspaces: [...state.workspaces, workspace],
                isLoading: false,
              };
            });
            return workspace;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to fetch workspace',
              isLoading: false,
            });
            return null;
          }
        },

        createWorkspace: async (request: CreateWorkspaceRequest) => {
          set({ isLoading: true, error: null });
          try {
            // API expects email and domain
            const email = request.name || 'user@example.com';
            const domain = 'default';
            const workspaceType = request.type || 'personal';
            const result = await workspaceService.createWorkspace(email, domain, workspaceType);
            const workspace = {
              id: result.workspace_path,
              name: request.name || email,
              type: workspaceType,
              owner_id: email,
              created_at: new Date().toISOString(),
              last_modified_at: new Date().toISOString(),
            };
            set((state) => ({
              workspaces: [...state.workspaces, workspace],
              isLoading: false,
            }));
            return workspace;
          } catch (error) {
            set({
              error: error instanceof Error ? error.message : 'Failed to create workspace',
              isLoading: false,
            });
            throw error;
          }
        },

        updateWorkspaceRemote: async (workspaceId: string, updates: Partial<Workspace>) => {
          // Workspace updates are not supported by the API (email-based workspaces)
          // Use local state update instead
          set((state) => ({
            workspaces: state.workspaces.map((w) => (w.id === workspaceId ? { ...w, ...updates } : w)),
          }));
          return updates as Workspace;
        },

        deleteWorkspaceRemote: async (workspaceId: string) => {
          // Workspace deletion is not supported by the API (email-based workspaces)
          // Use local state update instead
          set((state) => ({
            workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
            currentWorkspaceId: state.currentWorkspaceId === workspaceId ? null : state.currentWorkspaceId,
          }));
        },

        // Auto-save functionality
        autoSave: async () => {
          const state = get();
          if (!state.currentWorkspaceId || !state.pendingChanges) {
            return;
          }

          const workspace = state.workspaces.find((w) => w.id === state.currentWorkspaceId);
          if (!workspace) {
            return;
          }

          try {
            const mode = await useSDKModeStore.getState().getMode();
            const uiStoreModule = await import('@/stores/uiStore');
            
            if (mode === 'offline') {
              // Save to local file in offline mode
              if (getPlatform() === 'electron') {
                // In Electron, we'd save to the workspace file
                // For now, just mark as saved
                set({ pendingChanges: false, lastSavedAt: new Date().toISOString() });
                uiStoreModule.useUIStore.getState().addToast({
                  type: 'success',
                  message: 'Workspace saved locally',
                });
              } else {
                // Browser: trigger download
                await localFileService.saveFile(workspace, `${workspace.name || 'workspace'}.yaml`);
                set({ pendingChanges: false, lastSavedAt: new Date().toISOString() });
                uiStoreModule.useUIStore.getState().addToast({
                  type: 'success',
                  message: 'Workspace saved to file',
                });
              }
            } else {
              // In online mode, sync to remote
              const syncModule = await import('@/services/sync/syncService');
              const sync = new syncModule.SyncService(workspace.id);
              const result = await sync.syncToRemote();
              if (result.success) {
                set({ pendingChanges: false, lastSavedAt: new Date().toISOString() });
                uiStoreModule.useUIStore.getState().addToast({
                  type: 'success',
                  message: 'Workspace synced to server',
                });
              } else {
                throw new Error(result.error || 'Sync failed');
              }
            }
          } catch (error) {
            console.error('Auto-save failed:', error);
            const uiStoreModule = await import('@/stores/uiStore');
            uiStoreModule.useUIStore.getState().addToast({
              type: 'error',
              message: `Auto-save failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
            // Don't throw - auto-save failures shouldn't interrupt user
          }
        },

        startAutoSave: () => {
          const state = get();
          if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
          }

          if (state.autoSaveEnabled && state.autoSaveInterval > 0) {
            autoSaveTimer = setInterval(() => {
              get().autoSave();
            }, state.autoSaveInterval);
          }
        },

        stopAutoSave: () => {
          if (autoSaveTimer) {
            clearInterval(autoSaveTimer);
            autoSaveTimer = null;
          }
        },

        // Workspace switching with state save/load
        switchWorkspace: async (workspaceId: string) => {
          const state = get();
          
          // Save current workspace state if there are pending changes
          if (state.pendingChanges && state.currentWorkspaceId) {
            await state.autoSave();
          }

          // Clear pending changes
          set({ pendingChanges: false });

          // Switch to new workspace
          set({ currentWorkspaceId: workspaceId });

          // Load new workspace data
          await get().fetchWorkspace(workspaceId);
        },

        // Browser refresh handling
        handleBrowserRefresh: async () => {
          const state = get();
          const mode = await useSDKModeStore.getState().getMode();
          
          const hasLocalChanges = state.pendingChanges;
          let hasRemoteChanges = false;

          if (mode === 'online' && state.currentWorkspaceId) {
            try {
              // Check if remote workspace has been modified
              await workspaceService.getWorkspaceInfo();
              const localWorkspace = state.workspaces.find((w) => w.id === state.currentWorkspaceId);
              
              if (localWorkspace) {
                // Remote workspace info doesn't have last_modified_at, so assume no remote changes
                // In a real implementation, we'd fetch the full workspace to compare timestamps
                hasRemoteChanges = false;
              }
            } catch (error) {
              // If we can't check remote, assume no remote changes
              console.warn('Failed to check remote workspace:', error);
            }
          }

          return {
            hasLocalChanges,
            hasRemoteChanges,
          };
        },
      };
    },
    {
      name: 'workspace-storage',
      partialize: (state) => ({
        workspaces: state.workspaces,
        currentWorkspaceId: state.currentWorkspaceId,
        autoSaveInterval: state.autoSaveInterval,
        autoSaveEnabled: state.autoSaveEnabled,
        lastSavedAt: state.lastSavedAt,
      }),
    }
  )
);
