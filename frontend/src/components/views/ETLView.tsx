/**
 * ETL View Component
 * Detailed ETL processes within systems
 */

import React, { useState } from 'react';
import { useModelStore } from '@/stores/modelStore';
import { EditorModal } from '@/components/editors/EditorModal';
import { TransformationLinkDialog } from '@/components/transformation/TransformationLinkDialog';
import { bpmnService } from '@/services/sdk/bpmnService';
import { useUIStore } from '@/stores/uiStore';
import { useSDKModeStore } from '@/services/sdk/sdkMode';
import { localFileService } from '@/services/storage/localFileService';
import { electronFileService } from '@/services/storage/electronFileService';
import { getPlatform } from '@/services/platform/platform';
import type { TransformationLink } from '@/types/bpmn';

export interface ETLViewProps {
  workspaceId: string;
  domainId: string;
}

export const ETLView: React.FC<ETLViewProps> = ({ workspaceId, domainId }) => {
  const { bpmnProcesses, addBPMNProcess, updateBPMNProcess, selectedDomainId } = useModelStore();
  const { addToast } = useUIStore();
  const { mode } = useSDKModeStore();
  const [showBPMNEditor, setShowBPMNEditor] = useState(false);
  const [editingProcessId, setEditingProcessId] = useState<string | null>(null);
  const [showTransformationDialog, setShowTransformationDialog] = useState(false);
  const [transformationSource, setTransformationSource] = useState<string | null>(null);
  const [transformationTarget, setTransformationTarget] = useState<string | null>(null);
  const [selectedBPMNProcessId, setSelectedBPMNProcessId] = useState<string | null>(null);

  const editingProcess = editingProcessId ? bpmnProcesses.find((p) => p.id === editingProcessId) : null;

  const handleCreateBPMN = () => {
    setEditingProcessId(null);
    setShowBPMNEditor(true);
  };

  const handleEditBPMN = (processId: string) => {
    setEditingProcessId(processId);
    setShowBPMNEditor(true);
  };

  const handleSaveBPMN = async (xml: string, name: string) => {
    try {
      const process = await bpmnService.parseXML(xml);
      
      if (editingProcessId) {
        // Update existing process
        const updated = { ...process, id: editingProcessId, name: name.trim() || process.name || 'Untitled Process' };
        updateBPMNProcess(editingProcessId, updated);
        
        // Save to file if offline
        if (mode === 'offline' && selectedDomainId) {
          const domain = useModelStore.getState().domains.find((d) => d.id === selectedDomainId);
          if (domain) {
            const platform = getPlatform();
            if (platform === 'electron') {
              const workspacePath = (useModelStore.getState().tables[0] as any)?.workspacePath || '';
              if (workspacePath) {
                await electronFileService.saveBPMNProcess(workspacePath, domain.name, updated);
              }
            } else {
              await localFileService.saveBPMNProcess(workspaceId, selectedDomainId, updated);
            }
          }
        }
      } else {
        // Create new process
        const newProcess = {
          ...process,
          id: crypto.randomUUID(),
          name: name.trim() || process.name || 'Untitled Process',
          domain_id: selectedDomainId || domainId,
        };
        addBPMNProcess(newProcess);
        
        // Save to file if offline
        if (mode === 'offline' && selectedDomainId) {
          const domain = useModelStore.getState().domains.find((d) => d.id === selectedDomainId);
          if (domain) {
            const platform = getPlatform();
            if (platform === 'electron') {
              const workspacePath = (useModelStore.getState().tables[0] as any)?.workspacePath || '';
              if (workspacePath) {
                await electronFileService.saveBPMNProcess(workspacePath, domain.name, newProcess);
              }
            } else {
              await localFileService.saveBPMNProcess(workspaceId, selectedDomainId, newProcess);
            }
          }
        }
      }
      
      setShowBPMNEditor(false);
      setEditingProcessId(null);
    } catch (error) {
      addToast({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to save BPMN process',
      });
    }
  };

  /*
  // Transformation link creation - Future enhancement
  const handleCreateTransformationLink = (sourceTableId: string, targetTableId: string) => {
    setTransformationSource(sourceTableId);
    setTransformationTarget(targetTableId);
    setShowTransformationDialog(true);
  };
  */

  const handleSaveTransformationLink = (link: TransformationLink) => {
    if (!selectedBPMNProcessId) {
      // Find or create a BPMN process for this domain
      const domainProcess = bpmnProcesses.find((p) => p.domain_id === domainId);
      if (domainProcess) {
        const updatedLinks = [...(domainProcess.transformation_links || []), link];
        updateBPMNProcess(domainProcess.id, { transformation_links: updatedLinks });
        addToast({
          type: 'success',
          message: 'Transformation link created successfully',
        });
      } else {
        addToast({
          type: 'error',
          message: 'Please create a BPMN process first to link transformations',
        });
      }
    } else {
      const process = bpmnProcesses.find((p) => p.id === selectedBPMNProcessId);
      if (process) {
        const updatedLinks = [...(process.transformation_links || []), link];
        updateBPMNProcess(selectedBPMNProcessId, { transformation_links: updatedLinks });
        addToast({
          type: 'success',
          message: 'Transformation link created successfully',
        });
      }
    }
    setShowTransformationDialog(false);
    setTransformationSource(null);
    setTransformationTarget(null);
  };

  // ETL view is rendered as overlay on DomainCanvas
  // This component provides UI elements specific to ETL view
  return (
    <>
      {/* Floating action button for creating BPMN processes */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleCreateBPMN}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 flex items-center gap-2"
          title="Create BPMN Process"
        >
          <span>+</span>
          <span>Create Process</span>
        </button>
      </div>

      {/* List of existing BPMN processes */}
      {bpmnProcesses.length > 0 && (
        <div className="absolute top-16 right-4 z-10 bg-white rounded-lg shadow-lg p-4 max-w-xs">
          <h4 className="text-sm font-semibold text-gray-700 mb-2">BPMN Processes</h4>
          <div className="space-y-2 mb-3">
            {bpmnProcesses
              .filter((p) => p.domain_id === domainId)
              .map((process) => (
                <div
                  key={process.id}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100"
                >
                  <span className="text-sm text-gray-700">{process.name}</span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => {
                        setSelectedBPMNProcessId(process.id);
                      }}
                      className={`px-2 py-1 text-xs rounded ${
                        selectedBPMNProcessId === process.id
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                      title="Select for transformation links"
                    >
                      Link
                    </button>
                    <button
                      onClick={() => handleEditBPMN(process.id)}
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
          </div>
          {selectedBPMNProcessId && (
            <div className="text-xs text-purple-600 mb-2">
              Selected for transformation links
            </div>
          )}
          <div className="text-xs text-gray-500">
            Tip: Select a process, then connect tables to create transformation links
          </div>
        </div>
      )}

      {/* BPMN Editor Modal */}
      <EditorModal
        type="bpmn"
        isOpen={showBPMNEditor}
        onClose={() => {
          setShowBPMNEditor(false);
          setEditingProcessId(null);
        }}
        title={editingProcessId ? `Edit BPMN Process: ${editingProcess?.name || ''}` : 'Create BPMN Process'}
        size="full"
        bpmnProps={{
          xml: editingProcess?.bpmn_xml,
          name: editingProcess?.name,
          onSave: handleSaveBPMN,
        }}
      />

      {/* Transformation Link Dialog */}
      {transformationSource && transformationTarget && (
        <TransformationLinkDialog
          isOpen={showTransformationDialog}
          onClose={() => {
            setShowTransformationDialog(false);
            setTransformationSource(null);
            setTransformationTarget(null);
          }}
          sourceTableId={transformationSource}
          targetTableId={transformationTarget}
          bpmnProcessId={selectedBPMNProcessId || undefined}
          onSave={handleSaveTransformationLink}
        />
      )}
    </>
  );
};

