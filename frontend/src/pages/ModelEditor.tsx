/**
 * Model Editor Page
 * Main page for editing data models with infinite canvas
 */

import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DomainCanvas } from '@/components/canvas/DomainCanvas';
import { DomainSelector } from '@/components/domain/DomainSelector';
import { ViewModeSelector } from '@/components/domain/ViewModeSelector';
import { BPMNProcessLinks } from '@/components/domain/BPMNProcessLinks';
import { SaveExitControls } from '@/components/domain/SaveExitControls';
// import { EditorModal } from '@/components/editors/EditorModal';
// import { bpmnService } from '@/services/sdk/bpmnService';
import { TableEditor } from '@/components/table/TableEditor';
import { TableProperties } from '@/components/table/TableProperties';
import { CreateTableDialog } from '@/components/table/CreateTableDialog';
import { CreateSystemDialog } from '@/components/system/CreateSystemDialog';
import { DraggableModal } from '@/components/common/DraggableModal';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useModelStore } from '@/stores/modelStore';
import { workspaceService } from '@/services/api/workspaceService';
import { Loading } from '@/components/common/Loading';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { useUIStore } from '@/stores/uiStore';
import { useCollaboration } from '@/hooks/useCollaboration';
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator';
import { CollaborationStatus } from '@/components/collaboration/CollaborationStatus';
import { ConflictResolver } from '@/components/collaboration/ConflictResolver';
import { useCollaborationStore } from '@/stores/collaborationStore';
import { WorkspaceSettings } from '@/components/workspace/WorkspaceSettings';
import { VersionHistory } from '@/components/workspace/VersionHistory';
import { ImportExportDialog } from '@/components/common/ImportExportDialog';
import { getAssetPath } from '@/services/platform/platform';
import { TagFilter } from '@/components/common/TagFilter';
import { filterService } from '@/services/sdk/filterService';
import { SharedResourcePicker } from '@/components/domain/SharedResourcePicker';
import { DecisionPanel } from '@/components/decision/DecisionPanel';
import { KnowledgePanel } from '@/components/knowledge/KnowledgePanel';
import { SketchPanel } from '@/components/sketch/SketchPanel';
import { GitPanel, GitStatusIndicator } from '@/components/git';
import { gitService } from '@/services/git/gitService';
import { GitHubUserMenu, GitHubAuthDialog, GitHubRepoSelector } from '@/components/github';

import { useGitHubStore } from '@/stores/githubStore';
import { useGitHubRepoStore } from '@/stores/githubRepoStore';
import { isElectron } from '@/services/platform/platform';
import type { SharedResourceReference } from '@/types/domain';
import { HelpButton, HelpPanel } from '@/components/help';
import { ValidationWarnings } from '@/components/common/ValidationWarnings';
import { useHelpPanel } from '@/hooks/useHelpPanel';

const ModelEditor: React.FC = () => {
  const params = useParams<{ workspaceId: string; domainId?: string; '*': string }>();
  // Handle both regular workspace routes (/workspace/:workspaceId) and
  // GitHub repo routes (/workspace/github/*) where the path contains encoded slashes
  const workspaceId = params['*'] ? `github/${params['*']}` : params.workspaceId;
  const domainId = params.domainId;
  const { fetchWorkspace, workspaces, setCurrentWorkspace } = useWorkspaceStore();
  const {
    selectedDomainId,
    selectedTableId,
    tables,
    computeAssets,
    relationships,
    systems,
    currentView,
    domains,
    fetchTables,
    fetchRelationships,
    loadDomainAssets,
    setSelectedDomain,
    setSelectedTable,
    setTables,
    setRelationships,
    setDomains,
    setSystems,
    setProducts,
    setComputeAssets,
    setBPMNProcesses,
    setDMNDecisions,
    // Multi-editor support
    openTableEditorIds,
    focusedTableEditorId,
    openTableEditor,
    closeTableEditor,
    focusTableEditor,
  } = useModelStore();
  const { addToast } = useUIStore();
  const { mode } = useSDKModeStore();
  const { conflicts } = useCollaborationStore();

  const [isLoading, setIsLoading] = useState(true);
  const [showTableProperties, setShowTableProperties] = useState(false);
  const [showConflictResolver, setShowConflictResolver] = useState(false);
  const [showWorkspaceSettings, setShowWorkspaceSettings] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [showImportExportDialog, setShowImportExportDialog] = useState(false);
  const [showCreateTableDialog, setShowCreateTableDialog] = useState(false);
  const [showCreateSystemDialog, setShowCreateSystemDialog] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [isFiltering, setIsFiltering] = useState(false);
  const [showSharedResourcePicker, setShowSharedResourcePicker] = useState(false);
  const [canvasRefreshKey, setCanvasRefreshKey] = useState(0);

  // Initialize help panel keyboard shortcuts (F1, Cmd+?)
  useHelpPanel();

  // Handle shared resource selection
  const handleSharedResourcesSelected = (sharedResources: SharedResourceReference[]) => {
    if (!selectedDomainId) return;

    const domain = useModelStore.getState().domains.find((d) => d.id === selectedDomainId);
    if (!domain) return;

    // Update domain with new shared resources
    const updatedSharedResources = sharedResources.map((sr) => ({
      ...sr,
      shared_at: new Date().toISOString(),
    }));

    useModelStore.getState().updateDomain(selectedDomainId, {
      shared_resources: updatedSharedResources,
    });

    addToast({
      type: 'success',
      message: `Shared ${sharedResources.length} resource(s) from other domain(s)`,
    });

    // Trigger save
    useWorkspaceStore.getState().setPendingChanges(true);
  };

  // Handle tag filter changes
  const handleTagFilterChange = async (tags: string[]) => {
    setTagFilter(tags);

    if (tags.length === 0) {
      setIsFiltering(false);
      return;
    }

    setIsFiltering(true);

    try {
      const filtered = await filterService.filterByTags(
        {
          tables,
          computeAssets,
          relationships,
          systems,
        },
        tags
      );

      // Store original data before filtering if not already stored
      const modelStore = useModelStore.getState();
      if (!modelStore.originalTables) {
        (modelStore as any).originalTables = tables;
        (modelStore as any).originalComputeAssets = computeAssets;
        (modelStore as any).originalRelationships = relationships;
        (modelStore as any).originalSystems = systems;
      }

      // Apply filtered data to store
      setTables(filtered.tables);
      setComputeAssets(filtered.computeAssets);
      setRelationships(filtered.relationships);
      setSystems(filtered.systems);
    } catch (error) {
      console.error('[ModelEditor] Error filtering by tags:', error);
      addToast({
        type: 'error',
        message: 'Failed to apply tag filter',
      });
    } finally {
      setIsFiltering(false);
    }
  };

  // Restore original data when filter is cleared
  useEffect(() => {
    if (tagFilter.length === 0) {
      const modelStore = useModelStore.getState();
      const origTables = (modelStore as any).originalTables;
      const origAssets = (modelStore as any).originalComputeAssets;
      const origRelationships = (modelStore as any).originalRelationships;
      const origSystems = (modelStore as any).originalSystems;

      if (origTables) {
        setTables(origTables);
        setComputeAssets(origAssets);
        setRelationships(origRelationships);
        setSystems(origSystems);

        // Clear stored originals
        delete (modelStore as any).originalTables;
        delete (modelStore as any).originalComputeAssets;
        delete (modelStore as any).originalRelationships;
        delete (modelStore as any).originalSystems;
      }
    }
  }, [tagFilter.length, setTables, setComputeAssets, setRelationships, setSystems]);

  // Initialize collaboration
  useCollaboration({
    workspaceId: workspaceId ?? '',
    enabled: mode === 'online' && !!workspaceId,
  });

  // Show conflict resolver when conflicts exist
  useEffect(() => {
    if (conflicts.length > 0) {
      setShowConflictResolver(true);
    }
  }, [conflicts.length]);

  // Close table properties when selected table changes
  useEffect(() => {
    if (!selectedTableId) {
      setShowTableProperties(false);
    }
  }, [selectedTableId]);

  // Initialize auto-save when workspace is loaded
  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    const workspaceStore = useWorkspaceStore.getState();
    workspaceStore.startAutoSave();

    return () => {
      workspaceStore.stopAutoSave();
    };
  }, [workspaceId]);

  // Initialize git service with workspace path
  useEffect(() => {
    // Get the workspace path from domains or workspaceId
    const domain = domains.find((d) => d.id === selectedDomainId);
    const workspacePath = domain?.workspace_path || null;

    if (workspacePath && gitService.isAvailable()) {
      gitService.setWorkspacePath(workspacePath);
      gitService.enableAutoRefresh(10000); // Refresh every 10 seconds
    }

    return () => {
      gitService.disableAutoRefresh();
    };
  }, [domains, selectedDomainId]);

  // Clear model store when workspace changes (not on initial mount or same workspace reload)
  // This prevents stale data from appearing when switching to a different workspace
  const previousWorkspaceIdRef = React.useRef<string | undefined>(undefined);
  useEffect(() => {
    // Only clear if switching TO a different workspace (not on initial mount)
    if (previousWorkspaceIdRef.current && previousWorkspaceIdRef.current !== workspaceId) {
      const modelStore = useModelStore.getState();
      console.log('[ModelEditor] Workspace changed - clearing stores for new workspace');
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

      // Also clear knowledge and decision stores (including filters)
      // These are synchronous to avoid race conditions
      import('@/stores/knowledgeStore').then(({ useKnowledgeStore }) => {
        useKnowledgeStore.getState().setArticles([]);
        useKnowledgeStore.getState().setFilter({});
      });
      import('@/stores/decisionStore').then(({ useDecisionStore }) => {
        useDecisionStore.getState().setDecisions([]);
      });
    }
    previousWorkspaceIdRef.current = workspaceId;
  }, [workspaceId]);

  // Handle browser refresh
  useEffect(() => {
    const handleBeforeUnload = async (e: BeforeUnloadEvent) => {
      const { handleBrowserRefresh } = useWorkspaceStore.getState();
      const { pendingChanges } = useWorkspaceStore.getState();

      if (pendingChanges) {
        const result = await handleBrowserRefresh();
        if (result.hasLocalChanges || result.hasRemoteChanges) {
          e.preventDefault();
          e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
          return e.returnValue;
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [workspaceId]);

  // State for tracking GitHub repo initialization
  const [isGitHubRepoInitialized, setIsGitHubRepoInitialized] = useState(false);
  const [isInitializingGitHubRepo, setIsInitializingGitHubRepo] = useState(false);

  // Initialize GitHub repo mode when URL starts with 'github/'
  // This handles direct navigation to GitHub workspace URLs
  useEffect(() => {
    const initGitHubRepo = async () => {
      if (!workspaceId || !workspaceId.startsWith('github/')) {
        setIsGitHubRepoInitialized(true);
        return;
      }

      // Check if GitHub repo is already open with this workspace
      const existingWorkspace = useGitHubRepoStore.getState().workspace;
      if (existingWorkspace && existingWorkspace.id === workspaceId.substring(7)) {
        setIsGitHubRepoInitialized(true);
        return;
      }

      // Wait for GitHub authentication to complete
      const githubState = useGitHubStore.getState();
      if (!githubState.auth.isAuthenticated) {
        console.log('[ModelEditor] Waiting for GitHub authentication...');
        // Give auth a moment to complete (it runs on app init)
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Check again after waiting
        const updatedState = useGitHubStore.getState();
        if (!updatedState.auth.isAuthenticated) {
          console.log('[ModelEditor] GitHub not authenticated, showing auth dialog');
          updatedState.setShowAuthDialog(true);
          setError('Please connect to GitHub to access this workspace');
          setIsLoading(false);
          return;
        }
      }

      // Parse the GitHub URL: github/owner/repo/branch/workspacePath
      const parts = workspaceId.substring(7).split('/');
      if (parts.length < 3) {
        setError('Invalid GitHub workspace URL');
        setIsLoading(false);
        return;
      }

      const owner = parts[0]!;
      const repo = parts[1]!;
      const branch = parts[2]!;
      const pathParts = parts.slice(3);
      const workspacePath = pathParts.join('/') || '_root_';
      const workspaceName =
        workspacePath === '_root_' ? repo : pathParts[pathParts.length - 1] || repo;

      console.log('[ModelEditor] Initializing GitHub repo from URL:', {
        owner,
        repo,
        branch,
        workspacePath,
      });

      setIsInitializingGitHubRepo(true);
      try {
        await useGitHubRepoStore
          .getState()
          .openWorkspace(
            owner,
            repo,
            branch,
            workspacePath === '_root_' ? '' : workspacePath,
            workspaceName
          );

        // Also set the connection in githubStore so PR panel works
        useGitHubStore.getState().setConnection({
          owner,
          repo,
          branch,
        });

        setIsGitHubRepoInitialized(true);
      } catch (error) {
        console.error('[ModelEditor] Failed to initialize GitHub repo:', error);
        setError(error instanceof Error ? error.message : 'Failed to open GitHub repository');
        setIsLoading(false);
      } finally {
        setIsInitializingGitHubRepo(false);
      }
    };

    initGitHubRepo();
  }, [workspaceId]);

  // Load workspace and domain on mount
  useEffect(() => {
    const loadWorkspace = async () => {
      if (!workspaceId) {
        setError('Workspace ID is required');
        setIsLoading(false);
        return;
      }

      // Wait for GitHub repo initialization if needed
      if (workspaceId.startsWith('github/') && !isGitHubRepoInitialized) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Handle GitHub repo mode - load workspace content from GitHub
        if (workspaceId.startsWith('github/')) {
          const githubRepoState = useGitHubRepoStore.getState();
          const { workspace: githubWorkspace } = githubRepoState;

          if (!githubWorkspace) {
            setError('GitHub workspace not initialized');
            setIsLoading(false);
            return;
          }

          console.log('[ModelEditor] Loading GitHub workspace content...', {
            owner: githubWorkspace.owner,
            repo: githubWorkspace.repo,
            branch: githubWorkspace.branch,
            workspacePath: githubWorkspace.workspacePath,
          });

          // Import the V2 loader for loading workspace from GitHub files
          const { WorkspaceV2Loader } = await import('@/services/storage/workspaceV2Loader');
          const { githubContentsService } = await import('@/services/github/githubContentsService');

          // Get the list of files in the workspace
          const files = await githubContentsService.getWorkspaceFiles(
            githubWorkspace.owner,
            githubWorkspace.repo,
            githubWorkspace.workspacePath,
            githubWorkspace.branch
          );

          console.log('[ModelEditor] GitHub workspace files:', files);

          // Load the content of each file
          const fileContents: Array<{ name: string; content: string }> = [];
          for (const filePath of files) {
            try {
              const content = await githubRepoState.readFile(filePath);
              // Extract just the filename from the path
              const fileName = filePath.split('/').pop() || filePath;
              fileContents.push({ name: fileName, content });
            } catch (err) {
              console.warn(`[ModelEditor] Failed to read file ${filePath}:`, err);
            }
          }

          console.log(
            '[ModelEditor] Loaded file contents:',
            fileContents.map((f) => f.name)
          );

          // Use the V2 loader to parse the workspace content
          // The loader returns an extended workspace with additional properties
          const loadedWorkspace = (await WorkspaceV2Loader.loadFromStringFiles(
            fileContents
          )) as any;

          console.log('[ModelEditor] Parsed workspace:', {
            name: loadedWorkspace.name,
            tablesCount: loadedWorkspace.tables?.length || 0,
            domainsCount: loadedWorkspace.domains?.length || 0,
          });

          // Set the loaded data into the model store
          if (loadedWorkspace.tables) {
            setTables(loadedWorkspace.tables);
          }
          if (loadedWorkspace.relationships) {
            setRelationships(loadedWorkspace.relationships);
          }
          if (loadedWorkspace.systems) {
            setSystems(loadedWorkspace.systems);
          }
          if (loadedWorkspace.products) {
            setProducts(loadedWorkspace.products);
          }
          if (loadedWorkspace.assets) {
            setComputeAssets(loadedWorkspace.assets);
          }
          if (loadedWorkspace.bpmnProcesses) {
            setBPMNProcesses(loadedWorkspace.bpmnProcesses);
          }
          if (loadedWorkspace.dmnDecisions) {
            setDMNDecisions(loadedWorkspace.dmnDecisions);
          }

          // Set knowledge articles and decision records to their respective stores
          if (loadedWorkspace.knowledgeArticles && loadedWorkspace.knowledgeArticles.length > 0) {
            const { useKnowledgeStore } = await import('@/stores/knowledgeStore');
            useKnowledgeStore.getState().setArticles(loadedWorkspace.knowledgeArticles);
            console.log(
              '[ModelEditor] Set knowledge articles:',
              loadedWorkspace.knowledgeArticles.length
            );
          }
          if (loadedWorkspace.decisionRecords && loadedWorkspace.decisionRecords.length > 0) {
            const { useDecisionStore } = await import('@/stores/decisionStore');
            useDecisionStore.getState().setDecisions(loadedWorkspace.decisionRecords);
            console.log(
              '[ModelEditor] Set decision records:',
              loadedWorkspace.decisionRecords.length
            );
          }

          // Set domains - ensure we always have at least one domain
          let domainToSelect: string | null = null;

          if (loadedWorkspace.domains && loadedWorkspace.domains.length > 0) {
            console.log(
              '[ModelEditor] Setting domains from loaded workspace:',
              loadedWorkspace.domains.map((d: any) => ({ id: d.id, name: d.name }))
            );
            setDomains(loadedWorkspace.domains);
            const firstDomain = loadedWorkspace.domains[0];
            if (firstDomain) {
              domainToSelect = firstDomain.id;
            }
          } else {
            // Create default domain when none exist in workspace
            console.log('[ModelEditor] No domains in workspace, creating default domain');
            const { generateUUID } = await import('@/utils/validation');
            const defaultDomain = {
              id: generateUUID(),
              workspace_id: workspaceId,
              name: 'Default',
              model_type: 'conceptual' as const,
              is_primary: true,
              created_at: new Date().toISOString(),
              last_modified_at: new Date().toISOString(),
            };
            setDomains([defaultDomain]);
            domainToSelect = defaultDomain.id;
          }

          // Set selected domain AFTER setting domains to ensure state is consistent
          if (domainToSelect) {
            console.log('[ModelEditor] Setting selected domain:', domainToSelect);
            setSelectedDomain(domainToSelect);
          }

          // Verify the state was set correctly
          const finalState = useModelStore.getState();
          console.log('[ModelEditor] Final state after loading GitHub workspace:', {
            domainsCount: finalState.domains.length,
            selectedDomainId: finalState.selectedDomainId,
            tablesCount: finalState.tables.length,
          });

          // Add workspace to workspaceStore and set as current for auto-save to work
          const githubWorkspaceObj = {
            id: workspaceId,
            name: githubWorkspace.workspaceName,
            owner_id: 'github', // Placeholder for GitHub repo mode
            created_at: new Date().toISOString(),
            last_modified_at: new Date().toISOString(),
          };

          // Check if workspace already exists, if not add it
          const existingWorkspace = useWorkspaceStore
            .getState()
            .workspaces.find((w) => w.id === workspaceId);
          if (!existingWorkspace) {
            useWorkspaceStore.getState().addWorkspace(githubWorkspaceObj);
          }
          useWorkspaceStore.getState().setCurrentWorkspace(workspaceId);
          console.log('[ModelEditor] Set current workspace for GitHub repo mode:', workspaceId);

          addToast({
            type: 'success',
            message: `Loaded GitHub workspace: ${githubWorkspace.workspaceName}`,
          });

          setIsLoading(false);
          return;
        }

        // Check if we're in offline mode - skip API calls
        const currentMode = useSDKModeStore.getState().mode;
        if (currentMode === 'offline') {
          // In offline mode, check if model store already has data (set by Home.tsx)
          // If so, don't overwrite it - just set the workspace and domain selection
          const modelStore = useModelStore.getState();
          const hasExistingData =
            modelStore.tables.length > 0 ||
            modelStore.systems.length > 0 ||
            modelStore.domains.length > 0;

          if (hasExistingData) {
            console.log(
              `[ModelEditor] Model store already has data (tables: ${modelStore.tables.length}, systems: ${modelStore.systems.length}, domains: ${modelStore.domains.length}) - not reloading from workspace object`
            );

            // Just set current workspace and select first domain if needed
            const workspace = workspaces.find((w) => w.id === workspaceId);
            if (workspace) {
              setCurrentWorkspace(workspace.id);
            }

            // Select first domain if none selected
            if (!selectedDomainId && modelStore.domains.length > 0) {
              const firstDomain = modelStore.domains[0];
              if (firstDomain) {
                console.log(
                  `[ModelEditor] Setting selected domain to: ${firstDomain.id} (${firstDomain.name})`
                );
                setSelectedDomain(firstDomain.id);
              }
            }

            addToast({
              type: 'success',
              message: `Loaded workspace: ${workspace?.name || workspaceId}`,
            });

            setIsLoading(false);
            return;
          }

          // Model store is empty - load from workspace store (loaded from file)
          const workspace = workspaces.find((w) => w.id === workspaceId);
          if (workspace) {
            // Set current workspace
            setCurrentWorkspace(workspace.id);

            // Load all assets from workspace
            // Workspace loaded from file may have all assets stored separately
            const workspaceData = workspace as any;

            // Load tables
            if (workspaceData.tables && Array.isArray(workspaceData.tables)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.tables.length} table(s) from workspace`
              );
              setTables(workspaceData.tables);
            }

            // Load relationships
            if (workspaceData.relationships && Array.isArray(workspaceData.relationships)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.relationships.length} relationship(s) from workspace`
              );
              setRelationships(workspaceData.relationships);
            }

            // Load systems
            if (workspaceData.systems && Array.isArray(workspaceData.systems)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.systems.length} system(s) from workspace`
              );
              console.log(
                `[ModelEditor] Systems domain_ids:`,
                workspaceData.systems.map((s: any) => ({
                  id: s.id,
                  name: s.name,
                  domain_id: s.domain_id,
                }))
              );
              console.log(
                `[ModelEditor] Workspace domains:`,
                workspace.domains?.map((d: any) => ({ id: d.id, name: d.name }))
              );
              setSystems(workspaceData.systems);
            }

            // Load products
            if (workspaceData.products && Array.isArray(workspaceData.products)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.products.length} product(s) from workspace`
              );
              setProducts(workspaceData.products);
            }

            // Load assets
            if (workspaceData.assets && Array.isArray(workspaceData.assets)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.assets.length} asset(s) from workspace`
              );
              setComputeAssets(workspaceData.assets);
            }

            // Load BPMN processes
            if (workspaceData.bpmnProcesses && Array.isArray(workspaceData.bpmnProcesses)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.bpmnProcesses.length} BPMN process(es) from workspace`
              );
              setBPMNProcesses(workspaceData.bpmnProcesses);
            }

            // Load DMN decisions
            if (workspaceData.dmnDecisions && Array.isArray(workspaceData.dmnDecisions)) {
              console.log(
                `[ModelEditor] Loading ${workspaceData.dmnDecisions.length} DMN decision(s) from workspace`
              );
              setDMNDecisions(workspaceData.dmnDecisions);
            }

            // Set domains from workspace
            if (workspace.domains && workspace.domains.length > 0) {
              console.log(
                `[ModelEditor] Loading ${workspace.domains.length} domain(s) from workspace:`,
                workspace.domains.map((d: any) => ({ id: d.id, name: d.name }))
              );
              setDomains(workspace.domains);
              const firstDomain = workspace.domains[0];
              if (firstDomain) {
                console.log(`[ModelEditor] Setting selected domain to: ${firstDomain.id}`);
                setSelectedDomain(firstDomain.id);
              }
            } else {
              // Create a default domain if none exist - always use UUID
              const { generateUUID } = await import('@/utils/validation');
              const defaultDomain = {
                id: generateUUID(),
                workspace_id: workspaceId,
                name: 'Default',
                model_type: 'conceptual' as const,
                is_primary: true,
                created_at: new Date().toISOString(),
                last_modified_at: new Date().toISOString(),
              };
              setDomains([defaultDomain]);
              setSelectedDomain(defaultDomain.id);
            }

            addToast({
              type: 'success',
              message: `Loaded workspace: ${workspace.name || workspaceId}`,
            });
          } else {
            setError('Workspace not found. Please open a file in offline mode.');
          }
          setIsLoading(false);
          return;
        }

        // Load workspace info (online mode only)
        await fetchWorkspace(workspaceId);

        // Load domains
        const domainList = await workspaceService.listDomains();
        if (domainList.length === 0) {
          // Create default domain if none exist
          await workspaceService.createDomain('default');
          domainList.push('default');
        }

        // Set selected domain
        const selectedDomain = domainId || domainList[0];
        if (!selectedDomain) {
          setError('No domain available');
          setIsLoading(false);
          return;
        }

        setSelectedDomain(selectedDomain);

        // Load domain into model service
        await workspaceService.loadDomain(selectedDomain);

        // Load all domain assets (tables, relationships, products, compute assets, BPMN, DMN)
        if (workspaceId) {
          await loadDomainAssets(workspaceId, selectedDomain);
        } else {
          // Fallback: fetch tables and relationships separately
          await Promise.all([fetchTables(selectedDomain), fetchRelationships(selectedDomain)]);
        }
      } catch (err) {
        // In offline mode, API errors are expected
        const currentMode = useSDKModeStore.getState().mode;
        if (currentMode === 'offline') {
          setError(null); // Clear error in offline mode
        } else {
          setError(err instanceof Error ? err.message : 'Failed to load workspace');
          console.error('Failed to load workspace:', err);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkspace();
  }, [
    workspaceId,
    domainId,
    fetchWorkspace,
    fetchTables,
    fetchRelationships,
    loadDomainAssets,
    setSelectedDomain,
    isGitHubRepoInitialized,
  ]);

  // Watch for branch switches in GitHub repo mode and reload workspace content
  const branchSwitchCounter = useGitHubRepoStore((state) => state.branchSwitchCounter);
  const previousBranchSwitchCounterRef = React.useRef(branchSwitchCounter);

  useEffect(() => {
    // Skip initial render and only react to actual changes
    if (previousBranchSwitchCounterRef.current === branchSwitchCounter) {
      return;
    }
    previousBranchSwitchCounterRef.current = branchSwitchCounter;

    // Only reload if we're in GitHub repo mode
    if (!workspaceId?.startsWith('github/')) {
      return;
    }

    const reloadWorkspaceContent = async () => {
      const githubRepoState = useGitHubRepoStore.getState();
      const { workspace: githubWorkspace } = githubRepoState;

      if (!githubWorkspace) {
        console.log('[ModelEditor] No GitHub workspace to reload');
        return;
      }

      console.log('[ModelEditor] Branch switched, reloading workspace content...', {
        branch: githubWorkspace.branch,
        branchSwitchCounter,
      });

      setIsLoading(true);

      try {
        // Import the V2 loader for loading workspace from GitHub files
        const { WorkspaceV2Loader } = await import('@/services/storage/workspaceV2Loader');
        const { githubContentsService } = await import('@/services/github/githubContentsService');

        // Get the list of files in the workspace
        const files = await githubContentsService.getWorkspaceFiles(
          githubWorkspace.owner,
          githubWorkspace.repo,
          githubWorkspace.workspacePath,
          githubWorkspace.branch
        );

        // Load the content of each file
        const fileContents: Array<{ name: string; content: string }> = [];
        for (const filePath of files) {
          try {
            const content = await githubRepoState.readFile(filePath);
            const fileName = filePath.split('/').pop() || filePath;
            fileContents.push({ name: fileName, content });
          } catch (err) {
            console.warn(`[ModelEditor] Failed to read file ${filePath}:`, err);
          }
        }

        // Use the V2 loader to parse the workspace content
        const loadedWorkspace = (await WorkspaceV2Loader.loadFromStringFiles(fileContents)) as any;

        console.log('[ModelEditor] Reloaded workspace after branch switch:', {
          name: loadedWorkspace.name,
          tablesCount: loadedWorkspace.tables?.length || 0,
          domainsCount: loadedWorkspace.domains?.length || 0,
        });

        // Set the loaded data into the model store
        if (loadedWorkspace.tables) {
          setTables(loadedWorkspace.tables);
        }
        if (loadedWorkspace.relationships) {
          setRelationships(loadedWorkspace.relationships);
        }
        if (loadedWorkspace.systems) {
          setSystems(loadedWorkspace.systems);
        }
        if (loadedWorkspace.products) {
          setProducts(loadedWorkspace.products);
        }
        if (loadedWorkspace.assets) {
          setComputeAssets(loadedWorkspace.assets);
        }
        if (loadedWorkspace.domains && loadedWorkspace.domains.length > 0) {
          setDomains(loadedWorkspace.domains);
        }

        // Increment canvas refresh key to force re-render
        setCanvasRefreshKey((prev) => prev + 1);

        addToast({
          type: 'info',
          message: `Switched to branch: ${githubWorkspace.branch}`,
        });
      } catch (error) {
        console.error('[ModelEditor] Failed to reload workspace after branch switch:', error);
        addToast({
          type: 'error',
          message: 'Failed to reload workspace content',
        });
      } finally {
        setIsLoading(false);
      }
    };

    reloadWorkspaceContent();
  }, [
    branchSwitchCounter,
    workspaceId,
    setTables,
    setRelationships,
    setSystems,
    setProducts,
    setComputeAssets,
    setDomains,
    addToast,
  ]);

  if (isLoading || isInitializingGitHubRepo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Loading />
          {isInitializingGitHubRepo && (
            <p className="mt-4 text-gray-600">Connecting to GitHub repository...</p>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!selectedDomainId) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-600">No domain selected</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Main header row with logo, actions, and controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 shadow-sm">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <img
            src={getAssetPath('/logo.svg')}
            alt="Open Data Modelling"
            className="h-8 w-auto flex-shrink-0"
            style={{ maxHeight: '32px' }}
          />

          {/* Collaboration Status - inline when online */}
          {mode === 'online' && workspaceId && (
            <div className="flex items-center gap-2">
              <CollaborationStatus workspaceId={workspaceId} />
              <PresenceIndicator workspaceId={workspaceId} />
            </div>
          )}

          {/* Spacer to push right-side items */}
          <div className="flex-1" />

          {/* Right side controls */}
          <div className="flex items-center gap-2">
            {/* Git Status Indicator (works in both Electron and GitHub repo mode) */}
            <GitStatusIndicator />

            {/* GitHub User Menu (Browser mode only) */}
            {!isElectron() && <GitHubUserMenu />}

            {/* Validation Warnings */}
            <ValidationWarnings />

            {/* Save/Exit Controls (Online indicator, pending count, Sync/Commit buttons, Exit) */}
            <SaveExitControls />

            {/* Refresh button - before Help/Settings */}
            {selectedDomainId && (
              <button
                onClick={() => {
                  // Force a re-render by incrementing the refresh key
                  setCanvasRefreshKey((prev) => prev + 1);
                  console.log('[ModelEditor] Refresh button clicked - forcing canvas re-render');
                }}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 whitespace-nowrap"
                title="Refresh canvas and reload all resources"
              >
                <svg
                  className="w-4 h-4 inline-block mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
                Refresh
              </button>
            )}

            {/* Help Button */}
            <HelpButton />

            <button
              onClick={() => setShowWorkspaceSettings(!showWorkspaceSettings)}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Workspace Settings"
            >
              Settings
            </button>
            {mode === 'online' && workspaceId && (
              <button
                onClick={() => setShowVersionHistory(!showVersionHistory)}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                aria-label="Version History"
              >
                History
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Secondary toolbar: Domain, View mode, Filter, Share Resources, BPMN links */}
      <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-4">
        <DomainSelector workspaceId={workspaceId ?? ''} />
        {selectedDomainId && (
          <>
            <ViewModeSelector domainId={selectedDomainId} />
            <div className="flex-1">
              <TagFilter
                onFilterChange={handleTagFilterChange}
                placeholder="Filter by tags (e.g., env:production, product:food)"
              />
            </div>
            <button
              onClick={() => setShowSharedResourcePicker(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap"
              title="Share resources from other domains"
            >
              Share Resources
            </button>
            <BPMNProcessLinks domainId={selectedDomainId} />
          </>
        )}
      </div>

      {/* Filter status messages */}
      {(isFiltering || tagFilter.length > 0) && (
        <div className="bg-gray-50 px-4 py-1 border-b border-gray-200">
          {isFiltering && <div className="text-xs text-gray-500">Filtering resources...</div>}
          {tagFilter.length > 0 && !isFiltering && (
            <div className="text-xs text-blue-600">
              Showing {tables.length} table(s), {computeAssets.length} asset(s),{' '}
              {relationships.length} relationship(s), {systems.length} system(s)
            </div>
          )}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas or Panel based on view mode */}
        <div className="flex-1 relative">
          {selectedDomainId && workspaceId && currentView === 'decisions' && (
            <DecisionPanel
              workspacePath={
                domains.find((d) => d.id === selectedDomainId)?.workspace_path || workspaceId
              }
              domainId={selectedDomainId}
            />
          )}
          {selectedDomainId && workspaceId && currentView === 'knowledge' && (
            <KnowledgePanel
              workspacePath={
                domains.find((d) => d.id === selectedDomainId)?.workspace_path || workspaceId
              }
              domainId={selectedDomainId}
            />
          )}
          {selectedDomainId && workspaceId && currentView === 'sketch' && (
            <SketchPanel
              workspacePath={
                domains.find((d) => d.id === selectedDomainId)?.workspace_path || workspaceId
              }
              domainId={selectedDomainId}
            />
          )}
          {selectedDomainId &&
            workspaceId &&
            currentView !== 'decisions' &&
            currentView !== 'knowledge' &&
            currentView !== 'sketch' && (
              <DomainCanvas
                key={canvasRefreshKey}
                workspaceId={workspaceId}
                domainId={selectedDomainId}
              />
            )}
        </div>

        {/* Git Version Control Panel */}
        <GitPanel />
      </div>

      {/* BPMN/DMN creation is now only available inside CADS nodes (AI/ML/App) */}

      {/* Conflict Resolver */}
      <ConflictResolver
        isOpen={showConflictResolver}
        onClose={() => setShowConflictResolver(false)}
      />

      {/* Workspace Settings Dialog */}
      {showWorkspaceSettings && workspaceId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Workspace Settings</h2>
              <button
                onClick={() => setShowWorkspaceSettings(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <WorkspaceSettings workspaceId={workspaceId} />
          </div>
        </div>
      )}

      {/* Version History Dialog */}
      {showVersionHistory && workspaceId && mode === 'online' && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Version History</h2>
              <button
                onClick={() => setShowVersionHistory(false)}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <VersionHistory workspaceId={workspaceId} />
          </div>
        </div>
      )}

      {/* Import/Export Dialog */}
      <ImportExportDialog
        isOpen={showImportExportDialog}
        onClose={() => setShowImportExportDialog(false)}
      />

      {/* GitHub Dialogs (Browser mode only) */}
      {!isElectron() && (
        <>
          <GitHubAuthDialog />
          <GitHubRepoSelector />
        </>
      )}

      {/* Multi-Table Editor Modals - up to 3 editors side by side */}
      {openTableEditorIds.map((tableId, index) => {
        const table = tables.find((t) => t.id === tableId);
        const tableName = table?.name || 'Table';
        // Position editors side by side: 50px start, 720px width + 20px gap
        const editorWidth = 720;
        const gap = 20;
        const startX = 50;
        const posX = startX + index * (editorWidth + gap);
        const isFocused = focusedTableEditorId === tableId;
        // Base z-index 50, focused editor gets +10
        const zIndex = isFocused ? 60 : 50;

        return (
          <DraggableModal
            key={tableId}
            isOpen={true}
            onClose={() => {
              closeTableEditor(tableId);
              if (selectedTableId === tableId) {
                setSelectedTable(null);
              }
            }}
            title={`Edit: ${tableName}`}
            size="lg"
            initialPosition={{
              x: Math.max(50, posX),
              y: 100,
            }}
            zIndex={zIndex}
            onFocus={() => focusTableEditor(tableId)}
            hideBackdrop={true} // No backdrop so users can click other tables on canvas
            resizable={true} // Allow resizing to see more columns
          >
            <TableEditor
              tableId={tableId}
              workspaceId={workspaceId ?? ''}
              onClose={async () => {
                // Small delay to ensure canvas updates before closing
                await new Promise((resolve) => setTimeout(resolve, 150));
                closeTableEditor(tableId);
                if (selectedTableId === tableId) {
                  setSelectedTable(null);
                }
              }}
            />
          </DraggableModal>
        );
      })}

      {/* Table Properties Modal */}
      {selectedTableId && (
        <DraggableModal
          isOpen={showTableProperties}
          onClose={() => {
            setShowTableProperties(false);
            setSelectedTable(null);
          }}
          title="Table Properties"
          size="md"
          initialPosition={{
            x: window.innerWidth / 2 - 300,
            y: window.innerHeight / 2 - 200,
          }}
        >
          <div className="flex gap-2 mb-4 border-b border-gray-200 pb-4">
            <button
              onClick={() => {
                if (selectedTableId) {
                  openTableEditor(selectedTableId);
                }
                setShowTableProperties(false);
              }}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Edit Table
            </button>
          </div>
          <TableProperties tableId={selectedTableId} workspaceId={workspaceId ?? ''} />
        </DraggableModal>
      )}

      {/* Create Table Dialog */}
      {selectedDomainId && (
        <CreateTableDialog
          workspaceId={workspaceId ?? ''}
          domainId={selectedDomainId}
          isOpen={showCreateTableDialog}
          onClose={() => setShowCreateTableDialog(false)}
          onCreated={(tableId) => {
            setSelectedTable(tableId);
            setShowCreateTableDialog(false);
          }}
        />
      )}

      {/* Create System Dialog */}
      {selectedDomainId && (
        <CreateSystemDialog
          domainId={selectedDomainId}
          isOpen={showCreateSystemDialog}
          onClose={() => setShowCreateSystemDialog(false)}
          onCreated={(systemId) => {
            setShowCreateSystemDialog(false);
            // Optionally select the system
            useModelStore.getState().setSelectedSystem(systemId);
          }}
        />
      )}

      {/* Shared Resource Picker Dialog */}
      {selectedDomainId && (
        <SharedResourcePicker
          isOpen={showSharedResourcePicker}
          onClose={() => setShowSharedResourcePicker(false)}
          currentDomainId={selectedDomainId}
          onResourcesSelected={handleSharedResourcesSelected}
        />
      )}

      {/* Help Panel */}
      <HelpPanel />
    </div>
  );
};

export default ModelEditor;
