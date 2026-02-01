/**
 * Domain Selector Component
 * Dropdown-based domain selection with actions menu
 * Replaces the horizontal tab-based DomainTabs component
 */

import React, { useState, useRef, useEffect } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { useUIStore } from '@/stores/uiStore';
import { useDecisionStore } from '@/stores/decisionStore';
import { useKnowledgeStore } from '@/stores/knowledgeStore';
import { workspaceService } from '@/services/api/workspaceService';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { CreateDomainDialog } from './CreateDomainDialog';
import { MoveResourcesDialog } from './MoveResourcesDialog';
import { getPlatform } from '@/services/platform/platform';
import { electronFileService as platformFileService } from '@/services/platform/electron';
import { electronFileService } from '@/services/storage/electronFileService';

export interface DomainSelectorProps {
  workspaceId: string;
}

export const DomainSelector: React.FC<DomainSelectorProps> = ({ workspaceId }) => {
  const {
    domains,
    selectedDomainId,
    setSelectedDomain,
    removeDomain,
    updateDomain,
    tables,
    systems,
    relationships,
  } = useModelStore();
  const { addToast } = useUIStore();
  const { mode } = useSDKModeStore();
  const { decisions } = useDecisionStore();
  const { articles } = useKnowledgeStore();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showMoveResourcesDialog, setShowMoveResourcesDialog] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedDomain = domains.find((d) => d.id === selectedDomainId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectDomain = (domainId: string) => {
    setSelectedDomain(domainId);
    setIsOpen(false);
  };

  const handleDeleteDomain = async (domainId: string, domainName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (domains.length <= 1) {
      addToast({
        type: 'error',
        message: 'Cannot delete the last domain. At least one domain is required.',
      });
      return;
    }

    if (!window.confirm(`Are you sure you want to delete domain "${domainName}"?`)) {
      return;
    }

    try {
      if (mode === 'online') {
        await workspaceService.deleteDomain(domainName);
      }
      removeDomain(domainId);
      addToast({
        type: 'success',
        message: `Domain "${domainName}" deleted successfully`,
      });
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to delete domain',
      });
    }
  };

  const handleLoadDomain = async () => {
    if (getPlatform() !== 'electron') {
      addToast({
        type: 'error',
        message: 'Load Domain is only available in Electron offline mode',
      });
      return;
    }

    setIsLoading(true);
    setIsOpen(false);

    try {
      const result = await platformFileService.showOpenDialog({
        properties: ['openDirectory'],
        title: 'Select Domain Folder to Load',
      });

      if (result.canceled || !result.filePaths || result.filePaths.length === 0) {
        setIsLoading(false);
        return;
      }

      const domainPath = result.filePaths[0];
      if (!domainPath) {
        setIsLoading(false);
        return;
      }

      const { generateUUID, isValidUUID } = await import('@/utils/validation');
      const domainData = await electronFileService.loadDomainFolder(domainPath);

      const pathParts = domainPath.split(/[/\\]/);
      const domainName = pathParts[pathParts.length - 1];
      const workspacePath = pathParts.slice(0, -1).join('/');

      const existingDomain = domains.find((d) => d.name === (domainData.domain.name || domainName));

      let domain;
      if (existingDomain) {
        domain = {
          ...existingDomain,
          ...domainData.domain,
          id: existingDomain.id,
          name: domainData.domain.name || domainName || existingDomain.name,
          description: domainData.domain.description || existingDomain.description,
          last_modified_at: new Date().toISOString(),
          folder_path: domainPath,
          workspace_path: workspacePath,
        };
        updateDomain(existingDomain.id, domain);
        setSelectedDomain(existingDomain.id);
      } else {
        const loadedDomainId =
          domainData.domain.id && isValidUUID(domainData.domain.id)
            ? domainData.domain.id
            : generateUUID();
        domain = {
          id: loadedDomainId,
          workspace_id: workspaceId || '',
          name: domainData.domain.name || domainName || 'Loaded Domain',
          description: domainData.domain.description,
          created_at: domainData.domain.created_at || new Date().toISOString(),
          last_modified_at: domainData.domain.last_modified_at || new Date().toISOString(),
          folder_path: domainPath,
          workspace_path: workspacePath,
        };
        useModelStore.getState().setDomains([...domains, domain]);
        setSelectedDomain(domain.id);
      }

      // Merge loaded assets (simplified - same logic as DomainTabs)
      const modelStore = useModelStore.getState();

      if (domainData.tables.length > 0) {
        const mergedTables = [...tables];
        domainData.tables.forEach((table) => {
          const index = mergedTables.findIndex((t) => t.id === table.id);
          if (index >= 0) {
            mergedTables[index] = {
              ...mergedTables[index],
              ...table,
              primary_domain_id: domain.id,
            };
          } else {
            mergedTables.push({ ...table, primary_domain_id: domain.id });
          }
        });
        modelStore.setTables(mergedTables);
      }

      if (domainData.systems.length > 0) {
        const mergedSystems = [...systems];
        domainData.systems.forEach((system) => {
          const index = mergedSystems.findIndex((s) => s.id === system.id);
          if (index >= 0) {
            mergedSystems[index] = { ...mergedSystems[index], ...system, domain_id: domain.id };
          } else {
            mergedSystems.push({ ...system, domain_id: domain.id });
          }
        });
        modelStore.setSystems(mergedSystems);
      }

      if (domainData.relationships.length > 0) {
        const mergedRelationships = [...relationships];
        domainData.relationships.forEach((relationship) => {
          const index = mergedRelationships.findIndex((r) => r.id === relationship.id);
          if (index >= 0) {
            mergedRelationships[index] = {
              ...mergedRelationships[index],
              ...relationship,
              domain_id: domain.id,
            };
          } else {
            mergedRelationships.push({
              ...relationship,
              domain_id: domain.id,
              workspace_id: workspaceId,
            });
          }
        });
        modelStore.setRelationships(mergedRelationships);
      }

      addToast({
        type: 'success',
        message: existingDomain
          ? `Merged domain "${domain.name}" with existing domain`
          : `Loaded domain: ${domain.name}`,
      });
    } catch (err) {
      console.error('Failed to load domain:', err);
      addToast({
        type: 'error',
        message: `Failed to load domain: ${err instanceof Error ? err.message : 'Unknown error'}`,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get counts for selected domain
  const getDomainstats = (domainId: string) => {
    const tableCount = tables.filter((t) => t.primary_domain_id === domainId).length;
    const systemCount = systems.filter((s) => s.domain_id === domainId).length;
    const decisionCount = decisions.filter((d) => d.domain_id === domainId).length;
    const articleCount = articles.filter((a) => a.domain_id === domainId).length;
    return { tableCount, systemCount, decisionCount, articleCount };
  };

  if (!domains || domains.length === 0) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-500">No domains</span>
        <button
          onClick={() => setShowCreateDialog(true)}
          className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded border border-blue-200"
        >
          + Add Domain
        </button>
        <CreateDomainDialog
          isOpen={showCreateDialog}
          onClose={() => setShowCreateDialog(false)}
          onCreated={(domainId) => {
            setSelectedDomain(domainId);
            setShowCreateDialog(false);
          }}
          workspaceId={workspaceId}
        />
      </div>
    );
  }

  const stats = selectedDomain ? getDomainstats(selectedDomain.id) : null;

  return (
    <>
      <div className="flex items-center gap-2" ref={dropdownRef}>
        <span className="text-sm font-medium text-gray-600">Domain:</span>

        {/* Domain Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <span className="flex-1 text-left truncate">
              {selectedDomain?.name || 'Select domain'}
            </span>
            {stats && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                {stats.tableCount > 0 && (
                  <span className="px-1 bg-gray-100 rounded">{stats.tableCount}T</span>
                )}
                {stats.systemCount > 0 && (
                  <span className="px-1 bg-blue-100 text-blue-700 rounded">
                    {stats.systemCount}S
                  </span>
                )}
              </span>
            )}
            <svg
              className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <div className="absolute z-50 mt-1 w-72 bg-white border border-gray-200 rounded-md shadow-lg">
              {/* Domain List */}
              <div className="max-h-64 overflow-y-auto py-1">
                {domains.map((domain) => {
                  const domainStats = getDomainstats(domain.id);
                  const isSelected = domain.id === selectedDomainId;
                  return (
                    <div
                      key={domain.id}
                      className={`flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-gray-50 ${
                        isSelected ? 'bg-blue-50' : ''
                      }`}
                      onClick={() => handleSelectDomain(domain.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm font-medium truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}
                          >
                            {domain.name}
                          </span>
                          {isSelected && (
                            <svg
                              className="w-4 h-4 text-blue-600"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {domainStats.tableCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {domainStats.tableCount} tables
                            </span>
                          )}
                          {domainStats.systemCount > 0 && (
                            <span className="text-xs text-gray-500">
                              {domainStats.systemCount} systems
                            </span>
                          )}
                          {domainStats.decisionCount > 0 && (
                            <span className="text-xs px-1 bg-amber-100 text-amber-700 rounded">
                              {domainStats.decisionCount}D
                            </span>
                          )}
                          {domainStats.articleCount > 0 && (
                            <span className="text-xs px-1 bg-emerald-100 text-emerald-700 rounded">
                              {domainStats.articleCount}K
                            </span>
                          )}
                        </div>
                      </div>
                      {domains.length > 1 && (
                        <button
                          onClick={(e) => handleDeleteDomain(domain.id, domain.name, e)}
                          className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          title={`Delete ${domain.name}`}
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Actions */}
              <div className="border-t border-gray-200 py-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    setShowCreateDialog(true);
                  }}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm text-blue-600 hover:bg-blue-50"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Add Domain
                </button>
                {mode === 'offline' && getPlatform() === 'electron' && (
                  <button
                    onClick={handleLoadDomain}
                    disabled={isLoading}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
                      />
                    </svg>
                    {isLoading ? 'Loading...' : 'Import Domain from Folder'}
                  </button>
                )}
                {selectedDomainId && (
                  <button
                    onClick={() => {
                      setIsOpen(false);
                      setShowMoveResourcesDialog(true);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 text-sm text-purple-700 hover:bg-purple-50"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                      />
                    </svg>
                    Move Resources
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <CreateDomainDialog
        isOpen={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onCreated={(domainId) => {
          setSelectedDomain(domainId);
          setShowCreateDialog(false);
        }}
        workspaceId={workspaceId}
      />

      {selectedDomainId && (
        <MoveResourcesDialog
          isOpen={showMoveResourcesDialog}
          onClose={() => setShowMoveResourcesDialog(false)}
          domainId={selectedDomainId}
        />
      )}
    </>
  );
};
